// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Lastcall} from "../src/Lastcall.sol";

contract LastcallTest is Test {
  Lastcall internal lc;

  address internal owner = address(0xA11CE);
  address internal beneficiary = address(0xB0B);
  address internal stranger = address(0xC0FFEE);

  uint64 internal constant INTERVAL = 7 days;
  uint256 internal constant AMOUNT = 1 ether;

  event Armed(uint256 indexed id, address indexed owner, address indexed beneficiary, uint64 interval, uint256 amount);
  event CheckedIn(uint256 indexed id, address indexed owner, uint64 newLastCheckIn);
  event Claimed(uint256 indexed id, address indexed beneficiary, uint256 amount);
  event Withdrawn(uint256 indexed id, address indexed owner, uint256 amount);

  function setUp() public {
    lc = new Lastcall();
    vm.warp(1_760_000_000);
    vm.deal(owner, 100 ether);
    vm.deal(beneficiary, 0);
  }

  // ─── helper ──────────────────────────────────────────────────────────────────

  function _arm() internal returns (uint256 id) {
    vm.prank(owner);
    id = lc.arm{value: AMOUNT}(beneficiary, INTERVAL);
  }

  // ─── happy path ───────────────────────────────────────────────────────────────

  function test_Arms() public {
    uint256 id = _arm();
    Lastcall.Switch memory s = lc.switchOf(id);
    assertEq(s.owner, owner, "owner");
    assertEq(s.beneficiary, beneficiary, "beneficiary");
    assertEq(s.interval, INTERVAL, "interval");
    assertEq(s.lastCheckIn, uint64(block.timestamp), "lastCheckIn");
    assertFalse(s.closed, "closed");
    assertEq(s.amount, AMOUNT, "amount");
  }

  function test_EmitsArmed() public {
    vm.expectEmit(true, true, true, true, address(lc));
    emit Armed(1, owner, beneficiary, INTERVAL, AMOUNT);
    vm.prank(owner);
    lc.arm{value: AMOUNT}(beneficiary, INTERVAL);
  }

  function test_CheckInResetsTimer() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + 1 days);
    vm.prank(owner);
    lc.checkIn(id);
    assertEq(lc.switchOf(id).lastCheckIn, uint64(block.timestamp), "lastCheckIn after checkIn");
  }

  function test_OwnerWithdrawsBeforeInterval() public {
    uint256 id = _arm();
    uint256 balBefore = owner.balance;
    vm.prank(owner);
    lc.withdraw(id);
    assertEq(owner.balance, balBefore + AMOUNT, "owner balance");
    assertTrue(lc.switchOf(id).closed, "closed");
  }

  function test_OwnerWithdrawsAfterInterval() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + INTERVAL + 1);
    uint256 balBefore = owner.balance;
    vm.prank(owner);
    lc.withdraw(id);
    assertEq(owner.balance, balBefore + AMOUNT, "owner balance after lapse");
    assertTrue(lc.switchOf(id).closed, "closed");
  }

  function test_BeneficiaryClaimsAfterInterval() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + INTERVAL + 1);
    vm.prank(beneficiary);
    lc.claim(id);
    assertEq(beneficiary.balance, AMOUNT, "beneficiary balance");
    assertTrue(lc.switchOf(id).closed, "closed");
  }

  function test_ClaimFailsBeforeInterval() public {
    uint256 id = _arm();
    uint64 claimableAt = lc.switchOf(id).lastCheckIn + INTERVAL;
    vm.expectRevert(abi.encodeWithSelector(Lastcall.NotYetClaimable.selector, id, claimableAt));
    vm.prank(beneficiary);
    lc.claim(id);
  }

  function test_CheckInPreventsEarlyClaim() public {
    uint256 id = _arm();
    uint64 armTime = uint64(block.timestamp);

    // Check in halfway through the interval
    vm.warp(armTime + INTERVAL / 2);
    vm.prank(owner);
    lc.checkIn(id);
    uint64 newLastCheckIn = uint64(block.timestamp);

    // Warp past original claimable time but not past new claimable
    vm.warp(armTime + INTERVAL + 1);
    uint64 newClaimableAt = newLastCheckIn + INTERVAL;
    vm.expectRevert(abi.encodeWithSelector(Lastcall.NotYetClaimable.selector, id, newClaimableAt));
    vm.prank(beneficiary);
    lc.claim(id);

    // Warp past new claimable time
    vm.warp(newClaimableAt + 1);
    vm.prank(beneficiary);
    lc.claim(id);
    assertEq(beneficiary.balance, AMOUNT, "beneficiary got funds after new interval");
  }

  function test_OwnerWinsRace() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + INTERVAL + 1);

    // Owner withdraws first
    vm.prank(owner);
    lc.withdraw(id);

    // Beneficiary's claim reverts with AlreadyClosed
    vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
    vm.prank(beneficiary);
    lc.claim(id);
  }

  function test_BeneficiaryWinsRace() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + INTERVAL + 1);

    // Beneficiary claims first
    vm.prank(beneficiary);
    lc.claim(id);

    // Owner's withdraw reverts with AlreadyClosed
    vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
    vm.prank(owner);
    lc.withdraw(id);
  }

  function test_DoubleWithdrawFails() public {
    uint256 id = _arm();
    vm.prank(owner);
    lc.withdraw(id);
    vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
    vm.prank(owner);
    lc.withdraw(id);
  }

  function test_DoubleClaimFails() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + INTERVAL + 1);
    vm.prank(beneficiary);
    lc.claim(id);
    vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
    vm.prank(beneficiary);
    lc.claim(id);
  }

  // ─── guards ──────────────────────────────────────────────────────────────────

  function test_RevertsZeroValue() public {
    vm.expectRevert(Lastcall.ZeroValue.selector);
    vm.prank(owner);
    lc.arm{value: 0}(beneficiary, INTERVAL);
  }

  function test_RevertsZeroAddress() public {
    vm.expectRevert(Lastcall.ZeroAddress.selector);
    vm.prank(owner);
    lc.arm{value: AMOUNT}(address(0), INTERVAL);
  }

  function test_RevertsBeneficiaryIsOwner() public {
    vm.expectRevert(Lastcall.BeneficiaryIsOwner.selector);
    vm.prank(owner);
    lc.arm{value: AMOUNT}(owner, INTERVAL);
  }

  function test_RevertsIntervalTooShort() public {
    uint64 tooShort = lc.MIN_INTERVAL() - 1;
    vm.expectRevert(abi.encodeWithSelector(Lastcall.IntervalTooShort.selector, tooShort, lc.MIN_INTERVAL()));
    vm.prank(owner);
    lc.arm{value: AMOUNT}(beneficiary, tooShort);
  }

  function test_RevertsNotOwner_CheckIn() public {
    uint256 id = _arm();
    vm.expectRevert(abi.encodeWithSelector(Lastcall.NotOwner.selector, id));
    vm.prank(stranger);
    lc.checkIn(id);
  }

  function test_RevertsNotOwner_Withdraw() public {
    uint256 id = _arm();
    vm.expectRevert(abi.encodeWithSelector(Lastcall.NotOwner.selector, id));
    vm.prank(stranger);
    lc.withdraw(id);
  }

  function test_RevertsNotBeneficiary_Claim() public {
    uint256 id = _arm();
    vm.warp(block.timestamp + INTERVAL + 1);
    vm.expectRevert(abi.encodeWithSelector(Lastcall.NotBeneficiary.selector, id));
    vm.prank(stranger);
    lc.claim(id);
  }

  function test_RevertsAlreadyClosed_CheckIn() public {
    uint256 id = _arm();
    vm.prank(owner);
    lc.withdraw(id);
    vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
    vm.prank(owner);
    lc.checkIn(id);
  }

  // ─── gas ceilings ─────────────────────────────────────────────────────────────

  function test_GasCeiling_Arm() public {
    uint256 before = gasleft();
    vm.prank(owner);
    lc.arm{value: AMOUNT}(beneficiary, INTERVAL);
    uint256 used = before - gasleft();
    emit log_named_uint("arm() gas", used);
    assertLt(used, 130_000, "arm() exceeded gas ceiling");
  }

  function test_GasCeiling_CheckIn() public {
    uint256 id = _arm();
    uint256 before = gasleft();
    vm.prank(owner);
    lc.checkIn(id);
    uint256 used = before - gasleft();
    emit log_named_uint("checkIn() gas", used);
    assertLt(used, 40_000, "checkIn() exceeded gas ceiling");
  }

  // ─── fuzz properties ──────────────────────────────────────────────────────────

  function testFuzz_ExactAmountToOwnerOnWithdraw(uint128 amount) public {
    vm.assume(amount > 0);
    vm.deal(owner, uint256(amount));
    vm.prank(owner);
    uint256 id = lc.arm{value: uint256(amount)}(beneficiary, INTERVAL);
    uint256 balBefore = owner.balance;
    vm.prank(owner);
    lc.withdraw(id);
    assertEq(owner.balance, balBefore + uint256(amount), "owner received exact amount");
  }

  function testFuzz_WhoeverActsFirstWins(bool ownerFirst) public {
    vm.deal(owner, 1 ether);
    vm.prank(owner);
    uint256 id = lc.arm{value: 1 ether}(beneficiary, INTERVAL);
    vm.warp(block.timestamp + INTERVAL + 1);

    if (ownerFirst) {
      vm.prank(owner);
      lc.withdraw(id);
      vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
      vm.prank(beneficiary);
      lc.claim(id);
    } else {
      vm.prank(beneficiary);
      lc.claim(id);
      vm.expectRevert(abi.encodeWithSelector(Lastcall.AlreadyClosed.selector, id));
      vm.prank(owner);
      lc.withdraw(id);
    }
  }
}

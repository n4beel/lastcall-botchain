// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title Lastcall
/// @notice A dead man's switch: check in periodically, or funds transfer to your beneficiary.
///
/// @dev Whoever acts first wins. The owner can withdraw at any time — including after the
/// interval has lapsed but before the beneficiary claims. This is intentional: the purpose is
/// to make a voluntary transfer happen if the owner becomes unreachable, not to force it
/// unconditionally. Whoever calls withdraw or claim first gets the funds.
///
/// What this cannot do:
/// - No owner change after arming
/// - No beneficiary change after arming
/// - No interval extension or modification
/// - No admin or recovery mechanism
contract Lastcall {
  uint64 public constant MIN_INTERVAL = 1 hours;

  struct Switch {
    address owner;
    uint64 interval;
    address beneficiary;
    uint64 lastCheckIn;
    bool closed;
    uint256 amount;
  }

  mapping(uint256 id => Switch) private _switches;
  uint256 private _nextId;

  event Armed(uint256 indexed id, address indexed owner, address indexed beneficiary, uint64 interval, uint256 amount);
  event CheckedIn(uint256 indexed id, address indexed owner, uint64 newLastCheckIn);
  event Claimed(uint256 indexed id, address indexed beneficiary, uint256 amount);
  event Withdrawn(uint256 indexed id, address indexed owner, uint256 amount);

  error ZeroValue();
  error ZeroAddress();
  error BeneficiaryIsOwner();
  error IntervalTooShort(uint64 interval, uint64 min);
  error NotFound(uint256 id);
  error NotOwner(uint256 id);
  error NotBeneficiary(uint256 id);
  error AlreadyClosed(uint256 id);
  error NotYetClaimable(uint256 id, uint64 claimableAt);
  error TransferFailed(uint256 id, address to, uint256 amount);

  function arm(address beneficiary, uint64 interval) external payable returns (uint256 id) {
    if (msg.value == 0) revert ZeroValue();
    if (beneficiary == address(0)) revert ZeroAddress();
    if (beneficiary == msg.sender) revert BeneficiaryIsOwner();
    if (interval < MIN_INTERVAL) revert IntervalTooShort(interval, MIN_INTERVAL);

    id = ++_nextId;
    _switches[id] = Switch({
      owner: msg.sender,
      interval: interval,
      beneficiary: beneficiary,
      lastCheckIn: uint64(block.timestamp),
      closed: false,
      amount: msg.value
    });
    emit Armed(id, msg.sender, beneficiary, interval, msg.value);
  }

  function checkIn(uint256 id) external {
    Switch storage s = _switches[id];
    if (s.owner == address(0)) revert NotFound(id);
    if (msg.sender != s.owner) revert NotOwner(id);
    if (s.closed) revert AlreadyClosed(id);
    s.lastCheckIn = uint64(block.timestamp);
    emit CheckedIn(id, msg.sender, s.lastCheckIn);
  }

  /// @notice Owner can ALWAYS withdraw, even if the interval has lapsed.
  /// Whoever calls withdraw or claim first gets the funds.
  function withdraw(uint256 id) external {
    Switch storage s = _switches[id];
    if (s.owner == address(0)) revert NotFound(id);
    if (msg.sender != s.owner) revert NotOwner(id);
    if (s.closed) revert AlreadyClosed(id);
    uint256 amount = s.amount;
    s.closed = true;
    (bool ok,) = s.owner.call{value: amount}("");
    if (!ok) revert TransferFailed(id, s.owner, amount);
    emit Withdrawn(id, s.owner, amount);
  }

  function claim(uint256 id) external {
    Switch storage s = _switches[id];
    if (s.owner == address(0)) revert NotFound(id);
    if (msg.sender != s.beneficiary) revert NotBeneficiary(id);
    if (s.closed) revert AlreadyClosed(id);
    uint64 claimableAt = s.lastCheckIn + s.interval;
    if (uint64(block.timestamp) < claimableAt) revert NotYetClaimable(id, claimableAt);
    uint256 amount = s.amount;
    s.closed = true;
    (bool ok,) = s.beneficiary.call{value: amount}("");
    if (!ok) revert TransferFailed(id, s.beneficiary, amount);
    emit Claimed(id, s.beneficiary, amount);
  }

  function switchOf(uint256 id) external view returns (Switch memory) {
    return _switches[id];
  }

  function timeUntilClaimable(uint256 id) external view returns (uint256) {
    Switch storage s = _switches[id];
    if (s.owner == address(0)) return type(uint256).max;
    uint64 claimableAt = s.lastCheckIn + s.interval;
    if (uint64(block.timestamp) >= claimableAt) return 0;
    return claimableAt - uint64(block.timestamp);
  }
}

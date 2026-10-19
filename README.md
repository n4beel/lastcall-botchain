# Lastcall

A dead man's switch. Check in or your funds transfer.

## **WHOEVER ACTS FIRST WINS**

The owner can withdraw at any time — even after the interval has lapsed, as long as the beneficiary has not claimed yet. This is intentional. The switch exists to ensure a voluntary transfer occurs if the owner becomes unreachable, not to force an irreversible handover prematurely.

## What it does
You deposit BOT and configure a periodic check-in window (minimum 1 hour). As long as you check in, the countdown resets and funds remain secure. If you become permanently unreachable and the countdown lapses, your beneficiary can claim the deposit.

## What it deliberately cannot do
- **No owner change**: owner address is fixed at arm time
- **No beneficiary change**: beneficiary is fixed at arm time
- **No interval extension**: the interval cannot be lengthened retroactively
- **No admin / recovery**: nobody can pause, override, or siphon funds

## Gas
- `arm()`: ~113k gas (target: ~110k)
- `checkIn()`: ~28k gas (cheap because you will do this regularly, target: ~30k)
- `withdraw()`: ~32k gas
- `claim()`: ~35k gas

## Honest limits
- If you set a 1-hour interval and lose internet connectivity or access for 61 minutes before checking in, your beneficiary can claim the funds
- `block.timestamp` is set by validators and can drift by ~15 seconds; not intended for sub-minute precision
- Minimum interval is 1 hour

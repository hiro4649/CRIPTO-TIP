# Contract Governance

PR #2 does not add Solidity contract functionality. The contract governance change is CI dependency pinning and evidence.

## Current Status

- GitHub CI contracts job passed in run `26835142098`.
- GitHub CI contracts job passed in run `26858338314`.
- Local `forge test` was attempted but local Foundry is unavailable in this Windows environment.
- CI now pins Foundry `v1.7.1`, OpenZeppelin Contracts `v5.6.1`, forge-std `v1.7.1`, and ds-test commit `e282159d5170298eb2455a6c05280ab5a73a4ef0`.

## Governance Requirements To Preserve

- Production owner must be a multisig address.
- `Pausable` emergency stop must remain.
- `minimumTip` enforcement must remain.
- `TipSent` ABI must not include display name, message text, YouTube ID, wallet label, or other user personal text.
- Contract tests must continue to cover transfer, pause, owner/admin controls, minimum amount, zero ids, and no personal data fields in event ABI.

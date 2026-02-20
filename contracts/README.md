# PBTS Smart Contracts

Solidity smart contracts for the Persistent BitTorrent Tracker System, built with [Foundry](https://book.getfoundry.sh/).

## Contracts

### `ReputationTracker.sol`

The core contract that stores user reputation on-chain. Each instance is linked to a `REFERRER` — the previous tracker contract — enabling seamless reputation portability across migrations.

**State**

| Variable | Type | Description |
|---|---|---|
| `OWNER` | `address immutable` | Deployer address; can call `setTracker` |
| `REFERRER` | `address immutable` | Previous tracker contract (single-hop delegation) |
| `tracker` | `address` | Backend signer authorised to write reputation |
| `users` | `mapping(address => UserReputation)` | Per-user reputation store |
| `INITIAL_CREDIT` | `uint256 constant` | 1 GiB (1,073,741,824 bytes) given on registration |

**Struct**

```solidity
struct UserReputation {
    uint256 uploadBytes;
    uint256 downloadBytes;
    uint256 lastUpdated; // 0 means not registered on this contract
}
```

**Functions**

| Function | Access | Description |
|---|---|---|
| `register(address userKey)` | `onlyTracker` | Register a new user with `INITIAL_CREDIT` upload |
| `updateReputation(address user, uint256 uploadDelta, uint256 downloadDelta)` | `onlyTracker` | Increment upload/download counters |
| `getReputation(address user)` | `view` | Returns reputation; delegates to `REFERRER` if user not found locally |
| `getRatio(address user)` | `view` | Returns upload/download ratio scaled by 1e18; delegates to `REFERRER` if needed |
| `setTracker(address newTracker)` | `OWNER only` | Rotate the authorised tracker backend address |

**Referrer delegation** — `getReputation` and `getRatio` use a single-hop fallback: if the user has no entry in the current contract (`lastUpdated == 0`) and `REFERRER != address(0)`, the call is forwarded to the previous contract. This keeps the frontend API identical across migrations.

---

### `RepFactory.sol`

Factory contract that deploys new `ReputationTracker` instances. Gated to the factory owner or addresses that have been explicitly granted valid-tracker status (for future TEE attestation).

**Functions**

| Function | Access | Description |
|---|---|---|
| `deployNewTracker(address _referrer)` | owner or valid tracker | Deploys a new `ReputationTracker`, wires `_referrer`, emits `NewReputationTracker` |
| `addValidTracker(address tracker)` | owner only | Grants a tracker address the right to call `deployNewTracker` |

**Event**

```solidity
event NewReputationTracker(
    address indexed newContract,
    address indexed referrer,
    address indexed newTracker
);
```

---

## Project Structure

```
contracts/
├── src/
│   ├── ReputationTracker.sol   # Core reputation contract
│   └── RepFactory.sol          # Factory for deploying tracker contracts
├── script/
│   └── DeployPBTS.s.sol        # Deployment script (factory + first tracker)
└── test/
    └── ReputationTrackerTest.t.sol  # Foundry tests (registration, ratio, migration)
```

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Usage

### Build

```bash
forge build
```

### Test

```bash
forge test
# or via make:
make test
```

### Deploy to Avalanche Fuji

1. Copy the root `.env.example` to `contracts/.env` and fill in your values:

```env
FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
PRIVATE_KEY=0x<your_deployer_private_key>
```

2. Run the deployment script:

```bash
make deploy-fuji
# or directly:
forge script script/DeployPBTS.s.sol:DeployPBTS \
  --rpc-url $FUJI_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast
```

The script prints the deployed addresses:

```
RepFactory: 0x...
First ReputationTracker: 0x...
```

Copy these into your backend `.env` as `FACTORY_ADDRESS` and `REPUTATION_TRACKER_ADDRESS`.

### Other Foundry Commands

```bash
# Format
forge fmt

# Gas snapshots
forge snapshot

# Local devnet
anvil

# On-chain interactions
cast <subcommand>
```

## Migration Flow

When a tracker needs to rotate to a new contract (key rotation, server change, etc.):

```
RepFactory.deployNewTracker(oldTrackerAddress)
    → new ReputationTracker(referrer = oldTrackerAddress)
    → getReputation(user) delegates to old contract if user has no new-contract entry
```

See the backend `POST /migrate` endpoint for how the server automates this.


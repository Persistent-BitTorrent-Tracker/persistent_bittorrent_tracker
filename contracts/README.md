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

**State**

| Variable | Type | Description |
|---|---|---|
| `owner` | `address` | Factory owner; can manage tracker registry and deploy new contracts |
| `isValidTracker` | `mapping(address => bool)` | Authorised tracker addresses |
| `attestationHash` | `mapping(address => bytes32)` | keccak256 of TEE attestation report per tracker (`bytes32(0)` = owner-added) |

**Functions**

| Function | Access | Description |
|---|---|---|
| `deployNewTracker(address _referrer)` | owner or valid tracker | Deploys a new `ReputationTracker`, wires `_referrer`, emits `NewReputationTracker`. Reverts if `_referrer` is a non-zero EOA. |
| `addValidTracker(address tracker, bytes32 attestation)` | owner only | Grants a tracker address the right to call `deployNewTracker`. Stores the attestation hash on-chain. |
| `removeValidTracker(address tracker)` | owner only | Revokes a tracker's authorisation and clears its attestation hash. |
| `transferOwnership(address newOwner)` | owner only | Transfers factory ownership to a new address. |

**Events**

```solidity
event NewReputationTracker(
    address indexed newContract,
    address indexed referrer,
    address indexed newTracker
);
event TrackerAdded(address indexed tracker, bytes32 attestation);
event TrackerRemoved(address indexed tracker);
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

### Deploy

1. Create `contracts/.env` from the template and fill in your values:

```env
# At least one RPC URL is required
FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
SEPOLIA_RPC=https://rpc.sepolia.org

# Deployer wallet (NEVER commit a real key)
PRIVATE_KEY=0x<your_deployer_private_key>

# Verification (optional)
SNOWTRACE_API_KEY=
ETHERSCAN_API_KEY=
```

2. Run the deployment script for your target network:

```bash
# Avalanche Fuji (chain 43113)
make deploy-fuji

# Ethereum Sepolia (chain 11155111)
make deploy-sepolia
```

The script prints the deployed addresses:

```
RepFactory: 0x...
First ReputationTracker: 0x...
```

Copy these into your backend `.env` as `FACTORY_ADDRESS` and `REPUTATION_TRACKER_ADDRESS`.

3. (Optional) Verify on a block explorer:

```bash
# Set REP_FACTORY_ADDRESS in .env first
make verify-fuji    # Snowtrace
make verify-sepolia # Etherscan
```

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


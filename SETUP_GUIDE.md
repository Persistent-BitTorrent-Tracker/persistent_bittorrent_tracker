# PBTS Complete Setup Guide

This guide provides all commands needed to deploy and interact with the Persistent BitTorrent Tracker System (PBTS).

## Prerequisites

- **Foundry**: Install from [getfoundry.sh](https://getfoundry.sh)
- **Node.js 18+** or **Bun**: For running the backend server
- **MetaMask** (optional): For frontend wallet interactions
- **Test ETH/AVAX**: Faucet funds for gas fees

## Quick Start (Recommended Path)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/faulknerpearce/eth_denver_2026.git
cd eth_denver_2026/persistent_bittorrent_tracker

# Install backend dependencies
cd backend
npm install  # or: bun install
cd ..

# Install Foundry dependencies
cd contracts
forge install
cd ..
```

### 2. Configure Environment Variables

#### Contracts Environment

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:

```env
# Network (choose one)
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc  # Avalanche Fuji
# RPC_URL=https://rpc.sepolia.org                   # Ethereum Sepolia

CHAIN_ID=43113  # Fuji: 43113, Sepolia: 11155111

# Your deployer wallet private key (NEVER commit real keys)
PRIVATE_KEY=0x<your_private_key_here>

# Verification API keys (optional, for contract verification)
SNOWTRACE_API_KEY=<your_snowtrace_api_key>  # For Fuji
ETHERSCAN_API_KEY=<your_etherscan_api_key>  # For Sepolia
```

#### Backend Environment

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Network (must match contracts/.env)
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113

# Same private key as contracts (this wallet pays gas for backend operations)
DEPLOYER_PRIVATE_KEY=<your_private_key_here>

# Contract addresses (leave empty for now, filled after deployment)
REPUTATION_TRACKER_ADDRESS=
FACTORY_ADDRESS=

# Backend server configuration
PORT=3001
NODE_ENV=development

# Generate a secure random secret for the /migrate admin endpoint
ADMIN_SECRET=$(openssl rand -hex 32)

# Minimum ratio for peer access (default: 0.5)
MIN_RATIO=0.5

# Receipt timestamp window in seconds (default: 300)
TIMESTAMP_WINDOW_SECONDS=300

# BitTorrent tracker port
TRACKER_PORT=8000
```

### 3. Build Contracts

```bash
cd contracts
forge build
```

**Expected Output:**
```
[⠊] Compiling...
[⠘] Solc 0.8.33 finished in 680.72ms
Compiler run successful!
```

### 4. Run Contract Tests

```bash
forge test -vv
```

**Expected Output:**
```
Ran 19 tests for test/ReputationTrackerTest.t.sol:ReputationTrackerTest
[PASS] test_Attestation_MVP() (gas: 5480)
[PASS] test_Factory_AddValidTracker() (gas: 603224)
...
Suite result: ok. 19 passed; 0 failed; 0 skipped
```

## Deployment Options

You have two deployment paths:

### Option A: Backend Scripts (Recommended)

The backend `deploy.ts` script handles both RepFactory and ReputationTracker deployment in one command.

```bash
cd backend
npm run deploy
```

**Expected Output:**
```
=== PBTS Initial Deployment ===
Network : https://api.avax-test.network/ext/bc/C/rpc
Deployer: 0x<your_address>

Deploying RepFactory...
✓ RepFactory deployed: 0x<factory_address>

Deploying first ReputationTracker...
✓ ReputationTracker deployed: 0x<tracker_address>

=== Deployment Summary ===
RepFactory         : 0x<factory_address>
ReputationTracker  : 0x<tracker_address>

Update your backend/.env:
  FACTORY_ADDRESS=0x<factory_address>
  REPUTATION_TRACKER_ADDRESS=0x<tracker_address>
```

**After deployment**, update your `backend/.env` with the addresses shown above.

### Option B: Foundry Script (Basic)

The Foundry script deploys only a single ReputationTracker (no factory).

```bash
cd contracts
source .env
forge script script/DeployPBTS.s.sol:DeployPBTS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

**Expected Output:**
```
ReputationTracker: 0x<tracker_address>
```

**Note:** This method does NOT deploy RepFactory, so migration functionality will not be available. Use Option A for full functionality.

### 5. Update Backend Configuration

Edit `backend/.env` with the deployed addresses:

```env
FACTORY_ADDRESS=0x<factory_address_from_deployment>
REPUTATION_TRACKER_ADDRESS=0x<tracker_address_from_deployment>
```

### 6. Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
[PBTS] Tracker server running on port 3001 (development)
[PBTS] RPC URL : https://api.avax-test.network/ext/bc/C/rpc
[PBTS] Contract: 0x<tracker_address>
[PBTS] BitTorrent tracker running on port 8000
```

Leave this terminal running. Open a new terminal for the next steps.

### 7. Verify Deployment Status

Check contract status and reputation chain:

```bash
cd backend
npm run status
```

**Expected Output:**
```
=== PBTS Contract Status ===
Network : https://api.avax-test.network/ext/bc/C/rpc
Contract: 0x<tracker_address>

Owner   : 0x<factory_address>
Tracker : 0x<your_wallet_address>
Referrer: 0x0000000000000000000000000000000000000000 (genesis)

=== Referrer Chain ===
  0x<tracker_address> (current) → genesis
Chain length: 1
```

## Testing the System

### Test 1: Register a User

```bash
# In a new terminal
cd backend
npm run register
```

**Expected Output:**
```
=== PBTS User Registration ===
Registering: 0x<your_wallet_address>
✓ User registered successfully
TX: 0x<transaction_hash>
Initial credit: 1 GB (1073741824 bytes)
```

### Test 2: Submit a Transfer Receipt

Create a test receipt and submit it:

```bash
curl -X POST http://localhost:3001/report \
  -H "Content-Type: application/json" \
  -d '{
    "infohash": "0x1234567890abcdef1234567890abcdef12345678",
    "sender": "0x<your_wallet_address>",
    "receiver": "0x<another_test_address>",
    "pieceHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "pieceIndex": 0,
    "pieceSize": 262144,
    "timestamp": '$(date +%s)',
    "signature": "0x<receiver_signature>"
  }'
```

**Note:** For a real receipt, the receiver must sign the receipt data. For testing, you'll need to:
1. Register the receiver address first
2. Generate a valid signature using the receiver's private key

### Test 3: Request Peer List (Announce)

```bash
npm run announce
```

**Expected Output (good ratio):**
```
=== PBTS Announce ===
Announcing: started for 0x1234567890abcdef1234567890abcdef12345678

✓ Access granted
Current reputation:
  Upload   : 1.00 GB
  Download : 0.00 GB
  Ratio    : Infinity

Peers: 0
```

**Expected Output (low ratio):**
```
✗ Access denied (ratio too low)
Current ratio: 0.45
Required: 0.50
Upload 53.69 MB more to unlock access
```

### Test 4: Contract Migration

Deploy a new ReputationTracker contract with the current one as referrer:

```bash
cd backend
npm run migrate
```

**Expected Output:**
```
=== PBTS Controlled Migration ===
Network     : https://api.avax-test.network/ext/bc/C/rpc
Deployer    : 0x<your_wallet_address>
Factory     : 0x<factory_address>
Old contract: 0x<old_tracker_address>

Deploying new ReputationTracker...
✓ New ReputationTracker deployed: 0x<new_tracker_address>

=== Migration Complete ===
Old contract: 0x<old_tracker_address>
New contract: 0x<new_tracker_address>

Update backend/.env:
  REPUTATION_TRACKER_ADDRESS=0x<new_tracker_address>

Then restart the server with: npm run dev
```

**After migration:**

1. Update `backend/.env`:
   ```env
   REPUTATION_TRACKER_ADDRESS=0x<new_tracker_address>
   ```

2. Restart the server:
   ```bash
   npm run dev
   ```

3. Verify reputation is preserved:
   ```bash
   npm run status
   ```

   You should see the referrer chain:
   ```
   === Referrer Chain ===
     0x<new_tracker_address> (current) → 0x<old_tracker_address> → genesis
   Chain length: 2
   ```

### Test 5: Run Full Test Suites

#### Backend Tests

```bash
cd backend
npm test
```

**Expected Output:**
```
PASS  tests/api.test.ts
PASS  tests/signatures.test.ts
PASS  tests/receiptGenerator.test.ts
PASS  tests/bindPeer.test.ts
PASS  tests/peerRegistry.test.ts

Test Suites: 5 passed, 5 total
Tests:       27 passed, 27 total
```

#### Contract Tests

```bash
cd contracts
forge test -vv
```

**Expected Output:**
```
Ran 19 tests for test/ReputationTrackerTest.t.sol:ReputationTrackerTest
Suite result: ok. 19 passed; 0 failed; 0 skipped
```

#### Run Both

```bash
cd backend
npm run test:all
```

## API Reference

### POST /register

Register a new user on-chain.

```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x<user_address>",
    "message": "Register PBTS account: 0x<user_address>",
    "signature": "0x<eip191_signature>"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "userAddress": "0x<user_address>",
  "initialCredit": 1073741824,
  "txHash": "0x<transaction_hash>"
}
```

### POST /report

Submit a cryptographic transfer receipt.

```bash
curl -X POST http://localhost:3001/report \
  -H "Content-Type: application/json" \
  -d '{
    "infohash": "0x<40_char_hash>",
    "sender": "0x<sender_address>",
    "receiver": "0x<receiver_address>",
    "pieceHash": "0x<64_char_hash>",
    "pieceIndex": 0,
    "pieceSize": 262144,
    "timestamp": 1700000000,
    "signature": "0x<receiver_signature>"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "sender": {
    "address": "0x<sender_address>",
    "upload": "1.25 GB",
    "download": "0.00 GB",
    "ratio": "Infinity",
    "txHash": "0x<tx_hash>"
  },
  "receiver": {
    "address": "0x<receiver_address>",
    "upload": "1.00 GB",
    "download": "0.25 GB",
    "ratio": "4.00",
    "txHash": "0x<tx_hash>"
  }
}
```

### POST /announce

Request peer list (requires MIN_RATIO).

```bash
curl -X POST http://localhost:3001/announce \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x<user_address>",
    "infohash": "0x<40_char_hash>",
    "event": "started",
    "message": "Announce started for 0x<40_char_hash>",
    "signature": "0x<user_signature>"
  }'
```

**Response (200 - Access Granted):**
```json
{
  "success": true,
  "reason": "Ratio sufficient",
  "reputation": {
    "upload": "1.00 GB",
    "download": "0.50 GB",
    "ratio": "2.00"
  },
  "peers": [
    {
      "address": "0x<peer_address>",
      "peerId": "peer_id_string"
    }
  ]
}
```

**Response (403 - Access Denied):**
```json
{
  "error": "Ratio too low",
  "required": 0.5,
  "actual": 0.45,
  "uploadDeficitMB": 53.69,
  "reputation": {
    "upload": "900.00 MB",
    "download": "2.00 GB",
    "ratio": "0.45"
  }
}
```

### GET /health

Health check endpoint.

```bash
curl http://localhost:3001/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T12:34:56.789Z"
}
```

### POST /migrate (Admin Only)

Deploy a new tracker contract.

```bash
curl -X POST http://localhost:3001/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -d '{
    "oldContract": "0x<old_tracker_address>"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "oldContract": "0x<old_address>",
  "newContract": "0x<new_address>",
  "message": "New ReputationTracker deployed. Update REPUTATION_TRACKER_ADDRESS and restart the server."
}
```

## Contract Verification

### Verify on Snowtrace (Avalanche Fuji)

```bash
cd contracts
source .env
forge verify-contract \
  $REPUTATION_TRACKER_ADDRESS \
  src/ReputationTracker.sol:ReputationTracker \
  --chain-id 43113 \
  --etherscan-api-key $SNOWTRACE_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" "0x0000000000000000000000000000000000000000")
```

### Verify on Etherscan (Ethereum Sepolia)

```bash
cd contracts
source .env
forge verify-contract \
  $REPUTATION_TRACKER_ADDRESS \
  src/ReputationTracker.sol:ReputationTracker \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" "0x0000000000000000000000000000000000000000")
```

## Troubleshooting

### "Only tracker" Error

**Problem:** Backend cannot write to contract.

**Solution:** The tracker address in the contract is set permanently at deployment and must match your deployer wallet. When using `npm run deploy` or the RepFactory, the caller automatically becomes the authorized tracker. If the tracker address doesn't match, you need to deploy a new contract via the factory.

### "Invalid signature" Error

**Problem:** Signature verification failed.

**Solution:** Ensure you're using EIP-191 personal_sign format:
```javascript
const message = "Register PBTS account: 0x<address>";
const signature = await provider.send("personal_sign", [message, address]);
```

### "User already registered" Error

**Problem:** Trying to register an already registered user.

**Solution:** This is expected behavior. Each user can only register once per contract. After migration, users don't need to re-register (reputation is delegated from the old contract).

### Server Won't Start

**Problem:** Missing environment variables.

**Solution:** Verify all required variables in `backend/.env`:
- `DEPLOYER_PRIVATE_KEY`
- `RPC_URL`
- `REPUTATION_TRACKER_ADDRESS`
- `FACTORY_ADDRESS`
- `ADMIN_SECRET`

### Transaction Fails with "Insufficient Funds"

**Problem:** Deployer wallet has no testnet ETH/AVAX.

**Solution:** Get testnet funds:
- **Avalanche Fuji**: https://faucet.avax.network/
- **Ethereum Sepolia**: https://sepoliafaucet.com/

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      PBTS Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (React)                                            │
│      │                                                        │
│      │ HTTP API calls                                        │
│      ↓                                                        │
│  Backend (Express + ethers.js)                               │
│      │                                                        │
│      │ Contract calls (register, updateReputation)           │
│      ↓                                                        │
│  RepFactory (Solidity)                                       │
│      │                                                        │
│      │ Deploys                                               │
│      ↓                                                        │
│  ReputationTracker (Solidity)                                │
│      │                                                        │
│      │ REFERRER → Previous ReputationTracker                │
│      │            (single-hop delegation)                    │
│      ↓                                                        │
│  Blockchain (Avalanche Fuji / Ethereum Sepolia)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Reputation System

- **Initial Credit**: 1 GB (1,073,741,824 bytes) given on registration
- **Upload/Download Tracking**: Updated via cryptographic receipts
- **Ratio Calculation**: `(uploadBytes * 1e18) / downloadBytes`
- **Access Control**: Users must maintain `ratio >= MIN_RATIO` to get peer lists

### Migration & Referrer Chain

- Each ReputationTracker has a `REFERRER` pointing to the previous contract
- When reading reputation, if user not found locally, delegate to REFERRER
- Single-hop delegation prevents unbounded gas costs
- Frontend API remains unchanged across migrations

### Cryptographic Receipts

- Receiver signs: `keccak256(abi.encode(infohash, sender, receiver, pieceHash, pieceIndex, pieceSize, timestamp))`
- Prevents fake upload claims
- Timestamp window prevents replay attacks
- In-memory deduplication prevents double-counting

## Next Steps

1. **Deploy to Production Network**: Update RPC_URL to mainnet endpoint
2. **TEE Integration**: Implement attestation validation in RepFactory
3. **Frontend Development**: Build React dashboard for user interactions
4. **P2P Integration**: Connect to real BitTorrent protocol via WebTorrent
5. **BLS Signatures**: Implement aggregated batch receipt submission

## Resources

- **Foundry Documentation**: https://book.getfoundry.sh/
- **ethers.js v6 Docs**: https://docs.ethers.org/v6/
- **Avalanche Fuji Explorer**: https://testnet.snowtrace.io/
- **Ethereum Sepolia Explorer**: https://sepolia.etherscan.io/
- **Project Repository**: https://github.com/faulknerpearce/eth_denver_2026

## License

TBD

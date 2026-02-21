# PBTS Setup Guide

Quick-start guide for running the Persistent BitTorrent Tracker System locally.

---

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| **Node.js 18+** | Backend + Frontend | [nodejs.org](https://nodejs.org) |
| **Foundry** | Compile & deploy contracts | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **MetaMask** | Browser wallet for the frontend | [metamask.io](https://metamask.io) |
| **Testnet funds** | Gas for contract deployment | [Fuji faucet](https://faucet.avax.network/) · [Sepolia faucet](https://sepoliafaucet.com/) |

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/Persistent-BitTorrent-Tracker/persistent_bittorrent_tracker.git
cd persistent_bittorrent_tracker

# Install all dependencies
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
cd contracts && forge install && cd ..
```

---

## Step 2 — Configure Environment Variables

### Contracts (`contracts/.env`)

```bash
cd contracts && cp .env.example .env
```

```env
# Network — pick one
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc   # Avalanche Fuji
# RPC_URL=https://rpc.sepolia.org                    # Ethereum Sepolia

CHAIN_ID=43113   # Fuji: 43113 · Sepolia: 11155111

# Deployer wallet private key (never commit a real key)
PRIVATE_KEY=0x<your_private_key_here>

# Optional: for contract verification
SNOWTRACE_API_KEY=<your_snowtrace_api_key>
ETHERSCAN_API_KEY=<your_etherscan_api_key>
```

### Backend (`backend/.env`)

```bash
cd backend && cp .env.example .env
```

```env
# Must match contracts/.env
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113

# Same wallet as above — pays gas for on-chain reputation updates
DEPLOYER_PRIVATE_KEY=<your_private_key_here>

# Filled in after Step 4 (deployment)
REPUTATION_TRACKER_ADDRESS=
FACTORY_ADDRESS=

PORT=3001
NODE_ENV=development

# Random secret for the /migrate admin endpoint
ADMIN_SECRET=$(openssl rand -hex 32)

MIN_RATIO=0.5
TIMESTAMP_WINDOW_SECONDS=300
TRACKER_PORT=8000
```

### Frontend (`frontend/.env.local`)

```bash
cd frontend && cp .env.local.example .env.local
```

```env
VITE_BACKEND_URL=http://localhost:3001

# Match CHAIN_ID above
VITE_CHAIN_ID=43113   # Fuji: 43113 · Sepolia: 11155111

# Filled in after Step 4 (deployment)
VITE_REPUTATION_TRACKER_ADDRESS=

# Optional: only needed to use the Migrate button in the dashboard
VITE_ADMIN_SECRET=
```

---

## Step 3 — Build and Test Contracts

```bash
cd contracts
forge build
forge test -vv
```

Expected output:
```
Compiler run successful!
Suite result: ok. 19 passed; 0 failed; 0 skipped
```

---

## Step 4 — Deploy Contracts

```bash
cd backend
npm run deploy
```

Expected output:
```
✓ RepFactory deployed:        0x<factory_address>
✓ ReputationTracker deployed: 0x<tracker_address>
```

Copy the two addresses into `backend/.env` and `frontend/.env.local`:

```bash
# backend/.env
FACTORY_ADDRESS=0x<factory_address>
REPUTATION_TRACKER_ADDRESS=0x<tracker_address>

# frontend/.env.local
VITE_REPUTATION_TRACKER_ADDRESS=0x<tracker_address>
```

---

## Step 5 — Start the Backend

```bash
cd backend
npm run dev
```

Expected output:
```
[PBTS] Tracker server running on port 3001 (development)
[PBTS] RPC URL : https://api.avax-test.network/ext/bc/C/rpc
[PBTS] Contract: 0x<tracker_address>
[PBTS] BitTorrent tracker running on port 8000
```

Leave this terminal running.

---

## Step 6 — Start the Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v6.x.x  ready in ~300 ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser and connect MetaMask to start building reputation.

---

## Step 7 — Verify Everything is Working

```bash
# Check contract + reputation chain
cd backend && npm run status

# Run all backend tests
npm test

# Run all contract tests
cd ../contracts && forge test -vv

# Run backend + contract tests together
cd ../backend && npm run test:all
```

---

## Common Commands Reference

| Command | What it does |
|---------|-------------|
| `cd backend && npm run dev` | Start the tracker API server |
| `cd frontend && npm run dev` | Start the frontend dev server |
| `cd backend && npm run deploy` | Deploy RepFactory + ReputationTracker |
| `cd backend && npm run status` | Print contract state and referrer chain |
| `cd backend && npm run register` | Register the deployer wallet on-chain |
| `cd backend && npm run announce` | Test peer-list access via CLI |
| `cd backend && npm run migrate` | Deploy a new tracker (preserves reputation) |
| `cd backend && npm test` | Run backend test suite |
| `cd contracts && forge test -vv` | Run Solidity test suite |
| `cd frontend && npm run build` | Production build → `frontend/dist/` |

---

## Contract Development Workflow

When modifying smart contracts, follow this workflow to keep everything in sync:

### Updating Contract ABIs

After making changes to Solidity contracts:

```bash
# 1. Recompile contracts
cd contracts && forge build

# 2. Update ABIs automatically
cd ../backend && npm run update-abis

# 3. Test that backend still works
npm run dev
```

The `update-abis` command extracts the latest ABIs from compiled artifacts and updates the JSON files in `backend/abis/`.

### Full Contract Redeployment

For breaking changes that require redeployment:

```bash
# 1. Update and test contracts
cd contracts && forge build && forge test -vv

# 2. Deploy new contracts
cd ../backend && npm run deploy

# 3. Update environment variables with new addresses
# Edit backend/.env and frontend/.env.local with new contract addresses

# 4. Update ABIs (in case of interface changes)
npm run update-abis

# 5. Restart backend and frontend
npm run dev  # backend
cd ../frontend && npm run dev  # frontend (new terminal)
```

### Contract Migration (Preserves Reputation)

For non-breaking upgrades that preserve existing reputation:

```bash
# Deploy new tracker pointing to old one as referrer
cd backend && npm run migrate

# Update environment variables with new tracker address
# The old contract remains as referrer, preserving all reputation data
```

---

## API Quick Reference

All endpoints run at `http://localhost:3001`.

### `POST /register` — Register a wallet on-chain
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x<addr>","message":"Register PBTS account: 0x<addr>","signature":"0x<sig>"}'
```

### `POST /report` — Submit a signed transfer receipt
```bash
curl -X POST http://localhost:3001/report \
  -H "Content-Type: application/json" \
  -d '{"infohash":"0x<40hex>","sender":"0x<addr>","receiver":"0x<addr>","pieceHash":"0x<64hex>","pieceIndex":0,"pieceSize":262144,"timestamp":1700000000,"signature":"0x<sig>"}'
```

### `POST /announce` — Request peer list (ratio checked)
```bash
curl -X POST http://localhost:3001/announce \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x<addr>","infohash":"0x<40hex>","event":"started","message":"<msg>","signature":"0x<sig>"}'
```

### `GET /health` — Backend health check
```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

### `POST /migrate` — Deploy a new tracker contract *(admin only)*
```bash
curl -X POST http://localhost:3001/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -d '{"oldContract":"0x<old_tracker_address>"}'
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Only tracker` | Backend wallet ≠ contract tracker address | Redeploy via `npm run deploy` |
| `Invalid signature` | Wrong signing format | Use EIP-191 `personal_sign` |
| `User already registered` | Wallet already on-chain | Expected — not an error |
| Server won't start | Missing `.env` values | Ensure `DEPLOYER_PRIVATE_KEY`, `RPC_URL`, `REPUTATION_TRACKER_ADDRESS`, `FACTORY_ADDRESS`, `ADMIN_SECRET` are all set |
| `Insufficient funds` | No testnet gas | Fund wallet from [Fuji faucet](https://faucet.avax.network/) or [Sepolia faucet](https://sepoliafaucet.com/) |
| Frontend shows "backend offline" | Backend not running | Run `cd backend && npm run dev` first |

---

## Architecture

```
Frontend (Vite + React)  ──HTTP──▶  Backend (Express + ethers.js)
                                          │
                                          │ contract calls
                                          ▼
                                    RepFactory (Solidity)
                                          │
                                          │ deploys
                                          ▼
                                  ReputationTracker (Solidity)
                                          │
                                          │ REFERRER → previous contract
                                          ▼
                              Blockchain (Avalanche Fuji / Sepolia)
```

### How reputation works
- **Initial credit**: 1 GB on registration
- **Uploads**: credited when a signed receipt is submitted via `/report`
- **Ratio** = `uploadBytes / downloadBytes` — must stay ≥ `MIN_RATIO` (default 0.5) for peer-list access
- **Migration**: deploy a new `ReputationTracker` pointing to the old one as `REFERRER`; reputation is read through the chain with zero re-registration required

---

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Avalanche Fuji Explorer](https://testnet.snowtrace.io/)
- [Ethereum Sepolia Explorer](https://sepolia.etherscan.io/)

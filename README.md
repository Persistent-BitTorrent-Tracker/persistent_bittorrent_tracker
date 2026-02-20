# Persistent BitTorrent Tracker System (PBTS)

**ETH Denver 2026 Hackathon Project**

A blockchain-based solution for persistent, portable, and verifiable BitTorrent tracker reputation.

## Problem Statement

Private BitTorrent trackers suffer from three critical weaknesses:

1. **Non-Portable Reputation**: Upload/download ratios are locked to specific trackers. When a tracker shuts down, users lose their contribution history permanently.

2. **Centralized Fragility**: Trackers are single points of failure for both reputation storage and peer discovery.

3. **Unverifiable Statistics**: Upload statistics are self-reported and easily manipulated.

## Solution

PBTS addresses these weaknesses through:

- **Blockchain-Based Reputation**: Smart contracts persist user reputation permanently, surviving tracker shutdowns
- **Cryptographic Attestation**: Downloading peers sign receipts for received pieces, eliminating fake uploads
- **Decentralized Architecture**: Reputation persists across restarts, deployments, and operator changes

## Project Structure

```
eth_denver_2026/
├── contracts/          # Solidity smart contracts (ReputationTracker.sol)
│   ├── src/           # Contract source files
│   ├── test/          # Foundry tests
│   └── script/        # Deployment scripts
├── backend/           # Node.js + Express tracker server
│   ├── routes/        # API endpoints (register, report, announce)
│   ├── utils/         # Signature verification, contract interaction
│   └── config/        # Configuration files
├── frontend/          # React + Vite + TailwindCSS dashboard
│   └── src/
│       ├── components/  # UI components
│       ├── hooks/       # React hooks for wallet and contract
│       └── utils/       # Helper functions
├── dev-scripts/       # Utility scripts for development and deployment
└── agents/            # Development guidelines and best practices

```

## Technology Stack

- **Smart Contracts**: Solidity + Foundry
- **Backend**: Bun + Express.js
- **Frontend**: React + Vite + TailwindCSS
- **Cryptography**: ECDSA (secp256k1) via ethers.js
- **Blockchain**: Avalanche Fuji testnet (fast finality, low fees)

## MVP Scope (4-Day Hackathon)

**Core Demonstration:**
- Users register via wallet signature → on-chain account creation
- Manual transfer simulation with cryptographic receipts → reputation updates
- Reputation-based access control → high reputation users get peer lists
- Server restart demonstration → reputation persists via blockchain

**Intentional Simplifications:**
- Manual transfer simulation (no real P2P integration)
- Single smart contract (no factory pattern)
- Basic ECDSA signatures (no BLS aggregation)
- Simulated peer swarm (no real BitTorrent protocol)
- No TEE implementation

## Getting Started

### Prerequisites

- Bun
- Foundry
- MetaMask browser extension

### Quick Start

```bash
# Clone the repository
git clone https://github.com/faulknerpearce/eth_denver_2026.git
cd eth_denver_2026

# Install dependencies
npm install

# Copy example environment and fill in values
cp .env.example backend/.env
```

### Smart Contract Deployment

```bash
cd contracts

# Build contracts
forge build

# Run tests (including migration tests)
forge test

# Deploy RepFactory + first ReputationTracker to Avalanche Fuji
make deploy-fuji
# Outputs:
#   RepFactory: 0x...
#   First ReputationTracker: 0x...
```

After deployment, copy the addresses into `backend/.env`:

```env
FACTORY_ADDRESS=0x<RepFactory address>
REPUTATION_TRACKER_ADDRESS=0x<First ReputationTracker address>
ADMIN_SECRET=<a strong random secret>
```

### Backend Server

```bash
cd backend
bun run dev   # development with hot reload
bun run start # production
```

### Tracker Migration

When a tracker needs to move to a new contract (e.g. after a server change or
rotation), call the protected admin endpoint.  The new contract will have a
`referrer` pointing at the old one so that all reputation history is preserved
transparently — **no frontend changes required**.

```bash
curl -X POST http://localhost:3001/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -d '{"oldContract": "0x<current REPUTATION_TRACKER_ADDRESS>"}'
```

Response:
```json
{
  "success": true,
  "oldContract": "0x...",
  "newContract": "0x...",
  "message": "New ReputationTracker deployed. Update REPUTATION_TRACKER_ADDRESS and restart the server."
}
```

Then update `backend/.env`:

```env
REPUTATION_TRACKER_ADDRESS=0x<newContract>
```

and restart the server.  All existing users' reputation is automatically
accessible through the new contract's single-hop referrer delegation.

> **Tip**: If `oldContract` is omitted from the request body, the server
> defaults to the currently configured `REPUTATION_TRACKER_ADDRESS`.  Both
> usages are valid:
> ```bash
> # Explicit old contract address
> curl -X POST http://localhost:3001/migrate \
>   -H "Authorization: Bearer $ADMIN_SECRET" \
>   -d '{"oldContract":"0xOldAddress"}'
>
> # Omit oldContract — server uses the configured REPUTATION_TRACKER_ADDRESS
> curl -X POST http://localhost:3001/migrate \
>   -H "Authorization: Bearer $ADMIN_SECRET" \
>   -d '{}'
> ```

## Development Phases

### Phase 1: Smart Contracts (Day 1)
- Write `ReputationTracker.sol`
- Write comprehensive tests (≥90% coverage)
- Deploy to local network
- Deploy to Avalanche Fuji testnet

### Phase 2: Backend Server (Day 2)
- Implement API endpoints (`/register`, `/report`, `/announce`)
- Connect to deployed contract
- Test with Postman/curl
- Verify persistence across server restarts

### Phase 3: Frontend Dashboard (Day 3)
- Build wallet connection
- Implement user registration flow
- Create transfer simulation interface
- Display reputation and access status

### Phase 4: Polish & Demo (Day 4)
- UI/UX polish
- Demo scenario preparation
- Video recording
- Presentation slides

## Documentation

- **[MVP Implementation Plan](./MVP_IMPLEMENTATION_PLAN.md)** - Detailed specifications
- **[Contracts README](./contracts/README.md)** - Smart contract development guide
- **[Backend README](./backend/README.md)** - Tracker server documentation
- **[Frontend README](./frontend/README.md)** - Dashboard development guide

## Key Features

✅ Persistent on-chain reputation  
✅ Cryptographic transfer receipts  
✅ Reputation-based access control  
✅ Zero local state (stateless server)  
✅ Censorship-resistant architecture  

## Demo Flow

1. **Register**: Connect MetaMask → Sign message → On-chain account created
2. **Simulate Transfer**: Create receipt → Sign → Submit → Watch reputation update
3. **Announce**: Request peer list → Access granted/denied based on ratio
4. **Persistence**: Kill server → Restart → Reputation unchanged

## Security Considerations

⚠️ **NEVER commit**:
- Private keys
- API keys
- RPC URLs with embedded keys
- Any secrets or credentials

Use environment variables for all sensitive configuration.

## License

TBD

## Team

- Repository: [faulknerpearce/eth_denver_2026](https://github.com/faulknerpearce/eth_denver_2026)
- ETH Denver 2026 Hackathon

## References

- Academic paper concepts: BLS signatures, TEE (Intel TDX), factory contracts
- Agent guidelines in `./agents/` directory
- ETH Denver 2026 eligibility criteria

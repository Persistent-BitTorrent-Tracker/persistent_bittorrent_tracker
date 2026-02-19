# Backend Tracker Server

This directory contains the Node.js + Express.js tracker server for the Persistent BitTorrent Tracker System (PBTS).

## Structure

- `routes/` - API endpoint handlers
  - `register.ts` - User registration endpoint
  - `report.ts` - Transfer receipt submission endpoint
  - `announce.ts` - Torrent announce endpoint (access control)
- `utils/` - Utility functions
  - `signatures.ts` - ECDSA signature verification
  - `contract.ts` - Smart contract interaction helpers
- `config/` - Configuration files
  - Network settings
  - Contract addresses
  - Environment variables

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Blockchain**: ethers.js v6 for contract interaction
- **Network**: Avalanche Fuji testnet

## Core Endpoints

### `POST /register`
- Verifies user signature
- Calls `ReputationTracker.register()` on-chain
- Returns registration status and initial credit

### `POST /report`
- Validates cryptographic receipt from receiver
- Verifies signature authenticity
- Updates on-chain reputation for both sender and receiver
- Prevents replay attacks via timestamp checking

### `POST /announce`
- Reads user reputation from contract
- Calculates upload/download ratio
- Enforces minimum ratio (e.g., 0.5)
- Returns peer list if authorized, empty list if blocked

## State Management

- **In-memory only**: Active swarms (which users are downloading which torrents)
- **No local database**: All persistent data lives on-chain
- **Stateless design**: Server can restart without losing reputation data

## Development Workflow

1. Set up environment variables (RPC URL, private key, contract address)
2. Implement endpoints in `routes/`
3. Write signature verification logic in `utils/signatures.ts`
4. Test each endpoint with Postman/curl
5. Test full flow: register → report → announce
6. Verify persistence: restart server, check reputation unchanged

## Security Considerations

- NEVER commit private keys or API keys
- Use environment variables for all secrets
- Validate all signatures before blockchain updates
- Check timestamp freshness to prevent replay attacks
- Rate limiting for production deployment

## References

- See `MVP_IMPLEMENTATION_PLAN.md` for detailed API specifications
- See `agents/security.md` for security best practices

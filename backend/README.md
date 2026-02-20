# Backend Tracker Server

This directory contains the Express.js tracker server for the Persistent BitTorrent Tracker System (PBTS).

## Structure

```
backend/
├── config/
│   └── index.ts          # Typed config loaded from environment variables
├── routes/
│   ├── register.ts       # POST /register
│   ├── report.ts         # POST /report
│   └── announce.ts       # POST /announce
├── utils/
│   ├── signatures.ts     # ECDSA signature verification helpers
│   └── contract.ts       # ethers.js wrappers for ReputationTracker & RepFactory
├── tests/
│   ├── setup.ts          # Jest environment setup (dummy env vars)
│   ├── api.test.ts       # Integration tests for all endpoints
│   └── signatures.test.ts
└── server.ts             # Express app + server entry point
```

## Technology Stack

- **Runtime**: Bun / Node.js 18+
- **Framework**: Express.js
- **Blockchain**: ethers.js v6
- **Network**: Avalanche Fuji testnet (chain ID 43113)

## Environment Variables

Copy `.env.example` from the repository root and fill in your values:

| Variable | Required | Description |
|---|---|---|
| `AVALANCHE_FUJI_RPC_URL` | Yes | JSON-RPC endpoint (default: Fuji public) |
| `DEPLOYER_PRIVATE_KEY` | Yes | Private key of the tracker wallet (pays gas) |
| `REPUTATION_TRACKER_ADDRESS` | Yes | Currently active `ReputationTracker` contract |
| `FACTORY_ADDRESS` | Yes | Deployed `RepFactory` contract (used during migration) |
| `ADMIN_SECRET` | Yes | Bearer token for the `/migrate` admin endpoint |
| `CHAIN_ID` | No | Chain ID (default: `43113`) |
| `PORT` | No | Server port (default: `3001`) |
| `MIN_RATIO` | No | Minimum upload/download ratio for access (default: `0.5`) |
| `TIMESTAMP_WINDOW_SECONDS` | No | Receipt freshness window in seconds (default: `300`) |

## API Endpoints

### `POST /register`

Register a new user on-chain.

**Request body**
```json
{
  "userAddress": "0x...",
  "message": "Register PBTS account: 0x...",
  "signature": "0x..."
}
```

**Responses**
- `201` — Registration successful; returns `txHash` and `initialCredit` (1 GiB)
- `400` — Missing fields or invalid address
- `401` — Invalid signature
- `409` — User already registered

---

### `POST /report`

Submit a cryptographic transfer receipt. Updates the sender's upload count and the receiver's download count on-chain.

**Request body**
```json
{
  "infohash": "0x...",
  "sender": "0x...",
  "receiver": "0x...",
  "pieceHash": "0x...",
  "pieceIndex": 0,
  "pieceSize": 262144,
  "timestamp": 1700000000,
  "signature": "0x..."
}
```

The `signature` must be the receiver's EIP-191 personal-sign over the ABI-packed receipt fields.

**Responses**
- `200` — Reputation updated; returns updated stats and tx hashes for both parties
- `400` — Validation failure (missing fields, stale timestamp, malformed signature)
- `401` — Signature not from receiver
- `404` — Sender or receiver not registered
- `409` — Duplicate receipt (replay attack)

---

### `POST /announce`

Request a peer list. Access is granted when the user's upload/download ratio meets `MIN_RATIO`.

**Request body**
```json
{
  "userAddress": "0x...",
  "infohash": "0x...",
  "event": "started",
  "message": "Announce started for 0x...",
  "signature": "0x..."
}
```

Valid `event` values: `started`, `stopped`, `completed`.

**Responses**
- `200` — Access granted; returns mock peer list and current reputation stats
- `403` — Ratio too low; returns upload deficit in MB
- `400` / `401` / `404` — Validation errors

---

### `POST /migrate` *(admin only)*

Deploy a new `ReputationTracker` via `RepFactory` with the current contract as its `referrer`. After migration, all existing reputation is readable through the new contract via single-hop delegation.

**Headers**
```
Authorization: Bearer <ADMIN_SECRET>
```

**Request body**
```json
{
  "oldContract": "0x..."
}
```

`oldContract` is optional — omitting it defaults to the currently configured `REPUTATION_TRACKER_ADDRESS`.

**Response**
```json
{
  "success": true,
  "oldContract": "0x...",
  "newContract": "0x...",
  "message": "New ReputationTracker deployed. Update REPUTATION_TRACKER_ADDRESS and restart the server."
}
```

After a successful migration, update `REPUTATION_TRACKER_ADDRESS` in your environment to the returned `newContract` address and restart the server.

---

### `GET /health`

Returns `{ "status": "ok", "timestamp": "..." }`. Used by load balancers and CI smoke tests.

---

## Running the Server

```bash
# Development (hot reload)
bun run dev

# Production
bun run start
```

## Running Tests

```bash
npm test
```

Tests mock all blockchain calls so no live node is needed.

## State Management

- **In-memory only**: Active swarms (which users are seeding which infohashes) and replay-attack deduplication
- **No local database**: All persistent reputation data lives on-chain
- **Stateless design**: Server can restart without losing any data

## Security Considerations

- Never commit private keys or API keys — use environment variables
- All user signatures are verified before any on-chain write
- Receipt timestamps are checked for freshness to prevent replay attacks
- The `/migrate` endpoint is protected by a secret bearer token


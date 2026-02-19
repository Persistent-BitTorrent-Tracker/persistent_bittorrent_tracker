# Persistent BitTorrent Tracker MVP Implementation Plan

## Problem Statement

Private BitTorrent trackers suffer from **three critical weaknesses**:

1. **Non-Portable Reputation**: Upload/download ratios are locked to specific trackers. When a tracker shuts down (legal action, technical failure, operator choice), users lose their contribution history permanently.

2. **Centralized Fragility**: Trackers are single points of failure for both reputation storage and peer discovery. No redundancy or recovery mechanism exists.

3. **Unverifiable Statistics**: Upload statistics are self-reported and easily manipulated. Detection relies on manual moderation after the fact.

## Solution Overview

The **Persistent BitTorrent Tracker System (PBTS)** addresses these weaknesses through:

1. **Blockchain-Based Reputation**: Smart contracts persist user reputation permanently, surviving tracker shutdowns and enabling migration.

2. **Cryptographic Attestation**: Downloading peers sign receipts for received pieces. Trackers verify and aggregate signatures before updating reputation on-chain.

3. **Decentralized Architecture**: Blockchain replaces centralized databases. Reputation persists across restarts, deployments, and operator changes.

## MVP Scope (4-Day Hackathon)

**Core Demonstration:**
- Users register via wallet signature → on-chain account creation
- Manual transfer simulation with cryptographic receipts → reputation updates
- Reputation-based access control → high reputation users get peer lists, low reputation users blocked
- Server restart demonstration → reputation persists via blockchain (no local database)

**Intentional Simplifications:**
- Manual transfer simulation (no real P2P integration)
- Single smart contract (no factory pattern or migration)
- Basic ECDSA signatures (no BLS aggregation)
- Simulated peer swarm (no real BitTorrent protocol)
- No TEE implementation (demonstrates concept without hardware requirements)

**Technology Stack:**
- **Smart Contracts**: Solidity + Hardhat (Avalanche Fuji testnet)
- **Backend**: Node.js + Express.js (tracker server)
- **Frontend**: React + Vite + TailwindCSS
- **Cryptography**: ECDSA (secp256k1) via ethers.js
- **Blockchain**: Avalanche Fuji testnet (fast finality, low fees)

---

## Core Architecture & Components

### 1. Smart Contract Layer (`ReputationTracker.sol`)

**Purpose**: Persistent, censorship-resistant reputation storage

**Core Functions**:
```solidity
// State structure per user
struct UserReputation {
    address publicKey;
    uint256 uploadBytes;
    uint256 downloadBytes;
    uint256 timestamp;
}

// Core operations
function register(address userKey) external returns (bool)
function updateReputation(address user, uint256 uploadDelta, uint256 downloadDelta) external onlyTracker
function getReputation(address user) external view returns (UserReputation memory)
function getRatio(address user) external view returns (uint256)
```

**Key Properties**:
- Single contract (no factory pattern for MVP)
- Only tracker server can write (access control via owner/role)
- Anyone can read reputation (public transparency)
- New users get initial upload credit (e.g., 1 GB) to bootstrap participation
- Deployed on Avalanche Fuji testnet (fast finality, low gas fees)

---

### 2. Backend Tracker Server (Node.js + Express)

**Purpose**: Verifies signatures, enforces access control, updates blockchain state

**Core Endpoints**:

**`POST /register`**
```javascript
// Input: { userAddress, signature, message }
// 1. Verify ECDSA signature
// 2. Check if user already registered (read from contract)
// 3. Call contract.register(userAddress) if new
// 4. Return success/failure
```

**`POST /report`**
```javascript
// Input: { sender, receiver, infohash, pieceHash, timestamp, signature }
// 1. Reconstruct signed message
// 2. Verify receiver's signature
// 3. Check timestamp freshness (prevent replay)
// 4. Update on-chain: sender.uploadBytes += pieceSize, receiver.downloadBytes += pieceSize
// 5. Return updated reputation
```

**`POST /announce`**
```javascript
// Input: { userAddress, infohash, event: "started"|"stopped"|"completed" }
// 1. Verify user signature
// 2. Read reputation from contract
// 3. Calculate ratio = uploadBytes / downloadBytes
// 4. If ratio < MIN_RATIO (e.g., 0.5), return empty peer list
// 5. Else, return simulated peer list (mock IPs/ports for demo)
```

**State Management**:
- In-memory swarm tracking (which users are downloading which torrents)
- No local database - all persistent data lives on-chain
- ethers.js for contract interaction

---

### 3. Cryptographic Receipt Protocol

**Receipt Structure**:
```javascript
{
  infohash: "0x...",          // Torrent identifier
  sender: "0x...",            // Uploader's address
  receiver: "0x...",          // Downloader's address
  pieceHash: "0x...",         // SHA-256 of piece content
  pieceIndex: 42,             // Position in file
  pieceSize: 262144,          // Bytes (256 KB typical)
  timestamp: 1708185600,      // Unix epoch
  signature: "0x..."          // Receiver's ECDSA signature over above fields
}
```

**Signing Process** (Client-Side):
```javascript
const message = ethers.utils.solidityKeccak256(
  ['bytes32', 'address', 'address', 'bytes32', 'uint256', 'uint256', 'uint256'],
  [infohash, sender, receiver, pieceHash, pieceIndex, pieceSize, timestamp]
);
const signature = await receiverWallet.signMessage(ethers.utils.arrayify(message));
```

**Verification** (Server-Side):
```javascript
const recoveredAddress = ethers.utils.verifyMessage(message, signature);
if (recoveredAddress !== receipt.receiver) throw new Error("Invalid signature");
```

**Security Properties**:
- Receiver cannot forge sender's identity
- Sender cannot inflate upload without receiver signature
- Timestamp prevents replay attacks
- Piece hash ensures data integrity

---

### 4. Frontend Dashboard (React + Vite + TailwindCSS)

**Components Structure**:
```
src/
├── components/
│   ├── WalletConnect.jsx      # MetaMask integration
│   ├── Registration.jsx        # Sign message → register on-chain
│   ├── Dashboard.jsx           # Display reputation, ratio, access status
│   ├── SimulateTransfer.jsx    # Manual receipt creation & submission
│   └── PeerList.jsx            # Display announce results
├── hooks/
│   ├── useWallet.js            # Wallet connection state
│   └── useContract.js          # Smart contract interaction
└── utils/
    ├── signatures.js           # ECDSA signing helpers
    └── api.js                  # Backend API calls
```

**Key User Interactions**:
1. Connect MetaMask wallet
2. Switch to Avalanche Fuji network (automatic prompt)
3. Register account (sign message → backend → contract)
4. View current reputation (upload/download/ratio)
5. Simulate transfers (create receipt → submit → watch reputation update)
6. Announce torrent (get peer list or blocked message)

---

## Detailed User Flows

### Flow 1: New User Registration

**Objective**: Create on-chain account with initial upload credit

```
[User] → Clicks "Connect Wallet"
    ↓
[Frontend] → Detects MetaMask, requests account access
    ↓
[MetaMask] → User approves connection
    ↓
[Frontend] → Checks network, prompts to switch to Fuji if needed
    ↓
[User] → Clicks "Register Account"
    ↓
[Frontend] → Constructs message: "Register PBTS account: ${address}"
    ↓
[MetaMask] → User signs message (no gas, off-chain signature)
    ↓
[Frontend] → POST /register { address, signature, message }
    ↓
[Backend] → Verifies signature via ethers.utils.verifyMessage()
           → Checks contract: user already registered?
           → If not: calls contract.register(address) [gas paid by server]
           → Returns: { success: true, initialCredit: 1073741824 }
    ↓
[Smart Contract] → Emits UserRegistered(address, timestamp)
                  → Stores: users[address] = { upload: 1GB, download: 0, ... }
    ↓
[Frontend] → Displays success: "Registered! Initial credit: 1 GB"
            → Redirects to dashboard
```

**Success Criteria**:
- User has on-chain account
- Initial upload credit (1 GB) allows immediate downloading
- No upfront payment required (server pays gas)

---

### Flow 2: Simulated Transfer & Reputation Update

**Objective**: Demonstrate cryptographic receipt creation and on-chain reputation update

```
[User] → On dashboard, clicks "Simulate Transfer"
    ↓
[Frontend] → Opens modal:
           - Sender address: [current user]
           - Receiver address: [select from dropdown or paste]
           - Infohash: [pre-filled mock torrent ID]
           - Piece size: [slider: 256KB / 512KB / 1MB / 2MB]
    ↓
[User] → Selects receiver (e.g., another test account), sets piece size 1MB
        → Clicks "Generate Receipt"
    ↓
[Frontend] → Creates receipt object with current timestamp
           → Hashes receipt fields: keccak256(infohash, sender, receiver, pieceHash, ...)
           → Prompts MetaMask signature
    ↓
[MetaMask] → User signs message
    ↓
[Frontend] → Displays preview:
           "Transfer: 1 MB from ${sender} to ${receiver}
            Signature: 0xabc...def
            Click 'Submit' to update reputation on-chain"
    ↓
[User] → Clicks "Submit to Tracker"
    ↓
[Frontend] → POST /report { receipt with signature }
    ↓
[Backend] → Reconstructs message hash
           → Verifies signature: recoveredAddr === receipt.receiver?
           → Checks timestamp (within last 5 minutes? not seen before?)
           → Calls contract.updateReputation(sender, +1MB, 0)
           → Calls contract.updateReputation(receiver, 0, +1MB)
           → Returns: { 
               senderRatio: 2.5, 
               receiverRatio: 0.8,
               txHash: "0x..." 
             }
    ↓
[Smart Contract] → Updates storage:
                    users[sender].uploadBytes += 1048576
                    users[receiver].downloadBytes += 1048576
                  → Emits TransferRecorded(sender, receiver, bytes, timestamp)
    ↓
[Frontend] → Displays success notification:
           "Transfer recorded! Transaction: 0x...
            Your new ratio: 2.5 (upload: 5 GB, download: 2 GB)"
           → Refreshes dashboard with new reputation
```

**Success Criteria**:
- Receipt cryptographically links sender and receiver
- On-chain state updated atomically
- Reputation survives server restart (no local database)

---

### Flow 3: Torrent Announce (Access Control)

**Objective**: Demonstrate reputation-based access control (high ratio → peers, low ratio → blocked)

**Scenario A: High Reputation User (Ratio ≥ 0.5)**
```
[User] → Navigates to "Download Torrent" page
        → Enters mock infohash: "0xabc123..."
        → Clicks "Announce"
    ↓
[Frontend] → Signs announce message with MetaMask
           → POST /announce { address, infohash, event: "started", signature }
    ↓
[Backend] → Verifies signature
           → Reads contract.getReputation(address)
           → Calculates ratio: 5GB upload / 2GB download = 2.5
           → 2.5 ≥ 0.5 (MIN_RATIO) → ACCESS GRANTED
           → Returns: {
               status: "allowed",
               peers: [
                 { ip: "192.0.2.1", port: 6881 },
                 { ip: "192.0.2.2", port: 6882 },
                 { ip: "192.0.2.3", port: 6883 }
               ],
               ratio: 2.5,
               message: "Access granted. Happy seeding!"
             }
    ↓
[Frontend] → Displays: 
           "Access Granted
            Your ratio: 2.5 (Excellent standing!)
            Connected peers: 3
            [List of peer IPs]"
```

**Scenario B: Low Reputation User (Ratio < 0.5)**
```
[User] → Same announce flow
    ↓
[Backend] → Reads reputation: 100MB upload / 1GB download = 0.1
           → 0.1 < 0.5 (MIN_RATIO) → ACCESS DENIED
           → Returns: {
               status: "blocked",
               peers: [],
               ratio: 0.1,
               message: "Insufficient ratio. Upload more to regain access."
             }
    ↓
[Frontend] → Displays:
           "Access Denied
            Your ratio: 0.1 (Below minimum 0.5)
            You need to upload 400 MB more to download.
            Try seeding existing torrents to improve your ratio."
```

**Success Criteria**:
- Access control enforced entirely by on-chain reputation
- No centralized database or manual moderation
- Clear feedback to users about their standing

---

### Flow 4: Persistence Demonstration

**Objective**: Prove reputation survives tracker restart (blockchain as source of truth)

```
[Demo Setup] → User registers, simulates several transfers
              → Dashboard shows: ratio 1.8, upload 3.6GB, download 2GB
    ↓
[Presenter] → Opens terminal, runs: `pkill -f "node server.js"`
           → Shows server process stopped
           → Refreshes frontend: "Cannot connect to server"
    ↓
[Presenter] → Explains: "Server is down. In traditional trackers, all reputation data is lost."
           → Restarts server: `node server.js`
           → Server logs: "Connected to Fuji testnet at block 12345678"
    ↓
[Frontend] → Auto-reconnects, fetches reputation from contract
           → Displays: ratio 1.8, upload 3.6GB, download 2GB
           → **EXACT SAME VALUES** (no data loss)
    ↓
[Presenter] → "Reputation persisted! No database, no backups needed.
              The blockchain guarantees users never lose their contribution history,
              even if trackers shut down permanently."
```

**Success Criteria**:
- Zero local state in server (no SQLite, no files)
- Reputation identical before/after restart
- Demonstrates censorship resistance (tracker operator cannot erase history)

---

## Development Workflow (4-Day Plan)

### Day 1: Foundation (Smart Contract + Local Testing)

**Morning (3 hours)**:
- Initialize Hardhat project with TypeScript
- Write `ReputationTracker.sol` contract
- Write deployment script for local network
- Write unit tests (registration, reputation updates, access control)

**Afternoon (4 hours)**:
- Deploy to local Hardhat node
- Test contract interactions via Hardhat console
- Configure Fuji testnet in `hardhat.config.ts`
- Deploy to Fuji, verify on Snowtrace explorer
- Store contract address for backend integration

**Success Metrics**:
- All contract tests pass locally
- Contract deployed and verified on Fuji
- Can call contract functions via ethers.js

---

### Day 2: Backend Server + API Testing

**Morning (3 hours)**:
- Set up Express.js server with TypeScript
- Implement `/register` endpoint with signature verification
- Implement `/report` endpoint with receipt validation
- Connect backend to Fuji contract via ethers.js

**Afternoon (4 hours)**:
- Implement `/announce` endpoint with reputation checking
- Write API tests with Postman/curl
- Test full flow: register → report transfer → announce
- Handle error cases (invalid signatures, low reputation, etc.)

**Success Metrics**:
- All endpoints functional and tested
- Backend successfully updates contract state
- Reputation persists across server restarts

---

### Day 3: Frontend Dashboard + Integration

**Morning (3 hours)**:
- Create React app with Vite + TailwindCSS
- Implement wallet connection (MetaMask + Fuji network switch)
- Build registration component (sign message → API call)
- Build dashboard component (fetch and display reputation)

**Afternoon (4 hours)**:
- Build "Simulate Transfer" component (receipt creation + signing)
- Build "Announce" component (torrent access + peer list)
- Connect frontend to backend API
- Test end-to-end flows with real wallet

**Success Metrics**:
- Smooth UX for wallet connection
- All user flows work end-to-end
- UI updates reflect on-chain state changes

---

### Day 4: Polish + Demo Preparation

**Morning (3 hours)**:
- UI/UX polish (loading states, error messages, animations)
- Add ratio visualization (progress bars, color coding)
- Create demo scenario scripts (pre-registered users, test data)
- Test persistence demo (kill/restart server)

**Afternoon (4 hours)**:
- Record 3-5 minute demo video
- Prepare presentation slides:
  - Problem: 3 weaknesses of private trackers
  - Solution: PBTS architecture
  - Demo: Live walkthrough of key flows
  - Impact: Censorship resistance + reputation portability
- Final testing and bug fixes
- Deploy frontend to Vercel/Netlify

**Success Metrics**:
- Polished demo ready for judges
- All critical flows work reliably
- Video and slides finalized

---

## Feature Prioritization

### Must-Have (Core MVP)
Smart contract deployment on Fuji
User registration with wallet signature
Manual transfer simulation with cryptographic receipts
On-chain reputation updates (upload/download counters)
Reputation-based access control (announce endpoint)
Dashboard displaying ratio and access status
Persistence demonstration (restart server, data intact)

### Nice-to-Have (Time Permitting)
Multiple pre-registered demo accounts
Transfer history view (list of past receipts)
Ratio visualization (charts/graphs)
Gas cost estimation and display
Error handling with user-friendly messages
Mobile-responsive UI

### Post-Hackathon (Not in MVP)
Real BitTorrent protocol integration
Actual P2P file transfers
BLS signature aggregation
Factory contract for tracker migration
TEE implementation (Intel TDX)
Authenticated DHT fallback
Multi-torrent swarm management
Advanced reputation formulas (time decay, bonus credits)
Security audits and formal verification

---

## Testing Strategy

### Unit Tests (Contract)
```javascript
describe("ReputationTracker", () => {
  it("should register new user with initial credit");
  it("should reject duplicate registration");
  it("should update upload/download counters");
  it("should calculate ratio correctly");
  it("should enforce access control (only tracker can write)");
});
```

### Integration Tests (Backend)
```javascript
describe("API Endpoints", () => {
  it("POST /register: valid signature → contract write");
  it("POST /register: invalid signature → reject");
  it("POST /report: valid receipt → update both users");
  it("POST /announce: high ratio → return peers");
  it("POST /announce: low ratio → block access");
});
```

### End-to-End Tests (Manual)
1. Register user via MetaMask → verify on-chain account
2. Simulate transfer → verify reputation update on Snowtrace
3. Announce with high ratio → receive peer list
4. Announce with low ratio → blocked
5. Restart server → verify reputation unchanged
6. Simulate 5+ transfers → verify cumulative updates

---

## Risk Mitigation

### Technical Risks

**Risk**: Fuji testnet congestion during hackathon
**Mitigation**: Deploy early (Day 1), test gas prices, have local Hardhat fallback

**Risk**: MetaMask connection issues (network not found, RPC errors)
**Mitigation**: Provide clear setup instructions, auto-detect and prompt network addition

**Risk**: Signature verification bugs (nonce issues, message formatting)
**Mitigation**: Test signature flows early, use standard ethers.js patterns, log all verification steps

**Risk**: Contract out of gas (complex operations exceed block limit)
**Mitigation**: Keep contract logic simple, batch updates if needed, monitor gas usage

**Risk**: Frontend-backend-contract integration failures
**Mitigation**: Test each integration point in isolation first, use mock data for frontend development

### Timeline Risks

**Risk**: Scope creep (trying to implement too many features)
**Mitigation**: Ruthlessly prioritize MVP features, defer nice-to-haves, focus on demo quality

**Risk**: Debugging eats into development time
**Mitigation**: Use robust logging, test incrementally, isolate components, don't integrate until parts work

**Risk**: Last-minute bugs before presentation
**Mitigation**: Freeze code 6 hours before demo, use recorded video as fallback, prepare backup demo script

---

## Demo Presentation (3-5 Minutes)

### Act 1: The Problem (60 seconds)
*Show slide with OiNK tracker shutdown news*
- "In 2007, police shut down OiNK, one of the world's largest music trackers"
- "Users lost years of upload history overnight"
- "Private trackers have 3 critical weaknesses: reputation isn't portable, servers are single points of failure, and uploads are unverifiable"

### Act 2: The Solution (60 seconds)
*Show architecture diagram*
- "We store reputation in smart contracts, not databases"
- "Downloaders sign cryptographic receipts, eliminating fake uploads"
- "When trackers die, reputation lives on-chain forever"

### Act 3: Live Demo (180 seconds)
*Screen recording + live interaction*
1. "Watch me register with just a wallet signature" → MetaMask popup → on-chain confirmation (30s)
2. "I'll simulate a 1MB transfer" → create receipt → sign → submit → reputation updates in real-time (45s)
3. "My ratio is 2.5, so I get access" → announce → receive peer list (30s)
4. "Now watch this: I kill the server" → terminal shutdown → restart → "Reputation intact!" (45s)
5. "Low ratio user tries to download" → blocked message → "Access control enforced by blockchain" (30s)

### Act 4: Impact (30 seconds)
- "PBTS makes private trackers censorship-resistant"
- "Reputation survives shutdowns, moves between communities"
- "No more lost contribution history. Ever."
- *Show GitHub repo QR code*

---

## Success Criteria

### Technical Validation
Smart contract deployed and verified on Fuji testnet
All user flows (register, transfer, announce) functional
Cryptographic receipts verified correctly
Reputation persists across server restarts
Access control enforced by on-chain data

### Demo Quality
3-5 minute video recorded and polished
All components work reliably in live demo
UI is clean and intuitive
Presentation slides clearly explain problem/solution

### Team Execution
MVP completed within 4-day timeline
Code committed to GitHub with documentation
Deployed frontend accessible via public URL
Contract address and Snowtrace links available

---

## Post-Hackathon Roadmap

### Phase 2: Real P2P Integration (2-3 weeks)
- Integrate WebTorrent client library
- Hook receipt generation into piece transfer events
- Implement actual peer discovery and data exchange
- Test with small files (10-100 MB)

### Phase 3: Advanced Features (1-2 months)
- Factory contract pattern for tracker migration
- BLS signature aggregation for efficiency
- Authenticated DHT fallback (tracker-less operation)
- Time-weighted reputation formulas

### Phase 4: Production Hardening (2-3 months)
- Security audit and formal verification
- TEE implementation (Intel TDX) for tracker integrity
- Multi-chain deployment (Ethereum, Polygon, Arbitrum)
- Mobile app development

---

## Getting Started

### Prerequisites
```bash
# Install Node.js 18+
node --version  # v18.0.0+

# Install Hardhat
npm install -g hardhat

# Install MetaMask browser extension
# Add Avalanche Fuji testnet (auto-prompt in app)
```

### Quick Start (Day 1)
```bash
# Clone repo
git clone https://github.com/your-org/pbts-mvp
cd pbts-mvp

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to Fuji
npx hardhat run scripts/deploy.ts --network fuji
```

### Project Structure
```
pbts-mvp/
├── contracts/
│   └── ReputationTracker.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── ReputationTracker.test.ts
├── server/
│   ├── server.ts
│   ├── routes/
│   │   ├── register.ts
│   │   ├── report.ts
│   │   └── announce.ts
│   └── utils/
│       └── signatures.ts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
└── README.md
```

---

**This MVP demonstrates the core innovations of the PBTS paper—persistent reputation, cryptographic attestation, and censorship resistance—in a format achievable within a 4-day hackathon while maintaining clarity for judges and potential users.**
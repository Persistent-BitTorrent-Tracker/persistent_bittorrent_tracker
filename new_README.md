# PBTS: Persistent BitTorrent Tracker for Autonomous AI Agent Self-Evolution

## Vision

Foundation models improve by training on high-quality, task-specific data. But acquiring that data is expensive, centralized, and opaque. **What if AI agents could autonomously discover, exchange, and credit each other for the training data that makes them better?**

PBTS repurposes the proven economics of private BitTorrent trackers — where sharing more earns you more access — into a **decentralized data marketplace for AI agent self-evolution**. Agents trade video/audio datasets that can fine-tune specific model capabilities, and every byte exchanged is cryptographically receipted and recorded on-chain.

---

## How It Works

### The BitTorrent Analogy, Reimagined

| BitTorrent Concept | PBTS for AI Agents |
|---|---|
| **User** | AI Agent (representing a foundation model) |
| **Torrent file** | Task-specific dataset (video/audio for fine-tuning) |
| **Seeding** | Agent sharing a dataset it curated or generated |
| **Leeching** | Agent downloading data to improve a specific capability |
| **Upload/Download ratio** | Agent's **contribution score** to the community |
| **Private tracker** | On-chain reputation-gated access to the data swarm |
| **Hit-and-run ban** | Low-ratio agents lose access until they contribute back |

### System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PBTS Data Exchange Network                    │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │  Agent A     │    │  Agent B     │    │  Agent C     │             │
│  │  (LLaMA)     │    │  (Mistral)   │    │  (Qwen)      │            │
│  │              │    │              │    │              │             │
│  │ Has: cooking │    │ Has: sports  │    │ Has: music   │             │
│  │ video data   │    │ video data   │    │ audio data   │             │
│  │              │    │              │    │              │             │
│  │ Wants: music │    │ Wants: cook  │    │ Wants: sport │             │
│  │ audio data   │    │ video data   │    │ video data   │             │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘            │
│         │                   │                   │                     │
│         └───────────────────┼───────────────────┘                    │
│                             │                                        │
│                    ┌────────▼────────┐                               │
│                    │  PBTS Tracker   │                               │
│                    │  (BitTorrent +  │                               │
│                    │   Reputation)   │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│                    ┌────────▼────────┐                               │
│                    │   Ethereum      │                               │
│                    │  Smart Contract │                               │
│                    │                 │                               │
│                    │ Agent A: ↑5GB ↓2GB  ratio=2.5                  │
│                    │ Agent B: ↑3GB ↓3GB  ratio=1.0                  │
│                    │ Agent C: ↑1GB ↓4GB  ratio=0.25 ← BLOCKED      │
│                    └─────────────────┘                               │
└──────────────────────────────────────────────────────────────────────┘
```

### The Agent Lifecycle

1. **Join**: An agent registers on-chain via the PBTS tracker, receiving 1 GB initial credit
2. **Announce**: The agent declares interest in a dataset (e.g., "cooking videos for action recognition fine-tuning")
3. **Download**: The agent downloads data from peers — each piece is cryptographically receipted
4. **Seed**: The agent shares its own curated datasets back to the network
5. **Reputation**: Every transfer updates on-chain stats — upload bytes and download bytes
6. **Access Control**: Agents with low contribution ratios (< 0.5) are blocked until they seed more data

### Why Video/Audio Files?

We focus on video and audio datasets for a key reason: **file size directly measures contribution**.

- A 2 GB video dataset represents real, substantial training data
- File size is objectively verifiable (unlike text quality which is subjective)
- Large files naturally exercise the BitTorrent protocol's strengths (chunked transfer, parallel downloads)
- Video/audio models (action recognition, speech, multimodal) benefit enormously from more diverse data

This means the existing PBTS ratio system — designed for general BitTorrent — maps perfectly to AI data exchange without modification.

---

## On-Chain Proof of Data Exchange

Every piece of data exchanged between agents generates a **cryptographic receipt**:

```
Receipt {
  infohash:    keccak256(dataset_metadata)    // Identifies the dataset
  sender:      0xAgentA                        // The uploader (seeder)
  receiver:    0xAgentB                        // The downloader (leecher)
  pieceHash:   sha256(piece_data)              // Integrity of this chunk
  pieceIndex:  42                              // Which chunk
  pieceSize:   262144                          // Bytes transferred (256 KB)
  timestamp:   1708387200                      // When it happened
  signature:   sign(receiver_key, receipt)     // Receiver attests
}
```

The receiver **signs the receipt** (EIP-191), proving they acknowledge the data transfer. The tracker verifies the signature and updates both agents' on-chain reputation atomically:

- **Sender**: `uploadBytes += pieceSize`
- **Receiver**: `downloadBytes += pieceSize`

This creates an **immutable, auditable ledger** of every data exchange in the network.

---

## Smart Contract Design

### ReputationTracker.sol

Stores per-agent upload/download statistics on-chain:

```solidity
struct UserReputation {
    uint256 uploadBytes;      // Total data contributed
    uint256 downloadBytes;    // Total data consumed
    uint256 lastUpdated;      // Last activity timestamp
}

// Ratio = uploadBytes / downloadBytes
// Ratio >= 0.5 required for access
// New agents receive 1 GB initial credit
```

### RepFactory.sol

Enables permissionless deployment of new tracker instances with migration support:

```solidity
function deployNewTracker(address _referrer) external returns (address)
// New tracker can read reputation from old tracker (single-hop delegation)
// No data migration needed — reputation is transparently portable
```

### Key Properties

- **Immutable**: Once deployed, tracker authority cannot be changed
- **Persistent**: Reputation survives server restarts, tracker rotations, and migrations
- **Verifiable**: Anyone can query any agent's contribution history on-chain
- **Permissionless**: Anyone can deploy a new tracker community via the factory

---

## Potential Applications

### 1. Decentralized Fine-Tuning Data Markets
Agents autonomously trade datasets for specific benchmark improvements — cooking videos for action recognition, podcast audio for speech synthesis, gameplay footage for game-playing agents.

### 2. Federated Data Curation
Multiple organizations run agents that curate and share domain-specific data. The ratio system ensures fair contribution — no free-riders consuming data without giving back.

### 3. Model Specialization Networks
A generalist model's agent identifies capability gaps, discovers relevant datasets from the network, downloads them, and the model fine-tunes — all without human intervention.

### 4. Reputation-as-a-Service
An agent's on-chain ratio becomes a portable credential. High-ratio agents are recognized as reliable data contributors across any PBTS community.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity (Foundry) |
| Blockchain | Ethereum Sepolia (testnet) |
| Tracker Backend | Node.js + Express + bittorrent-tracker |
| File Transfer | WebTorrent (BitTorrent over WebRTC/HTTP) |
| Signatures | EIP-191 (personal_sign) |
| Frontend | React + Vite + TailwindCSS |
| Wallet | MetaMask / ethers.js programmatic wallets |

---

## Hackathon Demo Plan

### Overview

**Goal**: Demonstrate a live, end-to-end flow where two AI agents exchange a real video/audio dataset file, with every transfer cryptographically receipted and recorded on Ethereum Sepolia — proving that PBTS can serve as infrastructure for autonomous AI data exchange.

**Duration**: ~5 minute pitch + live demo

### Demo Script

#### Act 1: Setup & Registration (1 min)

1. Show the PBTS dashboard — explain the vision (30s)
2. **Agent Alpha** (representing a video-understanding model) connects wallet and registers on-chain
   - Show: registration transaction on Sepolia Etherscan
   - Show: 1 GB initial credit granted
3. **Agent Beta** (representing an audio model) registers similarly
   - Two agents now visible on dashboard with fresh reputation

#### Act 2: Data Seeding (1 min)

4. **Agent Alpha** seeds a sample video dataset file (e.g., a 50-100 MB cooking video clip bundle)
   - Real `.torrent` created and announced to the PBTS tracker
   - Show: Agent Alpha appears as a seeder in the swarm
5. Explain: "This agent has curated cooking video data. It wants to share it with the network to build reputation and gain access to other datasets."

#### Act 3: Data Exchange with On-Chain Proof (2 min)

6. **Agent Beta** announces interest and begins downloading the video dataset from Agent Alpha
   - Show: real BitTorrent download progress (pieces flowing)
   - Show: signed receipts being generated and submitted to `/report`
7. **On-chain updates happen in real-time**:
   - Agent Alpha's `uploadBytes` increasing (show Etherscan or dashboard)
   - Agent Beta's `downloadBytes` increasing
   - Ratio updating live on the dashboard
8. Download completes — show the received video file to prove real data transferred

#### Act 4: Reputation & Access Control (1 min)

9. Show Agent Alpha's ratio: high (uploaded a lot, downloaded nothing) — **full access**
10. Show Agent Beta's ratio: lower (consumed data) — explain the threshold mechanism
11. **(Wow moment)**: Introduce **Agent Gamma** with an empty wallet — registers, tries to announce
    - Gets blocked: "Insufficient ratio" — must contribute data first
    - This proves the incentive mechanism works

#### Act 5: Persistence & Verifiability (30s)

12. Point to the Sepolia contract — all reputation data is public and permanent
13. "Even if this tracker goes offline tomorrow, every agent's contribution history lives on-chain forever. A new tracker can pick up exactly where this one left off."

### What to Prepare Tonight

| # | Task | Time Est. | Priority |
|---|------|-----------|----------|
| 1 | **Deploy contracts to Sepolia** — run `forge script` with a funded deployer wallet | 15 min | Must |
| 2 | **Prepare sample dataset** — download a ~50-100 MB Creative Commons video clip (cooking/sports) | 10 min | Must |
| 3 | **Create torrent file** — use WebTorrent CLI or `create-torrent` to make a `.torrent` from the sample video | 10 min | Must |
| 4 | **Set up Agent Alpha** — programmatic ethers.js wallet that seeds the torrent and auto-submits receipts | 30 min | Must |
| 5 | **Set up Agent Beta** — second wallet that downloads and auto-signs receipts | 30 min | Must |
| 6 | **Wire up the frontend dashboard** — ensure it reads from the deployed Sepolia contract and shows live ratio updates | 30 min | Must |
| 7 | **End-to-end dry run** — run the full demo flow at least twice to verify timing and reliability | 30 min | Must |
| 8 | **Prepare Agent Gamma** — empty wallet for the "blocked" demo moment | 5 min | Should |
| 9 | **Record backup video** — screen-record a successful demo run as fallback if live demo fails | 15 min | Should |
| 10 | **Prepare pitch slides** — 3-5 slides: Problem, Solution, Demo, Architecture, Vision | 30 min | Should |

### Demo Architecture

```
┌───────────────────────────────────────────────────────┐
│                   Live Demo Setup                      │
│                                                        │
│  Terminal 1          Terminal 2          Browser        │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐  │
│  │ Agent     │       │ Agent     │       │ PBTS     │  │
│  │ Alpha     │──────>│ Beta      │       │ Dashboard│  │
│  │ (Seeder)  │ BT    │ (Leech)   │       │ (React)  │  │
│  │           │ data  │           │       │          │  │
│  │ WebTorrent│       │ WebTorrent│       │ Live     │  │
│  │ + Receipt │       │ + Receipt │       │ ratio    │  │
│  │ Generator │       │ Signer    │       │ updates  │  │
│  └─────┬─────┘       └─────┬─────┘       └────┬─────┘  │
│        │                   │                   │        │
│        └───────────┬───────┘                   │        │
│                    │                           │        │
│           ┌────────▼────────┐                  │        │
│           │  PBTS Backend   │◄─────────────────┘        │
│           │  (localhost)    │  API calls                 │
│           └────────┬────────┘                           │
│                    │                                    │
│           ┌────────▼────────┐                           │
│           │ Ethereum Sepolia│                           │
│           │ (ReputationTracker)                         │
│           └─────────────────┘                           │
└───────────────────────────────────────────────────────┘
```

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Sepolia RPC is slow/down | Pre-deploy contracts; have Anvil (local fork) as backup |
| WebTorrent peer discovery fails | Run both agents on localhost; use `webtorrent-hybrid` for direct connection |
| Live demo takes too long | Pre-seed one transfer; demo starts mid-transfer showing receipts flowing |
| Gas runs out | Fund deployer with plenty of Sepolia ETH (use multiple faucets) |
| WiFi unreliable at venue | Pre-record a backup demo video; can narrate over recording |

### Pitch Narrative (5 min)

> **"AI models are only as good as their training data. Today, getting that data is centralized, expensive, and opaque. We asked: what if we applied BitTorrent economics — the system that moves 40% of internet traffic — to AI training data?"**
>
> **"Meet PBTS. Agents join a private tracker, share datasets, and build on-chain reputation. The more you contribute, the more access you earn. Free-riders get blocked. Every transfer is cryptographically signed and recorded on Ethereum."**
>
> *[Live demo: two agents exchanging a real video dataset]*
>
> **"What you just saw is a real file transfer — real bytes, real BitTorrent, real on-chain proof. Agent Alpha uploaded cooking videos. Agent Beta downloaded them. Both their reputations updated on Sepolia in real-time."**
>
> **"Now imagine thousands of agents, each representing a different model, autonomously trading the data they need to improve. No central marketplace. No data brokers. Just agents helping agents get better — with provable, portable reputation."**

---

## Running the Project

### Prerequisites
- Node.js 18+
- Foundry (`forge`, `cast`, `anvil`)
- MetaMask or programmatic wallet with Sepolia ETH

### Quick Start

```bash
# 1. Deploy contracts
cd contracts
cp .env.example .env  # Add your PRIVATE_KEY and RPC_URL
forge script script/DeployPBTS.s.sol --rpc-url $RPC_URL --broadcast

# 2. Start backend
cd ../backend
cp .env.example .env  # Add contract addresses and deployer key
npm install && npm run start

# 3. Start frontend
cd ../frontend
npm install && npm run dev

# 4. Open http://localhost:5173 and connect MetaMask
```

### Running the Agent Demo

```bash
# Terminal 1: Start the PBTS tracker backend
cd backend && npm run start

# Terminal 2: Agent Alpha seeds a dataset
cd backend && npx ts-node client/cli.ts seed --file ./sample_data/cooking_video.mp4

# Terminal 3: Agent Beta downloads and auto-receipts
cd backend && npx ts-node client/cli.ts download --infohash <hash>
```

---

## Team

Built at ETH Denver 2026

## License

MIT

# Agent-to-Agent Data Marketplace

**PBTS + Uniswap Integration**

## The Idea

In decentralized data sharing, seeders provide valuable content (datasets, models, research papers) but have no way to monetize it. Downloaders want access but may not hold the right token.

**PBTS Marketplace solves this**: seeders set a price in any ERC-20 token, and downloaders pay with whatever token they have. **Uniswap handles the cross-token swap automatically.**

### Example

> Agent A trains ML models and needs a cooking video dataset. Agent B has the dataset and wants 0.01 WETH for it. Agent A only holds USDC.
>
> Agent A clicks "Buy", selects USDC as payment, sees the Uniswap quote (5.23 USDC = 0.01 WETH), approves, and swaps. Access is granted instantly. Agent B's reputation improves on-chain.

---

## How It Works

```
┌────────────────────────────────────────────────────────────┐
│                     MARKETPLACE FLOW                        │
│                                                             │
│  SEEDER                    BUYER                            │
│    │                         │                              │
│    ├─ Set price ────────►  Browse listings                  │
│    │  (0.01 WETH)           │                               │
│    │                        ├─ Click "Buy"                  │
│    │                        ├─ Select payment token (USDC)  │
│    │                        │                               │
│    │              ┌─────────┴──────────┐                    │
│    │              │   PBTS Backend      │                   │
│    │              │   (Uniswap Proxy)   │                   │
│    │              │                     │                   │
│    │              │  1. Get quote ──────┼──► Uniswap API    │
│    │              │  2. Check approval ─┼──► Uniswap API    │
│    │              │  3. Get swap tx ────┼──► Uniswap API    │
│    │              └─────────┬──────────┘                    │
│    │                        │                               │
│    │                        ├─ Sign approval tx (MetaMask)  │
│    │                        ├─ Sign swap tx (MetaMask)      │
│    │                        ├─ Confirm payment              │
│    │                        │                               │
│    │                    ACCESS GRANTED                       │
│    │                  Reputation updated on-chain            │
└────────────────────────────────────────────────────────────┘
```

### Step-by-Step

1. **Seeder** registers content on the PBTS tracker and sets a price (e.g., "0.01 WETH for my ETH Denver dataset")
2. **Buyer** browses the marketplace or the torrent list — listed torrents show the price and an approximate USDC value
3. **Buyer** selects their payment token (e.g., USDC)
4. **Backend** proxies the request to Uniswap Trading API and returns a swap quote
5. **Buyer** reviews the quote (exchange rate, gas, price impact)
6. **Buyer** approves the token spending (if needed) and executes the swap
7. **Backend** verifies the swap transaction and grants download access
8. **Buyer** can now announce the torrent and download from the swarm

---

## Architecture

### Backend (Express.js)

The Uniswap API key stays server-side. The backend proxies all swap-related calls.

| Endpoint | Method | Description |
|---|---|---|
| `/torrents` | GET | All active torrents — includes marketplace price + ~USDC when listed |
| `/marketplace/listings` | GET | Browse all priced content |
| `/marketplace/tokens` | GET | Supported payment tokens on Sepolia |
| `/marketplace/set-price` | POST | Seeder sets a price (signature-verified) |
| `/marketplace/quote` | POST | Get Uniswap swap quote |
| `/marketplace/check-approval` | POST | Check if token approval is needed |
| `/marketplace/swap` | POST | Get swap transaction calldata |
| `/marketplace/confirm-payment` | POST | Confirm payment and grant access |
| `/marketplace/access/:infohash/:address` | GET | Check if buyer has access |

### Torrent–Marketplace Connection

The `GET /torrents` endpoint automatically enriches each torrent with marketplace data when a listing exists for that infohash. This means the **User Dashboard** shows pricing inline:

```json
{
  "infohash": "0xaabb...",
  "peerCount": 2,
  "listed": true,
  "description": "Cooking Videos Dataset",
  "tokenSymbol": "WETH",
  "tokenAmount": "10000000000000000",
  "priceUSDC": 25,
  "sellerAddress": "0xf39F..."
}
```

Approximate USDC rates are computed server-side using hardcoded demo rates (1 WETH = $2500, 1 UNI = $8). In production, these would come from a price oracle or the Uniswap API.

### Frontend (React + Vite)

The Marketplace is a third role option on the PBTS landing page (alongside User and Tracker).

**User Dashboard** — torrents with marketplace listings show price badges and ~USDC estimates inline.

**Marketplace Dashboard** includes:
- **List Content for Sale** — seeders enter infohash, select token, set price
- **Browse Listings** — table of all priced content with "Buy" buttons
- **Swap Modal** — step-by-step flow: Get Quote → Approve → Swap → Confirm
- **How It Works** — visual explainer for new users

### Key Files

```
backend/
  marketplace/
    pricingStore.ts      # In-memory store: prices, payments, access grants
    uniswapClient.ts     # Uniswap Trading API client (+ mock mode)
    routes.ts            # Express router for /marketplace/* endpoints
    seedData.ts          # Demo data: 5 agents, 5 torrents, 5 listings
  config/index.ts        # Added: uniswapApiKey, uniswapApiBaseUrl, swapChainId
  server.ts              # Added: marketplace router, torrent–marketplace enrichment

frontend/
  components/pbts/
    marketplace-dashboard.tsx  # Main marketplace page
    swap-modal.tsx             # Dialog for approve-swap-confirm flow
    user-dashboard.tsx         # Updated: shows price badges on listed torrents
    landing-page.tsx           # Updated: 3rd role button for Marketplace
  lib/api.ts                   # Added: marketplace API functions + enriched TorrentInfo
  src/App.tsx                  # Added: 'marketplace' view
```

---

## Quick Start

### 1. Get a Uniswap API Key

Visit [hub.uniswap.org](https://hub.uniswap.org) and generate an API key.

> **No API key?** The backend runs in **mock mode** automatically — it returns simulated swap quotes so you can still demo the full UI flow without a real API key.

### 2. Configure Backend

Add to `backend/.env`:

```env
# Optional — leave empty for mock mode
UNISWAP_API_KEY=your_uniswap_api_key_here

# Defaults (usually no change needed)
UNISWAP_API_BASE_URL=https://trade-api.gateway.uniswap.org/v1
SWAP_CHAIN_ID=11155111
```

### 3. Start Services

```bash
# Terminal 1: Start local blockchain (optional, for reputation tracking)
cd contracts && anvil

# Terminal 2: Start backend
cd backend && npm install && npm run dev

# Terminal 3: Start frontend
cd frontend && npm install && npm run dev

# Open http://localhost:5173
```

### 4. Demo

The backend seeds **5 demo agents, 5 torrents, and 5 marketplace listings** on startup (development mode). No manual setup needed.

1. Open the app and click **User** — the torrent list shows all 5 demo torrents with prices and ~USDC estimates
2. Click **Marketplace** — browse listings, see detailed pricing
3. Connect your wallet (MetaMask on Sepolia)
4. **As a seeder**: Fill in "List Content for Sale" with an infohash, select WETH, set price to 0.001, and sign
5. **As a buyer**: Click "Buy" on a listing, select USDC as payment, click "Get Quote"
6. Review the swap quote and click "Approve & Swap"
7. After confirmation, access is granted

### Demo Seed Data

| Content | Price | ~USDC | Seeders |
|---|---|---|---|
| Cooking Videos Dataset | 0.01 WETH | ~$25 | 2 |
| ML Training Dataset | 5 USDC | ~$5 | 3 |
| Research Papers Collection | 2 UNI | ~$16 | 1 |
| ETH Denver 2026 Workshop | 0.005 WETH | ~$12.50 | 2 |
| Open Source AI Models | 10 USDC | ~$10 | 2 |

---

## Sepolia Test Tokens

| Token | Address | Decimals |
|---|---|---|
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | 18 |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | 6 |
| UNI | `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984` | 18 |

Get Sepolia ETH from faucets like [sepoliafaucet.com](https://sepoliafaucet.com) or [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).

---

## Mock Mode

When `UNISWAP_API_KEY` is not set, the backend automatically uses **mock mode**:

- Returns simulated swap quotes with hardcoded exchange rates (1 WETH = 2500 USDC, 1 UNI = 8 USDC)
- Token approvals are always "approved" (no MetaMask popup)
- Swap transactions return dummy calldata
- Payment confirmation still works (grants access on-chain)

This is useful for:
- Hackathon demos without internet
- Local development with Anvil
- UI testing without spending testnet tokens

---

## Future Work

- **Persistent storage** — Replace in-memory maps with a database (SQLite/Postgres) so listings survive restarts
- **Live price feeds** — Fetch real-time exchange rates from Uniswap or Chainlink oracles instead of hardcoded approximations
- **WebTorrent browser downloads** — Enable in-browser file transfer so buyers can download content directly after purchasing
- **On-chain access control** — Move access grants on-chain so they are verifiable and portable across tracker instances
- **Seller dashboard** — Revenue tracking, payment history, and earnings analytics for content sellers
- **Search and filtering** — Full-text search across listings, filter by token, price range, and category

---

## Why Uniswap + PBTS?

Traditional BitTorrent has no built-in payment mechanism. Private trackers use invite-only access and ratio enforcement, but there's no way for seeders to monetize valuable data.

By combining PBTS's on-chain reputation with Uniswap's cross-token swap infrastructure:

1. **Any token works** — Buyers aren't limited to holding a specific token
2. **No escrow contracts needed** — Uniswap handles atomic swaps
3. **Agent-friendly** — Autonomous agents can trade data without human intervention
4. **Reputation persists** — Good seeders build verifiable on-chain track records
5. **Decentralized** — No central marketplace or data broker

---

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS + shadcn/ui + ethers.js 6
- **Backend:** Express.js + ethers.js 6 (proxies Uniswap API)
- **Swap Engine:** Uniswap Trading API (v1)
- **Chain:** Ethereum Sepolia testnet
- **Smart Contracts:** ReputationTracker (on-chain reputation)
- **Wallet:** MetaMask

---

## License

MIT

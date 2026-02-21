# PBTS Frontend

React + Vite dashboard for the Persistent BitTorrent Tracker System with an integrated Uniswap-powered data marketplace.

## Tech Stack

- **React 19** with TypeScript
- **Vite 6** for build tooling
- **Tailwind CSS 4** for styling
- **shadcn/ui** (Radix primitives) for components
- **ethers.js v6** for MetaMask wallet integration
- **Framer Motion** for animations
- **Sonner** for toast notifications
- **next-themes** for dark/light mode

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Root router (landing / user / tracker / marketplace)
│   └── main.tsx             # Entry point with ThemeProvider
├── components/
│   ├── ui/                  # shadcn/ui base components
│   └── pbts/                # Application components
│       ├── landing-page.tsx          # Role selection (User / Tracker / Marketplace)
│       ├── user-dashboard.tsx        # User page with tabs
│       ├── tracker-dashboard.tsx     # Tracker admin page
│       ├── marketplace-dashboard.tsx # Uniswap data marketplace
│       ├── torrents-browser.tsx      # Full torrent listing with search/sort
│       ├── wallet-connect.tsx        # MetaMask connection UI
│       └── agent/                    # BitTensor agent visualization
├── hooks/
│   └── useWallet.ts         # MetaMask wallet hook
├── lib/
│   ├── api.ts               # Backend API client (tracker + marketplace)
│   ├── pbts-types.ts        # Shared type definitions
│   ├── pbts-store.ts        # Mock/demo data & helpers
│   └── utils.ts             # General utilities
└── styles/                  # Global CSS
```

## Pages

### Landing Page
Role selection screen with three options:
- **User** — Connect wallet, register, browse and announce torrents
- **Tracker** — View registered users, deploy contracts
- **Marketplace** — Browse and purchase data content via Uniswap token swaps

### User Dashboard
Three tabs:
- **Dashboard** — Wallet connection, reputation stats (upload/download/ratio), register account, register content as seeder, torrent preview (top 3) with marketplace pricing badges, and announce results
- **Torrents** — Full browsable torrent list with search, sort by name/size/peers, category icons, marketplace pricing badges, and announce actions
- **Agent** — BitTensor agent simulation and visualization

### Tracker Dashboard
Admin view showing registered users and their on-chain reputation, with contract deployment controls.

### Marketplace Dashboard
Data marketplace powered by Uniswap where seeders can list content with token-denominated prices and buyers can purchase access by paying with any ERC-20 token (auto-swapped via Uniswap).

## API Integration

The frontend connects to the backend API (default `http://localhost:3001`). Key endpoints used:

| Endpoint | Usage |
|----------|-------|
| `GET /health` | Backend status indicator in header |
| `POST /register` | Register wallet on-chain |
| `POST /announce` | Request peer list for a torrent |
| `GET /reputation/:address` | Load user reputation stats |
| `GET /torrents` | List active torrents in the swarm |
| `GET /users` | List all registered users (tracker page) |
| `POST /migrate` | Trigger contract migration (admin) |
| `GET /marketplace/listings` | List marketplace content listings |
| `POST /marketplace/set-price` | Set price for content (seller) |
| `POST /marketplace/swap-quote` | Get Uniswap swap quote for purchase |
| `POST /marketplace/check-approval` | Check ERC-20 token approval status |
| `POST /marketplace/swap-transaction` | Build swap transaction for purchase |
| `POST /marketplace/confirm-payment` | Confirm payment and grant access |
| `POST /marketplace/check-access` | Check if buyer has access to content |

When the backend is offline, the dashboard falls back to demo torrent data for demonstration purposes.

## Getting Started

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:3001` | Backend API URL |
| `VITE_ADMIN_SECRET` | — | Admin secret for migration (optional) |

## Build

```bash
npm run build     # output in dist/
npm run preview   # preview production build locally
```

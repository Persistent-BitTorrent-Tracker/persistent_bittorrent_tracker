# Frontend Dashboard

This directory contains the React frontend for the Persistent BitTorrent Tracker System (PBTS).

## Structure

- `src/`
  - `components/` - React components
    - `WalletConnect.jsx` - MetaMask integration
    - `Registration.jsx` - User registration flow
    - `Dashboard.jsx` - Reputation display
    - `SimulateTransfer.jsx` - Manual receipt creation
    - `PeerList.jsx` - Announce results display
  - `hooks/` - Custom React hooks
    - `useWallet.js` - Wallet connection state
    - `useContract.js` - Smart contract interaction
  - `utils/` - Utility functions
    - `signatures.js` - ECDSA signing helpers
    - `api.js` - Backend API calls
  - `public/` - Static assets

## Technology Stack

- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Wallet**: MetaMask / WalletConnect
- **Blockchain**: ethers.js for signing and contract reads

## Key User Flows

### 1. Wallet Connection
- Connect MetaMask
- Auto-detect/prompt network switch to Avalanche Fuji
- Display connected address

### 2. Registration
- Sign message with MetaMask (off-chain, no gas)
- Submit to backend `/register` endpoint
- Display success with initial credit (1 GB)

### 3. Dashboard
- Fetch reputation from smart contract
- Display upload/download amounts
- Calculate and show ratio
- Show access status (granted/blocked)

### 4. Simulate Transfer
- Select receiver address
- Choose piece size
- Sign receipt with MetaMask
- Submit to backend `/report`
- Watch reputation update in real-time

### 5. Announce
- Sign announce message
- Submit to backend `/announce`
- Display peer list if authorized
- Show blocked message if ratio too low

## Development Workflow

1. Install dependencies: `npm install` or `yarn install`
2. Configure environment variables (backend API URL, contract address)
3. Run dev server: `npm run dev` or `yarn dev`
4. Build components following Scaffold-ETH 2 patterns
5. Test with real wallet on Fuji testnet
6. Build for production: `npm run build` or `yarn build`

## UX Requirements

- Human-readable amounts (use `formatEther`, `formatUnits`)
- Loading states on all async operations
- Disabled buttons during pending transactions
- Clear error messages
- Network switch prompts when on wrong chain
- No infinite approvals (not applicable for this MVP, but good practice)

## Design Guidelines

- Clean, professional interface
- No generic "LLM slop" designs
- Clear visual feedback for reputation status
- Color-coded ratio (green = good, yellow = warning, red = blocked)
- Responsive design for mobile

## References

- See `MVP_IMPLEMENTATION_PLAN.md` for detailed UI specifications
- See `agents/frontend-playbook.md` for development best practices
- See `agents/frontend-ux.md` for UX guidelines

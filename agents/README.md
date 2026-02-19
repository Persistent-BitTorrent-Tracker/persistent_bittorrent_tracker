# Smart Contracts

This directory contains the Solidity smart contracts for the Persistent BitTorrent Tracker System (PBTS).

## Structure

- `src/` - Solidity source files
  - `ReputationTracker.sol` - Main contract for persistent reputation storage
- `test/` - Foundry test files
  - Unit tests for contract functions
  - Fuzz tests for mathematical operations
  - Fork tests if needed
- `script/` - Deployment scripts
  - Deploy scripts for local, testnet, and mainnet

## Technology

- **Framework**: Hardhat or Foundry (to be determined)
- **Target Network**: Avalanche Fuji testnet (for MVP)
- **Testing**: Foundry for comprehensive test coverage

## Key Contract Features

The `ReputationTracker.sol` contract will implement:

- User registration with initial upload credit (1 GB)
- Reputation tracking (uploadBytes, downloadBytes)
- Access control (only tracker server can update reputation)
- Public read access for transparency
- Ratio calculation (upload/download)

## Development Workflow

1. Write contracts in `src/`
2. Write comprehensive tests in `test/`
3. Run tests: `forge test` or `npx hardhat test`
4. Deploy locally first: `forge script` or `npx hardhat run scripts/deploy.ts`
5. Deploy to Fuji testnet after local validation
6. Verify contracts on Snowtrace explorer

## Testing Requirements

- ≥90% code coverage
- Unit tests for all core functions
- Fuzz tests for mathematical operations (ratio calculations)
- Access control tests (onlyTracker modifier)
- Edge case tests (zero amounts, max values)

## References

- See `MVP_IMPLEMENTATION_PLAN.md` for detailed contract specifications
- See `agents/testing.md` for testing best practices

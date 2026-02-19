# Scripts

This directory contains utility scripts for the Persistent BitTorrent Tracker System (PBTS).

## Purpose

Helper scripts for development, testing, deployment, and maintenance.

## Potential Scripts

- **setup.sh** - One-command project setup (install dependencies, configure environment)
- **test-all.sh** - Run all tests (contracts, backend, frontend)
- **deploy-local.sh** - Deploy full stack locally for testing
- **deploy-testnet.sh** - Deploy to Avalanche Fuji testnet
- **generate-receipts.sh** - Create sample transfer receipts for testing
- **check-reputation.sh** - Query on-chain reputation for an address
- **demo-reset.sh** - Reset demo environment to initial state
- **verify-deployment.sh** - Verify all components are deployed correctly

## Script Guidelines

- Make scripts executable: `chmod +x scripts/*.sh`
- Add usage documentation in script headers
- Include error handling and validation
- Use environment variables for configuration
- Test scripts before committing
- Document all required dependencies

## Environment Variables

Scripts should source from `.env` file containing:
- RPC URLs
- Private keys (NEVER commit)
- Contract addresses
- API endpoints
- Network configurations

## Usage Example

```bash
# Setup project
./scripts/setup.sh

# Deploy to local fork
./scripts/deploy-local.sh

# Run all tests
./scripts/test-all.sh

# Deploy to testnet
./scripts/deploy-testnet.sh
```

## Security

⚠️ **NEVER commit scripts containing**:
- Private keys
- API keys
- Passwords
- Secrets of any kind

Use environment variables or prompt for sensitive data.

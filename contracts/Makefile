# ReputationTracker — Foundry on-chain scripts

.PHONY: help build test deploy

# ─────────────────────────────────────────
# Help
# ─────────────────────────────────────────
help:
	@echo ""
	@echo "  USAGE: Environment variables are automatically loaded from .env"
	@echo ""
	@echo "  FORGE (on-chain)"
	@echo "  ─────────────────────────────────────────────────────────"
	@echo "  build              Build Solidity contracts"
	@echo "  test               Run Forge test suite"
	@echo "  deploy             Deploy ReputationTracker contract to Fuji"
	@echo ""

# ─────────────────────────────────────────
# Forge — build & test
# ─────────────────────────────────────────
build:
	forge build

test:
	forge test

# ─────────────────────────────────────────
# Forge — on-chain scripts
# ─────────────────────────────────────────
deploy-fuji:
	@source .env && forge script script/DeployPBTS.s.sol:DeployPBTS --rpc-url $$FUJI_RPC --private-key $$PRIVATE_KEY --broadcast
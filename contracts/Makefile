# ReputationTracker — Foundry on-chain scripts
# Supports: Avalanche Fuji (chain 43113) and Ethereum Sepolia (chain 11155111)

.PHONY: help build test deploy-fuji deploy-sepolia verify-fuji verify-sepolia

# ─────────────────────────────────────────
# Help
# ─────────────────────────────────────────
help:
	@echo ""
	@echo "  USAGE: Environment variables are loaded from .env"
	@echo ""
	@echo "  FORGE"
	@echo "  ──────────────────────────────────────────────────────"
	@echo "  build              Build Solidity contracts"
	@echo "  test               Run Forge test suite"
	@echo "  deploy-fuji        Deploy to Avalanche Fuji (chain 43113)"
	@echo "  deploy-sepolia     Deploy to Ethereum Sepolia (chain 11155111)"
	@echo "  verify-fuji        Verify contracts on Snowtrace (Fuji)"
	@echo "  verify-sepolia     Verify contracts on Etherscan (Sepolia)"
	@echo ""

# ─────────────────────────────────────────
# Forge — build & test
# ─────────────────────────────────────────
build:
	forge build

test:
	forge test -vv

# ─────────────────────────────────────────
# Forge — Avalanche Fuji deployment
# ─────────────────────────────────────────
deploy-fuji:
	@source .env && forge script script/DeployPBTS.s.sol:DeployPBTS \
		--rpc-url $$FUJI_RPC \
		--private-key $$PRIVATE_KEY \
		--broadcast \
		--chain-id 43113

verify-fuji:
	@source .env && forge verify-contract \
		$$REP_FACTORY_ADDRESS \
		src/RepFactory.sol:RepFactory \
		--chain-id 43113 \
		--etherscan-api-key $$SNOWTRACE_API_KEY

# ─────────────────────────────────────────
# Forge — Ethereum Sepolia deployment
# ─────────────────────────────────────────
deploy-sepolia:
	@source .env && forge script script/DeployPBTS.s.sol:DeployPBTS \
		--rpc-url $$SEPOLIA_RPC \
		--private-key $$PRIVATE_KEY \
		--broadcast \
		--chain-id 11155111

verify-sepolia:
	@source .env && forge verify-contract \
		$$REP_FACTORY_ADDRESS \
		src/RepFactory.sol:RepFactory \
		--chain-id 11155111 \
		--etherscan-api-key $$ETHERSCAN_API_KEY
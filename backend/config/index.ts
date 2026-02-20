import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Resolve the JSON-RPC URL in priority order:
 *   1. RPC_URL          — generic, network-agnostic
 *   2. ETH_SEPOLIA_RPC_URL — Ethereum Sepolia
 *   3. AVALANCHE_FUJI_RPC_URL — Avalanche Fuji (legacy compat)
 *   4. Hard-coded Fuji public endpoint as last-resort fallback
 */
function resolveRpcUrl(): string {
  return (
    process.env["RPC_URL"] ??
    process.env["ETH_SEPOLIA_RPC_URL"] ??
    process.env["AVALANCHE_FUJI_RPC_URL"] ??
    "https://api.avax-test.network/ext/bc/C/rpc"
  );
}

/**
 * Infer a sensible default chain ID from the RPC URL when CHAIN_ID is not
 * explicitly set.  Defaults to Fuji (43113) if the URL is unrecognised.
 */
function resolveChainId(): number {
  if (process.env["CHAIN_ID"]) {
    return parseInt(process.env["CHAIN_ID"], 10);
  }
  const rpc = resolveRpcUrl().toLowerCase();
  if (rpc.includes("sepolia") || rpc.includes("11155111")) return 11155111;
  return 43113; // Avalanche Fuji
}

const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",

  /** JSON-RPC endpoint — set RPC_URL, ETH_SEPOLIA_RPC_URL, or AVALANCHE_FUJI_RPC_URL */
  rpcUrl: resolveRpcUrl(),

  /** Private key of the tracker server wallet (pays gas for contract writes) */
  trackerPrivateKey: requireEnv("DEPLOYER_PRIVATE_KEY", ""),

  /** Current active ReputationTracker contract the backend writes to */
  contractAddress: requireEnv("REPUTATION_TRACKER_ADDRESS", ""),

  /** RepFactory address — used only during migration */
  factoryAddress: requireEnv("FACTORY_ADDRESS", "0x0000000000000000000000000000000000000000"),

  /**
   * Chain ID.
   *   Ethereum Sepolia : 11155111
   *   Avalanche Fuji   : 43113
   * Auto-inferred from RPC_URL if not explicitly set.
   */
  chainId: resolveChainId(),

  /**
   * Minimum upload/download ratio required to receive a peer list.
   * Stored as a regular JS number; the contract returns ratios scaled by 1e18.
   * 0.5 → 0.5 * 1e18 = 5e17
   */
  minRatio: parseFloat(process.env["MIN_RATIO"] ?? "0.5"),

  /** Receipts older than this (seconds) are rejected as potential replays. */
  timestampWindowSeconds: parseInt(
    process.env["TIMESTAMP_WINDOW_SECONDS"] ?? "300",
    10
  ),

  /** Port for the BitTorrent tracker (HTTP announce + WebSocket). */
  trackerPort: parseInt(process.env["TRACKER_PORT"] ?? "8000", 10),

  /**
   * Secret token that must be supplied in the Authorization header when
   * calling the /migrate admin endpoint.  Keep this out of version control.
   */
  adminSecret: requireEnv("ADMIN_SECRET", ""),
};

export default config;


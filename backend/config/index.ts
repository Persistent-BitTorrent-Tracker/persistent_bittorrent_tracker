import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",

  /** Avalanche Fuji (or localhost Hardhat) JSON-RPC endpoint */
  rpcUrl: requireEnv(
    "AVALANCHE_FUJI_RPC_URL",
    "https://api.avax-test.network/ext/bc/C/rpc"
  ),

  /** Private key of the tracker server wallet (pays gas for contract writes) */
  trackerPrivateKey: requireEnv("DEPLOYER_PRIVATE_KEY", ""),

  /** Deployed ReputationTracker contract address */
  contractAddress: requireEnv("REPUTATION_TRACKER_ADDRESS", ""),

  /** Chain ID — Avalanche Fuji = 43113 */
  chainId: parseInt(process.env["CHAIN_ID"] ?? "43113", 10),

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
};

export default config;

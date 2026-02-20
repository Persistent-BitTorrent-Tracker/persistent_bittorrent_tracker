import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config/index";
import { registerHandler } from "./routes/register";
import { reportHandler } from "./routes/report";
import { announceHandler } from "./routes/announce";
import { migrateFrom } from "./utils/contract";

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.post("/register", registerHandler);
app.post("/report", reportHandler);
app.post("/announce", announceHandler);

// Health check — useful for load balancers and CI smoke tests.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * POST /migrate
 *
 * Admin-only endpoint (protected by Authorization: Bearer <ADMIN_SECRET>).
 * Deploys a new ReputationTracker via RepFactory with the current contract as
 * referrer so that reputation history is preserved, then returns the new
 * contract address.  The operator must update REPUTATION_TRACKER_ADDRESS in
 * the environment and restart the server to complete the migration.
 *
 * Body: { oldContract?: string }
 *   oldContract — address of the tracker to migrate from.
 *                 Defaults to the currently configured contractAddress.
 */
app.post("/migrate", async (req: Request, res: Response): Promise<void> => {
  // ── Auth check ──────────────────────────────────────────────────────────
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!config.adminSecret || token !== config.adminSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const oldContract: string =
    (req.body as { oldContract?: string }).oldContract ?? config.contractAddress;

  try {
    const newAddress = await migrateFrom(oldContract);
    res.status(200).json({
      success: true,
      oldContract,
      newContract: newAddress,
      message:
        "New ReputationTracker deployed. Update REPUTATION_TRACKER_ADDRESS and restart the server.",
    });
  } catch (err) {
    console.error("[/migrate] Migration error:", err);
    res.status(500).json({ error: "Migration failed" });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(
    `[PBTS] Tracker server running on port ${config.port} (${config.nodeEnv})`
  );
  console.log(`[PBTS] RPC URL : ${config.rpcUrl}`);
  console.log(`[PBTS] Contract: ${config.contractAddress}`);
});

export { app, server };

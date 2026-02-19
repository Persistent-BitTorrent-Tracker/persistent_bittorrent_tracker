import "dotenv/config";
import express from "express";
import cors from "cors";
import config from "./config/index";
import { registerHandler } from "./routes/register";
import { reportHandler } from "./routes/report";
import { announceHandler } from "./routes/announce";

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

// ── Start ──────────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(
    `[PBTS] Tracker server running on port ${config.port} (${config.nodeEnv})`
  );
  console.log(`[PBTS] RPC URL : ${config.rpcUrl}`);
  console.log(`[PBTS] Contract: ${config.contractAddress}`);
});

export { app, server };

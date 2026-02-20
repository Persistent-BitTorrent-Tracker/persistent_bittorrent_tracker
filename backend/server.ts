import "dotenv/config";
import express from "express";
import cors from "cors";
import config from "./config/index";
import { registerHandler } from "./routes/register";
import { reportHandler } from "./routes/report";
import { announceHandler } from "./routes/announce";
import { bindPeerHandler } from "./routes/bindPeer";
import { resolvePeerHandler } from "./routes/resolvePeer";

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.post("/register", registerHandler);
app.post("/report", reportHandler);
app.post("/announce", announceHandler);
app.post("/bind-peer", bindPeerHandler);
app.get("/resolve-peer", resolvePeerHandler);

// Health check — useful for load balancers and CI smoke tests.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start Express ─────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(
    `[PBTS] Tracker server running on port ${config.port} (${config.nodeEnv})`
  );
  console.log(`[PBTS] RPC URL : ${config.rpcUrl}`);
  console.log(`[PBTS] Contract: ${config.contractAddress}`);
});

// ── Start BitTorrent Tracker (skip in test environment) ───────────────────
let btTracker: import("bittorrent-tracker").Server | null = null;

if (config.nodeEnv !== "test") {
  import("./tracker/index").then(({ createTracker }) => {
    btTracker = createTracker();
    btTracker!.listen(config.trackerPort, () => {
      console.log(
        `[PBTS] BitTorrent tracker running on port ${config.trackerPort}`
      );
    });
  });
}

export { app, server, btTracker };

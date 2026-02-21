# Skybox AI Integration — Persistent BitTorrent Tracker (Neural Torrent)

## Overview

This integration brings **Blockade Labs Skybox AI** into the Neural Torrent agent ecosystem, generating immersive 360-degree spatial environments that represent each AI agent's data domain. By giving agents a "home" — a persistent spatial context to inhabit, explore, and remember — we solve the **Homeless Agent Problem**.

Each of the four agents in our network operates in a distinct data domain:

| Agent | Specialty | Spatial Environment |
|-------|-----------|-------------------|
| **AURA** | Dashcam & Driving Data | Futuristic highway corridor with autonomous vehicles, Denver Rocky Mountains |
| **MEDI** | Medical Imaging | High-tech medical imaging lab with holographic X-ray displays |
| **SATO** | Satellite Imagery | Satellite ground station with Colorado terrain overlays from orbit |
| **VOXL** | Speech & Language | Multilingual speech processing room with sound wave visualizations |

## Bounty Criteria

### 1. Skybox AI Integration (30%)

- **Backend proxy** secures the API key server-side — never exposed to the browser
- Full generation lifecycle: `POST /skybox/generate` → poll `GET /skybox/status/:id` → display completed 8K equirectangular image
- **CSS-only 360-degree panorama viewer** with drag-to-pan interaction and ambient auto-rotation — zero extra dependencies
- Styles endpoint cached for 10 minutes to minimize API calls

### 2. Spatial Awareness (25%)

- **Spatial Memory Store**: In-memory backend store (`skyboxStore.ts`) tracks every environment generated per agent, maintaining a full history of visited locations
- **Contextual Reasoning**: Each agent's environment prompt is curated to match its data specialty — AURA gets highways because it processes dashcam data, MEDI gets a medical lab, etc.
- **Multi-Environment Navigation**: Users can switch between agents to see their respective spatial worlds, and the memory log tracks navigation across environments
- **Frontend Memory Log**: Visual timeline showing which agents have visited which environments and when

### 3. Impact & Creativity (25%)

- Agents trading data in the BitTorrent network are visualized as inhabiting spatial worlds that represent their data domains
- Interactive 360-degree viewer with drag-to-pan, vignette depth effect, and ambient auto-rotation
- Seamlessly integrated below the existing agent network visualization — no existing functionality was removed or modified
- The spatial context badge and memory log create a narrative of agent spatial awareness

### 4. Agent Autonomy (20%)

- **Existing blockchain integration**: On-chain registration, ECDSA-signed reputation, cryptographic transfer receipts, free-rider choking
- **Spatial environments triggered contextually**: The active agents change based on the demo timeline step
- **Agent tool discovery**: The `/agent-tools` endpoint already enables autonomous agent interaction

## Architecture

```
Frontend (React + Vite)                    Backend (Express.js)
┌────────────────────┐                     ┌─────────────────────┐
│ SpatialWorlds      │──POST /skybox/───→  │ skybox/routes.ts    │──→ Blockade Labs API
│   └─ SkyboxViewer  │   generate          │   └─ skyboxStore.ts │    POST /api/v1/skybox
│   └─ Memory Log    │                     │       (spatial       │
│                    │──GET /skybox/────→   │        memory)      │──→ GET /imagine/requests/:id
│ use-skybox.ts      │   status/:id        │                     │
│ skybox-api.ts      │                     │ server.ts           │
│ skybox-types.ts    │──GET /skybox/────→   │   app.use("/skybox") │
│                    │   memory/:agentId   │                     │
└────────────────────┘                     └─────────────────────┘
```

## Setup

### 1. Backend

Add to `backend/.env`:

```env
SKYBOX_API_KEY=your_api_key_here
```

Start the backend:

```bash
cd backend
npm install
npx tsx server.ts
```

Verify the integration:

```bash
# List available skybox styles
curl http://localhost:3001/skybox/styles

# Generate a test skybox
curl -X POST http://localhost:3001/skybox/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A futuristic data center", "agentId": "A", "spatialContext": "Test environment"}'

# Check generation status (replace ID)
curl http://localhost:3001/skybox/status/12345

# View all generated skyboxes
curl http://localhost:3001/skybox/history

# View agent spatial memory
curl http://localhost:3001/skybox/memory/A
```

### 2. Frontend

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Navigate to **User Dashboard** → **Agent** tab → scroll down to the **Spatial Worlds** panel.

### 3. Using the Integration

1. Select an agent from the agent selector (AURA, MEDI, SATO, or VOXL)
2. Click **"Generate World"** to create a 360-degree environment
3. Wait ~30-60 seconds for Skybox AI to render
4. **Drag to look around** in the panorama viewer
5. Generate environments for different agents to build spatial memory
6. The **Spatial Memory** section at the bottom tracks all visited environments

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/skybox/styles` | List available Skybox AI styles (cached 10 min) |
| `POST` | `/skybox/generate` | Generate a new 360-degree environment |
| `GET` | `/skybox/status/:id` | Poll generation progress |
| `GET` | `/skybox/history` | All generated skyboxes (spatial memory) |
| `GET` | `/skybox/memory/:agentId` | Agent-specific spatial memory |

### POST /skybox/generate — Request Body

```json
{
  "prompt": "Description of the environment to generate",
  "skybox_style_id": 2,
  "enhance_prompt": true,
  "agentId": "A",
  "spatialContext": "Human-readable location name"
}
```

## Files Added/Modified

### New Files (8)

| File | Purpose |
|------|---------|
| `backend/skybox/routes.ts` | Express Router — Skybox AI proxy with 5 endpoints |
| `backend/skybox/skyboxStore.ts` | In-memory spatial memory store |
| `frontend/lib/skybox-types.ts` | TypeScript types + agent environment prompts |
| `frontend/lib/skybox-api.ts` | Frontend API client |
| `frontend/hooks/use-skybox.ts` | React hook — generation, polling, memory |
| `frontend/components/pbts/agent/skybox-viewer.tsx` | CSS-only 360-degree panorama viewer |
| `frontend/components/pbts/agent/spatial-worlds.tsx` | Spatial Worlds panel |
| `SKYBOX_INTEGRATION.md` | This document |

### Modified Files (3)

| File | Change |
|------|--------|
| `backend/config/index.ts` | Added `skyboxApiKey` config field |
| `backend/server.ts` | Mounted `/skybox` router (2 lines) |
| `frontend/components/pbts/agent/agent-demo.tsx` | Added SpatialWorlds component below canvas |

## How Spatial Memory Works

1. When a user generates a skybox for an agent, the backend stores the record in `skyboxStore.ts`
2. The record is also added to the agent's `SpatialMemory` — a list of all environments that agent has "visited"
3. Each `SkyboxRecord` includes the prompt, spatial context label, generation status, and image URLs
4. The frontend displays a **Spatial Memory Log** showing timestamped entries of every environment visit
5. The backend's `/skybox/memory/:agentId` endpoint returns the full visit history for any agent

This demonstrates that agents have **persistent spatial context** — they can recall where they've been and what each environment represented.

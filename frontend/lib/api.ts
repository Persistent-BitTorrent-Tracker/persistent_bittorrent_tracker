/**
 * Backend API client for PBTS.
 *
 * Reads the backend URL from VITE_BACKEND_URL (defaults to localhost:3001).
 */

const BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001"

// ── Types matching backend response shapes ────────────────────────────────

export interface RegisterResponse {
  success: boolean
  userAddress: string
  initialCredit: number
  txHash: string
}

export interface AnnounceAllowedResponse {
  status: "allowed"
  peers: Array<{ address: string; peerId: string | null }>
  peerCount: number
  ratio: number | null
  uploadBytes: string
  downloadBytes: string
  trackerPort: number
  message: string
}

export interface AnnounceBlockedResponse {
  status: "blocked"
  peers: []
  ratio: number | null
  uploadGB: number
  downloadGB: number
  message: string
}

export type AnnounceResponse = AnnounceAllowedResponse | AnnounceBlockedResponse

export interface ReportResponse {
  success: boolean
  sender: {
    address: string
    ratio: number | null
    uploadBytes: string
    downloadBytes: string
  }
  receiver: {
    address: string
    ratio: number | null
    uploadBytes: string
    downloadBytes: string
  }
  senderTxHash: string
  receiverTxHash: string
}

export interface ApiError {
  error: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    const message = (data as ApiError).error ?? `HTTP ${res.status}`
    throw new Error(message)
  }

  return data as T
}

// ── API calls ─────────────────────────────────────────────────────────────

/**
 * Register a new user via POST /register.
 *
 * The caller must sign `message` with their wallet and provide the signature.
 * Throws if the registration fails (including "already registered" — callers
 * should check for that case separately).
 */
export async function registerUser(
  userAddress: string,
  message: string,
  signature: string
): Promise<RegisterResponse> {
  return post<RegisterResponse>("/register", { userAddress, message, signature })
}

/**
 * Announce a swarm event via POST /announce.
 *
 * The caller must sign `message` with their wallet.
 */
export async function announce(
  userAddress: string,
  infohash: string,
  event: "started" | "stopped" | "completed",
  message: string,
  signature: string
): Promise<AnnounceResponse> {
  return post<AnnounceResponse>("/announce", {
    userAddress,
    infohash,
    event,
    message,
    signature,
  })
}

/**
 * Report a transfer receipt via POST /report.
 *
 * `signature` is the receiver's ECDSA signature over the packed keccak256 of
 * the receipt fields (see backend/utils/signatures.ts for the exact scheme).
 */
export interface ReceiptPayload {
  infohash: string
  sender: string
  receiver: string
  pieceHash: string
  pieceIndex: number
  pieceSize: number
  timestamp: number
  signature: string
}

export async function reportTransfer(
  receipt: ReceiptPayload
): Promise<ReportResponse> {
  return post<ReportResponse>("/report", receipt)
}

/**
 * Check backend health (GET /health).
 * Returns true when the backend is reachable and healthy.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

// ── Reputation lookup ─────────────────────────────────────────────────────

export interface ReputationResponse {
  address: string
  uploadBytes: string
  downloadBytes: string
  ratio: number | null
  lastUpdated: number
  isRegistered: boolean
}

/**
 * Query on-chain reputation for any address via GET /reputation/:address.
 * Public endpoint — no authentication required.
 */
export async function getReputation(address: string): Promise<ReputationResponse> {
  const res = await fetch(`${BASE_URL}/reputation/${address}`)
  const data = await res.json()

  if (!res.ok) {
    const message = (data as ApiError).error ?? `HTTP ${res.status}`
    throw new Error(message)
  }

  return data as ReputationResponse
}

/**
 * Fetch all known users and their on-chain reputation via GET /users.
 */
export async function getAllUsers(): Promise<ReputationResponse[]> {
  try {
    const res = await fetch(`${BASE_URL}/users`)
    if (!res.ok) return []
    const data = (await res.json()) as { users: ReputationResponse[] }
    return data.users
  } catch {
    return []
  }
}

// ── Torrent listing ──────────────────────────────────────────────────────

export interface TorrentInfo {
  infohash: string
  peerCount: number
  peers: string[]
}

/**
 * Fetch all active torrents in the swarm via GET /torrents.
 * Public endpoint — no authentication required.
 */
export async function getTorrents(): Promise<TorrentInfo[]> {
  try {
    const res = await fetch(`${BASE_URL}/torrents`)
    if (!res.ok) return []
    const data = (await res.json()) as { torrents: TorrentInfo[] }
    return data.torrents
  } catch {
    return []
  }
}

export interface MigrateResponse {
  success: boolean
  oldContract: string
  newContract: string
  message: string
}

/**
 * Trigger a contract migration via POST /migrate (admin only).
 *
 * Requires the admin secret set in VITE_ADMIN_SECRET.
 */
export async function migrateContract(
  oldContract: string,
  adminSecret: string
): Promise<MigrateResponse> {
  const res = await fetch(`${BASE_URL}/migrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminSecret}`,
    },
    body: JSON.stringify({ oldContract }),
  })
  const data = await res.json()
  if (!res.ok) {
    const message = (data as ApiError).error ?? `HTTP ${res.status}`
    throw new Error(message)
  }
  return data as MigrateResponse
}

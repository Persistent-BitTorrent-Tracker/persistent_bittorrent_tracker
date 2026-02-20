const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface RegisterResponse {
  success: boolean
  userAddress: string
  initialCredit: number
  txHash: string
}

export interface ReputationData {
  address: string
  ratio: number | null
  uploadBytes: string
  downloadBytes: string
}

export interface ReportResponse {
  success: boolean
  sender: ReputationData
  receiver: ReputationData
  senderTxHash: string
  receiverTxHash: string
}

export interface AnnounceResponse {
  status: 'allowed' | 'blocked'
  peers: Array<{ address: string; peerId: string | null }>
  peerCount?: number
  ratio: number | null
  uploadBytes?: string
  downloadBytes?: string
  uploadGB?: number
  downloadGB?: number
  trackerPort?: number
  message: string
}

export interface MigrateResponse {
  success: boolean
  oldContract: string
  newContract: string
  message: string
}

export interface Receipt {
  infohash: string
  sender: string
  receiver: string
  pieceHash: string
  pieceIndex: number
  pieceSize: number
  timestamp: number
  signature: string
}

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  return data as T
}

export async function apiRegister(
  userAddress: string,
  message: string,
  signature: string
): Promise<RegisterResponse> {
  return post<RegisterResponse>('/register', { userAddress, message, signature })
}

export async function apiReport(receipt: Receipt): Promise<ReportResponse> {
  return post<ReportResponse>('/report', receipt)
}

export async function apiAnnounce(
  userAddress: string,
  infohash: string,
  event: 'started' | 'stopped' | 'completed',
  message: string,
  signature: string
): Promise<AnnounceResponse> {
  return post<AnnounceResponse>('/announce', { userAddress, infohash, event, message, signature })
}

export async function apiMigrate(adminSecret: string, oldContract?: string): Promise<MigrateResponse> {
  return post<MigrateResponse>(
    '/migrate',
    { oldContract },
    { Authorization: `Bearer ${adminSecret}` }
  )
}

export async function apiHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/health`)
  return res.json()
}

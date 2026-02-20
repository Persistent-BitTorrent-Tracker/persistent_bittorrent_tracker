import { useState, useEffect, useCallback } from 'react'
import {
  Upload,
  Download,
  Radio,
  LogOut,
  ExternalLink,
  ArrowUpRight,
  Shuffle,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '../hooks/useWallet'
import { useContract } from '../hooks/useContract'
import { apiRegister, apiAnnounce, apiMigrate, type AnnounceResponse, type ReportResponse } from '../utils/api'
import SimulateTransferModal from './SimulateTransferModal'
import AnnounceCard from './AnnounceCard'
import MigrationBanner from './MigrationBanner'

const TEST_INFOHASH = '0x' + 'ab'.repeat(32)

function formatBytes(bytes: bigint): string {
  const gb = Number(bytes) / 1_073_741_824
  if (gb >= 1) return `${gb.toFixed(3)} GB`
  const mb = Number(bytes) / 1_048_576
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  const kb = Number(bytes) / 1024
  return `${kb.toFixed(0)} KB`
}

function getRatioColor(ratio: number): string {
  if (ratio >= 0.5) return 'text-green-400'
  if (ratio >= 0.1) return 'text-yellow-400'
  return 'text-red-400'
}

function getRatioBg(ratio: number): string {
  if (ratio >= 0.5) return 'bg-green-500'
  if (ratio >= 0.1) return 'bg-yellow-500'
  return 'bg-red-500'
}

interface ActivityItem {
  type: 'transfer' | 'announce' | 'register' | 'migrate'
  message: string
  txHash?: string
  timestamp: number
}

interface MigrationInfo {
  oldContract: string
  newContract: string
}

export default function Dashboard() {
  const { address, isCorrectNetwork, disconnect, switchToFuji, signMessage } = useWallet()
  const { reputation, loading: repLoading, contractAddress, setContractAddress, fetchReputation } = useContract()

  const [registered, setRegistered] = useState<boolean | null>(null)
  const [registering, setRegistering] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [announcing, setAnnouncing] = useState(false)
  const [announceResult, setAnnounceResult] = useState<AnnounceResponse | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [migration, setMigration] = useState<MigrationInfo | null>(null)
  const [migrating, setMigrating] = useState(false)

  const refresh = useCallback(() => {
    if (address) fetchReputation(address)
  }, [address, fetchReputation])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    if (reputation) setRegistered(reputation.isRegistered)
  }, [reputation])

  function addActivity(item: Omit<ActivityItem, 'timestamp'>) {
    setActivity((prev) => [{ ...item, timestamp: Date.now() }, ...prev.slice(0, 9)])
  }

  async function handleRegister() {
    if (!address) return
    setRegistering(true)
    try {
      const message = `Register PBTS account for ${address} at ${Date.now()}`
      const signature = await signMessage(message)
      const result = await apiRegister(address, message, signature)
      toast.success('Registered! Initial credit: 1 GB')
      addActivity({ type: 'register', message: 'Account registered on-chain', txHash: result.txHash })
      await refresh()
    } catch (err: unknown) {
      const e = err as Error
      toast.error(e.message || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  async function handleAnnounce() {
    if (!address) return
    setAnnouncing(true)
    setAnnounceResult(null)
    try {
      const message = `PBTS announce ${address} ${TEST_INFOHASH} started ${Date.now()}`
      const signature = await signMessage(message)
      const result = await apiAnnounce(address, TEST_INFOHASH, 'started', message, signature)
      setAnnounceResult(result)
      addActivity({
        type: 'announce',
        message: result.status === 'allowed' ? 'Announce: Access Granted' : 'Announce: Access Denied',
      })
      await refresh()
    } catch (err: unknown) {
      const e = err as Error
      toast.error(e.message || 'Announce failed')
    } finally {
      setAnnouncing(false)
    }
  }

  function handleTransferSuccess(result: ReportResponse) {
    setShowTransferModal(false)
    addActivity({
      type: 'transfer',
      message: 'Transfer recorded on-chain',
      txHash: result.senderTxHash,
    })
    refresh()
  }

  async function handleMigrate() {
    const secret = prompt('Enter admin secret for migration:')
    if (!secret) return
    setMigrating(true)
    try {
      const result = await apiMigrate(secret, contractAddress ?? undefined)
      setMigration({ oldContract: result.oldContract, newContract: result.newContract })
      setContractAddress(result.newContract)
      addActivity({ type: 'migrate', message: `Migrated to ${result.newContract.slice(0, 8)}…` })
      toast.success('Migration successful! Reputation preserved.')
      refresh()
    } catch (err: unknown) {
      const e = err as Error
      toast.error(e.message || 'Migration failed')
    } finally {
      setMigrating(false)
    }
  }

  const ratio = reputation?.ratio ?? 0
  const uploadBytes = reputation?.uploadBytes ?? 0n
  const downloadBytes = reputation?.downloadBytes ?? 0n
  const maxBytes = uploadBytes > downloadBytes ? uploadBytes : downloadBytes
  const uploadPct = maxBytes > 0n ? Math.min(100, (Number(uploadBytes) / Number(maxBytes)) * 100) : 0
  const downloadPct = maxBytes > 0n ? Math.min(100, (Number(downloadBytes) / Number(maxBytes)) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-6">
      {/* Migration Banner */}
      {migration && (
        <MigrationBanner
          oldContract={migration.oldContract}
          newContract={migration.newContract}
          onDismiss={() => setMigration(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h1 className="text-white font-bold">PBTS Dashboard</h1>
            <p className="text-slate-500 text-xs font-mono">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isCorrectNetwork && (
            <button
              onClick={switchToFuji}
              className="flex items-center gap-1.5 text-yellow-400 border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Switch to Fuji
            </button>
          )}
          {isCorrectNetwork && (
            <span className="flex items-center gap-1.5 text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1.5 rounded-lg text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Fuji
            </span>
          )}
          <button
            onClick={disconnect}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Registration prompt */}
      {registered === false && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-yellow-300 font-medium text-sm">Not Registered</p>
              <p className="text-slate-500 text-xs">Register your wallet to start tracking reputation</p>
            </div>
          </div>
          <button
            onClick={handleRegister}
            disabled={registering}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-800 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {registering ? 'Registering…' : 'Register'}
          </button>
        </div>
      )}

      {registered === true && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-6 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-green-400 text-xs font-medium">Account registered on-chain</p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Ratio Card */}
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Upload/Download Ratio</p>
          {repLoading ? (
            <div className="h-16 flex items-center">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className={`text-5xl font-bold mb-2 ${getRatioColor(ratio)}`}>
                {ratio >= 999 ? '∞' : ratio.toFixed(3)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getRatioBg(ratio)}`}
                    style={{ width: `${Math.min(100, ratio >= 999 ? 100 : ratio * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${getRatioColor(ratio)}`}>
                  {ratio >= 0.5 ? 'GOOD' : ratio >= 0.1 ? 'LOW' : 'CRITICAL'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Upload */}
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-green-400" />
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Uploaded</p>
          </div>
          <p className="text-3xl font-bold text-white mb-3">{formatBytes(uploadBytes)}</p>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        </div>

        {/* Download */}
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-blue-400" />
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Downloaded</p>
          </div>
          <p className="text-3xl font-bold text-white mb-3">{formatBytes(downloadBytes)}</p>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${downloadPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => setShowTransferModal(true)}
          disabled={!registered}
          className="flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/40 text-green-400 font-medium py-3 rounded-xl transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          Simulate Transfer
        </button>
        <button
          onClick={handleAnnounce}
          disabled={!registered || announcing}
          className="flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/40 text-blue-400 font-medium py-3 rounded-xl transition-colors"
        >
          <Radio className={`w-4 h-4 ${announcing ? 'animate-pulse' : ''}`} />
          {announcing ? 'Announcing…' : 'Announce'}
        </button>
        <button
          onClick={handleMigrate}
          disabled={migrating}
          className="flex items-center justify-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/40 text-purple-400 font-medium py-3 rounded-xl transition-colors"
        >
          <Shuffle className={`w-4 h-4 ${migrating ? 'animate-spin' : ''}`} />
          {migrating ? 'Migrating…' : 'Migrate (Admin)'}
        </button>
      </div>

      {/* Announce Result */}
      {announceResult && (
        <div className="mb-4">
          <AnnounceCard result={announceResult} onClose={() => setAnnounceResult(null)} />
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
        <h3 className="text-slate-300 font-medium text-sm mb-4">Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="text-slate-600 text-sm">No activity yet. Start by registering or simulating a transfer.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#2d3148] last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item.type === 'transfer'
                        ? 'bg-green-400'
                        : item.type === 'announce'
                        ? 'bg-blue-400'
                        : item.type === 'register'
                        ? 'bg-yellow-400'
                        : 'bg-purple-400'
                    }`}
                  />
                  <span className="text-slate-400 text-sm">{item.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  {item.txHash && (
                    <a
                      href={`https://testnet.snowtrace.io/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && address && (
        <SimulateTransferModal
          senderAddress={address}
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  )
}

import { CheckCircle, XCircle, Users, ExternalLink } from 'lucide-react'
import type { AnnounceResponse } from '../utils/api'

interface AnnounceCardProps {
  result: AnnounceResponse
  onClose: () => void
}

export default function AnnounceCard({ result, onClose }: AnnounceCardProps) {
  const isAllowed = result.status === 'allowed'

  return (
    <div
      className={`w-full rounded-xl border p-6 ${
        isAllowed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {isAllowed ? (
            <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400 shrink-0" />
          )}
          <div>
            <h3 className={`text-xl font-bold ${isAllowed ? 'text-green-400' : 'text-red-400'}`}>
              {isAllowed ? 'Access Granted' : 'Access Denied'}
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">{result.message}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors text-sm"
        >
          Close
        </button>
      </div>

      {isAllowed && result.peers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">
              {result.peerCount ?? result.peers.length} Active Peer{result.peers.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {result.peers.map((peer, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-[#1a1d2e] rounded-lg px-3 py-2"
              >
                <span className="font-mono text-xs text-slate-400">
                  {peer.address.slice(0, 6)}…{peer.address.slice(-4)}
                </span>
                <a
                  href={`https://testnet.snowtrace.io/address/${peer.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAllowed && result.peers.length === 0 && (
        <div className="text-slate-500 text-sm">
          No other peers in swarm yet. Be the first seeder!
        </div>
      )}

      {!isAllowed && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-[#1a1d2e] rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">Your Ratio</p>
            <p className="text-red-400 font-bold text-lg">
              {result.ratio !== null ? result.ratio.toFixed(3) : 'N/A'}
            </p>
          </div>
          <div className="bg-[#1a1d2e] rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">Upload</p>
            <p className="text-slate-300 font-bold text-lg">
              {result.uploadGB !== undefined ? result.uploadGB.toFixed(3) : '—'} GB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

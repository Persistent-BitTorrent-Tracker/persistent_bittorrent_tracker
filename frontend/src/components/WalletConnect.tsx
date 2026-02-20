import { Zap, Shield, Database } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'

export default function WalletConnect() {
  const { connect, isConnecting } = useWallet()

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-6">
      {/* Logo / Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <Zap className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PBTS</h1>
        </div>
        <p className="text-slate-400 text-lg max-w-md">
          Persistent BitTorrent Tracker System
        </p>
        <p className="text-slate-500 text-sm mt-2 max-w-sm">
          Blockchain-backed reputation for private trackers. Verified. Portable. Permanent.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-2xl w-full">
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 text-center">
          <Shield className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <h3 className="text-white font-medium text-sm">Cryptographic Receipts</h3>
          <p className="text-slate-500 text-xs mt-1">ECDSA-signed transfer proofs</p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 text-center">
          <Database className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <h3 className="text-white font-medium text-sm">On-Chain Reputation</h3>
          <p className="text-slate-500 text-xs mt-1">Survives server restarts</p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 text-center">
          <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <h3 className="text-white font-medium text-sm">Zero Local State</h3>
          <p className="text-slate-500 text-xs mt-1">Stateless tracker architecture</p>
        </div>
      </div>

      {/* Connect Button */}
      <button
        onClick={connect}
        disabled={isConnecting}
        className="flex items-center gap-3 bg-green-500 hover:bg-green-400 disabled:bg-green-800 disabled:cursor-not-allowed text-black font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
      >
        {isConnecting ? (
          <>
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
              alt="MetaMask"
              className="w-6 h-6"
            />
            Connect MetaMask
          </>
        )}
      </button>

      <p className="mt-4 text-slate-600 text-sm">Avalanche Fuji Testnet</p>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { X, Send, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiReport, type ReportResponse } from '../utils/api'
import { useWallet } from '../hooks/useWallet'

const PIECE_SIZES = [
  { label: '256 KB', bytes: 262144 },
  { label: '512 KB', bytes: 524288 },
  { label: '1 MB', bytes: 1048576 },
  { label: '2 MB', bytes: 2097152 },
]

const TEST_INFOHASH = '0x' + 'ab'.repeat(32)
const TEST_RECEIVERS = [
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
]

type Step = 'idle' | 'signing' | 'submitting' | 'done'

interface Props {
  senderAddress: string
  onClose: () => void
  onSuccess: (result: ReportResponse) => void
}

export default function SimulateTransferModal({ senderAddress, onClose, onSuccess }: Props) {
  const { signMessage } = useWallet()
  const [receiver, setReceiver] = useState(TEST_RECEIVERS[0])
  const [customReceiver, setCustomReceiver] = useState('')
  const [pieceSizeIdx, setPieceSizeIdx] = useState(2)
  const [step, setStep] = useState<Step>('idle')
  const [receiptPreview, setReceiptPreview] = useState<string>('')

  const pieceSize = PIECE_SIZES[pieceSizeIdx].bytes
  const effectiveReceiver = receiver === 'custom' ? customReceiver : receiver

  useEffect(() => {
    const preview = {
      infohash: TEST_INFOHASH,
      sender: senderAddress,
      receiver: effectiveReceiver,
      pieceHash: ethers.keccak256(ethers.toUtf8Bytes(`piece-${pieceSizeIdx}`)),
      pieceIndex: pieceSizeIdx,
      pieceSize,
      timestamp: Math.floor(Date.now() / 1000),
    }
    setReceiptPreview(JSON.stringify(preview, null, 2))
  }, [effectiveReceiver, pieceSizeIdx, pieceSize, senderAddress])

  async function handleSimulate() {
    if (effectiveReceiver.toLowerCase() === senderAddress.toLowerCase()) {
      toast.error('Receiver cannot be the same as sender')
      return
    }
    if (!ethers.isAddress(effectiveReceiver)) {
      toast.error('Invalid receiver address')
      return
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const pieceHash = ethers.keccak256(ethers.toUtf8Bytes(`piece-${pieceSizeIdx}`))

    const packed = ethers.solidityPacked(
      ['string', 'address', 'address', 'bytes32', 'uint256', 'uint256', 'uint256'],
      [TEST_INFOHASH, senderAddress, effectiveReceiver, pieceHash, pieceSizeIdx, pieceSize, timestamp]
    )
    const receiptHash = ethers.keccak256(packed)

    setStep('signing')
    let signature: string
    try {
      signature = await signMessage(receiptHash)
    } catch {
      toast.error('User rejected signature')
      setStep('idle')
      return
    }

    setStep('submitting')
    try {
      const result = await apiReport({
        infohash: TEST_INFOHASH,
        sender: senderAddress,
        receiver: effectiveReceiver,
        pieceHash,
        pieceIndex: pieceSizeIdx,
        pieceSize,
        timestamp,
        signature,
      })
      setStep('done')
      toast.success('Transfer recorded on-chain!')
      onSuccess(result)
    } catch (err: unknown) {
      const e = err as Error
      toast.error(e.message || 'Failed to submit transfer')
      setStep('idle')
    }
  }

  const stepLabels: Record<Step, string> = {
    idle: 'Simulate Transfer',
    signing: 'Waiting for MetaMask…',
    submitting: 'Submitting to chain…',
    done: 'Transfer Complete!',
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2d3148]">
          <h2 className="text-white font-bold text-lg">Simulate Transfer</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Sender */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Sender (you)</label>
            <div className="font-mono text-xs text-slate-300 bg-[#0f1117] rounded-lg px-3 py-2 border border-[#2d3148]">
              {senderAddress}
            </div>
          </div>

          {/* Receiver */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Receiver Address</label>
            <select
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2d3148] rounded-lg px-3 py-2 text-slate-300 text-sm font-mono mb-2 focus:outline-none focus:border-green-500/50"
            >
              {TEST_RECEIVERS.map((addr) => (
                <option key={addr} value={addr}>
                  {addr.slice(0, 10)}…{addr.slice(-6)} (test)
                </option>
              ))}
              <option value="custom">Custom address…</option>
            </select>
            {receiver === 'custom' && (
              <input
                type="text"
                placeholder="0x..."
                value={customReceiver}
                className="w-full bg-[#0f1117] border border-[#2d3148] rounded-lg px-3 py-2 text-slate-300 text-sm font-mono focus:outline-none focus:border-green-500/50"
                onChange={(e) => setCustomReceiver(e.target.value)}
              />
            )}
          </div>

          {/* Piece Size */}
          <div>
            <label className="text-slate-400 text-sm block mb-2">
              Piece Size: <span className="text-white font-medium">{PIECE_SIZES[pieceSizeIdx].label}</span>
            </label>
            <div className="flex gap-2">
              {PIECE_SIZES.map((ps, i) => (
                <button
                  key={i}
                  onClick={() => setPieceSizeIdx(i)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    i === pieceSizeIdx
                      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-[#0f1117] border border-[#2d3148] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ps.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infohash */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Infohash</label>
            <div className="font-mono text-xs text-slate-500 bg-[#0f1117] rounded-lg px-3 py-2 border border-[#2d3148] truncate">
              {TEST_INFOHASH}
            </div>
          </div>

          {/* Receipt Preview */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Receipt Preview</label>
            <pre className="text-xs text-slate-500 bg-[#0f1117] rounded-lg p-3 border border-[#2d3148] overflow-auto max-h-36 font-mono leading-relaxed">
              {receiptPreview}
            </pre>
          </div>

          {/* Step indicator */}
          {step !== 'idle' && (
            <div className="flex items-center gap-3 py-2">
              {step === 'done' ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />
              )}
              <span className={`text-sm font-medium ${step === 'done' ? 'text-green-400' : 'text-blue-400'}`}>
                {step === 'signing' && 'Step 1/3: Sign receipt in MetaMask…'}
                {step === 'submitting' && 'Step 2/3: Submitting to blockchain…'}
                {step === 'done' && 'Step 3/3: Reputation updated!'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-[#2d3148]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#2d3148] text-slate-400 hover:text-slate-300 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSimulate}
            disabled={step !== 'idle'}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-green-900 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
          >
            {step === 'idle' ? (
              <>
                <Send className="w-4 h-4" />
                Simulate Transfer
              </>
            ) : step === 'done' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {stepLabels[step]}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

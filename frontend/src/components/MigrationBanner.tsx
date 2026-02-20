import { ArrowRight, X } from 'lucide-react'

interface MigrationBannerProps {
  oldContract: string
  newContract: string
  onDismiss: () => void
}

export default function MigrationBanner({ oldContract, newContract, onDismiss }: MigrationBannerProps) {
  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
        <p className="text-blue-300 text-sm font-medium">
          Contract Migrated
        </p>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{short(oldContract)}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-green-400">{short(newContract)}</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}


import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Download,
  ArrowUpDown,
  Film,
  Music,
  Package,
  FileText,
  FileIcon,
  Users,
  ChevronUp,
  ChevronDown,
  X,
  HardDrive,
  Loader2,
  RefreshCw,
} from "lucide-react"
import type { TorrentInfo } from "@/lib/api"
import type { DemoTorrent } from "@/lib/pbts-store"
import { formatBytes } from "@/lib/pbts-types"

type SortKey = "name" | "size" | "peerCount"
type SortDir = "asc" | "desc"

type DisplayTorrent = TorrentInfo & {
  name?: string
  size?: number
  category?: "video" | "audio" | "software" | "documents" | "other"
}

const CATEGORY_ICONS: Record<string, typeof Film> = {
  video: Film,
  audio: Music,
  software: Package,
  documents: FileText,
  other: FileIcon,
}

function isDemoTorrent(t: TorrentInfo): t is DemoTorrent {
  return "name" in t
}

interface TorrentsBrowserProps {
  torrents: TorrentInfo[]
  isLoading: boolean
  onRefresh: () => void
  onAnnounce: (infohash: string) => void
  isAnnouncing: boolean
  announcingHash: string | null
  walletConnected: boolean
  isRegistered: boolean
}

export function TorrentsBrowser({
  torrents,
  isLoading,
  onRefresh,
  onAnnounce,
  isAnnouncing,
  announcingHash,
  walletConnected,
  isRegistered,
}: TorrentsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("peerCount")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const filteredTorrents = useMemo(() => {
    let result: DisplayTorrent[] = torrents

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.infohash.toLowerCase().includes(q) ||
          (isDemoTorrent(t) && t.name.toLowerCase().includes(q))
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = ((a as DisplayTorrent).name ?? a.infohash).localeCompare(
            (b as DisplayTorrent).name ?? b.infohash
          )
          break
        case "size":
          cmp = ((a as DisplayTorrent).size ?? 0) - ((b as DisplayTorrent).size ?? 0)
          break
        case "peerCount":
          cmp = a.peerCount - b.peerCount
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [torrents, searchQuery, sortKey, sortDir])

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortKey(key)
        setSortDir("desc")
      }
    },
    [sortKey]
  )

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    )
  }

  const totalPeers = torrents.reduce((acc, t) => acc + t.peerCount, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <HardDrive className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Total Torrents:</span>
          <span className="text-xs font-semibold text-foreground">{torrents.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <Users className="h-4 w-4 text-success" />
          <span className="text-xs text-muted-foreground">Total Peers:</span>
          <span className="text-xs font-semibold text-foreground">{totalPeers}</span>
        </div>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or infohash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      {/* Torrent table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Table header */}
        <div className="bg-secondary/50 border-b border-border">
          <div className="grid grid-cols-[1fr_100px_90px_100px] lg:grid-cols-[1fr_120px_100px_130px] items-center px-4 py-2.5">
            <button
              onClick={() => handleSort("name")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              Name <SortIcon column="name" />
            </button>
            <button
              onClick={() => handleSort("size")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Size <SortIcon column="size" />
            </button>
            <button
              onClick={() => handleSort("peerCount")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Peers <SortIcon column="peerCount" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground text-right">
              Actions
            </span>
          </div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-border">
          {isLoading && torrents.length === 0 ? (
            <div className="px-4 py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading torrents...</p>
            </div>
          ) : filteredTorrents.length === 0 ? (
            <div className="px-4 py-12 flex flex-col items-center gap-3">
              {torrents.length === 0 ? (
                <>
                  <Download className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No torrents in the swarm yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Register content on the Dashboard tab to add torrents.
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No torrents found matching your search.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredTorrents.map((torrent) => {
              const isThisAnnouncing =
                isAnnouncing && announcingHash === torrent.infohash
              const hasMetadata = isDemoTorrent(torrent)
              const Icon = hasMetadata
                ? CATEGORY_ICONS[torrent.category] ?? FileIcon
                : FileIcon

              return (
                <div
                  key={torrent.infohash}
                  className="grid grid-cols-[1fr_100px_90px_100px] lg:grid-cols-[1fr_120px_100px_130px] items-center px-4 py-3 hover:bg-secondary/30 transition-colors"
                >
                  {/* Name + infohash */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {hasMetadata ? torrent.name : `Torrent ${torrent.infohash.slice(0, 8)}...`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                          {torrent.infohash.slice(0, 12)}...
                        </span>
                        {torrent.peerCount > 100 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-success/30 text-success bg-success/5 px-1.5 py-0"
                          >
                            Popular
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Size */}
                  <span className="text-xs font-mono text-muted-foreground">
                    {hasMetadata ? formatBytes(torrent.size) : "—"}
                  </span>

                  {/* Peers */}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-success font-medium">
                      {torrent.peerCount}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAnnounce(torrent.infohash)}
                      disabled={isAnnouncing || !walletConnected || !isRegistered}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1.5"
                    >
                      {isThisAnnouncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden lg:inline">Announce</span>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredTorrents.length} of {torrents.length} torrents
        </span>
      </div>
    </div>
  )
}

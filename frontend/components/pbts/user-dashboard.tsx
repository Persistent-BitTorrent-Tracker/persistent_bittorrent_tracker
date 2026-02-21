import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Shield,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Radio,
  Upload,
  Loader2,
  Wallet,
  CheckCircle2,
  XCircle,
  Server,
  Sun,
  Moon,
  Copy,
  Check,
  RefreshCw,
  Users,
  Download,
  Tag,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useWallet } from "@/hooks/useWallet"
import {
  announce as apiAnnounce,
  registerUser as apiRegisterUser,
  checkHealth,
  getReputation,
  getTorrents,
  type TorrentInfo,
} from "@/lib/api"
import {
  formatBytes,
  shortenAddress,
  getRatioColor,
  getRatioBgColor,
  getRatioLabel,
} from "@/lib/pbts-types"

interface UserDashboardProps {
  onBack: () => void
}

export function UserDashboard({ onBack }: UserDashboardProps) {
  const wallet = useWallet()
  const { theme, setTheme } = useTheme()
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  // Reputation state
  const [uploadBytes, setUploadBytes] = useState(0)
  const [downloadBytes, setDownloadBytes] = useState(0)
  const [ratio, setRatio] = useState(0)
  const [isRegistered, setIsRegistered] = useState(false)

  // Torrent listing
  const [torrents, setTorrents] = useState<TorrentInfo[]>([])
  const [isLoadingTorrents, setIsLoadingTorrents] = useState(false)

  // Action states
  const [isAnnouncing, setIsAnnouncing] = useState(false)
  const [announcingHash, setAnnouncingHash] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerInfohash, setRegisterInfohash] = useState("")

  // Announce result
  const [announceResult, setAnnounceResult] = useState<{
    infohash: string
    status: "allowed" | "blocked"
    peers: { ip: string; port: number }[]
    ratio: number
    message: string
  } | null>(null)

  // Check backend health + load torrents
  useEffect(() => {
    checkHealth().then(setBackendOnline)
    loadTorrents()
  }, [])

  // Load reputation when wallet is connected
  useEffect(() => {
    if (!wallet.address) return
    loadReputation(wallet.address)
  }, [wallet.address])

  async function loadReputation(address: string) {
    try {
      const rep = await getReputation(address)
      setUploadBytes(parseInt(rep.uploadBytes, 10))
      setDownloadBytes(parseInt(rep.downloadBytes, 10))
      setRatio(rep.ratio ?? Infinity)
      setIsRegistered(rep.isRegistered)
    } catch {
      // Backend may be offline
    }
  }

  async function loadTorrents() {
    setIsLoadingTorrents(true)
    const data = await getTorrents()
    setTorrents(data)
    setIsLoadingTorrents(false)
  }

  const handleConnect = useCallback(async () => {
    await wallet.connect()
  }, [wallet])

  const handleCopy = useCallback(async () => {
    if (!wallet.address) return
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [wallet.address])

  // Announce: query the tracker for a specific torrent
  const handleAnnounce = useCallback(async (infohash: string) => {
    if (!wallet.address) {
      toast.error("Connect your wallet first")
      return
    }
    if (!isRegistered) {
      toast.error("You must register first")
      return
    }

    setIsAnnouncing(true)
    setAnnouncingHash(infohash)
    setAnnounceResult(null)

    const message = `PBTS announce ${infohash} started by ${wallet.address} at ${Date.now()}`

    try {
      const signature = await wallet.signMessage(message)
      const result = await apiAnnounce(wallet.address, infohash, "started", message, signature)

      const display = {
        infohash,
        status: result.status,
        peers:
          result.status === "allowed"
            ? result.peers.map((p) => ({
                ip: p.peerId ?? p.address.slice(0, 10),
                port: 6881,
              }))
            : [],
        ratio: result.ratio !== null ? result.ratio : Infinity,
        message: result.message,
      } as const

      setAnnounceResult(display)

      if (result.status === "allowed") {
        setUploadBytes(parseInt(result.uploadBytes, 10))
        setDownloadBytes(parseInt(result.downloadBytes, 10))
        setRatio(result.ratio !== null ? result.ratio : Infinity)
        toast.success("Access Granted!", {
          description: `${result.peerCount} peers available for download`,
        })
      } else {
        toast.error("Access Denied", { description: result.message })
      }

      // Refresh torrent list after announce (swarm may have changed)
      await loadTorrents()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toast.error("Announce failed", { description: errMsg })
    }

    setIsAnnouncing(false)
    setAnnouncingHash(null)
  }, [wallet, isRegistered])

  // Register: tell the tracker you have content to share (seeder)
  // This registers your account on-chain, then announces the infohash so you join the swarm
  const handleRegister = useCallback(async () => {
    if (!wallet.address) {
      toast.error("Connect your wallet first")
      return
    }

    setIsRegistering(true)

    const message = `Register PBTS account for ${wallet.address} at ${Date.now()}`

    try {
      const signature = await wallet.signMessage(message)
      await apiRegisterUser(wallet.address, message, signature)
      toast.success("Registered on-chain!", {
        description: "1 GB initial credit granted. You can now announce torrents.",
      })
      setIsRegistered(true)
      await loadReputation(wallet.address)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.toLowerCase().includes("already registered")) {
        toast.info("Already registered", { description: "Your account is already active." })
        setIsRegistered(true)
        await loadReputation(wallet.address)
      } else {
        toast.error("Registration failed", { description: errMsg })
      }
    }

    setIsRegistering(false)
  }, [wallet])

  // Register content: register account (if needed) + announce infohash as seeder
  const handleRegisterContent = useCallback(async () => {
    if (!wallet.address) {
      toast.error("Connect your wallet first")
      return
    }

    const infohash = registerInfohash.trim()
    if (!infohash) {
      toast.error("Enter an infohash for the content you want to share")
      return
    }

    // If not registered, register first
    if (!isRegistered) {
      await handleRegister()
    }

    // Now announce as seeder
    await handleAnnounce(infohash)
    setRegisterInfohash("")
  }, [wallet, registerInfohash, isRegistered, handleRegister, handleAnnounce])

  const displayRatio = ratio === Infinity ? "INF" : ratio.toFixed(2)
  const maxBytes = Math.max(uploadBytes, downloadBytes, 1073741824)
  const uploadPercent = (uploadBytes / (maxBytes * 1.2)) * 100
  const downloadPercent = (downloadBytes / (maxBytes * 1.2)) * 100

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">PBTS</span>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
              User
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs font-mono hidden sm:flex ${
                backendOnline === null
                  ? "border-border text-muted-foreground"
                  : backendOnline
                    ? "border-success/30 text-success bg-success/5"
                    : "border-destructive/30 text-destructive bg-destructive/5"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  backendOnline === null
                    ? "bg-muted-foreground animate-pulse"
                    : backendOnline
                      ? "bg-success"
                      : "bg-destructive"
                }`}
              />
              {backendOnline === null ? "checking..." : backendOnline ? "backend online" : "backend offline"}
            </Badge>

            {wallet.address && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border hover:border-primary/30 transition-colors"
              >
                <span className="text-sm font-mono text-foreground">
                  {shortenAddress(wallet.address)}
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Connect wallet prompt */}
        {!wallet.address && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <Wallet className="h-8 w-8 text-primary" />
              <p className="text-sm text-foreground font-medium">Connect your wallet to interact with the tracker</p>
              <Button onClick={handleConnect} disabled={wallet.isConnecting} className="gap-2">
                {wallet.isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reputation display */}
        {wallet.address && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Reputation Ratio
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-bold font-mono tracking-tight ${getRatioColor(ratio)}`}>
                    {displayRatio}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${getRatioBgColor(ratio)}/10 border-current ${getRatioColor(ratio)} text-xs`}
                  >
                    {getRatioLabel(ratio)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.0</span>
                    <span>0.5 min</span>
                    <span>1.0</span>
                    <span>2.0+</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${getRatioBgColor(ratio)}`}
                      style={{
                        width: `${Math.min((ratio === Infinity ? 2.5 : ratio) / 2.5 * 100, 100)}%`,
                      }}
                    />
                    <div className="absolute top-0 h-full w-px bg-foreground/30" style={{ left: "20%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-success" />
                  Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <span className="text-3xl font-bold font-mono text-foreground">
                  {formatBytes(uploadBytes)}
                </span>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: `${uploadPercent}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-chart-2" />
                  Download
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <span className="text-3xl font-bold font-mono text-foreground">
                  {formatBytes(downloadBytes)}
                </span>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-chart-2 transition-all duration-700" style={{ width: `${downloadPercent}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action cards: Register account + Register content */}
        {wallet.address && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Register account */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Register Account
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  Register your wallet with the tracker to create your on-chain reputation
                  record. You get 1 GB initial credit.
                </p>
                {isRegistered && (
                  <Badge variant="outline" className="w-fit border-success/30 text-success bg-success/5 text-xs">
                    Already Registered
                  </Badge>
                )}
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering || isRegistered}
                  className="w-full gap-2"
                >
                  {isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isRegistered ? "Registered" : isRegistering ? "Registering..." : "Register"}
                </Button>
              </CardContent>
            </Card>

            {/* Register content (become a seeder) */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Register Content (Seed)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  Tell the tracker you have content available for sharing. Enter the infohash
                  of the torrent you want to seed. This adds you to the swarm.
                </p>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">Infohash</Label>
                  <Input
                    placeholder="0x... enter the torrent infohash"
                    value={registerInfohash}
                    onChange={(e) => setRegisterInfohash(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <Button
                  onClick={handleRegisterContent}
                  disabled={isAnnouncing || !registerInfohash.trim()}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {isAnnouncing && announcingHash === registerInfohash.trim() ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Register as Seeder
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Available Torrents */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Download className="h-4 w-4" />
                Available Torrents
                {torrents.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {torrents.length} torrent{torrents.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadTorrents}
                disabled={isLoadingTorrents}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingTorrents ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTorrents && torrents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm">Loading torrents...</p>
              </div>
            ) : torrents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Download className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">No torrents in the swarm yet</p>
                <p className="text-xs mt-1">
                  Register content above to add torrents, or wait for others to seed.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {torrents.map((torrent) => {
                    const isThisAnnouncing = isAnnouncing && announcingHash === torrent.infohash

                    const TOKEN_DECIMALS: Record<string, number> = { ETH: 18, WETH: 18, USDC: 6, UNI: 18 }
                    const formatTokenAmount = (amount: string, symbol: string) => {
                      const decimals = TOKEN_DECIMALS[symbol] ?? 18
                      const human = Number(amount) / 10 ** decimals
                      return human % 1 === 0 ? human.toString() : human.toFixed(decimals === 6 ? 2 : 4).replace(/0+$/, "").replace(/\.$/, "")
                    }

                    const shortHash = torrent.infohash.length > 16
                      ? `${torrent.infohash.slice(0, 10)}...${torrent.infohash.slice(-6)}`
                      : torrent.infohash

                    return (
                      <div
                        key={torrent.infohash}
                        className="rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            {torrent.description && (
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {torrent.description}
                              </p>
                            )}
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5" title={torrent.infohash}>
                              {shortHash}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAnnounce(torrent.infohash)}
                            disabled={isAnnouncing || !wallet.address || !isRegistered}
                            className="shrink-0 gap-1.5 h-7 text-xs"
                          >
                            {isThisAnnouncing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            Announce
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] gap-1 font-normal">
                            <Users className="h-2.5 w-2.5" />
                            {torrent.peerCount} peer{torrent.peerCount !== 1 ? "s" : ""}
                          </Badge>
                          {torrent.listed && torrent.tokenSymbol && torrent.tokenAmount && (
                            <Badge variant="outline" className="text-[10px] gap-1 font-normal border-chart-4/50 text-chart-4">
                              <Tag className="h-2.5 w-2.5" />
                              {formatTokenAmount(torrent.tokenAmount, torrent.tokenSymbol)} {torrent.tokenSymbol}
                              {torrent.priceUSDC != null && (
                                <span className="text-muted-foreground">~${torrent.priceUSDC.toLocaleString()}</span>
                              )}
                            </Badge>
                          )}
                          {torrent.listed && (
                            <Badge variant="outline" className="text-[10px] font-normal border-chart-4/30 text-chart-4/80">
                              Marketplace
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Announce result */}
        {announceResult && (
          <Card className={announceResult.status === "allowed" ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}>
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  announceResult.status === "allowed"
                    ? "bg-success/10 border border-success/20"
                    : "bg-destructive/10 border border-destructive/20"
                }`}>
                  {announceResult.status === "allowed" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className={`text-lg font-semibold ${
                    announceResult.status === "allowed" ? "text-success" : "text-destructive"
                  }`}>
                    {announceResult.status === "allowed" ? "Access Granted" : "Access Denied"}
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">{announceResult.infohash}</p>
                  <p className="text-sm text-muted-foreground">{announceResult.message}</p>
                  <Badge
                    variant="outline"
                    className={`w-fit text-xs mt-1 ${
                      announceResult.status === "allowed"
                        ? "border-success/30 text-success"
                        : "border-destructive/30 text-destructive"
                    }`}
                  >
                    Ratio: {announceResult.ratio === Infinity ? "INF" : announceResult.ratio.toFixed(2)}
                  </Badge>
                </div>
              </div>

              {announceResult.status === "allowed" && announceResult.peers.length > 0 && (
                <div className="rounded-md bg-card border border-border p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Radio className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Connected Peers ({announceResult.peers.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {announceResult.peers.map((peer, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border"
                      >
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-foreground">
                          {peer.ip}:{peer.port}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-success ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

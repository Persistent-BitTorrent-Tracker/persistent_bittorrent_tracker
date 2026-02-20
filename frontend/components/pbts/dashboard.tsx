
import { useState, useCallback } from "react"
import { toast } from "sonner"
import { DashboardHeader, type DashboardTab } from "./dashboard-header"
import { MigrationBanner } from "./migration-banner"
import { ReputationDisplay } from "./reputation-display"
import { ActionButtons } from "./action-buttons"
import { SimulateTransferModal } from "./simulate-transfer-modal"
import { AnnounceCard } from "./announce-card"
import { ActivityFeed } from "./activity-feed"
import { FilesBrowser } from "./files-browser"
import type { UserReputation, ActivityItem, AnnounceResult, ContractInfo } from "@/lib/pbts-types"
import { formatBytes, shortenAddress } from "@/lib/pbts-types"
import {
  createInitialReputation,
  simulateTransfer,
  createActivity,
  getContractInfo,
  generateMockInfohash,
} from "@/lib/pbts-store"
import { announce as apiAnnounce } from "@/lib/api"
import { useWallet } from "@/hooks/useWallet"

interface DashboardProps {
  address: string
  onDisconnect: () => void
}

export function Dashboard({ address, onDisconnect }: DashboardProps) {
  const wallet = useWallet()
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard")
  const [reputation, setReputation] = useState<UserReputation>(
    createInitialReputation(address)
  )
  const [activities, setActivities] = useState<ActivityItem[]>([
    createActivity("register", `Account registered with 1 GB initial credit`),
  ])
  const [contractInfo, setContractInfo] = useState<ContractInfo>(
    getContractInfo(false)
  )
  const [announceResult, setAnnounceResult] = useState<AnnounceResult | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isAnnouncing, setIsAnnouncing] = useState(false)

  const handleTransferComplete = useCallback(
    (receiverAddress: string, pieceSize: number) => {
      const newRep = simulateTransfer(reputation, pieceSize, true)
      setReputation(newRep)

      const activity = createActivity(
        "transfer",
        `Transferred ${formatBytes(pieceSize)} to ${shortenAddress(receiverAddress)}`
      )
      setActivities((prev) => [activity, ...prev])

      toast.success("Transfer recorded on-chain!", {
        description: `New ratio: ${newRep.ratio === Infinity ? "INF" : newRep.ratio.toFixed(2)}`,
      })
    },
    [reputation]
  )

  const handleAnnounce = useCallback(async () => {
    setIsAnnouncing(true)
    setAnnounceResult(null)

    const infohash = generateMockInfohash()
    const message = `PBTS announce ${infohash} started by ${address} at ${Date.now()}`

    try {
      const signature = await wallet.signMessage(message)
      const result = await apiAnnounce(address, infohash, "started", message, signature)

      const announceDisplay: AnnounceResult = {
        status: result.status,
        peers:
          result.status === "allowed"
            ? result.peers.map((p) => ({
                ip: p.peerId ?? p.address.slice(0, 10),
                port: 6881,
              }))
            : [],
        ratio:
          result.ratio !== null
            ? result.ratio
            : Infinity,
        message: result.message,
      }

      setAnnounceResult(announceDisplay)

      const activity = createActivity(
        "announce",
        result.status === "allowed"
          ? `Announce succeeded — ${result.peerCount} peers returned`
          : `Announce blocked — insufficient ratio`,
        result.status === "allowed" ? "success" : "error"
      )
      setActivities((prev) => [activity, ...prev])

      if (result.status === "allowed") {
        // Update local reputation from backend data
        setReputation((prev) => ({
          ...prev,
          uploadBytes: parseInt(result.uploadBytes, 10),
          downloadBytes: parseInt(result.downloadBytes, 10),
          ratio:
            result.ratio !== null
              ? result.ratio
              : Infinity,
        }))
        toast.success("Access Granted!", {
          description: `${result.peerCount} peers available for download`,
        })
      } else {
        toast.error("Access Denied", {
          description: result.message,
        })
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      // If backend is unavailable, fall back to local simulation
      if (errMsg.includes("Failed to fetch") || errMsg.includes("fetch")) {
        toast.warning("Backend unavailable — showing demo result", {
          description: "Start the backend server to use live data.",
        })
        const { simulateAnnounce } = await import("@/lib/pbts-store")
        const result = simulateAnnounce(reputation)
        setAnnounceResult(result)
        const activity = createActivity(
          "announce",
          result.status === "allowed"
            ? `Announce succeeded (demo) — ${result.peers.length} peers`
            : `Announce blocked (demo)`,
          result.status === "allowed" ? "success" : "error"
        )
        setActivities((prev) => [activity, ...prev])
      } else {
        toast.error("Announce failed", { description: errMsg })
      }
    }

    setIsAnnouncing(false)
  }, [address, reputation, wallet])

  const handleServerRestart = useCallback(async () => {
    setIsRestarting(true)

    toast.info("Server shutting down...", {
      description: "Simulating tracker restart",
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast.info("Server offline", {
      description: "All local state wiped",
    })

    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Server comes back — reputation unchanged (from blockchain)
    toast.success("Server restarted!", {
      description: "Reputation restored from blockchain - no data loss!",
    })

    const activity = createActivity(
      "register",
      `Server restarted — reputation persisted via blockchain`
    )
    setActivities((prev) => [activity, ...prev])
    setIsRestarting(false)
  }, [])

  const handleFileTransfer = useCallback(
    (fileName: string, size: number) => {
      const newRep = simulateTransfer(reputation, size, false)
      setReputation(newRep)

      const activity = createActivity(
        "transfer",
        `Downloaded ${formatBytes(size)} — ${fileName}`
      )
      setActivities((prev) => [activity, ...prev])
    },
    [reputation]
  )

  const handleMigrate = useCallback(async () => {
    toast.info("Initiating contract migration...", {
      description: "Deploying new contract via RepFactory",
    })

    await new Promise((resolve) => setTimeout(resolve, 2500))

    const newInfo = getContractInfo(true)
    setContractInfo(newInfo)

    const activity = createActivity(
      "migration",
      `Migrated to new contract — reputation preserved`
    )
    setActivities((prev) => [activity, ...prev])

    toast.success("Migration complete!", {
      description: "Reputation carried over to new contract",
    })
  }, [])

  const signMessage = useCallback(
    (message: string | Uint8Array): Promise<string> => wallet.signMessage(message),
    [wallet]
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader
        address={address}
        network={contractInfo.network}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDisconnect={onDisconnect}
      />

      {/* Mobile tab switcher */}
      <div className="sm:hidden flex border-b border-border bg-card/50">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "dashboard"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "files"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Files
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {activeTab === "dashboard" ? (
          <>
            {/* Migration banner */}
            <MigrationBanner contractInfo={contractInfo} />

            {/* Reputation stats */}
            <ReputationDisplay reputation={reputation} />

            {/* Action buttons */}
            <ActionButtons
              onSimulateTransfer={() => setTransferModalOpen(true)}
              onAnnounce={handleAnnounce}
              onMigrate={handleMigrate}
              onServerRestart={handleServerRestart}
              isMigrated={!!contractInfo.migratedFrom}
              isRestarting={isRestarting}
              isAnnouncing={isAnnouncing}
            />

            {/* Announce result */}
            {announceResult && <AnnounceCard result={announceResult} />}

            {/* Activity feed */}
            <ActivityFeed activities={activities} />
          </>
        ) : (
          <FilesBrowser
            address={address}
            onTransferTriggered={handleFileTransfer}
          />
        )}
      </main>

      {/* Transfer modal */}
      <SimulateTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        senderAddress={address}
        signMessage={signMessage}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  )
}

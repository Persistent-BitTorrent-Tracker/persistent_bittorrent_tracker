"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  Shield,
  ArrowUpDown,
  Globe,
  Loader2,
  ChevronRight,
} from "lucide-react"

interface WalletConnectProps {
  onConnect: (address: string) => void
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [step, setStep] = useState<"idle" | "connecting" | "registering">("idle")

  const handleConnect = async () => {
    setIsConnecting(true)
    setStep("connecting")

    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setStep("registering")

    // Simulate on-chain registration
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    onConnect(mockAddress)
  }

  const features = [
    {
      icon: Shield,
      title: "Cryptographic Attestation",
      description: "Downloaders sign receipts for received pieces. No fake uploads.",
    },
    {
      icon: ArrowUpDown,
      title: "Persistent Reputation",
      description: "Upload/download ratios stored on-chain. Survives tracker shutdowns.",
    },
    {
      icon: Globe,
      title: "Censorship Resistant",
      description: "Blockchain replaces centralized databases. No single point of failure.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(oklch(0.2_0.008_260)_1px,transparent_1px),linear-gradient(to_right,oklch(0.2_0.008_260)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              PBTS
            </h1>
          </div>
          <p className="text-lg text-muted-foreground text-center text-balance leading-relaxed">
            Persistent BitTorrent Tracker System
          </p>
          <Badge
            variant="outline"
            className="text-xs font-mono border-primary/30 text-primary bg-primary/5"
          >
            Avalanche Fuji Testnet
          </Badge>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
            >
              <feature.icon className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Connect button area */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {step === "idle" && (
            <Button
              size="lg"
              onClick={handleConnect}
              className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-3"
            >
              <Wallet className="h-5 w-5" />
              Connect MetaMask
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          )}

          {step === "connecting" && (
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card w-full">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-sm text-foreground font-medium">
                Connecting to MetaMask...
              </p>
              <p className="text-xs text-muted-foreground">
                Please approve the connection in your wallet
              </p>
            </div>
          )}

          {step === "registering" && (
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg border border-primary/30 bg-primary/5 w-full">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-sm text-foreground font-medium">
                Registering on-chain...
              </p>
              <p className="text-xs text-muted-foreground">
                Creating your account with 1 GB initial credit
              </p>
            </div>
          )}

          {step === "idle" && (
            <p className="text-xs text-muted-foreground text-center">
              Connect your wallet to register and start building reputation.
              <br />
              Server pays gas fees — no AVAX required.
            </p>
          )}
        </div>

        {/* Network info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>Chain ID: 43113</span>
          <span className="text-border">|</span>
          <span>Avalanche Fuji C-Chain</span>
        </div>
      </div>
    </div>
  )
}

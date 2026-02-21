import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  ArrowUpDown,
  Globe,
  User,
  Server,
  Sun,
  Moon,
  ShoppingCart,
} from "lucide-react"
import { useTheme } from "next-themes"
import type { AppView } from "@/src/App"

interface LandingPageProps {
  onSelectRole: (role: AppView) => void
}

export function LandingPage({ onSelectRole }: LandingPageProps) {
  const { theme, setTheme } = useTheme()

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
    {
      icon: ShoppingCart,
      title: "Data Marketplace",
      description: "Seeders set prices, buyers pay with any token. Powered by Uniswap.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-4 right-4 z-50 p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-3xl w-full">
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
            Blockchain-Backed Reputation
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
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

        <div className="flex flex-col items-center gap-4 w-full max-w-lg">
          <p className="text-sm text-muted-foreground text-center mb-2">
            Choose your role to continue
          </p>
          <div className="grid grid-cols-3 gap-4 w-full">
            <Button
              size="lg"
              onClick={() => onSelectRole('user')}
              className="h-24 flex-col gap-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <User className="h-6 w-6" />
              <span className="text-sm font-semibold">User</span>
            </Button>
            <Button
              size="lg"
              onClick={() => onSelectRole('tracker')}
              variant="outline"
              className="h-24 flex-col gap-3 border-border text-foreground hover:bg-secondary"
            >
              <Server className="h-6 w-6" />
              <span className="text-sm font-semibold">Tracker</span>
            </Button>
            <Button
              size="lg"
              onClick={() => onSelectRole('marketplace')}
              variant="outline"
              className="h-24 flex-col gap-3 border-chart-4/30 text-foreground hover:bg-chart-4/10"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-sm font-semibold">Marketplace</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            <strong>User:</strong> View your ratio, announce torrents, register content.
            <br />
            <strong>Tracker:</strong> Manage registered users, deploy new contracts.
            <br />
            <strong>Marketplace:</strong> Buy & sell data with any token via Uniswap.
          </p>
        </div>
      </div>
    </div>
  )
}

import { useRef, useState, useEffect, useMemo } from "react"
import type {
  AgentId,
  AgentWithState,
  Connection,
  Particle,
  DemoStep,
  AgentPosition,
} from "@/lib/agent-demo-types"
import { AGENT_POSITIONS } from "@/lib/agent-demo-data"
import { AgentNode } from "./agent-node"
import { CentralHub } from "./central-hub"
import { ConnectionLine } from "./connection-line"
import { DataParticle } from "./data-particle"
import { ProofOverlay } from "./proof-overlay"

interface NetworkCanvasProps {
  agents: Record<AgentId, AgentWithState>
  connections: Connection[]
  particles: Particle[]
  currentStep: DemoStep
  subStep: number
  transferProgress: number
}

function percentToPixel(percent: string, total: number): number {
  return (parseFloat(percent) / 100) * total
}

export function NetworkCanvas({
  agents,
  connections,
  particles,
  currentStep,
  subStep,
  transferProgress,
}: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const hubX = size.width / 2
  const hubY = size.height / 2

  const agentPixelPositions = useMemo(() => {
    const result = {} as Record<AgentId, { x: number; y: number }>
    for (const [id, pos] of Object.entries(AGENT_POSITIONS) as [AgentId, AgentPosition][]) {
      result[id] = {
        x: percentToPixel(pos.x, size.width),
        y: percentToPixel(pos.y, size.height),
      }
    }
    return result
  }, [size.width, size.height])

  // Filter connections — only render those between known agents (not hub placeholder connections)
  const renderableConnections = connections.filter(
    (c) =>
      c.id.startsWith("discovery") ||
      c.id.startsWith("transfer")
  )

  return (
    <div
      ref={canvasRef}
      className="relative flex-1 min-h-[400px] rounded-lg border border-border bg-card/20 overflow-hidden"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* SVG overlay for connections and particles */}
      {size.width > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
          viewBox={`0 0 ${size.width} ${size.height}`}
        >
          <defs>
            <filter id="particle-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Hub connection lines (faint lines from each agent to hub) */}
          {(Object.entries(agentPixelPositions) as [AgentId, { x: number; y: number }][]).map(
            ([id, pos]) =>
              agents[id].state !== "hidden" && (
                <line
                  key={`hub-line-${id}`}
                  x1={pos.x}
                  y1={pos.y}
                  x2={hubX}
                  y2={hubY}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
              )
          )}

          {/* Active connections */}
          {renderableConnections.map((conn) => {
            const from = agentPixelPositions[conn.from]
            const to = agentPixelPositions[conn.to]
            if (!from || !to) return null
            return (
              <ConnectionLine
                key={conn.id}
                fromX={from.x}
                fromY={from.y}
                toX={to.x}
                toY={to.y}
                hubX={hubX}
                hubY={hubY}
                state={conn.state}
                color={conn.color}
                label={conn.label}
              />
            )
          })}

          {/* Data particles during transfer */}
          {currentStep === "transfer" &&
            particles.map((p, i) => {
              const conn = connections.find((c) => c.id === p.connectionId)
              if (!conn) return null
              // Particles flow from source to destination (B -> A)
              const from = agentPixelPositions[conn.from]
              const to = agentPixelPositions[conn.to]
              if (!from || !to) return null
              return (
                <DataParticle
                  key={p.id}
                  fromX={from.x}
                  fromY={from.y}
                  toX={to.x}
                  toY={to.y}
                  hubX={hubX}
                  hubY={hubY}
                  color={p.color}
                  delay={i * 0.3}
                  duration={1.8}
                />
              )
            })}
        </svg>
      )}

      {/* Central hub */}
      <CentralHub currentStep={currentStep} />

      {/* Agent nodes */}
      {(Object.entries(agents) as [AgentId, AgentWithState][]).map(
        ([id, agent]) => (
          <AgentNode
            key={id}
            agent={agent}
            position={AGENT_POSITIONS[id]}
            isYou={id === "A"}
            currentStep={currentStep}
            transferProgress={id === "A" ? transferProgress : 0}
          />
        )
      )}

      {/* Proof overlay */}
      <ProofOverlay
        visible={currentStep === "proof"}
        subStep={subStep}
      />
    </div>
  )
}

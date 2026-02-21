import { useDemoTimeline } from "@/hooks/use-demo-timeline"
import { DemoControlBar } from "./demo-control-bar"
import { NetworkCanvas } from "./network-canvas"
import { NarrationPanel } from "./narration-panel"

export function AgentDemo() {
  const { state, play, pause, reset, setSpeed, isComplete } =
    useDemoTimeline()

  return (
    <div className="flex flex-col gap-4 h-full min-h-[calc(100vh-180px)]">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Agent Data Exchange
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          AI agents autonomously discover, verify, and exchange training data
          via the PBTS BitTorrent protocol
        </p>
      </div>

      {/* Control bar */}
      <DemoControlBar
        stepIndex={state.stepIndex}
        isAutoPlaying={state.isAutoPlaying}
        playbackSpeed={state.playbackSpeed}
        isComplete={isComplete}
        onPlay={play}
        onPause={pause}
        onReset={reset}
        onSpeedChange={setSpeed}
      />

      {/* Network canvas */}
      <NetworkCanvas
        agents={state.agents}
        connections={state.connections}
        particles={state.particles}
        currentStep={state.currentStep}
        subStep={state.subStep}
        transferProgress={state.transferProgress}
      />

      {/* Narration panel */}
      <NarrationPanel entries={state.narration} />
    </div>
  )
}

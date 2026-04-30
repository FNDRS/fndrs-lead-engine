"use client"

import { useState } from "react"
import type { LeadAnalysis } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/score-badge"
import { AlertTriangle, Lightbulb, Package, MessageSquare, PhoneCall, Copy, Check, User, Briefcase } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type CallTurn = { speaker: "me" | "client" | "narration"; text: string }

function parseCallSimulation(raw: string): CallTurn[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  return lines.map((line) => {
    const meMatch = line.match(/^(yo|asesor|tu)\s*:\s*(.*)$/i)
    if (meMatch) {
      return { speaker: "me", text: meMatch[2].trim() }
    }
    const clientMatch = line.match(/^(cliente|prospecto)\s*:\s*(.*)$/i)
    if (clientMatch) {
      return { speaker: "client", text: clientMatch[2].trim() }
    }
    return { speaker: "narration", text: line }
  })
}

function Section({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string
  icon: React.ElementType
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] overflow-hidden">
      <div className={cn("flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]", accent)}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[12px] font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

export function AnalysisPanel({ analysis }: { analysis: LeadAnalysis }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis.outreachMessage)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      {/* Summary + Score */}
      <div className="rounded-lg border border-white/[0.07] bg-[#111114] p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">
            Summary
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {typeof analysis.reanalysisCount === "number" && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 uppercase tracking-wide">
                Re-analyses: {analysis.reanalysisCount}
              </span>
            )}
            <span className="text-[11px] text-zinc-600">Score</span>
            <ScoreBadge score={analysis.score} />
          </div>
        </div>
        <p className="text-[13px] text-zinc-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Problems */}
      {analysis.problems.length > 0 && (
        <Section title="Problems" icon={AlertTriangle} accent="text-red-400">
          <ul className="space-y-2">
            {analysis.problems.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-red-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Opportunities */}
      {analysis.opportunities.length > 0 && (
        <Section title="Opportunities" icon={Lightbulb} accent="text-emerald-400">
          <ul className="space-y-2">
            {analysis.opportunities.map((o, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                {o}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Suggested Offer */}
      <Section title="Suggested Offer" icon={Package} accent="text-violet-400">
        <p className="text-[13px] text-zinc-300 leading-relaxed">{analysis.suggestedOffer}</p>
      </Section>

      {/* Outreach Message */}
      <div className="rounded-lg border border-white/[0.07] bg-[#111114] overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-blue-400">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              Outreach Message
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1.5 px-2 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
        <pre className="px-4 py-4 text-[13px] text-zinc-300 whitespace-pre-wrap font-sans leading-loose">
          {analysis.outreachMessage}
        </pre>
      </div>

      {/* Call Simulation */}
      {analysis.callSimulation && (
        <CallSimulationPanel raw={analysis.callSimulation} />
      )}
    </div>
  )
}

function CallSimulationPanel({ raw }: { raw: string }) {
  const turns = parseCallSimulation(raw)

  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] text-amber-400">
        <PhoneCall className="h-3.5 w-3.5" />
        <span className="text-[12px] font-semibold uppercase tracking-wider">
          Call Simulation
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-wider">
          <LegendDot color="bg-violet-500" label="You" />
          <LegendDot color="bg-zinc-500" label="Client" />
        </div>
      </div>
      <div className="px-4 py-5 space-y-3 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.04),transparent_60%)]">
        {turns.map((turn, i) => (
          <CallBubble key={i} turn={turn} />
        ))}
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      <span>{label}</span>
    </div>
  )
}

function CallBubble({ turn }: { turn: CallTurn }) {
  if (turn.speaker === "narration") {
    return (
      <div className="text-center">
        <span className="inline-block text-[11px] text-zinc-600 italic px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.04]">
          {turn.text}
        </span>
      </div>
    )
  }

  const isMe = turn.speaker === "me"

  return (
    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <Avatar
          icon={User}
          className="bg-zinc-800 border-white/[0.06] text-zinc-400"
        />
      )}
      <div className={cn("max-w-[78%] flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            isMe ? "text-violet-400" : "text-zinc-500",
          )}
        >
          {isMe ? "You" : "Client"}
        </span>
        <div
          className={cn(
            "text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl border whitespace-pre-wrap",
            isMe
              ? "bg-violet-500/15 border-violet-500/30 text-zinc-100 rounded-br-sm"
              : "bg-white/[0.04] border-white/[0.08] text-zinc-200 rounded-bl-sm",
          )}
        >
          {turn.text}
        </div>
      </div>
      {isMe && (
        <Avatar
          icon={Briefcase}
          className="bg-violet-500/20 border-violet-500/30 text-violet-300"
        />
      )}
    </div>
  )
}

function Avatar({
  icon: Icon,
  className,
}: {
  icon: React.ElementType
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-7 w-7 shrink-0 rounded-full border flex items-center justify-center",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  )
}

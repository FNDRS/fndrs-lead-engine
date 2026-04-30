"use client"

import { useState } from "react"
import type { LeadAnalysis } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/score-badge"
import { AlertTriangle, Lightbulb, Package, MessageSquare, PhoneCall, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
        <pre className="px-4 py-4 text-[13px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
          {analysis.outreachMessage}
        </pre>
      </div>

      {/* Call Simulation */}
      {analysis.callSimulation && (
        <Section title="Call Simulation" icon={PhoneCall} accent="text-amber-400">
          <pre className="text-[13px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
            {analysis.callSimulation}
          </pre>
        </Section>
      )}
    </div>
  )
}

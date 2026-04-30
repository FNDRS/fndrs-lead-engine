"use client"

import { useState } from "react"
import type { LeadAnalysis } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/score-badge"
import { AlertTriangle, Lightbulb, Package, MessageSquare, Copy, Check } from "lucide-react"
import { toast } from "sonner"

export function AnalysisPanel({ analysis }: { analysis: LeadAnalysis }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis.outreachMessage)
    setCopied(true)
    toast.success("Message copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Score + Summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-400">Analysis Summary</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Score</span>
              <ScoreBadge score={analysis.score} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Problems */}
      {analysis.problems.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Problems Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {analysis.problems.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {analysis.opportunities.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <Lightbulb className="h-3.5 w-3.5" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {analysis.opportunities.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggested Offer */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-violet-400">
            <Package className="h-3.5 w-3.5" />
            Suggested Offer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-300">{analysis.suggestedOffer}</p>
        </CardContent>
      </Card>

      {/* Outreach Message */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-400">
              <MessageSquare className="h-3.5 w-3.5" />
              Outreach Message
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-zinc-100"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-800/50 rounded-md p-3 border border-zinc-700">
            {analysis.outreachMessage}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

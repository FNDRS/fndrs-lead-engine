"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateLead } from "@/services/api"
import type { FollowUpOutcome, Lead } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  OutcomeBadge,
  OUTCOME_OPTIONS,
  outcomeLabel,
} from "@/components/outcome-badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Save,
  CheckCircle2,
  Circle,
  Calendar,
  MessageSquare,
  Handshake,
  Sparkles,
} from "lucide-react"

type DraftState = {
  responded: boolean
  respondedAt: string | null
  nextFollowUpAt: string | null
  outcome: FollowUpOutcome | null
  promises: string
  responseNotes: string
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fromDateInputValue(v: string): string | null {
  if (!v) return null
  const d = new Date(`${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function leadToDraft(lead: Lead): DraftState {
  return {
    responded: !!lead.responded,
    respondedAt: lead.respondedAt ?? null,
    nextFollowUpAt: lead.nextFollowUpAt ?? null,
    outcome: lead.outcome ?? null,
    promises: lead.promises ?? "",
    responseNotes: lead.responseNotes ?? "",
  }
}

interface FollowUpEditorProps {
  lead: Lead
  invalidateKeys: string[][]
  compact?: boolean
}

export function FollowUpEditor({
  lead,
  invalidateKeys,
  compact = false,
}: FollowUpEditorProps) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<DraftState>(() => leadToDraft(lead))

  useEffect(() => {
    setDraft(leadToDraft(lead))
  }, [
    lead.responded,
    lead.respondedAt,
    lead.nextFollowUpAt,
    lead.outcome,
    lead.promises,
    lead.responseNotes,
  ])

  const dirty = useMemo(() => {
    const base = leadToDraft(lead)
    return (
      base.responded !== draft.responded ||
      base.respondedAt !== draft.respondedAt ||
      base.nextFollowUpAt !== draft.nextFollowUpAt ||
      base.outcome !== draft.outcome ||
      base.promises !== draft.promises ||
      base.responseNotes !== draft.responseNotes
    )
  }, [lead, draft])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateLead(lead.id, {
        responded: draft.responded,
        respondedAt: draft.respondedAt,
        nextFollowUpAt: draft.nextFollowUpAt,
        outcome: draft.outcome,
        promises: draft.promises.trim() ? draft.promises : null,
        responseNotes: draft.responseNotes.trim() ? draft.responseNotes : null,
      }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      toast.success("Follow-up saved")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleResponded = () => {
    setDraft((d) => {
      const next = !d.responded
      return {
        ...d,
        responded: next,
        respondedAt: next ? d.respondedAt ?? new Date().toISOString() : null,
      }
    })
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Status row: responded + outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Did they respond?
          </label>
          <button
            type="button"
            onClick={toggleResponded}
            className={cn(
              "w-full inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] transition-colors",
              draft.responded
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                : "border-white/[0.08] bg-black/30 text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]",
            )}
          >
            {draft.responded ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            {draft.responded ? "Responded" : "No response yet"}
            {draft.responded && draft.respondedAt && (
              <span className="ml-auto text-[11px] text-emerald-400/70">
                {new Date(draft.respondedAt).toLocaleDateString()}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Next follow-up
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 pointer-events-none" />
            <input
              type="date"
              value={toDateInputValue(draft.nextFollowUpAt)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  nextFollowUpAt: fromDateInputValue(e.target.value),
                }))
              }
              className="w-full rounded-md border border-white/[0.08] bg-black/30 pl-8 pr-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Outcome pills */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          Outcome
          {draft.outcome && <OutcomeBadge outcome={draft.outcome} />}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {OUTCOME_OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  outcome: d.outcome === o ? null : o,
                }))
              }
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors",
                draft.outcome === o
                  ? outcomeButtonActive(o)
                  : "bg-white/[0.03] text-zinc-500 ring-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-300",
              )}
            >
              {outcomeLabel(o)}
            </button>
          ))}
        </div>
      </div>

      {/* Promises + Response notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Handshake className="h-3 w-3" />
            Promises
          </label>
          <textarea
            value={draft.promises}
            onChange={(e) =>
              setDraft((d) => ({ ...d, promises: e.target.value }))
            }
            placeholder="Ex: send proposal Friday · demo next Tuesday · callback at 3pm..."
            className="w-full min-h-[88px] resize-y rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            Response notes
          </label>
          <textarea
            value={draft.responseNotes}
            onChange={(e) =>
              setDraft((d) => ({ ...d, responseNotes: e.target.value }))
            }
            placeholder="Ex: said pricing too high · interested but not until Q3 · referred to partner..."
            className="w-full min-h-[88px] resize-y rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          className="h-7 px-3 text-[11px] bg-violet-600 hover:bg-violet-500 text-white disabled:bg-white/[0.04] disabled:text-zinc-600"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          <Save className="h-3 w-3 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}

function outcomeButtonActive(outcome: FollowUpOutcome): string {
  switch (outcome) {
    case "interested":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
    case "not_interested":
      return "bg-orange-500/15 text-orange-300 ring-orange-500/30"
    case "won":
      return "bg-violet-500/20 text-violet-200 ring-violet-500/40"
    case "lost":
      return "bg-red-500/15 text-red-300 ring-red-500/30"
    case "pending":
    default:
      return "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30"
  }
}

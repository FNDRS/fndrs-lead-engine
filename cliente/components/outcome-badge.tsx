import { cn } from "@/lib/utils"
import type { FollowUpOutcome } from "@/lib/types"

const STYLES: Record<FollowUpOutcome, { label: string; className: string }> = {
  pending: {
    label: "Awaiting",
    className: "bg-zinc-500/10 text-zinc-300 ring-zinc-500/20",
  },
  interested: {
    label: "Interested",
    className: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  },
  not_interested: {
    label: "Not interested",
    className: "bg-orange-500/10 text-orange-300 ring-orange-500/20",
  },
  won: {
    label: "Won",
    className: "bg-violet-500/15 text-violet-200 ring-violet-500/30",
  },
  lost: {
    label: "Lost",
    className: "bg-red-500/10 text-red-300 ring-red-500/20",
  },
}

export const OUTCOME_OPTIONS: FollowUpOutcome[] = [
  "pending",
  "interested",
  "not_interested",
  "won",
  "lost",
]

export function outcomeLabel(outcome: FollowUpOutcome): string {
  return STYLES[outcome].label
}

export function OutcomeBadge({
  outcome,
}: {
  outcome: FollowUpOutcome | null | undefined
}) {
  if (!outcome) return null
  const s = STYLES[outcome]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        s.className,
      )}
    >
      {s.label}
    </span>
  )
}

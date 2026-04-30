import { cn } from "@/lib/utils"

export function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return <span className="text-zinc-600 text-[13px] tabular-nums">—</span>
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums tracking-wide ring-1 ring-inset",
        score >= 80
          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
          : score >= 60
          ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
          : "bg-red-500/10 text-red-400 ring-red-500/20"
      )}
    >
      {score}
    </span>
  )
}

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score?: number
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === undefined || score === null) {
    return <span className="text-zinc-500 text-sm">—</span>
  }

  const color =
    score >= 80
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : score >= 60
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        color
      )}
    >
      {score}
    </span>
  )
}

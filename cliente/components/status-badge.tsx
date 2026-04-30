import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  analyzed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  qualified: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  disqualified: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status.toLowerCase()] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        style
      )}
    >
      {status}
    </span>
  )
}

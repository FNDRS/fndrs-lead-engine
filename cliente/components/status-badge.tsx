import { cn } from "@/lib/utils"

const STATUS: Record<string, string> = {
  new:          "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  contacted:    "bg-violet-500/10 text-violet-400 ring-violet-500/20",
  analyzed:     "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  qualified:    "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  disqualified: "bg-zinc-500/10 text-zinc-500 ring-zinc-500/20",
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS[status.toLowerCase()] ?? "bg-zinc-500/10 text-zinc-500 ring-zinc-500/20"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset",
        style
      )}
    >
      {status}
    </span>
  )
}

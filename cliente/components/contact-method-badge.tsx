import { cn } from "@/lib/utils"
import { Phone, Mail } from "lucide-react"
import type { ContactMethod } from "@/lib/types"

const STYLES: Record<ContactMethod, string> = {
  call: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  email: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
}

export function ContactMethodBadge({
  method,
}: {
  method: ContactMethod | null | undefined
}) {
  if (!method) return null
  const Icon = method === "call" ? Phone : Mail
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset",
        STYLES[method],
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {method}
    </span>
  )
}

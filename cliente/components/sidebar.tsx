"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Play, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/runs", label: "Runs", icon: Play },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-zinc-800">
        <Zap className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          FNDRS Lead Engine
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

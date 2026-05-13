"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Play, Clock, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pendings", label: "Pendings", icon: Clock },
  { href: "/follow-ups", label: "Follow Ups", icon: MessageCircle },
  { href: "/runs", label: "Runs", icon: Play },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0c0c0f]">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4">
        <div className="h-6 w-6 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-white"
          >
            <path
              d="M6 1L10.5 9H1.5L6 1Z"
              fill="currentColor"
              fillOpacity="0.9"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-zinc-100 leading-none tracking-tight">
            Lead Engine
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5 tracking-wide uppercase font-medium">
            FNDRS
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mx-3" />

      {/* Nav */}
      <nav className="flex-1 p-2 pt-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-white/[0.08] text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  active ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <p className="text-[10px] text-zinc-700 font-mono">v0.1 · internal</p>
      </div>
    </aside>
  )
}

"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Play,
  Clock,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
}

type NavSection = {
  label?: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/pendings", label: "Pendings", icon: Clock },
      { href: "/follow-ups", label: "Follow Ups", icon: MessageCircle },
    ],
  },
  {
    label: "System",
    items: [{ href: "/runs", label: "Runs", icon: Play }],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0d0d10] to-[#0a0a0c]">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 shrink-0">
        <Link href="/dashboard" className="group flex flex-col gap-1.5 min-w-0">
          <Image
            src="/fndrs-logo.webp"
            alt="FNDRS"
            width={96}
            height={20}
            priority
            className="h-[20px] w-auto transition-opacity group-hover:opacity-80"
          />
          <p className="text-[10px] text-zinc-600 tracking-[0.18em] uppercase font-medium">
            Lead Engine
          </p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 pb-6 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.label ?? i} className={cn(i > 0 && "mt-6")}>
            {section.label && (
              <p className="px-3 pb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.18em]">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "group relative flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150",
                        active
                          ? "bg-white/[0.06] text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-violet-500" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-violet-400"
                            : "text-zinc-500 group-hover:text-zinc-300",
                        )}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-700 font-mono tracking-wider">
            v0.1
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-600 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            Internal
          </span>
        </div>
      </div>
    </aside>
  )
}

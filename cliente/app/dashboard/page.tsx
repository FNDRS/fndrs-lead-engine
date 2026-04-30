"use client"

import { useQuery } from "@tanstack/react-query"
import { getLeads } from "@/services/api"
import type { Lead } from "@/lib/types"
import { LeadTable } from "@/components/lead-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Sparkles, CheckCircle, TrendingUp } from "lucide-react"

const METRICS = [
  {
    key: "total",
    label: "Total Leads",
    icon: Users,
    color: "text-zinc-400",
    dot: "bg-zinc-600",
  },
  {
    key: "newLeads",
    label: "New",
    icon: Sparkles,
    color: "text-sky-400",
    dot: "bg-sky-500",
  },
  {
    key: "analyzed",
    label: "Analyzed",
    icon: CheckCircle,
    color: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    key: "highScore",
    label: "Score ≥ 80",
    icon: TrendingUp,
    color: "text-violet-400",
    dot: "bg-violet-500",
  },
] as const

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  dot,
  isLoading,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  dot: string
  isLoading?: boolean
}) {
  return (
    <div className="relative rounded-xl border border-white/[0.07] bg-[#111114] p-5 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent`} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-9 w-14 bg-white/[0.05]" />
      ) : (
        <div className="flex items-end gap-2">
          <p className="text-[32px] font-semibold text-zinc-100 leading-none tracking-tight tabular-nums">
            {value}
          </p>
          <span className={`mb-1 h-1.5 w-1.5 rounded-full ${dot}`} />
        </div>
      )}
    </div>
  )
}

function computeMetrics(leads: Lead[]) {
  return {
    total: leads.length,
    newLeads: leads.filter((l) => l.status.toLowerCase() === "new").length,
    analyzed: leads.filter((l) => l.status.toLowerCase() === "analyzed").length,
    highScore: leads.filter((l) => (l.score ?? 0) >= 80).length,
    topLeads: [...leads]
      .filter((l) => l.score !== undefined)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10),
  }
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
  })

  const leads = data?.data ?? []
  const metrics = computeMetrics(leads)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-zinc-600 mt-0.5">Lead pipeline overview</p>
        </div>
        <div className="text-[11px] text-zinc-600 font-mono uppercase tracking-wider">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3">
          <p className="text-[13px] text-red-400">
            Cannot connect to backend at{" "}
            <code className="font-mono text-red-300">{process.env.NEXT_PUBLIC_API_URL}</code>
          </p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={metrics[m.key]}
            icon={m.icon}
            color={m.color}
            dot={m.dot}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Top Leads */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-semibold text-zinc-400">Top Leads by Score</h2>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
        <LeadTable leads={metrics.topLeads} isLoading={isLoading} />
      </div>
    </div>
  )
}

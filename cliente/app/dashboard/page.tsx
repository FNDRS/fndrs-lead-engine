"use client"

import { useQuery } from "@tanstack/react-query"
import { getLeads } from "@/services/api"
import type { Lead } from "@/lib/types"
import { LeadTable } from "@/components/lead-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Sparkles, CheckCircle, TrendingUp } from "lucide-react"

function MetricCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  isLoading?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-zinc-600" />
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16 bg-zinc-800" />
      ) : (
        <p className="text-3xl font-semibold text-zinc-100 tracking-tight">{value}</p>
      )}
    </div>
  )
}

function computeMetrics(leads: Lead[]) {
  const total = leads.length
  const newLeads = leads.filter((l) => l.status.toLowerCase() === "new").length
  const analyzed = leads.filter((l) => l.status.toLowerCase() === "analyzed").length
  const highScore = leads.filter((l) => l.score !== undefined && l.score >= 80).length
  const topLeads = [...leads]
    .filter((l) => l.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10)
  return { total, newLeads, analyzed, highScore, topLeads }
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
  })

  const leads = data?.data ?? []
  const { total, newLeads, analyzed, highScore, topLeads } = computeMetrics(leads)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Overview of your lead pipeline</p>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load leads. Make sure the backend is running at{" "}
          {process.env.NEXT_PUBLIC_API_URL}.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Leads" value={total} icon={Users} isLoading={isLoading} />
        <MetricCard label="New" value={newLeads} icon={Sparkles} isLoading={isLoading} />
        <MetricCard label="Analyzed" value={analyzed} icon={CheckCircle} isLoading={isLoading} />
        <MetricCard label="Score ≥ 80" value={highScore} icon={TrendingUp} isLoading={isLoading} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Top Leads by Score</h2>
        <LeadTable leads={topLeads} isLoading={isLoading} />
      </div>
    </div>
  )
}

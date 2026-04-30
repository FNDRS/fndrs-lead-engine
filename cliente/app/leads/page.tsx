"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLeads, analyzeLead, updateLead } from "@/services/api"
import type { Lead } from "@/lib/types"
import { LeadTable } from "@/components/lead-table"
import { CreateLeadDialog } from "@/components/create-lead-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Search, Zap, CheckCheck } from "lucide-react"

const ALL = "all"

function unique(arr: (string | undefined)[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))) as string[]
}

export default function LeadsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads })
  const leads = data?.data ?? []

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [cityFilter, setCityFilter] = useState(ALL)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [scoreFilter, setScoreFilter] = useState(ALL)

  const statuses = unique(leads.map((l) => l.status))
  const cities = unique(leads.map((l) => l.city))
  const categories = unique(leads.map((l) => l.category))

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search && !l.businessName.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== ALL && l.status !== statusFilter) return false
      if (cityFilter !== ALL && l.city !== cityFilter) return false
      if (categoryFilter !== ALL && l.category !== categoryFilter) return false
      if (scoreFilter === "high" && (l.score === undefined || l.score < 80)) return false
      if (scoreFilter === "medium" && (l.score === undefined || l.score < 60 || l.score >= 80)) return false
      if (scoreFilter === "low" && (l.score === undefined || l.score >= 60)) return false
      return true
    })
  }, [leads, search, statusFilter, cityFilter, categoryFilter, scoreFilter])

  const analyzeMutation = useMutation({
    mutationFn: (id: string) => analyzeLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Analysis complete")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const contactMutation = useMutation({
    mutationFn: (id: string) => updateLead(id, { status: "contacted" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Marked as contacted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const actions = (lead: Lead) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10"
        onClick={() => analyzeMutation.mutate(lead.id)}
        disabled={analyzeMutation.isPending}
      >
        <Zap className="h-3 w-3 mr-1" />
        Analyze
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => contactMutation.mutate(lead.id)}
        disabled={contactMutation.isPending}
      >
        <CheckCheck className="h-3 w-3 mr-1" />
        Contacted
      </Button>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">Leads</h1>
          <p className="text-[13px] text-zinc-600 mt-0.5">
            {isLoading ? "Loading..." : `${filtered.length} of ${leads.length} leads`}
          </p>
        </div>
        <CreateLeadDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-44 bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 text-[13px] focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50"
          />
        </div>

        <FilterSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? ALL)}
          placeholder="Status"
          options={statuses}
        />
        <FilterSelect
          value={cityFilter}
          onValueChange={(v) => setCityFilter(v ?? ALL)}
          placeholder="City"
          options={cities}
        />
        <FilterSelect
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v ?? ALL)}
          placeholder="Category"
          options={categories}
        />
        <FilterSelect
          value={scoreFilter}
          onValueChange={(v) => setScoreFilter(v ?? ALL)}
          placeholder="Score"
          options={["high", "medium", "low"]}
          labels={{ high: "≥ 80", medium: "60–79", low: "< 60" }}
        />
      </div>

      <LeadTable leads={filtered} isLoading={isLoading} actions={actions} />
    </div>
  )
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
  labels,
}: {
  value: string
  onValueChange: (v: string | null) => void
  placeholder: string
  options: string[]
  labels?: Record<string, string>
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-auto min-w-[120px] bg-white/[0.04] border-white/[0.08] text-zinc-400 text-[13px] focus:ring-0 focus:border-white/[0.12]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#1a1a1f] border-white/[0.08] shadow-xl">
        <SelectItem value={ALL} className="text-zinc-400 text-[13px] focus:bg-white/[0.06] focus:text-zinc-200">
          All {placeholder}s
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-zinc-300 text-[13px] capitalize focus:bg-white/[0.06] focus:text-zinc-200">
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

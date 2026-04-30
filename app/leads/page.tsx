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
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10"
        onClick={() => analyzeMutation.mutate(lead.id)}
        disabled={analyzeMutation.isPending}
      >
        <Zap className="h-3 w-3 mr-1" />
        Analyze
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Leads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {filtered.length} of {leads.length} leads
          </p>
        </div>
        <CreateLeadDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm"
          />
        </div>

        <FilterSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Status"
          options={statuses}
        />
        <FilterSelect
          value={cityFilter}
          onValueChange={setCityFilter}
          placeholder="City"
          options={cities}
        />
        <FilterSelect
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          placeholder="Category"
          options={categories}
        />
        <FilterSelect
          value={scoreFilter}
          onValueChange={setScoreFilter}
          placeholder="Score"
          options={["high", "medium", "low"]}
          labels={{ high: "Score ≥ 80", medium: "Score 60–79", low: "Score < 60" }}
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
  onValueChange: (v: string) => void
  placeholder: string
  options: string[]
  labels?: Record<string, string>
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-auto min-w-28 bg-zinc-800 border-zinc-700 text-zinc-400 text-sm focus:ring-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-zinc-800 border-zinc-700">
        <SelectItem value={ALL} className="text-zinc-400 text-sm focus:bg-zinc-700 focus:text-zinc-100">
          All {placeholder}s
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-zinc-300 text-sm capitalize focus:bg-zinc-700 focus:text-zinc-100">
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

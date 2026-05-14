"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLeads, analyzeLead, updateLead } from "@/services/api"
import type { ContactMethod, Lead } from "@/lib/types"
import { LeadTable } from "@/components/lead-table"
import { CreateLeadDialog } from "@/components/create-lead-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPopup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { DoNotContactDialog } from "@/components/do-not-contact-dialog"
import { toast } from "sonner"
import { Search, Zap, CheckCheck, Phone, Mail, MoreHorizontal, Ban } from "lucide-react"
import { cn } from "@/lib/utils"

const ALL = "all"

function unique(arr: (string | undefined)[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))) as string[]
}

function MultiFilterSelect({
  values,
  onValuesChange,
  label,
  options,
}: {
  values: string[]
  onValuesChange: (v: string[]) => void
  label: string
  options: string[]
}) {
  const isEmpty = values.length === 0
  const display = isEmpty
    ? "All"
    : values.length === 1
      ? values[0]
      : `${values[0]} +${values.length - 1}`
  return (
    <Select
      value={values}
      multiple
      onValueChange={(next: unknown) =>
        onValuesChange(Array.isArray(next) ? (next as string[]) : [])
      }
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto min-w-[160px] bg-white/[0.04] border-white/[0.08] text-[13px] focus:ring-0 focus:border-white/[0.12]",
          isEmpty ? "text-zinc-400" : "text-zinc-200",
        )}
      >
        <span className="flex items-baseline gap-1 truncate">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            {label}
          </span>
          <span className="capitalize truncate">{display}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="bg-[#1a1a1f] border-white/[0.08] shadow-xl">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-zinc-600">No options</div>
        ) : (
          options.map((o) => (
            <SelectItem
              key={o}
              value={o}
              className="text-zinc-300 text-[13px] capitalize focus:bg-white/[0.06] focus:text-zinc-200"
            >
              {o}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

function FilterSelect({
  value,
  onValueChange,
  label,
  options,
  labels,
}: {
  value: string
  onValueChange: (v: string | null) => void
  label: string
  options: string[]
  labels?: Record<string, string>
}) {
  const isAll = value === ALL
  const display = isAll ? "All" : labels?.[value] ?? value
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto min-w-[140px] bg-white/[0.04] border-white/[0.08] text-[13px] focus:ring-0 focus:border-white/[0.12]",
          isAll ? "text-zinc-400" : "text-zinc-200",
        )}
      >
        <span className="flex items-baseline gap-1 truncate">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            {label}
          </span>
          <span className="capitalize truncate">{display}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="bg-[#1a1a1f] border-white/[0.08] shadow-xl">
        <SelectItem
          value={ALL}
          className="text-zinc-400 text-[13px] focus:bg-white/[0.06] focus:text-zinc-200"
        >
          All {label.toLowerCase()}
        </SelectItem>
        {options.map((o) => (
          <SelectItem
            key={o}
            value={o}
            className="text-zinc-300 text-[13px] capitalize focus:bg-white/[0.06] focus:text-zinc-200"
          >
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  )
}

function LeadsPageInner() {
  const qc = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [dncLead, setDncLead] = useState<Lead | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads })
  const leads = data?.data ?? []

  const search = searchParams.get("q") ?? ""
  const statusFilter = searchParams.get("status") ?? ALL
  const cityFilter = searchParams.get("city") ?? ALL
  const categoryFilterRaw = searchParams.get("category") ?? ""
  const categoryFilter = useMemo(
    () => categoryFilterRaw.split(",").map((s) => s.trim()).filter(Boolean),
    [categoryFilterRaw],
  )
  const scoreFilter = searchParams.get("score") ?? ALL

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === ALL) params.delete(key)
      else params.set(key, value)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const setParamList = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (values.length === 0) params.delete(key)
      else params.set(key, values.join(","))
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const statuses = unique(leads.map((l) => l.status))
  const cities = unique(leads.map((l) => l.city))
  const categories = unique(leads.map((l) => l.category))

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (l.status === "contacted" || l.status === "do_not_contact" || l.status === "rejected") return false
      if (search && !l.businessName.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== ALL && l.status !== statusFilter) return false
      if (cityFilter !== ALL && l.city !== cityFilter) return false
      if (categoryFilter.length > 0 && (!l.category || !categoryFilter.includes(l.category))) return false
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

  const methodMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: ContactMethod | null }) =>
      updateLead(id, { contactMethod: method }),
    onSuccess: (_data, { method }) => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success(
        method ? `Queued for ${method}` : "Removed from pendings",
      )
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleMethod = (lead: Lead, method: ContactMethod) => {
    const next = lead.contactMethod === method ? null : method
    methodMutation.mutate({ id: lead.id, method: next })
  }

  const actions = (lead: Lead) => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
          <MoreHorizontal className="h-3.5 w-3.5 text-zinc-500" />
        </DropdownMenuTrigger>
        <DropdownMenuPopup align="end">
          <DropdownMenuItem onClick={() => toggleMethod(lead, "call")}>
            <Phone className="h-3.5 w-3.5 text-amber-400" />
            {lead.contactMethod === "call" ? "Unqueue Call" : "Queue Call"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleMethod(lead, "email")}>
            <Mail className="h-3.5 w-3.5 text-blue-400" />
            {lead.contactMethod === "email" ? "Unqueue Email" : "Queue Email"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => analyzeMutation.mutate(lead.id)}>
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            Analyze
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => contactMutation.mutate(lead.id)}>
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
            Mark Contacted
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDncLead(lead)}>
            <Ban className="h-3.5 w-3.5 text-red-400" />
            Do Not Contact
          </DropdownMenuItem>
        </DropdownMenuPopup>
      </DropdownMenu>
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
            onChange={(e) => setParam("q", e.target.value)}
            className="pl-8 h-8 w-44 bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 text-[13px] focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50"
          />
        </div>

        <FilterSelect
          value={statusFilter}
          onValueChange={(v) => setParam("status", v)}
          label="Status"
          options={statuses}
        />
        <FilterSelect
          value={cityFilter}
          onValueChange={(v) => setParam("city", v)}
          label="City"
          options={cities}
        />
        <MultiFilterSelect
          values={categoryFilter}
          onValuesChange={(v) => setParamList("category", v)}
          label="Category"
          options={categories}
        />
        <FilterSelect
          value={scoreFilter}
          onValueChange={(v) => setParam("score", v)}
          label="Score"
          options={["high", "medium", "low"]}
          labels={{ high: "≥ 80", medium: "60–79", low: "< 60" }}
        />
      </div>

      <LeadTable leads={filtered} isLoading={isLoading} actions={actions} />

      {dncLead && (
        <DoNotContactDialog
          leadId={dncLead.id}
          leadName={dncLead.businessName}
          open={!!dncLead}
          onOpenChange={(open) => { if (!open) setDncLead(null) }}
        />
      )}
    </div>
  )
}

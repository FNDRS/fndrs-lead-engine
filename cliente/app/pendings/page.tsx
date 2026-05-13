"use client"

import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLeads, updateLead } from "@/services/api"
import type { Lead } from "@/lib/types"
import { LeadTable } from "@/components/lead-table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CheckCheck, X } from "lucide-react"

export default function PendingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
  })

  const leads = data?.data ?? []

  const pendings = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.contactMethod &&
          l.status !== "contacted" &&
          l.status !== "rejected",
      ),
    [leads],
  )

  const contactMutation = useMutation({
    mutationFn: (id: string) => updateLead(id, { status: "contacted" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Marked as contacted — moved to Follow Ups")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => updateLead(id, { contactMethod: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Removed from pendings")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const actions = (lead: Lead) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => contactMutation.mutate(lead.id)}
        disabled={contactMutation.isPending}
      >
        <CheckCheck className="h-3 w-3 mr-1" />
        Mark Contacted
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        onClick={() => removeMutation.mutate(lead.id)}
        disabled={removeMutation.isPending}
      >
        <X className="h-3 w-3 mr-1" />
        Unqueue
      </Button>
    </div>
  )

  const calls = pendings.filter((l) => l.contactMethod === "call")
  const emails = pendings.filter((l) => l.contactMethod === "email")

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">
          Pendings
        </h1>
        <p className="text-[13px] text-zinc-600 mt-0.5">
          {isLoading
            ? "Loading..."
            : `${pendings.length} lead${pendings.length === 1 ? "" : "s"} queued to contact`}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-semibold text-amber-400">
            By Call · {calls.length}
          </h2>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
        <LeadTable leads={calls} isLoading={isLoading} actions={actions} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-semibold text-blue-400">
            By Email · {emails.length}
          </h2>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
        <LeadTable leads={emails} isLoading={isLoading} actions={actions} />
      </section>
    </div>
  )
}

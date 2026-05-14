"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLeads, updateLead } from "@/services/api"
import type { Lead } from "@/lib/types"
import { LeadTable } from "@/components/lead-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Undo2, Trash2, MessageSquare } from "lucide-react"

export default function DoNotContactPage() {
  const qc = useQueryClient()
  const [reasonDialog, setReasonDialog] = useState<Lead | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
  })

  const leads: Lead[] = data?.data ?? []

  const dncLeads = useMemo(
    () => leads.filter((l) => l.status === "do_not_contact"),
    [leads],
  )

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateLead(id, { status: "new" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead restored to active")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => updateLead(id, { status: "rejected" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead rejected")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const actions = (lead: Lead) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => restoreMutation.mutate(lead.id)}
        disabled={restoreMutation.isPending}
        title="Restore to active leads"
      >
        <Undo2 className="h-3 w-3 mr-1" />
        Restore
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        onClick={() => setReasonDialog(lead)}
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        Reason
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        onClick={() => deleteMutation.mutate(lead.id)}
        disabled={deleteMutation.isPending}
        title="Reject lead"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Reject
      </Button>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">
          Do Not Contact
        </h1>
        <p className="text-[13px] text-zinc-600 mt-0.5">
          {isLoading
            ? "Loading..."
            : `${dncLeads.length} lead${dncLeads.length === 1 ? "" : "s"} marked as do not contact`}
        </p>
      </div>

      <LeadTable leads={dncLeads} isLoading={isLoading} actions={actions} />

      {reasonDialog && (
        <Dialog open={!!reasonDialog} onOpenChange={() => setReasonDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Do Not Contact Reason</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-zinc-200">{reasonDialog.businessName}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
              {reasonDialog.doNotContactReason ? (
                <p className="text-[13px] text-zinc-300 leading-relaxed">
                  {reasonDialog.doNotContactReason}
                </p>
              ) : (
                <p className="text-[13px] text-zinc-600 italic">No reason provided</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setReasonDialog(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

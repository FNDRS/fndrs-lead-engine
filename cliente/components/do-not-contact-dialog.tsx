"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateLead } from "@/services/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface DoNotContactDialogProps {
  leadId: string
  leadName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DoNotContactDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
}: DoNotContactDialogProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState("")

  const mutation = useMutation({
    mutationFn: (reason: string) =>
      updateLead(leadId, {
        status: "do_not_contact",
        doNotContactReason: reason || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["lead", leadId] })
      toast.success("Marked as do not contact")
      onOpenChange(false)
      setReason("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Do Not Contact</DialogTitle>
          <DialogDescription>
            Mark <span className="font-medium text-zinc-200">{leadName}</span>{" "}
            as do not contact. They will be excluded from future outreach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="dnc-reason"
            className="text-[12px] font-medium text-zinc-400"
          >
            Reason <span className="text-zinc-600">(optional)</span>
          </label>
          <textarea
            id="dnc-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you not contacting this lead?"
            className="w-full h-24 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-700 resize-none outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate(reason)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

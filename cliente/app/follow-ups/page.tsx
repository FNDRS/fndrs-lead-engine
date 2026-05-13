"use client"

import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLeads, updateLead } from "@/services/api"
import type { Lead } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { ContactMethodBadge } from "@/components/contact-method-badge"
import { OutcomeBadge } from "@/components/outcome-badge"
import { ScoreBadge } from "@/components/score-badge"
import { FollowUpEditor } from "@/components/follow-up-editor"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import {
  Phone,
  Mail,
  Globe,
  RefreshCw,
  XCircle,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react"

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function FollowUpsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
  })

  const leads = data?.data ?? []
  const followUps = useMemo(
    () => leads.filter((l) => l.status === "contacted"),
    [leads],
  )

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">
          Follow Ups
        </h1>
        <p className="text-[13px] text-zinc-600 mt-0.5">
          {isLoading
            ? "Loading..."
            : `${followUps.length} contacted lead${followUps.length === 1 ? "" : "s"} — track responses and promises`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full bg-white/[0.05]" />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
          <p className="text-[13px] text-zinc-500 font-medium">
            No follow ups yet
          </p>
          <p className="text-[12px] text-zinc-700 mt-1">
            Leads you mark as contacted will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((lead) => (
            <FollowUpCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}

function FollowUpCard({ lead }: { lead: Lead }) {
  const qc = useQueryClient()

  const requeueMutation = useMutation({
    mutationFn: () => updateLead(lead.id, { status: "new" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success(
        lead.contactMethod
          ? "Moved back to pendings"
          : "Status reset — pick a contact method to re-queue",
      )
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => updateLead(lead.id, { status: "rejected" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead rejected")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const respondedOn = formatDate(lead.respondedAt)
  const nextOn = formatDate(lead.nextFollowUpAt)

  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/leads/${lead.id}`}
              className="text-[14px] font-semibold text-zinc-100 hover:text-violet-300 transition-colors inline-flex items-center gap-1.5"
            >
              {lead.businessName}
              <ExternalLink className="h-3 w-3 text-zinc-600" />
            </Link>
            <StatusBadge status={lead.status} />
            <ContactMethodBadge method={lead.contactMethod} />
            <OutcomeBadge outcome={lead.outcome} />
            <ScoreBadge score={lead.score} />
          </div>
          <div className="flex flex-wrap gap-3 text-[12px] text-zinc-500">
            {lead.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3 text-zinc-600" />
                {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1 hover:text-zinc-300"
              >
                <Phone className="h-3 w-3 text-zinc-600" />
                {lead.phone}
              </a>
            )}
            {lead.contactMethod === "email" && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3 text-zinc-600" />
                Sent via email
              </span>
            )}
            {respondedOn && (
              <span className="inline-flex items-center gap-1 text-emerald-400/80">
                <Clock className="h-3 w-3" />
                Responded {respondedOn}
              </span>
            )}
            {nextOn && (
              <span className="inline-flex items-center gap-1 text-amber-400/80">
                <Calendar className="h-3 w-3" />
                Next {nextOn}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
            onClick={() => requeueMutation.mutate()}
            disabled={requeueMutation.isPending}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Re-queue
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </div>
      </div>

      <div className="p-4">
        <FollowUpEditor lead={lead} invalidateKeys={[["leads"]]} />
      </div>
    </div>
  )
}

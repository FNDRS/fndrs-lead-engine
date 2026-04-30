"use client"

import { use } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLead, analyzeLead, updateLead } from "@/services/api"
import { AnalysisPanel } from "@/components/analysis-panel"
import { StatusBadge } from "@/components/status-badge"
import { ScoreBadge } from "@/components/score-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import {
  ArrowLeft,
  Globe,
  Phone,
  MapPin,
  Tag,
  Zap,
  CheckCheck,
  RefreshCw,
} from "lucide-react"

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLead(id),
  })

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] })
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Analysis complete")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const contactMutation = useMutation({
    mutationFn: () => updateLead(id, { status: "contacted" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] })
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Marked as contacted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isError) {
    return (
      <div className="p-8">
        <p className="text-[13px] text-red-400">Failed to load lead.</p>
      </div>
    )
  }

  const lead = data?.lead
  const analysis = data?.analysis

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Leads
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2.5 min-w-0">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-52 bg-white/[0.05]" />
              <Skeleton className="h-5 w-32 bg-white/[0.05]" />
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-semibold text-zinc-100 tracking-tight leading-none">
                {lead?.businessName}
              </h1>
              <div className="flex items-center gap-2">
                {lead && <StatusBadge status={lead.status} />}
                {lead?.score !== undefined && <ScoreBadge score={lead.score} />}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-3 text-[13px] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] hover:border-white/[0.12]"
            onClick={() => contactMutation.mutate()}
            disabled={contactMutation.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark Contacted
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-[13px] bg-violet-600 hover:bg-violet-500 text-white shadow-none"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analysis ? (
              <>
                <RefreshCw className={`h-3.5 w-3.5 ${analyzeMutation.isPending ? "animate-spin" : ""}`} />
                Re-analyze
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Info sidebar */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
            Business Info
          </p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/[0.05]" />
              ))}
            </div>
          ) : (
            <div className="space-y-0 rounded-lg border border-white/[0.07] bg-[#111114] divide-y divide-white/[0.05] overflow-hidden">
              {lead?.website && (
                <InfoRow icon={Globe} label="Website">
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors truncate block"
                  >
                    {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </InfoRow>
              )}
              {lead?.city && (
                <InfoRow icon={MapPin} label="City">
                  <span className="text-zinc-300">{lead.city}</span>
                </InfoRow>
              )}
              {lead?.phone && (
                <InfoRow icon={Phone} label="Phone">
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-violet-400 hover:text-violet-300 transition-colors truncate block"
                  >
                    {lead.phone}
                  </a>
                </InfoRow>
              )}
              {lead?.category && (
                <InfoRow icon={Tag} label="Category">
                  <span className="text-zinc-300">{lead.category}</span>
                </InfoRow>
              )}
              {!lead?.website && !lead?.city && !lead?.phone && !lead?.category && (
                <div className="px-4 py-5 text-[12px] text-zinc-600">No info available</div>
              )}
            </div>
          )}
        </div>

        {/* Analysis */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
            Analysis
          </p>

          {analyzeMutation.isPending && (
            <div className="rounded-lg border border-white/[0.07] bg-[#111114] p-5 space-y-3">
              <Skeleton className="h-3.5 w-full bg-white/[0.05]" />
              <Skeleton className="h-3.5 w-4/5 bg-white/[0.05]" />
              <Skeleton className="h-3.5 w-3/4 bg-white/[0.05]" />
            </div>
          )}

          {!analyzeMutation.isPending && analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : !analyzeMutation.isPending && (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
              <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Zap className="h-4 w-4 text-zinc-700" />
              </div>
              <p className="text-[13px] text-zinc-500 font-medium">No analysis yet</p>
              <p className="text-[12px] text-zinc-700 mt-1">
                Click &ldquo;Analyze&rdquo; to generate AI insights
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-6 w-6 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3 w-3 text-zinc-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-600 font-medium">{label}</p>
        <div className="text-[13px] mt-0.5 truncate">{children}</div>
      </div>
    </div>
  )
}

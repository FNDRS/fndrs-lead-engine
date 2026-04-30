"use client"

import { use } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getLead, analyzeLead, updateLead } from "@/services/api"
import { AnalysisPanel } from "@/components/analysis-panel"
import { StatusBadge } from "@/components/status-badge"
import { ScoreBadge } from "@/components/score-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import Link from "next/link"
import {
  ArrowLeft,
  Globe,
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
        <p className="text-red-400 text-sm">Failed to load lead.</p>
      </div>
    )
  }

  const lead = data?.lead
  const analysis = data?.analysis

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Leads
          </Link>
          {isLoading ? (
            <Skeleton className="h-7 w-48 bg-zinc-800" />
          ) : (
            <h1 className="text-xl font-semibold text-zinc-100">{lead?.businessName}</h1>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {isLoading ? (
              <Skeleton className="h-5 w-16 bg-zinc-800" />
            ) : (
              lead && <StatusBadge status={lead.status} />
            )}
            {lead?.score !== undefined && <ScoreBadge score={lead.score} />}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            onClick={() => contactMutation.mutate()}
            disabled={contactMutation.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark Contacted
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
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

      <Separator className="bg-zinc-800" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-zinc-400">Business Info</h2>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full bg-zinc-800" />
                ))
              ) : (
                <>
                  {lead?.website && (
                    <InfoRow
                      icon={Globe}
                      label="Website"
                      value={
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:underline truncate"
                        >
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      }
                    />
                  )}
                  {lead?.city && (
                    <InfoRow icon={MapPin} label="City" value={lead.city} />
                  )}
                  {lead?.category && (
                    <InfoRow icon={Tag} label="Category" value={lead.category} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analysis */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-zinc-400">Analysis</h2>
          {analyzeMutation.isPending && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-3">
              <Skeleton className="h-4 w-full bg-zinc-800" />
              <Skeleton className="h-4 w-3/4 bg-zinc-800" />
              <Skeleton className="h-4 w-5/6 bg-zinc-800" />
            </div>
          )}
          {!analyzeMutation.isPending && analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : !analyzeMutation.isPending && (
            <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center">
              <Zap className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No analysis yet.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Click &ldquo;Analyze&rdquo; to generate insights.
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
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-zinc-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <div className="text-sm text-zinc-300 mt-0.5">{value}</div>
      </div>
    </div>
  )
}

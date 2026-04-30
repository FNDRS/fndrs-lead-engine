"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getRuns, triggerDailyRun } from "@/services/api"
import type { DailyRun } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Play, CheckCircle2, XCircle, Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"

function RunStatus({ status }: { status?: string }) {
  const s = status?.toLowerCase()
  if (s === "completed" || s === "success") {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[13px] text-emerald-400 capitalize">{status}</span>
      </div>
    )
  }
  if (s === "failed" || s === "error") {
    return (
      <div className="flex items-center gap-1.5">
        <XCircle className="h-3.5 w-3.5 text-red-400" />
        <span className="text-[13px] text-red-400 capitalize">{status}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <Clock3 className="h-3.5 w-3.5 text-zinc-600" />
      <span className="text-[13px] text-zinc-500 capitalize">{status ?? "unknown"}</span>
    </div>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <TableRow key={i} className="border-white/[0.05] hover:bg-transparent">
      <TableCell><Skeleton className="h-3.5 w-36 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-20 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-10 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-10 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-8 bg-white/[0.05]" /></TableCell>
    </TableRow>
  ))
}

export default function RunsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["runs"], queryFn: getRuns })
  const runs: DailyRun[] = data?.data ?? []

  const triggerMutation = useMutation({
    mutationFn: triggerDailyRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] })
      toast.success("Daily run triggered")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-100 tracking-tight">Runs</h1>
          <p className="text-[13px] text-zinc-600 mt-0.5">Daily lead ingestion history</p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 px-3 text-[13px] bg-violet-600 hover:bg-violet-500 text-white shadow-none"
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
        >
          <Play className={cn("h-3.5 w-3.5", triggerMutation.isPending && "animate-pulse")} />
          {triggerMutation.isPending ? "Running..." : "Trigger Run"}
        </Button>
      </div>

      <div className="rounded-lg border border-white/[0.07] overflow-hidden bg-[#111114]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.07] hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">Date</TableHead>
              <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">Status</TableHead>
              <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">Found</TableHead>
              <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">Processed</TableHead>
              <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : runs.length === 0 ? (
              <TableRow className="border-white/[0.05] hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <p className="text-[13px] text-zinc-500">No runs yet</p>
                  <p className="text-[12px] text-zinc-700 mt-1">Trigger your first run above</p>
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow
                  key={run.id}
                  className="border-white/[0.05] hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell className="text-[13px] text-zinc-400 py-3 font-mono text-[12px]">
                    {formatDate(run.createdAt)}
                  </TableCell>
                  <TableCell className="py-3">
                    <RunStatus status={run.status} />
                  </TableCell>
                  <TableCell className="text-[13px] text-zinc-500 py-3 tabular-nums">
                    {run.leadsFound ?? <span className="text-zinc-700">—</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-zinc-500 py-3 tabular-nums">
                    {run.leadsProcessed ?? <span className="text-zinc-700">—</span>}
                  </TableCell>
                  <TableCell className="py-3 tabular-nums">
                    {run.errors !== undefined && run.errors > 0 ? (
                      <span className="text-[13px] text-red-400">{run.errors}</span>
                    ) : (
                      <span className="text-[13px] text-zinc-700">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

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
import { Play, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

function RunStatusIcon({ status }: { status?: string }) {
  const s = status?.toLowerCase()
  if (s === "completed" || s === "success") {
    return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
  }
  if (s === "failed" || s === "error") {
    return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
  }
  return <Clock className="h-3.5 w-3.5 text-zinc-500" />
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
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i} className="border-zinc-800">
      <TableCell><Skeleton className="h-4 w-36 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12 bg-zinc-800" /></TableCell>
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
          <h1 className="text-xl font-semibold text-zinc-100">Runs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Daily lead ingestion history</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
        >
          <Play className="h-3.5 w-3.5" />
          {triggerMutation.isPending ? "Running..." : "Trigger Run"}
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Date</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Leads Found</TableHead>
              <TableHead className="text-zinc-400">Processed</TableHead>
              <TableHead className="text-zinc-400">Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : runs.length === 0 ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                  No runs yet. Trigger your first run.
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id} className="border-zinc-800 hover:bg-zinc-800/40">
                  <TableCell className="text-zinc-300 text-sm">
                    {formatDate(run.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <RunStatusIcon status={run.status} />
                      <span
                        className={cn(
                          "text-xs capitalize",
                          run.status?.toLowerCase() === "completed" || run.status?.toLowerCase() === "success"
                            ? "text-emerald-400"
                            : run.status?.toLowerCase() === "failed" || run.status?.toLowerCase() === "error"
                            ? "text-red-400"
                            : "text-zinc-500"
                        )}
                      >
                        {run.status ?? "unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {run.leadsFound ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {run.leadsProcessed ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {run.errors !== undefined && run.errors > 0 ? (
                      <span className="text-red-400">{run.errors}</span>
                    ) : (
                      <span className="text-zinc-600">0</span>
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

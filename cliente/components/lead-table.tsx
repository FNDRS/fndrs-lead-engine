"use client"

import { useRouter } from "next/navigation"
import type { Lead } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScoreBadge } from "@/components/score-badge"
import { StatusBadge } from "@/components/status-badge"
import { Globe, Building2 } from "lucide-react"

interface LeadTableProps {
  leads: Lead[]
  isLoading?: boolean
  actions?: (lead: Lead) => React.ReactNode
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i} className="border-zinc-800">
      <TableCell><Skeleton className="h-4 w-36 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16 bg-zinc-800" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12 bg-zinc-800" /></TableCell>
      <TableCell />
    </TableRow>
  ))
}

export function LeadTable({ leads, isLoading, actions }: LeadTableProps) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-400">Business</TableHead>
            <TableHead className="text-zinc-400">Category</TableHead>
            <TableHead className="text-zinc-400">City</TableHead>
            <TableHead className="text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-400">Score</TableHead>
            {actions && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : leads.length === 0 ? (
            <TableRow className="border-zinc-800">
              <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                No leads found
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="border-zinc-800 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="font-medium text-zinc-100">{lead.businessName}</span>
                  </div>
                  {lead.website && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Globe className="h-3 w-3 text-zinc-600" />
                      <span className="text-xs text-zinc-500 truncate max-w-[180px]">
                        {lead.website.replace(/^https?:\/\//, "")}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {lead.category ?? "—"}
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {lead.city ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>
                  <ScoreBadge score={lead.score} />
                </TableCell>
                {actions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {actions(lead)}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

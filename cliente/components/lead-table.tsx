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
import { ContactMethodBadge } from "@/components/contact-method-badge"
import { Globe } from "lucide-react"

interface LeadTableProps {
  leads: Lead[]
  isLoading?: boolean
  actions?: (lead: Lead) => React.ReactNode
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i} className="border-white/[0.05] hover:bg-transparent">
      <TableCell><Skeleton className="h-3.5 w-40 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-24 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-20 bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full bg-white/[0.05]" /></TableCell>
      <TableCell><Skeleton className="h-5 w-10 rounded-full bg-white/[0.05]" /></TableCell>
      {<TableCell />}
    </TableRow>
  ))
}

export function LeadTable({ leads, isLoading, actions }: LeadTableProps) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-white/[0.07] overflow-hidden bg-[#111114]">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.07] hover:bg-transparent">
            <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">
              Business
            </TableHead>
            <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">
              Category
            </TableHead>
            <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">
              City
            </TableHead>
            <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">
              Status
            </TableHead>
            <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-10">
              Score
            </TableHead>
            {actions && <TableHead className="h-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : leads.length === 0 ? (
            <TableRow className="border-white/[0.05] hover:bg-transparent">
              <TableCell colSpan={6} className="py-16 text-center">
                <p className="text-[13px] text-zinc-500">No leads found</p>
                <p className="text-xs text-zinc-700 mt-1">Try adjusting your filters</p>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="border-white/[0.05] cursor-pointer hover:bg-white/[0.03] transition-colors group"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <TableCell className="py-3">
                  <p className="text-[13px] font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
                    {lead.businessName}
                  </p>
                  {lead.website && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Globe className="h-2.5 w-2.5 text-zinc-600 shrink-0" />
                      <span className="text-[11px] text-zinc-600 truncate max-w-[200px]">
                        {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-[13px] text-zinc-500 py-3">
                  {lead.category ?? <span className="text-zinc-700">—</span>}
                </TableCell>
                <TableCell className="text-[13px] text-zinc-500 py-3">
                  {lead.city ?? <span className="text-zinc-700">—</span>}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={lead.status} />
                    <ContactMethodBadge method={lead.contactMethod} />
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <ScoreBadge score={lead.score} />
                </TableCell>
                {actions && (
                  <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
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

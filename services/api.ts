import type { Lead, LeadAnalysis, DailyRun, CreateLeadInput } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText)
    throw new Error(error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Leads
export const getLeads = (): Promise<{ data: Lead[] }> =>
  fetcher("/leads")

export const createLead = (input: CreateLeadInput): Promise<Lead> =>
  fetcher("/leads", { method: "POST", body: JSON.stringify(input) })

export const getLead = (id: string): Promise<{ lead: Lead; analysis?: LeadAnalysis }> =>
  fetcher(`/leads/${id}`)

export const updateLead = (id: string, data: Partial<Lead>): Promise<Lead> =>
  fetcher(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const analyzeLead = (id: string): Promise<{ analysis: LeadAnalysis }> =>
  fetcher(`/leads/${id}/analyze`, { method: "POST" })

// Runs
export const triggerDailyRun = (): Promise<{ run: DailyRun }> =>
  fetcher("/runs/daily", { method: "POST" })

export const getRuns = (): Promise<{ data: DailyRun[] }> =>
  fetcher("/runs")

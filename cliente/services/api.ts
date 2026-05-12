import axios, {
  isAxiosError,
  type AxiosError,
  type AxiosRequestConfig,
} from "axios"
import type { Lead, LeadAnalysis, DailyRun, CreateLeadInput } from "@/lib/types"

/**
 * Base URL for Nest API calls.
 * - Browser (default): `/api/backend` → Next rewrites to `NEST_ORIGIN` (same origin).
 * - Override: `NEXT_PUBLIC_API_BASE` (full origin). Legacy: `NEXT_PUBLIC_API_URL`.
 * - Server (RSC / Node): `NEST_ORIGIN`, then `INTERNAL_API_URL`, then `127.0.0.1:3001`.
 */
export function getApiBaseUrl(): string {
  const publicBase =
    process.env.NEXT_PUBLIC_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim()
  if (publicBase) return publicBase.replace(/\/+$/, "")
  if (typeof window !== "undefined") return "/api/backend"
  return (
    process.env.NEST_ORIGIN?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.BACKEND_PROXY_URL?.trim() ||
    "http://127.0.0.1:3001"
  ).replace(/\/+$/, "")
}

const api = axios.create({
  headers: { "Content-Type": "application/json" },
})

function messageFromAxiosError(err: unknown): string {
  if (!isAxiosError(err)) {
    return err instanceof Error && err.message ? err.message : "Request failed"
  }
  const axErr = err as AxiosError
  const { response } = axErr
  const status = response?.status
  const raw = response?.data
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message
  }
  if (Array.isArray(data?.message) && data.message.length > 0) {
    return data.message.map(String).join(", ")
  }
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
  }
  if (status) return `Request failed: ${status}`
  if (axErr.code === "ERR_NETWORK" || axErr.message === "Network Error") {
    return "Network error — start Nest (pnpm dev:server) and ensure NEST_ORIGIN in cliente/.env.local matches the API port."
  }
  return axErr.message || "Request failed"
}

async function request<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  try {
    const { data } = await api.request<T>({
      baseURL: getApiBaseUrl(),
      url: path,
      ...config,
    })
    return data
  } catch (err) {
    throw new Error(messageFromAxiosError(err))
  }
}

// Leads
export const getLeads = (): Promise<{ data: Lead[] }> =>
  request("/leads")

export const createLead = (input: CreateLeadInput): Promise<Lead> =>
  request("/leads", { method: "POST", data: input })

export const getLead = (id: string): Promise<{ lead: Lead; analysis?: LeadAnalysis }> =>
  request(`/leads/${id}`)

export const updateLead = (id: string, data: Partial<Lead>): Promise<Lead> =>
  request(`/leads/${id}`, { method: "PATCH", data })

export const analyzeLead = (id: string): Promise<{ analysis: LeadAnalysis }> =>
  request(`/leads/${id}/analyze`, { method: "POST" })

// Runs
export const triggerDailyRun = (): Promise<{ run: DailyRun }> =>
  request("/runs/daily", { method: "POST" })

export const getRuns = (): Promise<{ data: DailyRun[] }> =>
  request("/runs")

export type ContactMethod = "call" | "email"

export type FollowUpOutcome =
  | "pending"
  | "interested"
  | "not_interested"
  | "won"
  | "lost"

export interface Lead {
  id: string
  businessName: string
  website?: string
  phone?: string
  category?: string
  city?: string
  status: string
  score?: number
  contactMethod?: ContactMethod | null
  promises?: string | null
  responseNotes?: string | null
  responded?: boolean
  respondedAt?: string | null
  nextFollowUpAt?: string | null
  outcome?: FollowUpOutcome | null
}

export interface LeadAnalysis {
  summary: string
  problems: string[]
  opportunities: string[]
  suggestedOffer: string
  outreachMessage: string
  callSimulation?: string
  reanalysisCount?: number
  score: number
}

export interface DailyRun {
  id: string
  createdAt: string
  status?: string
  leadsProcessed?: number
  leadsFound?: number
  errors?: number
}

export interface CreateLeadInput {
  businessName: string
  website?: string
  category?: string
  city?: string
}

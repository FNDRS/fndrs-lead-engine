export interface Lead {
  id: string
  businessName: string
  website?: string
  category?: string
  city?: string
  status: string
  score?: number
}

export interface LeadAnalysis {
  summary: string
  problems: string[]
  opportunities: string[]
  suggestedOffer: string
  outreachMessage: string
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

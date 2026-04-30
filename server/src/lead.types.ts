export type LeadStatus = 'new' | 'analyzed' | 'contacted' | 'rejected';
export type RunStatus = 'running' | 'completed' | 'failed';

export interface Lead {
  id: string;
  businessName: string;
  website?: string;
  phone?: string;
  category?: string;
  city?: string;
  status: LeadStatus;
  score?: number;
}

export interface LeadAnalysis {
  summary: string;
  problems: string[];
  opportunities: string[];
  suggestedOffer: string;
  outreachMessage: string;
  callSimulation?: string;
  reanalysisCount?: number;
  score: number;
}

export interface DailyRun {
  id: string;
  createdAt: string;
  status: RunStatus;
  leadsFound?: number;
  leadsProcessed?: number;
  errors?: number;
}

export interface CreateLeadInput {
  businessName: string;
  website?: string;
  phone?: string;
  category?: string;
  city?: string;
}


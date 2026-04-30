import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type LeadStatus = 'new' | 'analyzed' | 'contacted' | 'rejected';
export type RunStatus = 'running' | 'completed' | 'failed';

export interface Lead {
  id: string;
  businessName: string;
  website?: string;
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
  category?: string;
  city?: string;
}

@Injectable()
export class AppService {
  private leads: Lead[] = [
    {
      id: randomUUID(),
      businessName: 'Cafe Central',
      website: 'https://example.com',
      category: 'Cafe',
      city: 'CDMX',
      status: 'new',
      score: 62,
    },
    {
      id: randomUUID(),
      businessName: 'Clinica Nova',
      website: 'https://example.org',
      category: 'Health',
      city: 'Monterrey',
      status: 'new',
      score: 71,
    },
  ];

  private analyses = new Map<string, LeadAnalysis>();
  private runs: DailyRun[] = [];

  getHealth() {
    return { ok: true };
  }

  getLeads() {
    return { data: this.leads };
  }

  createLead(input: CreateLeadInput) {
    const lead: Lead = {
      id: randomUUID(),
      businessName: input.businessName,
      website: input.website,
      category: input.category,
      city: input.city,
      status: 'new',
      score: 0,
    };
    this.leads.unshift(lead);
    return lead;
  }

  getLead(id: string) {
    const lead = this.findLeadOrThrow(id);
    const analysis = this.analyses.get(id);
    return { lead, analysis };
  }

  updateLead(id: string, data: Partial<Lead>) {
    const lead = this.findLeadOrThrow(id);
    Object.assign(lead, data);
    return lead;
  }

  analyzeLead(id: string) {
    const lead = this.findLeadOrThrow(id);
    const score = this.computeScore(lead);

    const analysis: LeadAnalysis = {
      summary: `${lead.businessName} shows strong local lead potential in ${lead.city ?? 'its market'}.`,
      problems: [
        'No clear conversion-focused CTA on website.',
        'Inconsistent review/reputation signals.',
      ],
      opportunities: [
        'Improve local SEO with service + city pages.',
        'Add clearer offer and booking/contact funnel.',
      ],
      suggestedOffer:
        'Lead-gen website optimization + local SEO starter package.',
      outreachMessage: `Hi ${lead.businessName}, I noticed opportunities to increase qualified leads from your website and local search presence. I can share a quick action plan if useful.`,
      score,
    };

    lead.status = 'analyzed';
    lead.score = score;
    this.analyses.set(id, analysis);
    return { analysis };
  }

  triggerDailyRun() {
    const run: DailyRun = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'completed',
      leadsFound: Math.max(1, this.leads.length),
      leadsProcessed: this.leads.length,
      errors: 0,
    };
    this.runs.unshift(run);
    return { run };
  }

  getRuns() {
    return { data: this.runs };
  }

  private findLeadOrThrow(id: string) {
    const lead = this.leads.find((item) => item.id === id);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  private computeScore(lead: Lead) {
    let score = 55;
    if (lead.website) score += 15;
    if (lead.category) score += 10;
    if (lead.city) score += 10;
    return Math.min(95, score);
  }
}

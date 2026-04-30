import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import {
  Lead as PrismaLead,
  LeadAnalysis as PrismaLeadAnalysis,
  LeadStatus as PrismaLeadStatus,
  PrismaClient,
  RunStatus as PrismaRunStatus,
} from '@prisma/client';

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
export class AppService implements OnModuleDestroy {
  private readonly prisma: PrismaClient;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  getHealth() {
    return { ok: true };
  }

  async getLeads() {
    const leads = await this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: leads.map((lead) => this.mapLead(lead)) };
  }

  async createLead(input: CreateLeadInput) {
    const lead = await this.prisma.lead.create({
      data: {
        businessName: input.businessName,
        website: input.website,
        category: input.category,
        city: input.city,
      },
    });
    return this.mapLead(lead);
  }

  async getLead(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { analysis: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return {
      lead: this.mapLead(lead),
      analysis: lead.analysis ? this.mapAnalysis(lead.analysis) : undefined,
    };
  }

  async updateLead(id: string, data: Partial<Lead>) {
    await this.ensureLeadExists(id);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        businessName: data.businessName,
        website: data.website,
        category: data.category,
        city: data.city,
        score: data.score,
        status: data.status ? this.toPrismaLeadStatus(data.status) : undefined,
      },
    });
    return this.mapLead(lead);
  }

  async analyzeLead(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const score = this.computeScore(lead);
    const problems = [
      'No clear conversion-focused CTA on website.',
      'Inconsistent review/reputation signals.',
    ];
    const opportunities = [
      'Improve local SEO with service + city pages.',
      'Add clearer offer and booking/contact funnel.',
    ];
    const analysis = await this.prisma.leadAnalysis.upsert({
      where: { leadId: id },
      update: {
        summary: `${lead.businessName} shows strong local lead potential in ${lead.city ?? 'its market'}.`,
        problems,
        opportunities,
        suggestedOffer:
          'Lead-gen website optimization + local SEO starter package.',
        outreachMessage: `Hi ${lead.businessName}, I noticed opportunities to increase qualified leads from your website and local search presence. I can share a quick action plan if useful.`,
        technicalFindings: {},
        rawAiResponse: JSON.stringify({ source: 'rule-based-analysis' }),
        score,
      },
      create: {
        leadId: id,
        summary: `${lead.businessName} shows strong local lead potential in ${lead.city ?? 'its market'}.`,
        problems,
        opportunities,
        suggestedOffer:
          'Lead-gen website optimization + local SEO starter package.',
        outreachMessage: `Hi ${lead.businessName}, I noticed opportunities to increase qualified leads from your website and local search presence. I can share a quick action plan if useful.`,
        technicalFindings: {},
        rawAiResponse: JSON.stringify({ source: 'rule-based-analysis' }),
        score,
      },
    });

    await this.prisma.lead.update({
      where: { id },
      data: { status: PrismaLeadStatus.ANALYZED, score },
    });

    return { analysis: this.mapAnalysis(analysis) };
  }

  async triggerDailyRun() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalFound = await this.prisma.lead.count();
    const totalAnalyzed = await this.prisma.lead.count({
      where: { status: PrismaLeadStatus.ANALYZED },
    });
    const run = await this.prisma.dailyRun.upsert({
      where: { date: today },
      update: {
        status: PrismaRunStatus.COMPLETED,
        totalFound,
        totalAnalyzed,
      },
      create: {
        date: today,
        status: PrismaRunStatus.COMPLETED,
        totalFound,
        totalAnalyzed,
      },
    });
    return { run: this.mapRun(run) };
  }

  async getRuns() {
    const runs = await this.prisma.dailyRun.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: runs.map((run) => this.mapRun(run)) };
  }

  private async ensureLeadExists(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
  }

  private mapLead(lead: PrismaLead): Lead {
    return {
      id: lead.id,
      businessName: lead.businessName,
      website: lead.website ?? undefined,
      category: lead.category ?? undefined,
      city: lead.city ?? undefined,
      status: lead.status.toLowerCase() as LeadStatus,
      score: lead.score,
    };
  }

  private mapAnalysis(analysis: PrismaLeadAnalysis): LeadAnalysis {
    return {
      summary: analysis.summary,
      problems: Array.isArray(analysis.problems)
        ? analysis.problems.map(String)
        : [],
      opportunities: Array.isArray(analysis.opportunities)
        ? analysis.opportunities.map(String)
        : [],
      suggestedOffer: analysis.suggestedOffer,
      outreachMessage: analysis.outreachMessage,
      score: analysis.score,
    };
  }

  private mapRun(run: {
    id: string;
    createdAt: Date;
    status: PrismaRunStatus;
    totalFound: number;
    totalAnalyzed: number;
  }): DailyRun {
    return {
      id: run.id,
      createdAt: run.createdAt.toISOString(),
      status: run.status.toLowerCase() as RunStatus,
      leadsFound: run.totalFound,
      leadsProcessed: run.totalAnalyzed,
      errors: 0,
    };
  }

  private toPrismaLeadStatus(status: LeadStatus): PrismaLeadStatus {
    switch (status) {
      case 'new':
        return PrismaLeadStatus.NEW;
      case 'analyzed':
        return PrismaLeadStatus.ANALYZED;
      case 'contacted':
        return PrismaLeadStatus.CONTACTED;
      case 'rejected':
        return PrismaLeadStatus.REJECTED;
      default:
        return PrismaLeadStatus.NEW;
    }
  }

  private computeScore(lead: PrismaLead) {
    let score = 55;
    if (lead.website) score += 15;
    if (lead.category) score += 10;
    if (lead.city) score += 10;
    return Math.min(95, score);
  }
}

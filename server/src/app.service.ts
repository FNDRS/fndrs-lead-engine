import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import {
  Lead as PrismaLead,
  LeadAnalysis as PrismaLeadAnalysis,
  LeadStatus as PrismaLeadStatus,
  Prisma,
  PrismaClient,
  RunStatus as PrismaRunStatus,
} from '@prisma/client';
import { DiscoveredLead, LeadDiscoveryService } from './lead-discovery.service';

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

@Injectable()
export class AppService implements OnModuleDestroy {
  private readonly logger = new Logger(AppService.name);
  private readonly prisma: PrismaClient;

  constructor(private readonly leadDiscovery: LeadDiscoveryService) {
    const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // ─── Health ──────────────────────────────────────────────────────────────────

  getHealth() {
    return { ok: true };
  }

  // ─── Leads ───────────────────────────────────────────────────────────────────

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
        phone: input.phone,
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
        phone: data.phone,
        category: data.category,
        city: data.city,
        score: data.score,
        status: data.status ? this.toPrismaLeadStatus(data.status) : undefined,
      },
    });
    return this.mapLead(lead);
  }

  // ─── Analysis ────────────────────────────────────────────────────────────────

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
    const summary = `${lead.businessName} muestra buen potencial de captacion local en ${lead.city ?? 'su mercado principal'}.`;
    const suggestedOffer =
      'Optimizacion de conversion en sitio web + paquete inicial de SEO local.';
    const outreachMessage = `Hola ${lead.businessName}, estuve revisando su presencia digital y veo oportunidades claras para generar mas leads calificados desde web y Google Maps. ${lead.phone ? `Vi este numero de contacto: ${lead.phone}. ` : ''}Si te parece, te comparto un plan rapido de 3 acciones para empezar esta semana.`;
    const callSimulation = [
      `Asesor: Hola, ¿hablo con la persona encargada de ventas o marketing en ${lead.businessName}?`,
      'Cliente: Si, adelante.',
      `Asesor: Excelente, te llamo porque detectamos oportunidades para generar mas leads desde su presencia digital${lead.phone ? ` y tenemos este numero de contacto registrado: ${lead.phone}` : ''}.`,
      'Asesor: En menos de 2 semanas podemos mejorar conversion web y visibilidad local con un plan de 3 pasos.',
      'Cliente: ¿Que necesitan de mi parte?',
      'Asesor: Solo 15 minutos para revisar su situacion actual y proponerte acciones concretas con impacto rapido.',
      'Asesor: ¿Te va bien agendarlo manana por la tarde?',
    ].join('\n');
    const analysis = await this.prisma.leadAnalysis.upsert({
      where: { leadId: id },
      update: {
        summary,
        problems,
        opportunities,
        suggestedOffer,
        outreachMessage,
        technicalFindings: { callSimulation },
        rawAiResponse: JSON.stringify({ source: 'rule-based-analysis' }),
        score,
      },
      create: {
        leadId: id,
        summary,
        problems,
        opportunities,
        suggestedOffer,
        outreachMessage,
        technicalFindings: { callSimulation },
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

  // ─── Daily Run ───────────────────────────────────────────────────────────────

  async triggerDailyRun() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Create / reset today's run as RUNNING
    const run = await this.prisma.dailyRun.upsert({
      where: { date: today },
      update: {
        status: PrismaRunStatus.RUNNING,
        totalFound: 0,
        totalAnalyzed: 0,
        notes: null,
      },
      create: {
        date: today,
        status: PrismaRunStatus.RUNNING,
        totalFound: 0,
        totalAnalyzed: 0,
      },
    });

    const notes: string[] = [];
    let discoveredCount = 0;
    let createdCount = 0;

    try {
      // 2. Discover leads via Google Places
      this.logger.log('Daily run started — discovering leads...');
      const discovered = await this.leadDiscovery.discoverDailyLeads();
      discoveredCount = discovered.length;
      notes.push(`Discovered ${discoveredCount} leads from Google Places.`);
      this.logger.log(`Discovered ${discoveredCount} leads.`);

      // 3. Save non-duplicates
      for (const lead of discovered) {
        const isDuplicate = await this.checkDuplicateLead(lead);
        if (isDuplicate) {
          this.logger.debug(`Skipping duplicate: ${lead.businessName} (${lead.city})`);
          continue;
        }

        await this.prisma.lead.create({
          data: {
            businessName: lead.businessName,
            website: lead.website,
            phone: lead.phone,
            category: lead.category,
            city: lead.city,
            country: lead.country,
            source: lead.source,
            score: lead.initialScore,
            status: PrismaLeadStatus.NEW,
          },
        });
        createdCount++;
        this.logger.debug(`Created: ${lead.businessName} (score ${lead.initialScore})`);
      }

      const skipped = discoveredCount - createdCount;
      notes.push(`Saved ${createdCount} new leads. Skipped ${skipped} duplicates.`);
      this.logger.log(`Saved ${createdCount} new leads, ${skipped} duplicates skipped.`);

      // 4. Mark run COMPLETED
      const updated = await this.prisma.dailyRun.update({
        where: { id: run.id },
        data: {
          status: PrismaRunStatus.COMPLETED,
          totalFound: discoveredCount,
          totalAnalyzed: createdCount,
          notes: notes.join(' '),
        },
      });

      return { run: this.mapRun(updated) };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notes.push(`Error: ${msg}`);
      this.logger.error(`Daily run failed: ${msg}`);

      // Update run as FAILED — suppress secondary errors
      await this.prisma.dailyRun
        .update({
          where: { id: run.id },
          data: {
            status: PrismaRunStatus.FAILED,
            totalFound: discoveredCount,
            totalAnalyzed: createdCount,
            notes: notes.join(' '),
          },
        })
        .catch((e: unknown) =>
          this.logger.error(
            `Failed to update run status: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );

      if (msg.includes('GOOGLE_PLACES_API_KEY is not set')) {
        throw new BadRequestException(msg);
      }
      if (msg.startsWith('Google Places API')) {
        throw new ServiceUnavailableException(msg);
      }
      throw err;
    }
  }

  async getRuns() {
    const runs = await this.prisma.dailyRun.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: runs.map((run) => this.mapRun(run)) };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async ensureLeadExists(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
  }

  /**
   * Returns true if a lead matching any of website / phone / name+city already exists in DB.
   * Uses OR so a single Prisma query covers all three signals.
   */
  private async checkDuplicateLead(lead: DiscoveredLead): Promise<boolean> {
    const orConditions: Array<Record<string, unknown>> = [];

    if (lead.website) {
      orConditions.push({ website: lead.website });
    }

    if (lead.phone) {
      orConditions.push({ phone: lead.phone });
    }

    // businessName + city — both must match
    orConditions.push({
      AND: [
        { businessName: lead.businessName },
        { city: lead.city ?? null },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await this.prisma.lead.findFirst({
      where: { OR: orConditions } as any,
      select: { id: true },
    });

    return !!existing;
  }

  private mapLead(lead: PrismaLead): Lead {
    return {
      id: lead.id,
      businessName: lead.businessName,
      website: lead.website ?? undefined,
      phone: lead.phone ?? undefined,
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
      callSimulation: this.extractCallSimulation(analysis.technicalFindings),
      score: analysis.score,
    };
  }

  private extractCallSimulation(technicalFindings: Prisma.JsonValue): string | undefined {
    if (
      technicalFindings &&
      typeof technicalFindings === 'object' &&
      'callSimulation' in technicalFindings &&
      typeof technicalFindings.callSimulation === 'string'
    ) {
      return technicalFindings.callSimulation;
    }
    return undefined;
  }

  private mapRun(run: {
    id: string;
    createdAt: Date;
    status: PrismaRunStatus;
    totalFound: number;
    totalAnalyzed: number;
    notes?: string | null;
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

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
  ContactMethod as PrismaContactMethod,
  FollowUpOutcome as PrismaFollowUpOutcome,
  Lead as PrismaLead,
  LeadAnalysis as PrismaLeadAnalysis,
  LeadStatus as PrismaLeadStatus,
  PrismaClient,
  RunStatus as PrismaRunStatus,
} from '@prisma/client';
import { LeadAnalysisService } from './lead-analysis.service';
import { DiscoveredLead, LeadDiscoveryService } from './lead-discovery.service';
import type {
  ContactMethod,
  CreateLeadInput,
  DailyRun,
  FollowUpOutcome,
  Lead,
  LeadAnalysis,
  LeadStatus,
  RunStatus,
} from './lead.types';

@Injectable()
export class AppService implements OnModuleDestroy {
  private readonly logger = new Logger(AppService.name);
  private readonly prisma: PrismaClient;

  constructor(
    private readonly leadDiscovery: LeadDiscoveryService,
    private readonly leadAnalysis: LeadAnalysisService,
  ) {
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
        contactMethod:
          data.contactMethod === undefined
            ? undefined
            : data.contactMethod === null
              ? null
              : this.toPrismaContactMethod(data.contactMethod),
        promises: data.promises === undefined ? undefined : data.promises,
        responseNotes:
          data.responseNotes === undefined ? undefined : data.responseNotes,
        responded: data.responded === undefined ? undefined : data.responded,
        respondedAt:
          data.respondedAt === undefined
            ? undefined
            : data.respondedAt === null
              ? null
              : new Date(data.respondedAt),
        nextFollowUpAt:
          data.nextFollowUpAt === undefined
            ? undefined
            : data.nextFollowUpAt === null
              ? null
              : new Date(data.nextFollowUpAt),
        outcome:
          data.outcome === undefined
            ? undefined
            : data.outcome === null
              ? null
              : this.toPrismaFollowUpOutcome(data.outcome),
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

    const existingAnalysis = await this.prisma.leadAnalysis.findUnique({
      where: { leadId: id },
      select: { technicalFindings: true },
    });
    const previousRuns = existingAnalysis
      ? this.leadAnalysis.extractAnalysisRuns(existingAnalysis.technicalFindings)
      : 0;
    const analysisRuns = previousRuns + 1;

    const ai = await this.leadAnalysis.generate(lead);
    const analysis = await this.prisma.leadAnalysis.upsert({
      where: { leadId: id },
      update: {
        summary: ai.summary,
        problems: ai.problems,
        opportunities: ai.opportunities,
        suggestedOffer: ai.suggestedOffer,
        outreachMessage: ai.outreachMessage,
        technicalFindings: {
          callSimulation: ai.callSimulation,
          websiteContextUsed: ai.websiteContextUsed,
          analysisRuns,
        },
        rawAiResponse: ai.rawAiResponse,
        score: ai.score,
      },
      create: {
        leadId: id,
        summary: ai.summary,
        problems: ai.problems,
        opportunities: ai.opportunities,
        suggestedOffer: ai.suggestedOffer,
        outreachMessage: ai.outreachMessage,
        technicalFindings: {
          callSimulation: ai.callSimulation,
          websiteContextUsed: ai.websiteContextUsed,
          analysisRuns,
        },
        rawAiResponse: ai.rawAiResponse,
        score: ai.score,
      },
    });

    await this.prisma.lead.update({
      where: { id },
      data: { status: PrismaLeadStatus.ANALYZED, score: ai.score },
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
          this.logger.debug(
            `Skipping duplicate: ${lead.businessName} (${lead.city})`,
          );
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
        this.logger.debug(
          `Created: ${lead.businessName} (score ${lead.initialScore})`,
        );
      }

      const skipped = discoveredCount - createdCount;
      notes.push(
        `Saved ${createdCount} new leads. Skipped ${skipped} duplicates.`,
      );
      this.logger.log(
        `Saved ${createdCount} new leads, ${skipped} duplicates skipped.`,
      );

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
      AND: [{ businessName: lead.businessName }, { city: lead.city ?? null }],
    });

    const existing = await this.prisma.lead.findFirst({
      where: { OR: orConditions },
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
      contactMethod: lead.contactMethod
        ? (lead.contactMethod.toLowerCase() as ContactMethod)
        : null,
      promises: lead.promises ?? null,
      responseNotes: lead.responseNotes ?? null,
      responded: lead.responded,
      respondedAt: lead.respondedAt ? lead.respondedAt.toISOString() : null,
      nextFollowUpAt: lead.nextFollowUpAt
        ? lead.nextFollowUpAt.toISOString()
        : null,
      outcome: lead.outcome
        ? (lead.outcome.toLowerCase() as FollowUpOutcome)
        : null,
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
      callSimulation: this.leadAnalysis.extractCallSimulation(
        analysis.technicalFindings,
      ),
      reanalysisCount: this.leadAnalysis.extractReanalysisCount(
        analysis.technicalFindings,
      ),
      score: analysis.score,
    };
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

  private toPrismaContactMethod(method: ContactMethod): PrismaContactMethod {
    return method === 'call'
      ? PrismaContactMethod.CALL
      : PrismaContactMethod.EMAIL;
  }

  private toPrismaFollowUpOutcome(
    outcome: FollowUpOutcome,
  ): PrismaFollowUpOutcome {
    switch (outcome) {
      case 'pending':
        return PrismaFollowUpOutcome.PENDING;
      case 'interested':
        return PrismaFollowUpOutcome.INTERESTED;
      case 'not_interested':
        return PrismaFollowUpOutcome.NOT_INTERESTED;
      case 'won':
        return PrismaFollowUpOutcome.WON;
      case 'lost':
        return PrismaFollowUpOutcome.LOST;
    }
  }
}

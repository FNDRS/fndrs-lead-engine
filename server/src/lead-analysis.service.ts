import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { Lead as PrismaLead, Prisma } from '@prisma/client';

interface GeneratedLeadAnalysis {
  summary: string;
  problems: string[];
  opportunities: string[];
  suggestedOffer: string;
  outreachMessage: string;
  callSimulation: string;
  score: number;
  rawAiResponse: string;
  websiteContextUsed: boolean;
}

@Injectable()
export class LeadAnalysisService {
  async generate(lead: PrismaLead): Promise<GeneratedLeadAnalysis> {
    const websiteContext = await this.fetchWebsiteContext(lead.website);
    const ai = await this.generateLeadAnalysisWithAI(lead, websiteContext);
    return {
      ...ai,
      websiteContextUsed: Boolean(websiteContext),
    };
  }

  extractCallSimulation(technicalFindings: Prisma.JsonValue): string | undefined {
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

  extractAnalysisRuns(technicalFindings: Prisma.JsonValue): number {
    if (
      technicalFindings &&
      typeof technicalFindings === 'object' &&
      'analysisRuns' in technicalFindings
    ) {
      const value = technicalFindings.analysisRuns;
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
      }
    }
    return 0;
  }

  extractReanalysisCount(technicalFindings: Prisma.JsonValue): number {
    return Math.max(0, this.extractAnalysisRuns(technicalFindings) - 1);
  }

  private async generateLeadAnalysisWithAI(
    lead: PrismaLead,
    websiteContext: string | null,
  ): Promise<Omit<GeneratedLeadAnalysis, 'websiteContextUsed'>> {
    const apiKey = process.env.OPENAI_API_KEY ?? '';
    if (!apiKey) {
      throw new BadRequestException(
        'OPENAI_API_KEY is not set. Add it to your .env file.',
      );
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const client = new OpenAI({ apiKey });

    const prompt = [
      'Analiza este lead para prospeccion comercial B2B en espanol.',
      'Contexto de la empresa vendedora: somos un equipo de ingenieria de software.',
      'No ofrecemos marketing, pauta, redes sociales, branding ni media.',
      'Solo ofrecemos soluciones de software e ingenieria (producto, automatizacion, integraciones, datos e IA aplicada).',
      'Devuelve SOLO JSON valido con estas claves:',
      'summary (string), problems (string[]), opportunities (string[]), suggestedOffer (string), outreachMessage (string), callSimulation (string), score (number 1-100).',
      '',
      'Contexto del lead:',
      `businessName: ${lead.businessName}`,
      `website: ${lead.website ?? 'N/A'}`,
      `phone: ${lead.phone ?? 'N/A'}`,
      `category: ${lead.category ?? 'N/A'}`,
      `city: ${lead.city ?? 'N/A'}`,
      `country: ${lead.country ?? 'N/A'}`,
      '',
      'Instrucciones:',
      '- Enfocate en dolores de ingenieria, operaciones y producto digital.',
      '- No menciones marketing digital, anuncios, SEO, redes sociales ni community management.',
      '- suggestedOffer debe ser una oferta tecnica de software (ej: automatizacion de procesos, integracion de sistemas, dashboard operativo, plataforma interna, agente IA para soporte/comercial, modernizacion de sistema legado).',
      '- outreachMessage en espanol, tono consultivo tecnico, breve y accionable.',
      '- callSimulation en espanol, formato dialogo (Asesor:/Cliente:) con 6-8 lineas, orientado a discovery tecnico y siguiente paso de levantamiento de requerimientos.',
      '- Si hay contexto web, usalo para personalizar analisis.',
      '',
      'Contexto web extraido (puede venir vacio):',
      websiteContext ?? 'Sin contexto web disponible.',
    ].join('\n');

    let content = '';
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Eres un analista comercial senior. Responde estrictamente en JSON valido.',
          },
          { role: 'user', content: prompt },
        ],
      });
      content = response.choices[0]?.message?.content ?? '';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(`OpenAI request failed: ${msg}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ServiceUnavailableException(
        'OpenAI returned an invalid JSON response.',
      );
    }

    const obj = (parsed ?? {}) as Record<string, unknown>;
    const score = Number(obj.score);
    if (!Number.isFinite(score)) {
      throw new ServiceUnavailableException(
        'OpenAI returned an invalid score value.',
      );
    }
    return {
      summary: this.asString(obj.summary),
      problems: Array.isArray(obj.problems)
        ? obj.problems.map((v) => String(v))
        : [],
      opportunities: Array.isArray(obj.opportunities)
        ? obj.opportunities.map((v) => String(v))
        : [],
      suggestedOffer: this.asString(obj.suggestedOffer),
      outreachMessage: this.asString(obj.outreachMessage),
      callSimulation: this.asString(obj.callSimulation),
      score: Math.max(1, Math.min(100, Math.round(score))),
      rawAiResponse: content,
    };
  }

  private async fetchWebsiteContext(website?: string | null): Promise<string | null> {
    if (!website) return null;
    try {
      const normalized = website.startsWith('http')
        ? website
        : `https://${website}`;
      const res = await fetch(normalized, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) return null;
      return text.slice(0, 5000);
    } catch {
      return null;
    }
  }

  private asString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }
}


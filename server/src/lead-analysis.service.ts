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
      'Eres un consultor senior de ingenieria de software haciendo prospeccion B2B proactiva.',
      'NUESTRA EMPRESA es un equipo de ingenieria de software puro: NO hacemos marketing, pauta, SEO, redes sociales, branding, media ni community management.',
      'NUESTRAS SOLUCIONES (solo estas categorias):',
      '  1. Automatizacion de procesos internos (back-office, operaciones, flujos administrativos).',
      '  2. Integraciones entre sistemas (ERP, CRM, contabilidad, inventario, facturacion, APIs externas).',
      '  3. Dashboards operativos y reporting con datos en tiempo real.',
      '  4. Plataformas internas a medida (apps web/movil para uso interno o de clientes).',
      '  5. Agentes IA aplicada (atencion al cliente, soporte, ventas, triaje, generacion de documentos).',
      '  6. Modernizacion de sistemas legados (migracion, refactor, escalabilidad).',
      '  7. Portales / extranets / autoservicio para clientes finales.',
      '',
      'DEVUELVE SOLO JSON VALIDO con estas claves exactas:',
      'summary (string), problems (string[] minimo 4), opportunities (string[] minimo 4), suggestedOffer (string detallado >= 3 frases), outreachMessage (string), callSimulation (string), score (number 1-100).',
      '',
      'Contexto del lead:',
      `businessName: ${lead.businessName}`,
      `website: ${lead.website ?? 'N/A'}`,
      `phone: ${lead.phone ?? 'N/A'}`,
      `category: ${lead.category ?? 'N/A'}`,
      `city: ${lead.city ?? 'N/A'}`,
      `country: ${lead.country ?? 'N/A'}`,
      '',
      'METODOLOGIA OBLIGATORIA:',
      '1. INFIERE el sector, modelo operativo y procesos tipicos de este negocio segun su categoria y region. Nombra procesos concretos (ej: "agendamiento de citas", "facturacion electronica DGI", "control de inventario por sucursal", "cotizacion manual via WhatsApp", "expedientes en papel").',
      '2. Hipotetiza dolores TECNICOS especificos de ese sector y tamano (no genericos). Ejemplo malo: "procesos manuales". Ejemplo bueno: "agendamiento de citas en Excel/WhatsApp sin recordatorios automaticos provoca no-shows del 20-30%".',
      '3. Para cada problema, mapea una solucion CONCRETA de nuestras 7 categorias.',
      '4. NO preguntes al cliente cuales son sus problemas: ya los planteas tu y propones la solucion.',
      '',
      'REGLAS DEL CONTENIDO:',
      '- problems: minimo 4. Cada uno es un dolor tecnico/operativo especifico, redactado como hipotesis fundamentada (ej: "Probablemente gestionan agendamiento manual via telefono/WhatsApp sin sistema central, lo que genera doble booking y perdida de seguimiento").',
      '- opportunities: minimo 4. Cada una mapea a una solucion concreta nuestra, con beneficio cuantificado cuando sea posible (ej: "Sistema de agendamiento online con confirmaciones automaticas: reduce no-shows ~25% y libera 10h/semana del personal").',
      '- suggestedOffer: minimo 3 frases. Describe una propuesta tecnica especifica con stack/componentes/entregables y un caso de uso clave. Ej: "Implementar plataforma de agendamiento integrada con su sistema actual, con confirmacion via WhatsApp/SMS, recordatorios automaticos, calendario para staff y panel de gestion. Stack: Next.js + Postgres, integracion WhatsApp Cloud API. Entrega en 4-6 semanas con piloto en 2 sucursales."',
      '- outreachMessage en espanol, tono consultivo tecnico. PRIMERA persona, tu ya identificaste un dolor y propones la solucion. NO pidas reunion abierta tipo "que necesitan?", proponer agenda concreta.',
      '- callSimulation en espanol, dialogo entre "Yo" y "Cliente" (USA EXACTAMENTE esos prefijos: "Yo:" y "Cliente:"). Minimo 8 lineas. Comienza TU presentando hipotesis especificas y propuesta concreta (no preguntes "como gestionan sus procesos?" - eso es debil). El cliente responde con dudas tipicas/objeciones reales. Cierra con propuesta de siguiente paso medible (ej: "agendar diagnostico tecnico de 30min con tu equipo de operaciones el martes a las 10am").',
      '- score: 1-100, basado en encaje real con nuestras soluciones (alta digitalizacion necesaria, sector con procesos repetitivos, evidencia de website/contacto, tamano probable).',
      '',
      'PROHIBIDO:',
      '- Marketing digital, anuncios, SEO, redes sociales, community management, branding, media, ads.',
      '- Frases genericas ("optimizar procesos", "mejorar eficiencia", "transformacion digital" sin especificar).',
      '- Preguntas vagas en callSimulation tipo "como gestionan sus procesos actualmente?" - tu YA propones.',
      '',
      'Si hay contexto web, usalo para anclar problemas/oportunidades en evidencia real del sitio.',
      '',
      'Contexto web extraido (puede venir vacio):',
      websiteContext ?? 'Sin contexto web disponible.',
    ].join('\n');

    let content = '';
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Eres un consultor senior de ingenieria de software haciendo prospeccion B2B proactiva. Propones soluciones concretas, no preguntas problemas vagos. Responde estrictamente en JSON valido.',
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


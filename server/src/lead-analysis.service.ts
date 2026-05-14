import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
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
    const [websiteContext, searchContext] = await Promise.all([
      this.fetchWebsiteContext(lead.website),
      this.searchBusinessContext(lead.businessName, lead.city, lead.category),
    ]);
    const combinedContext = [websiteContext, searchContext]
      .filter(Boolean)
      .join('\n\n---\n\n');
    const ai = await this.generateLeadAnalysisWithAI(lead, combinedContext || null);
    return {
      ...ai,
      websiteContextUsed: Boolean(combinedContext),
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
      '1. Usa el contexto web y resultados de busqueda abajo para IDENTIFICAR datos concretos del negocio: su propuesta de valor, servicios, tipo de clientes, tecnologia que usan, tamano, ubicaciones, etc.',
      '2. INFIERE el sector, modelo operativo y procesos tipicos. Nombra procesos concretos (ej: "agendamiento de citas", "facturacion electronica DGI", "control de inventario por sucursal", "cotizacion manual via WhatsApp", "expedientes en papel").',
      '3. Hipotetiza dolores TECNICOS especificos de ESE negocio basados en lo que viste en su web/busqueda. NO uses los mismos problemas para todos los negocios de una categoria.',
      '4. Para cada problema, mapea una solucion CONCRETA de nuestras 7 categorias.',
      '5. NO preguntes al cliente cuales son sus problemas: ya los planteas tu y propones la solucion.',
      '',
      'REGLAS DEL CONTENIDO:',
      '- problems: minimo 4. CADA UNO debe mencionar algo especifico del negocio basado en el contexto disponible. Si hay contexto web, menciona lo que viste en el sitio. Ej: "Su sitio muestra 20+ sucursales pero no tiene sistema centralizado de inventario" (menciona el numero real de sucursales si lo viste).',
      '- opportunities: minimo 4. Cada una mapea a una solucion concreta nuestra, con beneficio cuantificado. Si viste el tamano del negocio en el contexto, usa datos reales. Ej: "Con 20 sucursales, un sistema centralizado de inventario reduce roturas de stock ~30% y libera 2h/dia por sucursal en conciliacion manual = 40h/semana recuperadas".',
      '- suggestedOffer: minimo 3 frases. Describe una propuesta tecnica especifica con stack/componentes/entregables. MENCIONA algo unico del negocio que viste en el contexto. Ej: "Implementar plataforma de agendamiento integrada con su sistema actual (vi que usan WordPress + WooCommerce), con confirmacion via WhatsApp/SMS, recordatorios automaticos, calendario para staff y panel de gestion."',
      '- outreachMessage en espanol, tono consultivo tecnico. PRIMERA persona. MENCIONA algo que viste en su web o busqueda para demostrar que investigaste. Ej: "Visite su sitio y veo que ofrecen [servicio X] en [ciudad], pero note que [problema especifico]."',
      '- callSimulation en espanol, dialogo entre "Yo" y "Cliente" (USA EXACTAMENTE esos prefijos: "Yo:" y "Cliente:"). Minimo 8 lineas. USA datos del contexto web para personalizar. Ej: "Yo: Vi en su sitio que tienen 15 sucursales. Sin un sistema centralizado, conciliar el inventario de cada una debe ser un dolor de cabeza."',
      '- score: 1-100, basado en encaje real con nuestras soluciones.',
      '',
      'PROHIBIDO:',
      '- Marketing digital, anuncios, SEO, redes sociales, community management, branding, media, ads.',
      '- Frases genericas sin evidencia del contexto disponible.',
      '- Repetir los mismos problemas/oportunidades para diferentes leads.',
      '- Preguntas vagas en callSimulation tipo "como gestionan sus procesos actualmente?" - tu YA propones.',
      '',
      'Contexto extraido del sitio web y busquedas (puede venir vacio — en ese caso, infiere basado en categoria y region):',
      websiteContext ?? 'No hay contexto disponible. Infiere basado en categoria, ciudad y pais.',
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
    const urls = [
      website.startsWith('http') ? website : `https://${website}`,
      website.startsWith('http') ? website : `http://${website}`,
    ];
    for (const url of [...new Set(urls)]) {
      try {
        const res = await axios.get<string>(url, {
          timeout: 8_000,
          responseType: 'text',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-HN,es;q=0.9,en;q=0.8',
          },
        });
        const html = res.data;
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const meaningful = text
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.length > 30)
          .join(' ');
        if (meaningful.length > 100) return meaningful.slice(0, 5000);
      } catch {}
    }
    return null;
  }

  private async searchBusinessContext(
    businessName: string,
    city?: string | null,
    category?: string | null,
  ): Promise<string | null> {
    const query = encodeURIComponent(
      [businessName, city, category].filter(Boolean).join(' '),
    );
    try {
      const res = await axios.get<string>(
        `https://www.google.com/search?q=${query}&hl=es`,
        {
          timeout: 8_000,
          responseType: 'text',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-HN,es;q=0.9,en;q=0.8',
          },
        },
      );
      const html = res.data;
      const snippets: string[] = [];
      const patterns = [
        /<span[^>]*class="[^"]*VuuXrf[^"]*"[^>]*>([^<]+)<\/span>/gi,
        /<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([^<]+)<\/div>/gi,
        /<span[^>]*class="[^"]*aCOpRe[^"]*"[^>]*>([^<]+)<\/span>/gi,
        /<div[^>]*class="[^"]*lEBKkf[^"]*"[^>]*>([^<]+)<\/div>/gi,
      ];
      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(html)) !== null) {
          const text = match[1]?.trim();
          if (text && text.length > 20) snippets.push(text);
        }
      }
      if (snippets.length === 0) {
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const sentences = text
          .split(/(?<=[.!?])\s+/)
          .filter(
            (s) =>
              s.length > 40 &&
              !s.includes('cookie') &&
              !s.includes('Cookie') &&
              !s.includes('Iniciar sesión') &&
              !s.includes('google') &&
              !s.includes('Google'),
          );
        snippets.push(...sentences.slice(0, 5));
      }
      if (snippets.length > 0) {
        return [
          `Resultados de búsqueda para "${[businessName, city].filter(Boolean).join(', ')}":`,
          ...snippets.slice(0, 6),
        ].join('\n');
      }
      return null;
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


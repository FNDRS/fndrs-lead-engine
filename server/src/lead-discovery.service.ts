import { Injectable, Logger } from '@nestjs/common';

export interface DiscoveredLead {
  businessName: string;
  category?: string;
  city?: string;
  country: string;
  website?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  source: 'google_places';
  initialScore: number;
  raw?: Record<string, unknown>;
}

// ─── Google Places API (New) response shape ───────────────────────────────────
interface PlacesSearchResponse {
  places?: PlaceResult[];
}

interface PlacesDisplayName {
  text: string;
  languageCode?: string;
}

interface PlaceResult {
  id?: string;
  displayName?: PlacesDisplayName;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
}

// ─── Category mapping: Places types → human-readable ─────────────────────────
const PLACE_TYPE_MAP: Record<string, string> = {
  hospital: 'Clínica / Hospital',
  doctor: 'Clínica / Médico',
  physiotherapist: 'Fisioterapia',
  dentist: 'Odontología',
  pharmacy: 'Farmacia',
  restaurant: 'Restaurante',
  food: 'Restaurante',
  cafe: 'Café',
  real_estate_agency: 'Inmobiliaria',
  school: 'Colegio Privado',
  primary_school: 'Colegio Privado',
  secondary_school: 'Colegio Privado',
  university: 'Universidad',
  beauty_salon: 'Salón de Belleza',
  hair_care: 'Salón de Belleza',
  spa: 'Spa / Belleza',
  hardware_store: 'Ferretería',
  storage: 'Logística / Bodegaje',
  moving_company: 'Logística / Mudanzas',
  logistics: 'Logística',
  laboratory: 'Laboratorio',
  medical_laboratory: 'Laboratorio Médico',
};

// ─── Global chains to filter out ─────────────────────────────────────────────
const GLOBAL_CHAINS = [
  "mcdonald's",
  'mcdonalds',
  'burger king',
  'kfc',
  'subway',
  'pizza hut',
  'domino',
  "wendy's",
  'wendys',
  'starbucks',
  'walmart',
  'costco',
  'popeyes',
  'little caesars',
  'papa john',
  'dunkin',
  'baskin robbins',
  'church\'s chicken',
  'hardee',
];

// ─── Priority categories for scoring ─────────────────────────────────────────
const PRIORITY_KEYWORDS = [
  'clínica',
  'clinica',
  'clinic',
  'laborator',
  'logíst',
  'logist',
  'inmobiliar',
  'inmueble',
  'real estate',
  'colegio',
  'school',
  'medical',
  'médic',
];

@Injectable()
export class LeadDiscoveryService {
  private readonly logger = new Logger(LeadDiscoveryService.name);

  private readonly apiKey: string;
  private readonly country: string;
  private readonly cities: string[];
  private readonly categories: string[];

  private static readonly MAX_LEADS_PER_RUN = 50;
  private static readonly DEFAULT_LIMIT_PER_QUERY = 5;
  private static readonly BETWEEN_QUERY_DELAY_MS = 200;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
    this.country = process.env.DEFAULT_COUNTRY ?? 'Honduras';
    this.cities = (process.env.DEFAULT_CITIES ?? 'San Pedro Sula,Tegucigalpa')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.categories = (
      process.env.DEFAULT_CATEGORIES ?? 'clínicas,restaurantes'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async discoverDailyLeads(options?: {
    cities?: string[];
    categories?: string[];
    limitPerQuery?: number;
    analyzeAfterDiscovery?: boolean;
  }): Promise<DiscoveredLead[]> {
    const cities = options?.cities ?? this.cities;
    const categories = options?.categories ?? this.categories;
    const limitPerQuery =
      options?.limitPerQuery ?? LeadDiscoveryService.DEFAULT_LIMIT_PER_QUERY;

    if (!this.apiKey) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY is not set. Add it to your .env file.',
      );
    }

    const all: DiscoveredLead[] = [];

    outer: for (const city of cities) {
      for (const category of categories) {
        if (all.length >= LeadDiscoveryService.MAX_LEADS_PER_RUN) break outer;

        const query = `${category} en ${city} ${this.country}`;
        this.logger.log(`Searching: "${query}"`);

        try {
          const results = await this.searchGooglePlaces(query, city, limitPerQuery);
          this.logger.log(`  → ${results.length} results`);
          all.push(...results);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`  → Failed: ${msg}`);
        }

        await this.sleep(LeadDiscoveryService.BETWEEN_QUERY_DELAY_MS);
      }
    }

    const deduped = this.dedupeLeads(all);
    const limited = deduped.slice(0, LeadDiscoveryService.MAX_LEADS_PER_RUN);

    this.logger.log(
      `Discovery complete: ${all.length} raw → ${deduped.length} deduped → ${limited.length} returned`,
    );

    return limited;
  }

  async searchGooglePlaces(
    query: string,
    city: string,
    limit = LeadDiscoveryService.DEFAULT_LIMIT_PER_QUERY,
  ): Promise<DiscoveredLead[]> {
    const url = 'https://places.googleapis.com/v1/places:searchText';

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.nationalPhoneNumber',
      'places.websiteUri',
      'places.types',
      'places.rating',
      'places.userRatingCount',
      'places.googleMapsUri',
    ].join(',');

    const body = {
      textQuery: query,
      maxResultCount: Math.min(limit, 20),
      languageCode: 'es',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': fieldMask,
        'X-Goog-Api-Key': this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Google Places API ${response.status}: ${text}`);
    }

    const data = (await response.json()) as PlacesSearchResponse;
    const places = data.places ?? [];

    return places
      .map((place) => this.normalizePlaceToLead(place, city))
      .filter((lead): lead is DiscoveredLead => lead !== null);
  }

  normalizePlaceToLead(place: PlaceResult, city: string): DiscoveredLead | null {
    const name = place.displayName?.text;
    if (!name || name.trim().length < 2) return null;

    const website = place.websiteUri
      ? this.cleanUrl(place.websiteUri)
      : undefined;
    const phone = place.nationalPhoneNumber?.trim() || undefined;

    // Quality filter: require at least one contact signal
    if (!phone && !website) return null;

    // Filter global chains
    if (this.isGlobalChain(name)) return null;

    const lead: DiscoveredLead = {
      businessName: name.trim(),
      category: this.mapCategory(place.types),
      city,
      country: this.country,
      website,
      phone,
      source: 'google_places',
      initialScore: 0,
      raw: {
        placeId: place.id,
        address: place.formattedAddress,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        googleMapsUri: place.googleMapsUri,
        types: place.types,
      },
    };

    lead.initialScore = this.calculateInitialScore(lead, place);
    return lead;
  }

  dedupeLeads(leads: DiscoveredLead[]): DiscoveredLead[] {
    const seenWebsites = new Set<string>();
    const seenPhones = new Set<string>();
    const seenNameCity = new Set<string>();

    return leads.filter((lead) => {
      if (lead.website) {
        const key = this.normalizeUrl(lead.website);
        if (seenWebsites.has(key)) return false;
        seenWebsites.add(key);
      }

      if (lead.phone) {
        const digits = lead.phone.replace(/\D/g, '');
        if (digits.length >= 7) {
          if (seenPhones.has(digits)) return false;
          seenPhones.add(digits);
        }
      }

      const nameKey = `${lead.businessName.toLowerCase().trim()}|${(lead.city ?? '').toLowerCase()}`;
      if (seenNameCity.has(nameKey)) return false;
      seenNameCity.add(nameKey);

      return true;
    });
  }

  calculateInitialScore(lead: DiscoveredLead, place?: PlaceResult): number {
    let score = 3;

    // Contact signals
    if (lead.website) score += 2;
    else score -= 2;
    if (lead.phone) score += 1;

    // Priority category
    if (this.isPriorityCategory(lead.category ?? '')) score += 2;

    // Quality signals from Google
    if (place?.rating !== undefined && place.rating >= 4.0) score += 1;
    if (place?.userRatingCount !== undefined && place.userRatingCount >= 20) score += 1;

    // Penalize businesses with very few reviews (likely tiny / inactive)
    if (place?.userRatingCount !== undefined && place.userRatingCount < 5) score -= 2;

    return Math.max(1, Math.min(10, score));
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private isGlobalChain(name: string): boolean {
    const lower = name.toLowerCase();
    return GLOBAL_CHAINS.some((chain) => lower.includes(chain));
  }

  private isPriorityCategory(category: string): boolean {
    const lower = category.toLowerCase();
    return PRIORITY_KEYWORDS.some((kw) => lower.includes(kw));
  }

  private mapCategory(types?: string[]): string | undefined {
    if (!types || types.length === 0) return undefined;
    for (const type of types) {
      if (PLACE_TYPE_MAP[type]) return PLACE_TYPE_MAP[type];
    }
    // Fallback: humanize first non-generic type
    const ignored = new Set([
      'establishment',
      'point_of_interest',
      'premise',
      'street_address',
    ]);
    const first = types.find((t) => !ignored.has(t));
    return first ? this.humanizeType(first) : undefined;
  }

  private humanizeType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private cleanUrl(url: string): string {
    // Remove query params and trailing slash
    return url.split('?')[0].replace(/\/$/, '');
  }

  private normalizeUrl(url: string): string {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

# FNDRS Lead Engine — Backend

NestJS API server that discovers, stores, and analyzes local business leads in Honduras using **Google Places API (New)**.

## Stack

- NestJS 11 · TypeScript
- Prisma 7 + SQLite (better-sqlite3)
- Google Places API (New)
- OpenAI (optional, not wired yet)
- Playwright (optional, not wired yet)

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy and fill in `.env`:

```bash
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=""
PORT=4000

GOOGLE_PLACES_API_KEY=""       # <-- Required for discovery

DEFAULT_COUNTRY="Honduras"
DEFAULT_CITIES="San Pedro Sula,Tegucigalpa,La Ceiba,Choloma,Comayagua"
DEFAULT_CATEGORIES="clínicas privadas,laboratorios médicos,restaurantes,inmobiliarias,empresas de logística,colegios privados,salones de belleza,ferreterías"
```

### 3. How to get a Google Places API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Places API (New)** → APIs & Services → Library → search "Places API (New)"
4. Go to Credentials → Create Credentials → API Key
5. (Recommended) Restrict the key to "Places API (New)" only
6. Paste the key into `GOOGLE_PLACES_API_KEY` in `.env`

> The Places API (New) uses `POST /v1/places:searchText`. Pricing: first $200/month free (~4,000 text searches).

### 4. Run migrations (already applied on first install)

```bash
pnpm prisma:migrate
# or to apply existing migrations without prompting:
pnpm exec prisma migrate deploy
```

### 5. Seed test data (optional)

```bash
pnpm seed
```

---

## Run

```bash
# Development (watch mode, port 4000)
pnpm start:dev

# Production
pnpm build && pnpm start:prod
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/leads` | List all leads |
| POST | `/leads` | Create lead manually |
| GET | `/leads/:id` | Lead detail + analysis |
| PATCH | `/leads/:id` | Update lead |
| POST | `/leads/:id/analyze` | Run analysis on a lead |
| POST | `/runs/daily` | **Trigger daily discovery** |
| GET | `/runs` | List all runs |

---

## Trigger a discovery run

```bash
curl -X POST http://localhost:4000/runs/daily
```

Response:
```json
{
  "run": {
    "id": "clxxx...",
    "createdAt": "2026-04-30T12:00:00.000Z",
    "status": "completed",
    "leadsFound": 23,
    "leadsProcessed": 18,
    "errors": 0
  }
}
```

**What happens internally:**
1. Creates a `DailyRun` record with `status: RUNNING`
2. Queries Google Places for each `city × category` combination
3. Normalizes results into `DiscoveredLead` objects
4. Deduplicates within the batch (by website, phone, businessName+city)
5. Checks the database for existing leads before saving
6. Saves new leads with `status: NEW` and an `initialScore` (1–10)
7. Updates the run with `status: COMPLETED` (or `FAILED` on error)

**Limits:**
- Max 5 results per query (configurable)
- Max 50 leads per daily run
- 200ms delay between API calls

---

## Scoring (1–10)

| Signal | Adjustment |
|--------|-----------|
| Base score | 3 |
| Has website | +2 |
| No website | −2 |
| Has phone | +1 |
| Priority category (clinic, lab, logistics, etc.) | +2 |
| Rating ≥ 4.0 | +1 |
| ≥ 20 reviews | +1 |
| < 5 reviews (likely inactive) | −2 |

Score is clamped between 1 and 10.

---

## Deduplication

A lead is skipped if any of these match an existing DB record:
- Exact website URL
- Exact phone number
- Same businessName + city

---

## Prisma commands

```bash
pnpm prisma:migrate      # Create and apply migration
pnpm prisma:generate     # Regenerate Prisma client
pnpm prisma:studio       # Open Prisma Studio (visual DB browser)
pnpm seed                # Seed test leads
```

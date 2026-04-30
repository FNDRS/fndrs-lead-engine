import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient, LeadStatus, RunStatus } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Minimal seed for local dev.
  const leads = await prisma.lead.createMany({
    data: [
      {
        businessName: 'Cafe Central',
        category: 'Cafe',
        city: 'CDMX',
        country: 'MX',
        website: 'https://example.com',
        source: 'seed',
        status: LeadStatus.NEW,
      },
      {
        businessName: 'Clinica Nova',
        category: 'Salud',
        city: 'Monterrey',
        country: 'MX',
        website: 'https://example.org',
        source: 'seed',
        status: LeadStatus.NEW,
      },
      {
        businessName: 'Tienda Luna',
        category: 'Retail',
        city: 'Bogota',
        country: 'CO',
        website: 'https://example.net',
        source: 'seed',
        status: LeadStatus.NEW,
      },
    ],
  });

  // Create a placeholder run row (optional).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyRun.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      status: RunStatus.COMPLETED,
      totalFound: leads.count,
      totalAnalyzed: 0,
      notes: 'Seed run (no analysis executed).',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

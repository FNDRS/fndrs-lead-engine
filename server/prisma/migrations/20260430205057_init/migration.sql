-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "category" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "problems" JSONB NOT NULL,
    "opportunities" JSONB NOT NULL,
    "suggestedOffer" TEXT NOT NULL,
    "outreachMessage" TEXT NOT NULL,
    "technicalFindings" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "rawAiResponse" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "totalAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadAnalysis_leadId_key" ON "LeadAnalysis"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRun_date_key" ON "DailyRun"("date");

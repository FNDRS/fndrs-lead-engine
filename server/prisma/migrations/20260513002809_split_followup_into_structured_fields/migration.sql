/*
  Warnings:

  - You are about to drop the column `followUpNotes` on the `Lead` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
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
    "contactMethod" TEXT,
    "promises" TEXT,
    "responseNotes" TEXT,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" DATETIME,
    "nextFollowUpAt" DATETIME,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lead" ("businessName", "category", "city", "contactMethod", "country", "createdAt", "email", "id", "instagram", "linkedin", "phone", "score", "source", "status", "updatedAt", "website") SELECT "businessName", "category", "city", "contactMethod", "country", "createdAt", "email", "id", "instagram", "linkedin", "phone", "score", "source", "status", "updatedAt", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

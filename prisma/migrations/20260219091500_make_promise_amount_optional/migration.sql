-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromiseDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "promisedAmount" REAL,
    "promisedDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromiseDate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromiseDate" ("createdAt", "customerId", "id", "notes", "promisedAmount", "promisedDate", "resolvedAt", "status", "updatedAt") SELECT "createdAt", "customerId", "id", "notes", "promisedAmount", "promisedDate", "resolvedAt", "status", "updatedAt" FROM "PromiseDate";
DROP TABLE "PromiseDate";
ALTER TABLE "new_PromiseDate" RENAME TO "PromiseDate";
CREATE INDEX "PromiseDate_promisedDate_status_idx" ON "PromiseDate"("promisedDate", "status");
CREATE INDEX "PromiseDate_customerId_idx" ON "PromiseDate"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

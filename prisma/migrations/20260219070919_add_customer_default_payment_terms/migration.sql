-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "defaultPaymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "creditUsed" REAL NOT NULL DEFAULT 0,
    "outstandingAmt" REAL NOT NULL DEFAULT 0,
    "overdueAmt" REAL NOT NULL DEFAULT 0,
    "riskFlag" TEXT NOT NULL DEFAULT 'SAFE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Customer" ("address", "alternatePhone", "contactPerson", "createdAt", "creditLimit", "creditUsed", "customerCode", "email", "id", "isActive", "name", "outstandingAmt", "overdueAmt", "phone", "riskFlag", "updatedAt") SELECT "address", "alternatePhone", "contactPerson", "createdAt", "creditLimit", "creditUsed", "customerCode", "email", "id", "isActive", "name", "outstandingAmt", "overdueAmt", "phone", "riskFlag", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");
CREATE INDEX "Customer_riskFlag_idx" ON "Customer"("riskFlag");
CREATE INDEX "Customer_outstandingAmt_idx" ON "Customer"("outstandingAmt");
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "cashBalance" REAL NOT NULL DEFAULT 0,
    "exchangeRateUSDKRW" REAL,
    "targetAllocations" TEXT,
    "googleAiApiKey" TEXT,
    "finnhubApiKey" TEXT,
    "serverKeyUsageCount" INTEGER NOT NULL DEFAULT 0,
    "serverKeyUsageDate" TEXT,
    "hasSeenTour" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("cashBalance", "createdAt", "email", "exchangeRateUSDKRW", "finnhubApiKey", "googleAiApiKey", "id", "name", "password", "serverKeyUsageCount", "serverKeyUsageDate", "targetAllocations") SELECT "cashBalance", "createdAt", "email", "exchangeRateUSDKRW", "finnhubApiKey", "googleAiApiKey", "id", "name", "password", "serverKeyUsageCount", "serverKeyUsageDate", "targetAllocations" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

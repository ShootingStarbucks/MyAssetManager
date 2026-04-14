-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgCost" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT,
    "exchange" TEXT,
    "currency" TEXT,
    "purchaseDate" DATETIME,
    "memo" TEXT,
    CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Holding" ("assetType", "avgCost", "createdAt", "currency", "exchange", "id", "memo", "name", "purchaseDate", "quantity", "ticker", "updatedAt", "userId") SELECT "assetType", "avgCost", "createdAt", "currency", "exchange", "id", "memo", "name", "purchaseDate", "quantity", "ticker", "updatedAt", "userId" FROM "Holding";
DROP TABLE "Holding";
ALTER TABLE "new_Holding" RENAME TO "Holding";
CREATE UNIQUE INDEX "Holding_userId_ticker_key" ON "Holding"("userId", "ticker");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

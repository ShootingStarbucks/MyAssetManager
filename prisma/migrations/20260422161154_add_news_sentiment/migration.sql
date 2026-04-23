-- CreateTable
CREATE TABLE "NewsSentiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holdingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "keyReasons" TEXT NOT NULL,
    "newsItems" TEXT NOT NULL,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsSentiment_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsSentiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsSentiment_holdingId_key" ON "NewsSentiment"("holdingId");

-- Step 1: 중복 제거용 임시 테이블 (ticker 기준 가장 최신 1건만 유지)
CREATE TABLE "NewsSentiment_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "keyReasons" TEXT NOT NULL,
    "newsItems" TEXT NOT NULL,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Step 2: 기존 데이터에서 ticker별 최신 1건만 복사
INSERT INTO "NewsSentiment_new" ("id", "ticker", "userId", "sentiment", "score", "summary", "keyReasons", "newsItems", "analyzedAt", "createdAt", "updatedAt")
SELECT "id", "ticker", "userId", "sentiment", "score", "summary", "keyReasons", "newsItems", "analyzedAt", "createdAt", "updatedAt"
FROM "NewsSentiment"
WHERE "id" IN (
    SELECT "id" FROM "NewsSentiment" ns1
    WHERE "updatedAt" = (
        SELECT MAX("updatedAt") FROM "NewsSentiment" ns2 WHERE ns2."ticker" = ns1."ticker"
    )
);

-- Step 3: 기존 테이블 삭제 및 교체
DROP TABLE "NewsSentiment";
ALTER TABLE "NewsSentiment_new" RENAME TO "NewsSentiment";

-- Step 4: unique index 생성
CREATE UNIQUE INDEX "NewsSentiment_ticker_key" ON "NewsSentiment"("ticker");

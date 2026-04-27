# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Role: Orchestrator

You are a pure orchestrator. You NEVER write code, run commands, or verify output directly.
For EVERY user request, you MUST follow this protocol without exception:

## Mandatory Subagent Protocol

When ANY task is received:
1. Decompose it into discrete subtasks
2. Spawn a subagent via the Task tool for EACH subtask
3. Wait for all subagents to complete
4. Aggregate results and report to user

## Subagent Role Assignments

- **Coder agent**: File creation, modification, code writing
- **Build agent**: Running builds, installs, scripts
- **Test agent**: Running tests, checking outputs
- **Review agent**: Code review, validation, verification

## Hard Rules

- NEVER use Write, Edit, or Bash tools directly — delegate via Task tool only
- If tempted to write even one line of code inline → STOP and spawn a Coder agent
- If tempted to run even one command inline → STOP and spawn a Build/Test agent
- No exceptions. No shortcuts.

## Language Policy

- **CLAUDE.md must be written in English only.** Never write Korean in this file.
- Whenever CLAUDE.md is created or updated, sync the full Korean translation to `CLAUDE_ko.md` immediately after.

@AGENTS.md

## Git Flow

**Branch strategy** — all work must follow these rules.

| Branch | Purpose | Branch from | Merge into |
|--------|---------|-------------|------------|
| `main` | Production deploy | — | — |
| `develop` | Integration branch | `main` | `main` (on release) |
| `feature/<name>` | New features | `develop` | `develop` |
| `fix/<name>` | Bug fixes | `develop` | `develop` |
| `hotfix/<name>` | Urgent patches | `main` | `main` + `develop` |
| `release/<version>` | Release preparation | `develop` | `main` + `develop` |

**Mandatory rules:**
- Never commit directly to `main` or `develop`. Always create a branch and merge via PR.
- Branch naming: `feature/add-login`, `fix/quote-cache`, `hotfix/auth-crash`
- Always pull latest `develop` before starting new work.

**Feature development flow (most common case):**
```bash
git checkout develop && git pull origin develop
git checkout -b feature/<name>

# Commit each logical unit as it is completed — do NOT batch all changes into one commit
git add <files-for-unit-1>
git commit -m "<type>(<scope>): <description of unit 1>"

git add <files-for-unit-2>
git commit -m "<type>(<scope>): <description of unit 2>"

# ... repeat per logical unit ...

git checkout develop
git merge --no-ff feature/<name> -m "feat: merge feature/<name>"
git branch -d feature/<name>
git push origin develop
```

**What counts as one commit unit:**
- Adding a single API route or handler
- Adding or modifying a single component
- Schema change + migration (together as one unit)
- Writing tests for one feature
- A standalone refactor or rename

**Commit message format** — Conventional Commits:
```
<type>(<scope>): <subject>

feat(auth): add social login
fix(holdings): fix duplicate ticker validation
test(quotes): add quotes API tests
chore(deps): update zod version
refactor(portfolio): extract return calculation logic
```
Types: `feat` | `fix` | `test` | `chore` | `refactor` | `docs` | `style`

**Claude auto-behavior on every dev request:**
1. Run `git status` to check current branch
2. Create `feature/<task>` branch from `develop`
3. **Commit after each logical unit is complete** — never accumulate all changes into a single commit
   - Each commit must represent one self-contained change (one route, one component, one schema change, etc.)
   - Stage only the files belonging to that unit; do not bulk-add unrelated files
4. Stop after all commits are made — do NOT merge or push. Wait for user to confirm before merging.

**Release versioning — auto version bump:**
Before creating a `release/<version>` branch, always determine the next version automatically:
1. Run `git tag --sort=-v:refname | head -1` to get the latest semver tag (e.g. `v0.1.0`).
2. If no tag exists, fall back to the `version` field in `package.json`.
3. Increment the **patch** number by default (e.g. `v0.1.0` → `v0.1.1`). Increment **minor** when the release includes new features; increment **major** for breaking changes.
4. Use the resulting version for both the branch name (`release/<version>`) and the git tag (`v<version>`).
5. Never reuse or overwrite an existing tag. If the computed version is already tagged, increment again.

## Commands

```bash
npm run dev          # Dev server (http://localhost:3000)
npm run build        # Production build (includes type check)
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check only (no build)

# DB
npx prisma migrate dev --name <name>   # Migrate after schema changes
npx prisma generate                    # Regenerate client
npx prisma studio                      # DB GUI
```

## Architecture

**Next.js 16 App Router** + **TypeScript strict** + **Tailwind CSS v4**

### Authentication (Auth.js v5)

Split into two files due to Edge Runtime constraints:

- `src/auth.config.ts` — Lightweight config without Prisma. Used only in middleware (`src/middleware.ts`). Edge Runtime compatible.
- `src/auth.ts` — Full config with Credentials provider + Prisma. Used in API Routes and Server Components.

If `src/middleware.ts` imports `auth.ts` directly, `node:path`/`node:url` errors occur. Must use only `auth.config.ts`.

### Database (Prisma v7 + SQLite)

- `prisma/schema.prisma` — No `url` property in `datasource`. URL is managed in `prisma.config.ts`.
- `src/lib/prisma.ts` — PrismaClient created with `@prisma/adapter-libsql` adapter. Generated client (`src/generated/prisma/client.ts`) has `@ts-nocheck`, so type casting is required.
- `src/generated/prisma/` — Auto-generated by `npx prisma generate`. Do not edit directly.
- DB file: `prisma/dev.db` (gitignored)

### Data Flow

```
Component
  -> usePortfolioSummary()           # Aggregation hook
      -> useHoldings()               # GET /api/holdings (TanStack Query)
      -> useAssetQuotes(holdings)    # POST /api/quotes  (TanStack Query, 60s polling)
          -> /api/quotes/route.ts    # API key boundary (server-only)
              -> finnhub-client.ts       # US stocks (Finnhub API)
              -> yahoo-finance-client.ts # Korean stocks (.KS/.KQ symbols)
              -> coingecko-client.ts     # Crypto (no API key required)
```

All external API calls go through `/api/quotes` route only. Components never import API clients directly.

### Price & Currency Handling

US stocks in USD, Korean stocks/crypto in KRW. `toKRW(price, currency)` in `src/lib/calculate-portfolio.ts` converts USD to KRW (fixed exchange rate). Total portfolio value is always in KRW.

### State Management

- **Server state** (holdings list, live prices): TanStack Query
- **UI state**: Zustand (minimal usage currently)
- No localStorage — all holdings stored in DB (SQLite)

### AI Key Management

Per-user Google AI (Gemini) keys for sentiment analysis and portfolio insights:

- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt using `AUTH_SECRET` as the key seed. **Node.js runtime only — never import in Edge Runtime or `middleware.ts`.**
- `src/lib/get-user-ai-key.ts` — Loads and decrypts the user's key from DB; falls back to `GOOGLE_AI_API_KEY` env var. Throws `ServerKeyLimitError` when the shared server key daily limit (3/day per user) is exceeded.
- `src/app/api/settings/api-keys/route.ts` — GET (masked key status) / POST (validate via Gemini API + encrypt + store) / DELETE (remove key).
- `src/components/dashboard/ApiKeySettingsModal.tsx` — Settings modal opened via the "설정" button in the dashboard header.

**Key behavior:**
- User has personal key → use it, no usage limit.
- No personal key → use server `GOOGLE_AI_API_KEY`, capped at **3 requests/day** per user. Resets daily (tracked by `serverKeyUsageCount` + `serverKeyUsageDate` on User model).
- When limit is exceeded, API routes return HTTP 429 with a user-facing message prompting key registration.

### Key Constraints

- **Zod**: Pinned to v3 (`zod@^3`). v4 has no CJS build, causing module-not-found errors in Turbopack.
- **Max 20 holdings**: Enforced in `/api/holdings/route.ts` due to Finnhub free tier limit of 60 req/min.
- **Crypto ticker -> CoinGecko ID mapping**: Coins not in `TICKER_TO_COINGECKO_ID` map in `src/lib/coingecko-client.ts` fall back to lowercase conversion.
- **`src/lib/crypto.ts` is Node.js only**: Uses Node.js built-in `crypto` module. Importing it in Edge Runtime (e.g., `middleware.ts`) will cause runtime errors.

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="..."
FINNHUB_API_KEY="..."       # https://finnhub.io/register (server-only, never NEXT_PUBLIC_)
KRX_API_KEY="..."           # https://openapi.krx.co.kr (optional, server-only — falls back to Yahoo Finance if absent)
GOOGLE_AI_API_KEY="..."     # Google AI Studio key — shared fallback when users have no personal key (server-only)
NEXT_PUBLIC_REFRESH_MS="60000"
```

## Test Account (Chrome MCP)

When testing with Chrome MCP browser automation and the login screen appears, use:

- Email: `test@myasset.dev`
- Password: `Test1234!`

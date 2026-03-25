---
version: 1.0.0
status: draft
author: claude
last_updated: 2026-03-25
design_doc_reference: "@design-docs/financial-baseline-engine-design-doc.md"
---

# Financial Baseline Engine — Technical Spec

## 1. Summary

This feature computes a user's financial baseline — monthly income estimate, monthly spending estimate, and available monthly money — from normalized transaction data and surfaces it on the dashboard.

The system gains a `FinancialBaseline` model that stores deterministic, reproducible financial summaries derived from `NormalizedTransaction` records. A baseline service analyzes transaction history within a configurable window (default 90 days), detects income by filtering inflows and excluding internal transfers, calculates smoothed spending, and derives available money as `income - spending`. A new API endpoint serves the baseline to the dashboard, where it populates updated summary cards and a new centerpiece card showing the user's available monthly money.

This is the first feature that produces a **financial conclusion** rather than displaying raw data. It transforms the dashboard from "here is your data" to "here is your situation."

Success is defined as: after account connection and sync completion with >= 30 days of transaction history, the user sees accurate monthly income (+$X green), monthly spending (-$X red), and available money (~$X blue) on the dashboard, and these values are deterministic — the same transaction dataset always produces the same baseline.

## 2. Problem

The system currently stores clean, normalized transactions and displays them on the dashboard and Transactions page. However, the user still cannot answer:

- How much money do I actually have available each month?
- Am I spending more than I earn?
- Is my current lifestyle sustainable?

Current limitations:

- The three dashboard summary cards ("Net Worth", "Spending This Month", "Upcoming Bills") show placeholder dashes
- No income detection logic exists — inflows and transfers are not distinguished
- No spending smoothing exists — irregular spikes distort monthly estimates
- No available money calculation exists
- No API endpoint provides financial summary data
- The dashboard cannot answer any financial question beyond "what are my recent transactions?"

Without this, the system cannot:

- Provide the first "payworthy" insight
- Support downstream features (budgeting, goals, purchase readiness) that depend on baseline financial understanding
- Answer "Can I afford this?" — the core P.R.I.M.E. question

## 3. Core Concepts

### FinancialBaseline

A computed snapshot of a user's monthly financial profile. Derived entirely from `NormalizedTransaction` records. Recalculated on demand (not cached stale) but persisted for auditability and to avoid recomputation on every page load.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | Owner — FK to `User.id`. Unique — one baseline per user |
| `monthlyIncomeCents` | `Int` | Estimated monthly income in cents. Always >= 0 |
| `monthlySpendingCents` | `Int` | Estimated monthly spending in cents. Always >= 0 (stored as positive) |
| `availableCents` | `Int` | `monthlyIncomeCents - monthlySpendingCents`. Can be negative |
| `windowDays` | `Int` | Number of days of history used for this computation |
| `transactionCount` | `Int` | Number of active non-pending transactions analyzed |
| `oldestTransactionDate` | `DateTime` | Earliest transaction in the analysis window |
| `newestTransactionDate` | `DateTime` | Latest transaction in the analysis window |
| `status` | `BaselineStatus` | `READY`, `INSUFFICIENT_DATA`, or `STALE` |
| `computedAt` | `DateTime` | When this baseline was last computed |
| `createdAt` | `DateTime` | Record creation |
| `updatedAt` | `DateTime` | Last modification |

**Ownership:** Scoped to `userId`. One baseline per user (unique constraint on `userId`). All queries must include `userId`.

**Relationship to NormalizedTransaction:** The baseline is derived from `NormalizedTransaction` records where `isActive = true`, `pending = false`, and `date` falls within the analysis window. It is a computed aggregate — not a foreign key relationship.

### BaselineStatus

| Status | Meaning |
|--------|---------|
| `READY` | Baseline was computed successfully with sufficient data |
| `INSUFFICIENT_DATA` | User has transactions but < 30 days of history |
| `STALE` | Baseline exists but new transactions have arrived since `computedAt` |

### Income vs Transfer Detection

The baseline must distinguish genuine income from internal transfers. This is critical for accuracy.

**Income:** A `NormalizedTransaction` where `transactionType = INCOME` (i.e., `amountCents < 0` in Plaid convention) AND the transaction is NOT classified as an internal transfer.

**Transfer detection rules (deterministic):**

1. **Category-based:** Transactions with `category = TRANSFER` are excluded from income AND spending
2. **Name-based:** Transactions whose `displayName` matches known transfer patterns are excluded:
   - Contains "transfer" (case-insensitive)
   - Contains "xfer"
   - Contains "move" AND ("funds" OR "money")
   - Starts with "online transfer"
   - Starts with "ach transfer"
   - Starts with "wire transfer"
3. **Reciprocal matching:** If an income transaction and an expense transaction occur on the same day with the same absolute `amountCents` across different `financialAccountId` values for the same user, both are excluded as transfers. This catches user-initiated transfers between accounts.

**Important:** Transfer detection is conservative. When in doubt, include the transaction. A slightly higher income estimate is less harmful than missing a paycheck.

### Spending Smoothing

Monthly spending must be smoothed to avoid irregular spikes distorting the estimate.

**Algorithm:** Trimmed mean of daily spending over the analysis window.

1. Compute daily spending totals for each day in the window
2. Sort daily totals ascending
3. Trim the top 5% of daily totals (outlier spike removal)
4. Compute mean of remaining daily totals
5. Multiply by 30.44 (average days per month) to get monthly estimate

This removes one-off large purchases (furniture, emergency repair, annual insurance payment) that would inflate the monthly spending estimate.

**Edge case:** If the analysis window contains fewer than 14 distinct spending days, skip trimming and use the simple mean instead (not enough data for meaningful outlier detection).

## 4. States & Lifecycle

### Baseline Computation States

```
[No Baseline]
     │
     ▼ (user has connected accounts + sync complete)
[INSUFFICIENT_DATA]  ← < 30 days of transaction history
     │
     ▼ (>= 30 days of history)
[READY]
     │
     ▼ (new sync completes, transactions change)
[STALE]
     │
     ▼ (recomputation triggered)
[READY]
```

### Computation Triggers

| Trigger | Action |
|---------|--------|
| Sync pipeline completes (DONE step) | Compute or recompute baseline |
| `GET /api/v1/baseline` called and baseline is STALE | Recompute before responding |
| `GET /api/v1/baseline` called and no baseline exists | Compute on first call |

### Staleness Detection

A baseline becomes STALE when:

- Any `NormalizedTransaction` for the user has `updatedAt > baseline.computedAt`
- Any new `NormalizedTransaction` for the user has `createdAt > baseline.computedAt`

This is checked at query time via a simple count query, not a background job.

## 5. UI Integration

Reference: `@design-docs/financial-baseline-engine-design-doc.md`

### Dashboard — Summary Cards (Updated)

**Purpose:** Replace placeholder summary cards with live income and spending estimates.

**Data required from API:**

| Element | Field | Formatting |
|---------|-------|------------|
| Monthly Income amount | `monthlyIncomeCents` | `+` prefix, formatted to USD, `success.main` color |
| Monthly Spending amount | `monthlySpendingCents` | `-` prefix, formatted to USD, `error.main` color |
| Confidence note | (static) | "Estimated from recent activity" |
| Upcoming Bills | (not in scope) | Em dash placeholder |

**Render rules:**

- When `status = "ready"`: Show live income and spending values with confidence notes
- When `status != "ready"` or API unavailable: Show em dash placeholders (existing behavior)
- Amounts display in dollars (divide cents by 100, locale format)

### Dashboard — Baseline Card (New)

**Purpose:** Centerpiece card showing available monthly money.

**Data required from API:**

| Element | Field | Formatting |
|---------|-------|------------|
| Available amount | `availableCents` | `~` prefix when positive, `-` prefix when negative. `primary.main` when >= 0, `error.main` when < 0 |
| Explanation text | `windowDays` | Dynamic: "Based on your recent income and spending patterns over the last {windowDays} days." |
| Negative explanation | `availableCents < 0` | "Your recent spending has exceeded your income. This is based on the last {windowDays} days of activity." |

**Render rules:**

| Dashboard State | Baseline Status | Card Rendered? |
|----------------|-----------------|----------------|
| `pre_connection` | N/A | No |
| `syncing` | N/A | No |
| `activation_complete` | N/A | No |
| `connected` | `unavailable` (no baseline / API error) | No |
| `connected` | `insufficient_data` | Yes — em dash + "needs more history" message |
| `connected` | `ready` | Yes — full amounts |

**Position:** Between summary cards row and connection/accounts card.

### Derived Data Requirements

| Value | Computed Where | Updates When | Inputs |
|-------|---------------|-------------|--------|
| `monthlyIncomeCents` | Baseline service (server) | Sync completes or baseline queried while stale | Active, non-pending, non-transfer income transactions in window |
| `monthlySpendingCents` | Baseline service (server) | Same | Active, non-pending, non-transfer expense transactions in window, trimmed mean smoothing |
| `availableCents` | Baseline service (server) | Same | `monthlyIncomeCents - monthlySpendingCents` |
| Formatted amounts | Client (UI) | On render | Cents values from API divided by 100 |

## 6. Data Model

### Relationship to Existing Schema

| From | Relation | To | Description |
|------|----------|-----|-------------|
| `FinancialBaseline` | belongsTo | `User` | One baseline per user |
| `FinancialBaseline` | reads | `NormalizedTransaction` | Derived from active, non-pending transactions in window |
| `FinancialBaseline` | reads | `FinancialAccount` | Transfer detection uses account IDs for reciprocal matching |

### New Entity

```prisma
model FinancialBaseline {
  id        String @id @default(cuid())
  userId    String @unique

  monthlyIncomeCents   Int
  monthlySpendingCents Int
  availableCents       Int

  windowDays              Int
  transactionCount        Int
  oldestTransactionDate   DateTime
  newestTransactionDate   DateTime

  status     BaselineStatus @default(INSUFFICIENT_DATA)
  computedAt DateTime       @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

### New Enum

```prisma
enum BaselineStatus {
  READY
  INSUFFICIENT_DATA
  STALE
}
```

### Required Update to User Model

```prisma
model User {
  // existing fields...

  // NEW
  financialBaseline FinancialBaseline?
}
```

### Data Integrity Rules

- `userId` is unique — exactly one baseline per user
- `monthlyIncomeCents` must be >= 0
- `monthlySpendingCents` must be >= 0
- `availableCents` must equal `monthlyIncomeCents - monthlySpendingCents`
- `windowDays` must be > 0
- `transactionCount` must be >= 0
- `oldestTransactionDate` must be <= `newestTransactionDate`
- `computedAt` must be <= current time
- All cent values are integers — no floating point

## 7. Data Processing & Logic

### Baseline Computation Pipeline

**Entry point:** `computeBaseline(userId: string, tx?: PrismaClient): Promise<FinancialBaseline>`

**Step 1: Gather transactions**

```typescript
const windowStart = subDays(new Date(), 90); // 90-day lookback

const transactions = await tx.normalizedTransaction.findMany({
  where: {
    userId,
    isActive: true,
    pending: false,
    date: { gte: windowStart },
  },
  orderBy: { date: "asc" },
  select: {
    id: true,
    amountCents: true,
    date: true,
    transactionType: true,
    category: true,
    displayName: true,
    financialAccountId: true,
  },
});
```

**Step 2: Check data sufficiency**

```typescript
if (transactions.length === 0) {
  // No transactions at all — status: INSUFFICIENT_DATA
  return upsertBaseline(userId, {
    status: "INSUFFICIENT_DATA",
    monthlyIncomeCents: 0,
    monthlySpendingCents: 0,
    availableCents: 0,
    windowDays: 0,
    transactionCount: 0,
    // dates set to epoch for INSUFFICIENT_DATA
  });
}

const oldestDate = transactions[0].date;
const newestDate = transactions[transactions.length - 1].date;
const daySpan = differenceInDays(newestDate, oldestDate);

if (daySpan < 30) {
  return upsertBaseline(userId, {
    status: "INSUFFICIENT_DATA",
    monthlyIncomeCents: 0,
    monthlySpendingCents: 0,
    availableCents: 0,
    windowDays: daySpan,
    transactionCount: transactions.length,
    oldestTransactionDate: oldestDate,
    newestTransactionDate: newestDate,
  });
}
```

**Step 3: Filter transfers**

```typescript
const TRANSFER_PATTERNS = [
  /transfer/i,
  /xfer/i,
  /\bmove\b.*\b(funds|money)\b/i,
  /^online transfer/i,
  /^ach transfer/i,
  /^wire transfer/i,
];

function isTransferByName(displayName: string): boolean {
  return TRANSFER_PATTERNS.some((p) => p.test(displayName));
}

function isTransferByCategory(category: TransactionCategory): boolean {
  return category === "TRANSFER";
}

// Phase 1: Remove category + name-based transfers
const nonTransferTxns = transactions.filter(
  (t) => !isTransferByCategory(t.category) && !isTransferByName(t.displayName),
);

// Phase 2: Reciprocal matching — same day, same absolute amount, different accounts
const reciprocalTransferIds = detectReciprocalTransfers(nonTransferTxns);
const cleanTxns = nonTransferTxns.filter((t) => !reciprocalTransferIds.has(t.id));
```

**Reciprocal transfer detection:**

```typescript
function detectReciprocalTransfers(txns: Transaction[]): Set<string> {
  const transferIds = new Set<string>();

  // Group by date (YYYY-MM-DD)
  const byDate = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = formatDateKey(t.date); // YYYY-MM-DD
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(t);
  }

  for (const [, dayTxns] of byDate) {
    if (dayTxns.length < 2) continue;

    const incomes = dayTxns.filter((t) => t.transactionType === "INCOME");
    const expenses = dayTxns.filter((t) => t.transactionType === "EXPENSE");

    for (const inc of incomes) {
      for (const exp of expenses) {
        if (
          Math.abs(inc.amountCents) === exp.amountCents &&
          inc.financialAccountId !== exp.financialAccountId
        ) {
          transferIds.add(inc.id);
          transferIds.add(exp.id);
        }
      }
    }
  }

  return transferIds;
}
```

**Step 4: Compute monthly income**

```typescript
const incomeTxns = cleanTxns.filter((t) => t.transactionType === "INCOME");
const totalIncomeCents = incomeTxns.reduce(
  (sum, t) => sum + Math.abs(t.amountCents), // amountCents is negative for income; take absolute
  0,
);

const actualWindowDays = differenceInDays(newestDate, oldestDate) + 1; // inclusive
const monthlyIncomeCents = Math.round(
  (totalIncomeCents / actualWindowDays) * 30.44,
);
```

**Step 5: Compute monthly spending (trimmed mean)**

```typescript
const expenseTxns = cleanTxns.filter((t) => t.transactionType === "EXPENSE");

// Build daily spending totals
const dailySpending = new Map<string, number>();
for (const t of expenseTxns) {
  const key = formatDateKey(t.date);
  dailySpending.set(key, (dailySpending.get(key) ?? 0) + t.amountCents);
}

// Fill in zero-spending days within the window
const allDays: number[] = [];
for (let d = new Date(oldestDate); d <= newestDate; d = addDays(d, 1)) {
  const key = formatDateKey(d);
  allDays.push(dailySpending.get(key) ?? 0);
}

// Trimmed mean: remove top 5% of spending days
const sorted = [...allDays].sort((a, b) => a - b);
const spendingDayCount = sorted.filter((v) => v > 0).length;

let trimmedDailyTotals: number[];
if (spendingDayCount >= 14) {
  const trimCount = Math.max(1, Math.floor(sorted.length * 0.05));
  trimmedDailyTotals = sorted.slice(0, sorted.length - trimCount);
} else {
  trimmedDailyTotals = sorted; // not enough data to trim
}

const trimmedSum = trimmedDailyTotals.reduce((sum, v) => sum + v, 0);
const trimmedMean = trimmedSum / trimmedDailyTotals.length;
const monthlySpendingCents = Math.round(trimmedMean * 30.44);
```

**Step 6: Compute available money and persist**

```typescript
const availableCents = monthlyIncomeCents - monthlySpendingCents;

return upsertBaseline(userId, {
  status: "READY",
  monthlyIncomeCents,
  monthlySpendingCents,
  availableCents,
  windowDays: actualWindowDays,
  transactionCount: cleanTxns.length,
  oldestTransactionDate: oldestDate,
  newestTransactionDate: newestDate,
});
```

**Upsert helper:**

```typescript
async function upsertBaseline(
  userId: string,
  data: BaselineData,
  tx?: PrismaClient,
): Promise<FinancialBaseline> {
  const client = tx ?? prisma;

  return client.financialBaseline.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
      computedAt: new Date(),
    },
    update: {
      ...data,
      computedAt: new Date(),
    },
  });
}
```

### Staleness Check

```typescript
async function isBaselineStale(userId: string, baseline: FinancialBaseline): Promise<boolean> {
  const newerTxnCount = await prisma.normalizedTransaction.count({
    where: {
      userId,
      isActive: true,
      OR: [
        { createdAt: { gt: baseline.computedAt } },
        { updatedAt: { gt: baseline.computedAt } },
      ],
    },
  });
  return newerTxnCount > 0;
}
```

### Integration with Sync Pipeline

After the normalization step completes in `runSyncPipeline`, trigger baseline computation:

```typescript
// In sync.ts, after ANALYZING step succeeds:
// Step 3.5: Compute financial baseline
await updateSyncJobStep(syncJob.id, "ANALYZING"); // reuse step
await computeBaseline(syncJob.userId, tx);
```

This runs within the existing sync pipeline — no new background job infrastructure needed.

### Update Behavior

| Trigger | Behavior |
|---------|----------|
| Sync pipeline completes | `computeBaseline()` called directly — always recomputes fresh |
| API GET request, baseline exists + READY | Check staleness. If stale, recompute inline before responding |
| API GET request, baseline exists + INSUFFICIENT_DATA | Check if more data now exists. If so, recompute. If not, return as-is |
| API GET request, no baseline exists | Compute and persist on first call |
| API GET request, no transactions exist | Return `{ status: "unavailable" }` — no baseline persisted |

### Determinism Guarantees

The following guarantee holds: **given the same set of `NormalizedTransaction` records for a user, the baseline computation always produces identical `monthlyIncomeCents`, `monthlySpendingCents`, and `availableCents` values.**

This is enforced by:

- No randomness in any computation
- Deterministic sorting (date ASC, then amount for stability)
- Integer-only arithmetic (`Math.round` applied once at the end of each chain)
- No AI or ML inference
- Transfer detection uses exact pattern matching, not fuzzy heuristics
- Trimmed mean uses deterministic sort and slice

## 8. API Surface

### Base URL

```
/api/v1
```

### Authentication

All endpoints require a valid Supabase session. User is resolved via `User.supabaseId`. All queries are scoped to the authenticated user.

### Get Financial Baseline

```
GET /api/v1/baseline
```

**Query Parameters:** None.

**Response (status: ready):**

```json
{
  "status": "ready",
  "monthly_income_cents": 482000,
  "monthly_spending_cents": 358000,
  "available_cents": 124000,
  "window_days": 87,
  "transaction_count": 342,
  "computed_at": "2026-03-25T14:30:00.000Z"
}
```

**Response (status: insufficient_data):**

```json
{
  "status": "insufficient_data",
  "monthly_income_cents": 0,
  "monthly_spending_cents": 0,
  "available_cents": 0,
  "window_days": 18,
  "transaction_count": 42,
  "computed_at": "2026-03-25T14:30:00.000Z"
}
```

**Response (status: unavailable — no transactions):**

```json
{
  "status": "unavailable"
}
```

**Error Response:**

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**Status Codes:**

| Code | Condition |
|------|-----------|
| 200 | Baseline returned (any status) |
| 401 | Not authenticated |

**Behavior:**

1. Authenticate user
2. Check for existing `FinancialBaseline` record
3. If no baseline exists:
   a. Check if user has any active non-pending `NormalizedTransaction` records
   b. If no transactions: return `{ status: "unavailable" }`
   c. If transactions exist: compute baseline, persist, return result
4. If baseline exists:
   a. Check staleness (newer transactions since `computedAt`)
   b. If stale: recompute, persist, return fresh result
   c. If fresh: return existing baseline
5. Format response as snake_case JSON

**Performance note:** The staleness check is a single `COUNT` query. Recomputation only happens when data has actually changed. For most page loads, this endpoint returns the cached baseline directly.

## 9. Testing Strategy

### Financial Correctness Tests (CRITICAL)

```
TEST: baseline_income_calculation_exact
GIVEN:
  - User has 90 days of transactions
  - 3 income transactions: -250000 cents (Mar 1), -250000 cents (Mar 15), -250000 cents (Apr 1)
  - No transfers
WHEN:
  - Baseline is computed
THEN:
  - monthlyIncomeCents = round((750000 / 90) * 30.44) = 253667
  - Calculation uses absolute values of negative amountCents
  - Result is an integer (no floating point artifacts)

TEST: baseline_spending_smoothing_trims_outliers
GIVEN:
  - User has 60 days of transactions
  - 58 days of ~$50/day spending (5000 cents each)
  - 2 days with $2000 spending (200000 cents each) — outlier spikes
WHEN:
  - Baseline is computed with trimmed mean
THEN:
  - Top 5% of daily totals (the 3 highest days) are trimmed
  - monthlySpendingCents reflects ~$50/day baseline, not inflated by outliers
  - monthlySpendingCents < 200000 (well below what including outliers would produce)

TEST: baseline_available_money_positive
GIVEN:
  - monthlyIncomeCents = 500000 ($5,000)
  - monthlySpendingCents = 380000 ($3,800)
WHEN:
  - availableCents is computed
THEN:
  - availableCents = 120000 ($1,200)
  - availableCents = monthlyIncomeCents - monthlySpendingCents exactly

TEST: baseline_available_money_negative
GIVEN:
  - monthlyIncomeCents = 320000 ($3,200)
  - monthlySpendingCents = 354000 ($3,540)
WHEN:
  - availableCents is computed
THEN:
  - availableCents = -34000 (-$340)
  - availableCents is negative (spending exceeds income)
```

### Transfer Detection Tests

```
TEST: transfer_excluded_by_category
GIVEN:
  - Transaction with category = TRANSFER, transactionType = INCOME, amountCents = -50000
WHEN:
  - Transfer filter runs
THEN:
  - Transaction is excluded from income calculation

TEST: transfer_excluded_by_name_pattern
GIVEN:
  - Transaction with displayName = "Online Transfer from Savings"
  - category = UNCATEGORIZED
WHEN:
  - Transfer filter runs
THEN:
  - Transaction is excluded (matches "online transfer" pattern)

TEST: reciprocal_transfer_detected
GIVEN:
  - Income transaction: amountCents = -100000, accountId = "checking", date = "2026-03-15"
  - Expense transaction: amountCents = 100000, accountId = "savings", date = "2026-03-15"
WHEN:
  - Reciprocal transfer detection runs
THEN:
  - Both transactions are excluded
  - Neither counts toward income nor spending

TEST: non_transfer_income_preserved
GIVEN:
  - Income transaction: displayName = "Employer Direct Dep", category = INCOME, amountCents = -250000
WHEN:
  - Transfer filter runs
THEN:
  - Transaction is NOT excluded
  - Counts toward income calculation
```

### Insufficient Data Tests

```
TEST: insufficient_data_under_30_days
GIVEN:
  - User has 15 days of transaction history
  - 20 transactions exist
WHEN:
  - Baseline is computed
THEN:
  - status = INSUFFICIENT_DATA
  - monthlyIncomeCents = 0
  - monthlySpendingCents = 0
  - availableCents = 0
  - windowDays = 15
  - transactionCount = 20

TEST: sufficient_data_exactly_30_days
GIVEN:
  - User has exactly 30 days of transaction history
  - Oldest transaction: Feb 23, newest: Mar 25
WHEN:
  - Baseline is computed
THEN:
  - status = READY (30 days meets the minimum)
  - monthlyIncomeCents > 0 (assuming income exists)
```

### Staleness Tests

```
TEST: baseline_recomputed_when_stale
GIVEN:
  - Existing baseline with computedAt = "2026-03-24T10:00:00Z"
  - New NormalizedTransaction created at "2026-03-25T08:00:00Z"
WHEN:
  - GET /api/v1/baseline is called
THEN:
  - Staleness check detects newer transaction
  - Baseline is recomputed with fresh data
  - New computedAt > old computedAt

TEST: baseline_returned_cached_when_fresh
GIVEN:
  - Existing baseline with computedAt = "2026-03-25T10:00:00Z"
  - No NormalizedTransactions created or updated after that time
WHEN:
  - GET /api/v1/baseline is called
THEN:
  - Staleness check passes (no newer transactions)
  - Existing baseline returned without recomputation
```

### User Isolation Tests

```
TEST: user_a_cannot_see_user_b_baseline
GIVEN:
  - User A has a READY baseline
  - User B has no baseline
WHEN:
  - User B calls GET /api/v1/baseline
THEN:
  - User B receives { status: "unavailable" }
  - User A's baseline data is never returned

TEST: user_b_transactions_excluded_from_user_a_baseline
GIVEN:
  - User A has 60 days of transactions
  - User B has 60 days of transactions in the same date range
WHEN:
  - User A's baseline is computed
THEN:
  - Only User A's transactions are included
  - User B's income/spending has no effect on User A's baseline
```

### API Tests

```
TEST: api_returns_200_ready
GIVEN:
  - Authenticated user with >= 30 days of transactions
WHEN:
  - GET /api/v1/baseline
THEN:
  - Status 200
  - Response contains: status, monthly_income_cents, monthly_spending_cents, available_cents, window_days, transaction_count, computed_at
  - All cent values are integers
  - status = "ready"

TEST: api_returns_200_unavailable
GIVEN:
  - Authenticated user with no transactions
WHEN:
  - GET /api/v1/baseline
THEN:
  - Status 200
  - Response: { status: "unavailable" }

TEST: api_returns_401_unauthenticated
GIVEN:
  - No auth session
WHEN:
  - GET /api/v1/baseline
THEN:
  - Status 401
  - Response: { error: "unauthorized", message: "Authentication required" }
```

### Determinism Tests

```
TEST: same_transactions_produce_same_baseline
GIVEN:
  - A fixed set of 100 NormalizedTransactions for a user
WHEN:
  - Baseline is computed twice with the same data
THEN:
  - monthlyIncomeCents is identical both times
  - monthlySpendingCents is identical both times
  - availableCents is identical both times

TEST: integer_arithmetic_no_floating_point_drift
GIVEN:
  - Income transactions totaling 1 cent each, 1000 transactions
WHEN:
  - Monthly income is calculated
THEN:
  - Result is an exact integer
  - No floating-point artifacts (e.g., 0.1 + 0.2 != 0.3 cannot happen because all math is in cents)
```

### Test Data Factories

```typescript
function createTestTransaction(
  overrides?: Partial<NormalizedTransaction>,
): NormalizedTransaction {
  return {
    id: cuid(),
    userId: "test-user",
    financialAccountId: "test-account",
    rawTransactionId: cuid(),
    plaidTransactionId: cuid(),
    amountCents: 5000, // $50 expense
    isoCurrencyCode: "USD",
    date: new Date("2026-03-15"),
    displayName: "Test Merchant",
    originalName: "TEST MERCHANT #123",
    merchantName: "Test Merchant",
    category: "SHOPPING",
    transactionType: "EXPENSE",
    pending: false,
    duplicateOf: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createIncomeTransaction(
  overrides?: Partial<NormalizedTransaction>,
): NormalizedTransaction {
  return createTestTransaction({
    amountCents: -250000, // -$2,500 (income in Plaid convention)
    displayName: "Employer Direct Dep",
    category: "INCOME",
    transactionType: "INCOME",
    ...overrides,
  });
}

function createTransferTransaction(
  overrides?: Partial<NormalizedTransaction>,
): NormalizedTransaction {
  return createTestTransaction({
    amountCents: -50000,
    displayName: "Online Transfer from Savings",
    category: "TRANSFER",
    transactionType: "INCOME",
    ...overrides,
  });
}
```

## 10. Acceptance Criteria

### 1. Baseline Computation

- [ ] Income detection correctly identifies inflows and excludes transfers
- [ ] Transfer detection covers: category-based, name-based, and reciprocal matching
- [ ] Spending calculation uses trimmed mean smoothing (top 5% removed)
- [ ] Available money = income - spending, can be negative
- [ ] All values are integer cents — no floating point at any step
- [ ] Same input transactions produce identical output every time
- [ ] Minimum 30 days of history required for READY status
- [ ] Baseline persisted as `FinancialBaseline` record (one per user)

### 2. API

- [ ] `GET /api/v1/baseline` returns correct baseline for authenticated user
- [ ] Response includes: `status`, `monthly_income_cents`, `monthly_spending_cents`, `available_cents`, `window_days`, `transaction_count`, `computed_at`
- [ ] Returns `{ status: "unavailable" }` when no transactions exist
- [ ] Returns `{ status: "insufficient_data" }` when < 30 days of history
- [ ] Returns 401 for unauthenticated requests
- [ ] Stale baselines are recomputed inline before responding
- [ ] Fresh baselines are returned from cache without recomputation

### 3. Dashboard Integration

- [ ] Summary cards show live Monthly Income and Monthly Spending when baseline is ready
- [ ] Summary cards show placeholder dashes when baseline is not ready
- [ ] Baseline card shows available money with `~` prefix when positive
- [ ] Baseline card shows available money with `-` prefix in error color when negative
- [ ] Baseline card shows insufficient data state with explanatory message
- [ ] Baseline card is not rendered when no accounts connected or during sync
- [ ] All amounts formatted to dollars with locale-appropriate formatting
- [ ] `useBaseline` SWR hook revalidates on focus and after sync completes

### 4. Data Integrity

- [ ] `FinancialBaseline.userId` has unique constraint — one baseline per user
- [ ] All queries include `userId` for user isolation
- [ ] `availableCents` always equals `monthlyIncomeCents - monthlySpendingCents`
- [ ] No sensitive transaction data logged during computation
- [ ] Computation runs within Prisma transaction where appropriate

### 5. Sync Integration

- [ ] Baseline recomputation triggers automatically when sync pipeline completes
- [ ] No new background job infrastructure required
- [ ] Baseline computation failure does not fail the sync pipeline

## 11. Explicit Non-Goals (v1)

- No category-level spending breakdown exposed to UI
- No income source breakdown (employer vs side income)
- No spending trend history or month-over-month comparison
- No user-editable income or spending overrides
- No budget creation or management
- No goal integration or affordability calculations
- No "safe to spend" or "daily allowance" calculations
- No Net Worth calculation (remains placeholder)
- No Upcoming Bills calculation (remains placeholder — depends on recurring detection)
- No subscription or recurring transaction surfacing
- No spending charts or graphs
- No alerts or notifications when baseline changes
- No drill-down from the baseline card to supporting detail
- No AI-generated financial advice or recommendations
- No multi-currency support (USD only for v1)
- No baseline history or versioning (only latest snapshot)

## 12. Resolved Decisions

- **Baseline computation on sync failure:** Only compute on COMPLETED sync. Partial data from a failed pipeline must not be used — it produces misleading results.
- **Recomputation throttling:** No throttling. Recomputation triggers on actual data changes (new or updated `NormalizedTransaction` records since `computedAt`). No time-based throttle.
- **30-day minimum:** Confirmed. Under 30 days the system returns `INSUFFICIENT_DATA`. Monthly extrapolation from less than 30 days is unreliable — a single paycheck cycle may not be represented.

## 13. Future Considerations

- **Budgeting engine (next pitch):** Will read `monthlySpendingCents` and category breakdown (internal) to propose budget allocations
- **Goals:** Will read `availableCents` to determine if savings targets are realistic
- **Purchase readiness:** Will read `availableCents` to answer "Can I afford this?"
- **Recurring detection:** Once implemented, can refine income detection (recurring income vs one-time) and enable Upcoming Bills card
- **Baseline history:** Storing monthly snapshots would enable trend visualization ("spending up 12% vs last month")
- **Multi-account households:** Baseline could aggregate across household members (future tenant model expansion)
- **Confidence scoring:** Could add a confidence field indicating how reliable the estimate is based on data quality/quantity

## 14. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `prisma/migrations/[timestamp]_financial_baseline/migration.sql` | Schema migration for `FinancialBaseline` model |
| `src/services/baseline.ts` | Core baseline computation logic: income detection, transfer filtering, spending smoothing, persistence |
| `src/app/api/v1/baseline/route.ts` | `GET /api/v1/baseline` endpoint |
| `src/hooks/use-baseline.ts` | SWR hook for `GET /api/v1/baseline` |
| `src/components/baseline-card.tsx` | Dashboard centerpiece card component |
| `src/services/__tests__/baseline.test.ts` | Unit tests for baseline computation logic |
| `src/app/api/v1/baseline/__tests__/route.test.ts` | API route integration tests |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `FinancialBaseline` model, `BaselineStatus` enum, relation on `User` |
| `src/services/sync.ts` | Call `computeBaseline()` after normalization step completes |
| `src/app/(app)/dashboard/page.tsx` | Add `BaselineCard`, update `SummaryCard` to accept live data from `useBaseline` |

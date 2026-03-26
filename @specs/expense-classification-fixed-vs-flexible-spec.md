---
version: 1.0.0
status: draft
author: P.R.I.M.E. Engineering
last_updated: 2026-03-25
design_doc_reference: "@design-docs/expense-classification-fixed-vs-flexible-design-doc.md"
---

# Expense Classification (Fixed vs Flexible) — Technical Specification

---

## 1. Summary

This feature classifies a user's expense transactions into **fixed** (non-negotiable obligations) and **flexible** (discretionary spending), then surfaces the breakdown on the dashboard and budget page.

The system introduces a deterministic classification engine that combines category-based rules with recurrence pattern detection to assign each expense a fixed/flexible classification. Classification produces aggregated outputs — total fixed, total flexible, percentage breakdown, and per-category totals — that feed the dashboard summary card and the full budget page view.

The system gains the ability to answer: "How much of my spending can I actually control?" This is the foundational data layer for the Budget Intelligence Engine and a prerequisite for future affordability, goal planning, and purchase readiness features.

**Success criteria:**

- Every active, non-pending expense transaction is classified as `FIXED` or `FLEXIBLE`
- Dashboard shows accurate fixed/flexible totals with correct percentages
- Budget page shows per-category breakdown sorted by amount
- Classification is deterministic: same transactions always produce the same output
- User data isolation enforced on all queries
- Classification recomputes automatically when new transactions arrive via sync

---

## 2. Problem

After baseline computation, the system knows total monthly income and total monthly spending. But all spending is treated as a single undifferentiated number. The system cannot distinguish:

- Rent ($1,400/mo) from coffee ($5/day)
- A monthly loan payment from a one-time shopping purchase
- Obligations the user cannot remove from discretionary spending they could cut

This prevents the system from answering:

- What portion of my spending is controllable?
- What can I realistically reduce?
- Why does my available money feel so low?

Without this classification, the Budget page remains an empty state, and downstream features (budgeting, goal planning, purchase readiness) have no behavioral spending model to build on.

---

## 3. Core Concepts

### 3.1 Expense Type

Each expense transaction receives exactly one classification:

| Value | Description |
|-------|-------------|
| `FIXED` | Recurring, non-negotiable obligations — rent, loans, insurance, utilities, subscriptions with consistent amounts |
| `FLEXIBLE` | Discretionary, variable spending — dining, shopping, entertainment, one-time purchases |

### 3.2 Classification Confidence

Each classification receives a confidence level:

| Value | Description | Behavior |
|-------|-------------|----------|
| `HIGH` | Category + recurrence signals agree strongly | Auto-classify, no user action needed |
| `MEDIUM` | Signals partially agree or pattern is emerging | Auto-classify, monitor for changes |
| `LOW` | Ambiguous — category and recurrence signals conflict | Auto-classify with best guess, eligible for future user confirmation |

In v1, all confidence levels auto-classify. Confidence is persisted for future use (user confirmation flow in later versions) but does not affect the classification outcome.

### 3.3 Category Fixed/Flexible Default Mapping

Each `TransactionCategory` has a default classification:

| Category | Default | Rationale |
|----------|---------|-----------|
| `HOUSING` | `FIXED` | Rent, mortgage — always obligatory |
| `UTILITIES` | `FIXED` | Electric, water, internet — recurring obligations |
| `SUBSCRIPTIONS` | `FIXED` | Recurring charges with consistent amounts |
| `TRANSPORTATION` | `FLEXIBLE` | Gas, rideshare — variable and discretionary |
| `FOOD_AND_DRINK` | `FLEXIBLE` | Dining, groceries — variable amounts |
| `SHOPPING` | `FLEXIBLE` | Discretionary purchases |
| `ENTERTAINMENT` | `FLEXIBLE` | Discretionary |
| `HEALTH` | `FLEXIBLE` | Variable unless recurring |
| `PERSONAL` | `FLEXIBLE` | Variable unless recurring |
| `UNCATEGORIZED` | `FLEXIBLE` | Default to flexible when unknown |

**Note:** `INCOME` and `TRANSFER` categories are excluded from expense classification entirely. They are filtered out before classification begins.

### 3.4 Recurrence Override

A transaction that recurrence detection identifies as recurring (monthly cadence, consistent amount, same merchant) can override the default category mapping:

- A `TRANSPORTATION` transaction that recurs monthly at a consistent amount (e.g., car payment, transit pass) → overridden to `FIXED`
- A `HEALTH` transaction that recurs monthly at a consistent amount (e.g., gym, insurance) → overridden to `FIXED`
- A `FOOD_AND_DRINK` transaction that recurs monthly at a consistent amount (e.g., meal kit subscription) → overridden to `FIXED`

Categories already defaulting to `FIXED` (`HOUSING`, `UTILITIES`, `SUBSCRIPTIONS`) are not downgraded by recurrence absence.

### 3.5 Expense Classification Summary

The aggregated output produced by the classification engine:

| Field | Type | Description |
|-------|------|-------------|
| `fixedCents` | `Int` | Total monthly fixed expenses in cents |
| `flexibleCents` | `Int` | Total monthly flexible expenses in cents |
| `fixedPct` | `Int` | Fixed as percentage of total spending (integer, 0-100) |
| `flexiblePct` | `Int` | Flexible as percentage of total spending (integer, 0-100) |
| `fixedCategories` | `Array` | Per-category breakdown within fixed |
| `flexibleCategories` | `Array` | Per-category breakdown within flexible |

---

## 4. States & Lifecycle

### 4.1 Classification Status

| Status | Description |
|--------|-------------|
| `READY` | Classification computed with sufficient data |
| `INSUFFICIENT_DATA` | Fewer than 30 days of transaction history |
| `UNAVAILABLE` | No transactions exist or classification has not been computed |

### 4.2 State Transitions

```
UNAVAILABLE ──(first sync with transactions)──→ INSUFFICIENT_DATA or READY
INSUFFICIENT_DATA ──(more transactions arrive, ≥30 day span)──→ READY
READY ──(sync adds new transactions)──→ READY (recomputed)
```

Classification status mirrors the baseline status lifecycle. If baseline is `INSUFFICIENT_DATA`, classification is also `INSUFFICIENT_DATA`. Classification requires baseline to be `READY` for the income-percentage insight.

### 4.3 Recomputation Triggers

Classification recomputes:

1. During sync pipeline — after normalization and baseline computation (Step 3.6 in sync pipeline)
2. On API request — if classification is stale (newer transactions exist since last computation)

---

## 5. UI Integration

Reference: `@design-docs/expense-classification-fixed-vs-flexible-design-doc.md`

### 5.1 Dashboard — Spending Breakdown Card

**Purpose:** Show fixed vs flexible split at a glance.

**Data required from API:**

| Field | Usage |
|-------|-------|
| `fixed_cents` | Fixed amount display |
| `flexible_cents` | Flexible amount display |
| `fixed_pct` | Ratio bar width + percentage label |
| `flexible_pct` | Ratio bar width + percentage label |
| `status` | Render vs hide card |

**Actions:** "View Budget →" link navigates to `/budget`

**Render conditions:**
- Only renders when dashboard state is `connected` AND baseline is `ready`
- When classification status is `ready` → full breakdown
- When classification status is `insufficient_data` → empty state with placeholders
- When classification is `unavailable` or API error → card not rendered

### 5.2 Budget Page — Full Classification View

**Purpose:** Show per-category breakdown of fixed and flexible spending.

**Data required from API:**

| Field | Usage |
|-------|-------|
| `fixed_cents` | Overview card fixed total |
| `flexible_cents` | Overview card flexible total |
| `fixed_pct` | Ratio bar + label |
| `flexible_pct` | Ratio bar + label |
| `fixed_categories` | Fixed category card rows |
| `flexible_categories` | Flexible category card rows |
| `status` | Show classification view vs empty state |

**Also requires:** Baseline data (`monthly_income_cents`) for income-percentage insight text.

**Render conditions:**
- When classification status is `ready` → full view
- Otherwise → existing `EmptyStatePage` placeholder

### 5.3 Derived Data Requirements

| Value | Computed Where | Updates When |
|-------|---------------|--------------|
| `fixedCents` / `flexibleCents` | Server (classification service) | On sync or stale API request |
| `fixedPct` / `flexiblePct` | Server (classification service) | Same |
| Per-category totals | Server (classification service) | Same |
| Fixed-of-income percentage | Client (budget page) | When classification + baseline data both available |
| Insight text selection | Client (dashboard card) | When classification data available |

---

## 6. Data Model

### 6.1 Relationship to Existing Schema

| From | Relation | To | Description |
|------|----------|-----|-------------|
| `NormalizedTransaction` | gets classified by | Classification service | Each expense transaction receives a fixed/flexible classification |
| `ExpenseClassification` | belongs to | `User` | One classification summary per user |
| `ExpenseClassification` | depends on | `FinancialBaseline` | Shares the same computation window and staleness model |

### 6.2 New Model: ExpenseClassification

```prisma
model ExpenseClassification {
  id     String @id @default(cuid())
  userId String @unique

  fixedCents      Int
  flexibleCents   Int
  fixedPct        Int
  flexiblePct     Int

  // Per-category breakdown stored as JSON
  // Array<{ category: string, label: string, amountCents: number }>
  fixedCategories    Json
  flexibleCategories Json

  windowDays            Int
  transactionCount      Int
  oldestTransactionDate DateTime
  newestTransactionDate DateTime

  status     ClassificationStatus @default(INSUFFICIENT_DATA)
  computedAt DateTime             @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 6.3 New Enum: ClassificationStatus

```prisma
enum ClassificationStatus {
  READY
  INSUFFICIENT_DATA
}
```

### 6.4 New Enum: ExpenseType

```prisma
enum ExpenseType {
  FIXED
  FLEXIBLE
}
```

### 6.5 NormalizedTransaction Updates

Add per-transaction classification fields:

```prisma
model NormalizedTransaction {
  // ... existing fields ...

  // NEW — expense classification fields
  expenseType             ExpenseType?
  classificationConfidence ClassificationConfidence?
}
```

### 6.6 New Enum: ClassificationConfidence

```prisma
enum ClassificationConfidence {
  HIGH
  MEDIUM
  LOW
}
```

### 6.7 User Model Update

```prisma
model User {
  // ... existing relations ...

  // NEW
  expenseClassification ExpenseClassification?
}
```

### 6.8 Data Integrity Rules

- `ExpenseClassification.userId` is unique — one classification per user
- `fixedPct + flexiblePct` must equal 100 (or both 0 when no data)
- `fixedCents + flexibleCents` must equal total expense amount in the window
- Per-category amounts must sum to their respective totals
- `expenseType` is null for `INCOME` and `TRANSFER` transactions
- Classification must not include pending or inactive transactions

---

## 7. Data Processing & Logic

### 7.1 Classification Pipeline Overview

```
Normalized Transactions (active, non-pending, EXPENSE type, last 90 days)
    │
    ├── 1. Filter: exclude INCOME, TRANSFER categories
    │
    ├── 2. Category default mapping
    │
    ├── 3. Recurrence detection scan
    │
    ├── 4. Recurrence override (flexible → fixed for recurring)
    │
    ├── 5. Confidence scoring
    │
    ├── 6. Persist per-transaction classification
    │
    ├── 7. Aggregate totals + category breakdown
    │
    └── 8. Persist ExpenseClassification summary
```

### 7.2 Step 1: Transaction Selection

Query active, non-pending expense transactions from the last 90 days:

```typescript
const transactions = await client.normalizedTransaction.findMany({
  where: {
    userId,
    isActive: true,
    pending: false,
    transactionType: "EXPENSE",
    date: { gte: windowStart },
    category: { notIn: ["INCOME", "TRANSFER"] },
  },
  orderBy: { date: "asc" },
});
```

If no transactions or day span < 30 → `INSUFFICIENT_DATA`.

### 7.3 Step 2: Category Default Mapping

```typescript
const CATEGORY_DEFAULT_TYPE: Record<TransactionCategory, ExpenseType> = {
  HOUSING: "FIXED",
  UTILITIES: "FIXED",
  SUBSCRIPTIONS: "FIXED",
  TRANSPORTATION: "FLEXIBLE",
  FOOD_AND_DRINK: "FLEXIBLE",
  SHOPPING: "FLEXIBLE",
  ENTERTAINMENT: "FLEXIBLE",
  HEALTH: "FLEXIBLE",
  PERSONAL: "FLEXIBLE",
  UNCATEGORIZED: "FLEXIBLE",
  // These are filtered out before this step:
  INCOME: "FLEXIBLE",
  TRANSFER: "FLEXIBLE",
};
```

### 7.4 Step 3: Recurrence Detection

Group transactions by merchant name (case-insensitive, trimmed). For each merchant group:

```typescript
interface RecurrenceSignal {
  merchantName: string;
  isRecurring: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}
```

**Detection algorithm:**

1. Group transactions by normalized merchant key: `(merchantName || displayName).toLowerCase().trim()`
2. For each group with ≥2 transactions:
   a. Sort by date ascending
   b. Compute intervals between consecutive transactions (in days)
   c. Check monthly cadence: intervals mostly fall between 25–35 days
   d. Check amount consistency: coefficient of variation (stddev / mean) of amounts ≤ 0.10 (10%)
3. Classification:
   - **Monthly cadence (≥60% of intervals in 25–35 day range) AND amount consistency ≤ 0.10** → `isRecurring: true`, confidence `HIGH`
   - **Monthly cadence OR amount consistency ≤ 0.15** → `isRecurring: true`, confidence `MEDIUM`
   - Otherwise → `isRecurring: false`, confidence `LOW`

```typescript
function detectRecurrence(
  transactions: TransactionRow[],
): RecurrenceSignal {
  if (transactions.length < 2) {
    return { merchantName: transactions[0].merchantKey, isRecurring: false, confidence: "LOW" };
  }

  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(differenceInDays(sorted[i].date, sorted[i - 1].date));
  }

  // Monthly cadence check: 25-35 day intervals
  const monthlyIntervals = intervals.filter((d) => d >= 25 && d <= 35);
  const monthlyRatio = monthlyIntervals.length / intervals.length;

  // Amount consistency check
  const amounts = sorted.map((t) => t.amountCents);
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const variance = amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : Infinity;

  if (monthlyRatio >= 0.6 && cv <= 0.10) {
    return { merchantName: sorted[0].merchantKey, isRecurring: true, confidence: "HIGH" };
  }

  if (monthlyRatio >= 0.6 || cv <= 0.15) {
    return { merchantName: sorted[0].merchantKey, isRecurring: true, confidence: "MEDIUM" };
  }

  return { merchantName: sorted[0].merchantKey, isRecurring: false, confidence: "LOW" };
}
```

### 7.5 Step 4: Recurrence Override

For each transaction:

1. Look up the category default: `CATEGORY_DEFAULT_TYPE[transaction.category]`
2. If category default is `FIXED` → keep `FIXED` regardless of recurrence (confidence `HIGH`)
3. If category default is `FLEXIBLE` AND recurrence detection says `isRecurring: true` → override to `FIXED`
4. If category default is `FLEXIBLE` AND not recurring → keep `FLEXIBLE`

```typescript
function classifyTransaction(
  transaction: TransactionRow,
  recurrenceSignal: RecurrenceSignal | null,
): { expenseType: ExpenseType; confidence: ClassificationConfidence } {
  const categoryDefault = CATEGORY_DEFAULT_TYPE[transaction.category];

  // Fixed categories stay fixed with high confidence
  if (categoryDefault === "FIXED") {
    return { expenseType: "FIXED", confidence: "HIGH" };
  }

  // Flexible categories can be overridden by recurrence
  if (recurrenceSignal?.isRecurring) {
    return {
      expenseType: "FIXED",
      confidence: recurrenceSignal.confidence === "HIGH" ? "HIGH" : "MEDIUM",
    };
  }

  // Default flexible
  const confidence = recurrenceSignal
    ? (recurrenceSignal.confidence === "LOW" ? "HIGH" : "MEDIUM")
    : "MEDIUM";

  return { expenseType: "FLEXIBLE", confidence };
}
```

### 7.6 Step 5: Per-Transaction Persistence

Update each transaction with its classification:

```typescript
await client.normalizedTransaction.update({
  where: { id: transaction.id },
  data: {
    expenseType: classification.expenseType,
    classificationConfidence: classification.confidence,
  },
});
```

**Batch optimization:** Use a single `updateMany` per (expenseType, confidence) group to minimize DB round trips, then fall back to individual updates only for transactions needing per-row logic.

### 7.7 Step 6: Aggregation

After all transactions are classified:

```typescript
// Group by expenseType + category
const fixed = classified.filter((t) => t.expenseType === "FIXED");
const flexible = classified.filter((t) => t.expenseType === "FLEXIBLE");

const fixedCents = fixed.reduce((s, t) => s + t.amountCents, 0);
const flexibleCents = flexible.reduce((s, t) => s + t.amountCents, 0);
const totalCents = fixedCents + flexibleCents;

// Scale to monthly using same window approach as baseline
const monthlyFixedCents = Math.round((fixedCents / actualWindowDays) * DAYS_PER_MONTH);
const monthlyFlexibleCents = Math.round((flexibleCents / actualWindowDays) * DAYS_PER_MONTH);
const monthlyTotalCents = monthlyFixedCents + monthlyFlexibleCents;

const fixedPct = monthlyTotalCents > 0 ? Math.round((monthlyFixedCents / monthlyTotalCents) * 100) : 0;
const flexiblePct = monthlyTotalCents > 0 ? 100 - fixedPct : 0;
```

**Percentage rule:** `flexiblePct = 100 - fixedPct` to guarantee they sum to exactly 100. No independent rounding.

**Category breakdown:**

```typescript
function buildCategoryBreakdown(
  transactions: ClassifiedTransaction[],
  windowDays: number,
): Array<{ category: string; label: string; amountCents: number }> {
  const byCategory = new Map<string, number>();

  for (const t of transactions) {
    const current = byCategory.get(t.category) ?? 0;
    byCategory.set(t.category, current + t.amountCents);
  }

  return Array.from(byCategory.entries())
    .map(([category, totalCents]) => ({
      category,
      label: CATEGORY_LABELS[category],
      amountCents: Math.round((totalCents / windowDays) * DAYS_PER_MONTH),
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}
```

**Category display labels:**

```typescript
const CATEGORY_LABELS: Record<string, string> = {
  HOUSING: "Housing",
  UTILITIES: "Utilities",
  SUBSCRIPTIONS: "Subscriptions",
  TRANSPORTATION: "Transportation",
  FOOD_AND_DRINK: "Food & Drink",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  HEALTH: "Health",
  PERSONAL: "Personal",
  UNCATEGORIZED: "Other",
};
```

### 7.8 Step 7: Summary Persistence

```typescript
await client.expenseClassification.upsert({
  where: { userId },
  create: {
    userId,
    fixedCents: monthlyFixedCents,
    flexibleCents: monthlyFlexibleCents,
    fixedPct,
    flexiblePct,
    fixedCategories: fixedBreakdown,
    flexibleCategories: flexibleBreakdown,
    windowDays: actualWindowDays,
    transactionCount: classified.length,
    oldestTransactionDate: oldestDate,
    newestTransactionDate: newestDate,
    status: "READY",
    computedAt: new Date(),
  },
  update: {
    fixedCents: monthlyFixedCents,
    flexibleCents: monthlyFlexibleCents,
    fixedPct,
    flexiblePct,
    fixedCategories: fixedBreakdown,
    flexibleCategories: flexibleBreakdown,
    windowDays: actualWindowDays,
    transactionCount: classified.length,
    oldestTransactionDate: oldestDate,
    newestTransactionDate: newestDate,
    status: "READY",
    computedAt: new Date(),
  },
});
```

### 7.9 Sync Pipeline Integration

Add classification as Step 3.6 in `sync.ts`, after baseline computation:

```typescript
// Step 3.6: Compute expense classification (non-blocking)
try {
  await computeExpenseClassification(syncJob.userId);
} catch (error) {
  console.error(
    `Classification failed for syncJob=${syncJobId}:`,
    error instanceof Error ? error.message : "Unknown error",
  );
}
```

Classification failure must not block the sync pipeline. It follows the same non-blocking pattern as baseline computation.

### 7.10 Monthly Scaling

Classification uses the same window and scaling approach as baseline:

- **Window:** Last 90 days of active, non-pending transactions
- **Day span:** `differenceInDays(newestDate, oldestDate) + 1` (inclusive)
- **Monthly scale factor:** `DAYS_PER_MONTH (30.44) / actualWindowDays`
- **Minimum span:** 30 days (same as baseline)

This ensures fixed/flexible totals are comparable to baseline income/spending figures.

---

## 8. API Surface

### Base URL

```
/api/v1
```

### Authentication

All endpoints require authentication via Supabase session cookie. User scoping enforced on all queries.

---

### Get Expense Classification

```
GET /api/v1/expense-classification
```

**Query Parameters:** None

**Response (ready):**

```json
{
  "status": "ready",
  "fixed_cents": 210000,
  "flexible_cents": 90000,
  "fixed_pct": 70,
  "flexible_pct": 30,
  "fixed_categories": [
    { "category": "HOUSING", "label": "Housing", "amount_cents": 140000 },
    { "category": "UTILITIES", "label": "Utilities", "amount_cents": 18000 },
    { "category": "SUBSCRIPTIONS", "label": "Subscriptions", "amount_cents": 12000 },
    { "category": "TRANSPORTATION", "label": "Transportation", "amount_cents": 20000 },
    { "category": "HEALTH", "label": "Health", "amount_cents": 20000 }
  ],
  "flexible_categories": [
    { "category": "FOOD_AND_DRINK", "label": "Food & Drink", "amount_cents": 38000 },
    { "category": "SHOPPING", "label": "Shopping", "amount_cents": 22000 },
    { "category": "ENTERTAINMENT", "label": "Entertainment", "amount_cents": 15000 },
    { "category": "PERSONAL", "label": "Personal", "amount_cents": 10000 },
    { "category": "UNCATEGORIZED", "label": "Other", "amount_cents": 5000 }
  ],
  "window_days": 91,
  "transaction_count": 187,
  "computed_at": "2026-03-25T12:00:00.000Z"
}
```

**Response (insufficient_data):**

```json
{
  "status": "insufficient_data"
}
```

**Response (unavailable):**

```json
{
  "status": "unavailable"
}
```

**Error Responses:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Missing or invalid authentication |

### API Route Implementation Pattern

Follow the same pattern as `/api/v1/baseline/route.ts`:

1. Authenticate user via Supabase
2. Look up internal user record
3. Check for existing classification
4. If none exists → check for transactions → compute if transactions exist, return `unavailable` if not
5. If exists → check staleness (newer transactions since `computedAt`) → recompute if stale
6. Return formatted response

**Staleness check** (identical pattern to baseline):

```typescript
const newerTxnCount = await prisma.normalizedTransaction.count({
  where: {
    userId: user.id,
    pending: false,
    transactionType: "EXPENSE",
    OR: [
      { createdAt: { gt: existing.computedAt } },
      { updatedAt: { gt: existing.computedAt } },
    ],
  },
});
```

---

## 9. Client-Side Hook

### useExpenseClassification

```typescript
// src/hooks/use-expense-classification.ts
"use client";

import useSWR from "swr";

type ClassificationReady = {
  status: "ready";
  fixed_cents: number;
  flexible_cents: number;
  fixed_pct: number;
  flexible_pct: number;
  fixed_categories: Array<{ category: string; label: string; amount_cents: number }>;
  flexible_categories: Array<{ category: string; label: string; amount_cents: number }>;
  window_days: number;
  transaction_count: number;
  computed_at: string;
};

type ClassificationInsufficientData = {
  status: "insufficient_data";
};

type ClassificationUnavailable = {
  status: "unavailable";
};

export type ClassificationResponse =
  | ClassificationReady
  | ClassificationInsufficientData
  | ClassificationUnavailable;

async function fetcher(url: string): Promise<ClassificationResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch expense classification");
  return res.json();
}

export function useExpenseClassification() {
  const { data, error, isLoading, mutate } = useSWR<ClassificationResponse>(
    "/api/v1/expense-classification",
    fetcher,
  );

  return { data, error, isLoading, mutate };
}
```

---

## 10. Testing Strategy

### 10.1 Classification Logic Tests

```
TEST: classifies_housing_as_fixed
GIVEN:
  - A transaction with category HOUSING
  - No recurrence signal
WHEN:
  - classifyTransaction is called
THEN:
  - expenseType is FIXED
  - confidence is HIGH
```

```
TEST: classifies_food_and_drink_as_flexible
GIVEN:
  - A transaction with category FOOD_AND_DRINK
  - No recurrence signal (single occurrence)
WHEN:
  - classifyTransaction is called
THEN:
  - expenseType is FLEXIBLE
```

```
TEST: recurring_flexible_category_overrides_to_fixed
GIVEN:
  - A transaction with category TRANSPORTATION
  - Recurrence signal: isRecurring=true, confidence=HIGH
WHEN:
  - classifyTransaction is called
THEN:
  - expenseType is FIXED
  - confidence is HIGH
```

```
TEST: non_recurring_flexible_stays_flexible
GIVEN:
  - A transaction with category SHOPPING
  - Recurrence signal: isRecurring=false
WHEN:
  - classifyTransaction is called
THEN:
  - expenseType is FLEXIBLE
```

```
TEST: fixed_category_stays_fixed_even_without_recurrence
GIVEN:
  - A transaction with category UTILITIES
  - No recurrence signal (single occurrence in window)
WHEN:
  - classifyTransaction is called
THEN:
  - expenseType is FIXED
  - confidence is HIGH
```

### 10.2 Recurrence Detection Tests

```
TEST: detects_monthly_recurring_with_consistent_amount
GIVEN:
  - 3 transactions from same merchant
  - Dates: Jan 1, Feb 1, Mar 1 (30-day intervals)
  - Amounts: $100.00, $100.00, $100.00
WHEN:
  - detectRecurrence is called
THEN:
  - isRecurring is true
  - confidence is HIGH
```

```
TEST: detects_recurring_with_slight_amount_variation
GIVEN:
  - 3 transactions from same merchant
  - Dates: Jan 5, Feb 3, Mar 6 (29, 31-day intervals)
  - Amounts: $89.99, $92.50, $89.99 (CV ≈ 0.016)
WHEN:
  - detectRecurrence is called
THEN:
  - isRecurring is true
  - confidence is HIGH
```

```
TEST: rejects_recurrence_for_irregular_intervals
GIVEN:
  - 3 transactions from same merchant
  - Dates: Jan 1, Jan 15, Mar 20 (14, 64-day intervals)
  - Amounts: $50.00, $50.00, $50.00
WHEN:
  - detectRecurrence is called
THEN:
  - isRecurring is false
```

```
TEST: rejects_recurrence_for_wildly_varying_amounts
GIVEN:
  - 3 transactions from same merchant
  - Dates: Jan 1, Feb 1, Mar 1
  - Amounts: $20.00, $150.00, $45.00 (CV > 0.5)
WHEN:
  - detectRecurrence is called
THEN:
  - isRecurring is false
```

```
TEST: single_transaction_is_not_recurring
GIVEN:
  - 1 transaction from a merchant
WHEN:
  - detectRecurrence is called
THEN:
  - isRecurring is false
  - confidence is LOW
```

### 10.3 Aggregation Tests

```
TEST: percentages_always_sum_to_100
GIVEN:
  - Fixed total: $2,100
  - Flexible total: $900
WHEN:
  - Percentages computed
THEN:
  - fixedPct is 70
  - flexiblePct is 30
  - fixedPct + flexiblePct equals 100
```

```
TEST: percentages_sum_to_100_with_rounding
GIVEN:
  - Fixed total: $1,000
  - Flexible total: $2,000
WHEN:
  - Percentages computed (33.33% vs 66.67%)
THEN:
  - fixedPct is 33
  - flexiblePct is 67
  - fixedPct + flexiblePct equals 100
```

```
TEST: categories_sorted_by_amount_descending
GIVEN:
  - Fixed categories: Housing=$1400, Utilities=$180, Subscriptions=$120
WHEN:
  - Category breakdown computed
THEN:
  - Order is: Housing, Utilities, Subscriptions
```

```
TEST: monthly_scaling_matches_baseline_approach
GIVEN:
  - 61-day window (days 0-60)
  - Total fixed raw: $4,200 (over 61 days)
WHEN:
  - Monthly scaling applied
THEN:
  - monthlyFixedCents equals round(4200 * 100 / 61 * 30.44) = 209,567 cents
```

```
TEST: no_double_counting_income_and_transfer
GIVEN:
  - 5 transactions: 2 EXPENSE, 1 INCOME, 1 TRANSFER, 1 EXPENSE
WHEN:
  - Classification pipeline runs
THEN:
  - Only 3 EXPENSE transactions are classified
  - Totals sum to exactly those 3 transactions
```

### 10.4 Financial Correctness Tests (CRITICAL)

```
TEST: totals_exactly_match_sum_of_categories
GIVEN:
  - Classification with fixed categories totaling $2,100
  - Classification with flexible categories totaling $900
WHEN:
  - Response is built
THEN:
  - fixed_cents equals sum of all fixed_categories[].amount_cents
  - flexible_cents equals sum of all flexible_categories[].amount_cents
```

```
TEST: all_cents_values_are_integers
GIVEN:
  - Any set of transactions
WHEN:
  - Classification computed
THEN:
  - fixedCents is integer
  - flexibleCents is integer
  - All category amount_cents are integers
  - No floating point values in any financial field
```

### 10.5 User Isolation Tests

```
TEST: classification_scoped_to_user
GIVEN:
  - User A with transactions
  - User B with different transactions
WHEN:
  - Classification computed for User A
THEN:
  - Only User A's transactions are included
  - User B's data is not accessible
```

```
TEST: api_returns_only_authenticated_user_data
GIVEN:
  - User A authenticated
  - User B has classification data
WHEN:
  - GET /api/v1/expense-classification
THEN:
  - Only User A's classification is returned
```

### 10.6 Edge Case Tests

```
TEST: all_spending_is_fixed
GIVEN:
  - All transactions are HOUSING category
WHEN:
  - Classification computed
THEN:
  - fixedPct is 100
  - flexiblePct is 0
  - flexibleCategories is empty array
```

```
TEST: all_spending_is_flexible
GIVEN:
  - All transactions are SHOPPING category
  - None are recurring
WHEN:
  - Classification computed
THEN:
  - fixedPct is 0
  - flexiblePct is 100
  - fixedCategories is empty array
```

```
TEST: insufficient_data_with_short_history
GIVEN:
  - Transactions spanning only 15 days
WHEN:
  - Classification computed
THEN:
  - Status is INSUFFICIENT_DATA
  - No per-transaction classifications applied
```

```
TEST: zero_expense_transactions
GIVEN:
  - User has only INCOME and TRANSFER transactions
WHEN:
  - Classification computed
THEN:
  - Status is INSUFFICIENT_DATA (no expense transactions to classify)
```

### 10.7 Integration Tests

```
TEST: sync_pipeline_triggers_classification
GIVEN:
  - User with connected account
  - Sync job completes with new transactions
WHEN:
  - runSyncPipeline finishes
THEN:
  - ExpenseClassification record exists for user
  - All expense transactions have expenseType set
```

```
TEST: api_recomputes_when_stale
GIVEN:
  - Existing classification computed at T1
  - New transactions created at T2 > T1
WHEN:
  - GET /api/v1/expense-classification
THEN:
  - Classification is recomputed
  - computed_at reflects T2 or later
```

```
TEST: classification_failure_does_not_block_sync
GIVEN:
  - Classification service throws an error
WHEN:
  - runSyncPipeline executes
THEN:
  - Sync job still completes with status COMPLETED
  - Error is logged
```

### 10.8 Test Data Factories

```typescript
function makeExpenseTransaction(overrides: Partial<{
  id: string;
  amountCents: number;
  date: Date;
  category: TransactionCategory;
  displayName: string;
  merchantName: string | null;
  financialAccountId: string;
}> = {}) {
  return {
    id: overrides.id ?? `txn-${Math.random().toString(36).slice(2, 8)}`,
    amountCents: overrides.amountCents ?? 5000,
    date: overrides.date ?? makeDate(45),
    transactionType: "EXPENSE" as const,
    category: overrides.category ?? "FOOD_AND_DRINK",
    displayName: overrides.displayName ?? "Restaurant",
    merchantName: overrides.merchantName ?? "Restaurant",
    financialAccountId: overrides.financialAccountId ?? "acc-1",
    isActive: true,
    pending: false,
  };
}

function makeRecurringGroup(
  merchantName: string,
  category: TransactionCategory,
  amountCents: number,
  count: number,
): ReturnType<typeof makeExpenseTransaction>[] {
  return Array.from({ length: count }, (_, i) =>
    makeExpenseTransaction({
      category,
      amountCents,
      displayName: merchantName,
      merchantName,
      date: makeDate(i * 30), // monthly spacing
    }),
  );
}
```

---

## 11. Acceptance Criteria

### Data Model
- [ ] `ExpenseClassification` model created with all fields
- [ ] `ClassificationStatus`, `ExpenseType`, `ClassificationConfidence` enums created
- [ ] `NormalizedTransaction` updated with `expenseType` and `classificationConfidence` fields
- [ ] Migration runs cleanly

### Classification Service
- [ ] `computeExpenseClassification(userId)` produces correct fixed/flexible breakdown
- [ ] Category default mapping applied correctly for all 10 expense categories
- [ ] Recurrence detection identifies monthly patterns with consistent amounts
- [ ] Recurrence override correctly promotes recurring flexible transactions to fixed
- [ ] Monthly scaling uses same window approach as baseline (90-day window, 30.44 days/month)
- [ ] Percentages always sum to exactly 100
- [ ] Per-category totals sum to their respective fixed/flexible totals
- [ ] All financial values are integers in cents — no floating point

### Sync Pipeline
- [ ] Classification runs after baseline computation in sync pipeline
- [ ] Classification failure does not block sync completion
- [ ] Classification failure is logged with sanitized error

### API
- [ ] `GET /api/v1/expense-classification` returns correct response shapes for all states
- [ ] Authentication enforced
- [ ] User scoping enforced — no cross-user data access
- [ ] Stale classification recomputed on API request
- [ ] Response uses snake_case field names

### Dashboard Integration
- [ ] `ExpenseBreakdownCard` renders when baseline `ready` and classification `ready`
- [ ] Empty state renders when classification unavailable
- [ ] Card not rendered in pre-connection, syncing, or activation states
- [ ] "View Budget →" navigates to `/budget`
- [ ] SWR revalidation works on focus and after sync

### Budget Page Integration
- [ ] Full classification view replaces empty state when data available
- [ ] Overview card shows total, ratio bar, and income-based insight
- [ ] Category cards show per-category amounts sorted descending
- [ ] Falls back to existing empty state when classification unavailable

### Determinism
- [ ] Same transactions always produce the same classification
- [ ] No randomness in recurrence detection or classification
- [ ] Ordering is explicit (by amount descending for categories, by date for recurrence)

---

## 12. Explicit Non-Goals (v1)

- ❌ No user-facing reclassification UI (no override buttons, no drag-to-reclassify)
- ❌ No persistent user overrides stored per-merchant
- ❌ No individual transaction classification visibility in the transactions list
- ❌ No confidence indicators shown in UI
- ❌ No "learning layer" — classification does not improve from user corrections in v1
- ❌ No subscription detection or management (deferred to Pitch 10)
- ❌ No spending trend charts or historical comparison
- ❌ No budget creation, editing, or management workflows
- ❌ No spending recommendations or optimization suggestions
- ❌ No alerts when classification ratios change
- ❌ No AI-driven classification — all rules are deterministic
- ❌ No custom category creation or category merging

---

## 13. Open Questions

- **Subscription ambiguity:** Some subscriptions (e.g., DoorDash DashPass) feel flexible even though they're recurring. In v1, all recurring charges are classified as fixed. The user override system (future) would address this.

- **Category breakdown granularity:** When a category appears in both fixed and flexible (e.g., HEALTH: $200 recurring insurance + $50 one-time pharmacy), it appears in both cards. This is correct behavior but may be visually surprising. The label is the same in both cards — the amounts differ.

- **Trimmed mean for classification:** Baseline uses trimmed mean for spending. Classification uses raw totals scaled to monthly. This is intentional — trimmed mean removes outlier days but classification needs to count every transaction to avoid missing fixed obligations. The totals may not perfectly match the baseline spending figure. This is acceptable and expected.

---

## 14. Future Considerations

- **User overrides (v2):** Allow users to reclassify specific merchants as fixed or flexible. Persist at the merchant level. Override takes precedence over all signals.
- **Confidence-based confirmation (v2):** Surface low-confidence classifications for user review. "Is this a fixed expense?"
- **Subscription detection (Pitch 10):** Build on the recurrence detection engine to identify subscriptions specifically, with cancellation support.
- **Budget Intelligence Engine:** Fixed/flexible breakdown is the foundation for budget suggestions, spending limits, and goal feasibility analysis.
- **Purchase Readiness:** Flexible spending amount feeds into "Can I afford this?" calculations.
- **Goal Planning:** Fixed obligations determine how much income is available for goal contributions.

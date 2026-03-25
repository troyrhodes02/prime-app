---
version: 1.0.0
status: draft
author: claude
last_updated: 2026-03-23
design_doc_reference: "@design-docs/transaction-ingestion-normalization-engine-design-doc.md"
---

# Transaction Ingestion & Normalization Engine — Technical Spec

## 1. Summary

This feature normalizes raw Plaid transactions into a clean, deduplicated, display-ready dataset and surfaces that data through a new Transactions page and an updated dashboard Recent Activity card.

The system gains a `NormalizedTransaction` model — the canonical transaction record for all downstream features. A deterministic normalization pipeline transforms `RawTransaction` records by cleaning merchant names, resolving pending-to-posted transitions, deduplicating, and mapping Plaid categories to a P.R.I.M.E. internal taxonomy. The pipeline runs automatically at the end of each sync job. A new API endpoint serves normalized transactions with account, type, and time-range filters. The dashboard Recent Activity card transitions from an empty state to a live feed of the user's most recent cleaned transactions.

Success is defined as: after account connection and sync completion, the user sees a populated Recent Activity card with recognizable merchant names, can navigate to a dedicated Transactions page with light filtering, and every amount, date, and deduplication result is deterministically correct.

## 2. Problem

The system currently stores raw Plaid transaction data (`RawTransaction`) but does not process, clean, or surface it.

Current limitations:

- Merchant names are raw Plaid strings (e.g., `"TST* STARBUCKS #12345"`, `"AMZN MKTP US*2A1B3C"`)
- No deduplication between pending and posted versions of the same transaction
- No internal category system — only raw Plaid category arrays
- No API to query transactions with filtering
- Dashboard Recent Activity shows a static empty state
- No Transactions page exists
- No "Transactions" entry in the sidebar navigation

Without this, the system cannot:

- Display recognizable transaction history to the user
- Provide correct totals or counts (duplicates inflate numbers)
- Support any downstream feature that depends on clean transaction data (budgets, goals, purchase readiness, spending patterns)

## 3. Core Concepts

### NormalizedTransaction

The canonical transaction record. Created by the normalization pipeline from `RawTransaction` data. This is the entity that all downstream features read.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | Owner — FK to `User.id` |
| `financialAccountId` | `String` | FK to `FinancialAccount.id` |
| `rawTransactionId` | `String` | FK to `RawTransaction.id` — traceability to source |
| `plaidTransactionId` | `String` | Plaid's `transaction_id` — deduplication key |
| `amountCents` | `Int` | Amount in cents. Positive = expense (money out). Negative = income (money in). P.R.I.M.E. convention — inverted from Plaid. |
| `isoCurrencyCode` | `String` | Currency code (default "USD") |
| `date` | `DateTime` | Transaction date (UTC) |
| `displayName` | `String` | Cleaned merchant/transaction name for UI display |
| `originalName` | `String` | Raw name from Plaid — preserved for audit |
| `merchantName` | `String?` | Cleaned merchant name if available |
| `category` | `TransactionCategory` | P.R.I.M.E. internal category enum |
| `transactionType` | `TransactionType` | `INCOME` or `EXPENSE` |
| `pending` | `Boolean` | Whether the transaction is still pending |
| `duplicateOf` | `String?` | If this was a duplicate, ID of the surviving record. Null for active records. |
| `isActive` | `Boolean` | `true` for current records; `false` for superseded pending or duplicates |
| `createdAt` | `DateTime` | Record creation |
| `updatedAt` | `DateTime` | Last modification |

**Ownership:** Every `NormalizedTransaction` is scoped to a `userId`. All queries must include `userId`.

**Key distinction:** `RawTransaction` is the ingestion boundary (Plaid's data, Plaid's conventions). `NormalizedTransaction` is the trust boundary (P.R.I.M.E.'s data, P.R.I.M.E.'s conventions).

### TransactionCategory (P.R.I.M.E. Internal)

A simplified, deterministic category taxonomy mapped from Plaid's raw categories. Not AI-driven.

| Category | Maps from Plaid categories (primary) |
|----------|--------------------------------------|
| `FOOD_AND_DRINK` | "Food and Drink" |
| `SHOPPING` | "Shops", "Shopping" |
| `TRANSPORTATION` | "Travel", "Transportation" |
| `HOUSING` | "Payment", "Rent", "Mortgage" (when detectable) |
| `ENTERTAINMENT` | "Recreation", "Entertainment" |
| `HEALTH` | "Healthcare" |
| `PERSONAL` | "Personal Care", "Service" |
| `INCOME` | "Transfer" (when amount is negative/income), "Payroll" |
| `TRANSFER` | "Transfer" (when amount is positive/expense), "Bank Fees" |
| `UTILITIES` | "Utilities", "Telecom" |
| `SUBSCRIPTIONS` | Matched by `displayName` against a static known-subscription merchant list (e.g., Netflix, Spotify, Apple, Hulu). Applied after Plaid category matching as a name-based override. |
| `UNCATEGORIZED` | All unmatched categories |

### TransactionType

Derived deterministically from the normalized amount:

- `amountCents > 0` → `EXPENSE`
- `amountCents < 0` → `INCOME`
- `amountCents == 0` → `EXPENSE` (zero-amount transactions are treated as expenses — rare edge case)

### Amount Convention

Plaid uses: positive = money out (debit), negative = money in (credit).

P.R.I.M.E. uses the **same convention** for `NormalizedTransaction.amountCents`:
- Positive = expense (money out)
- Negative = income (money in)

This preserves Plaid's raw convention since it is already intuitive for financial display. The `transactionType` field provides a typed accessor without requiring amount sign inspection on the client.

**Display formatting:** The UI inverts the sign for display. Income shows as `+$2,450.00` (green). Expenses show as `-$34.99` (neutral).

## 4. States & Lifecycle

### NormalizedTransaction Lifecycle

```
RawTransaction created (sync pipeline)
    ↓
Normalization pipeline runs
    ↓
NormalizedTransaction created (isActive: true)
    ↓
On re-sync: if pending → posted transition detected
    ↓
Pending record: isActive → false, duplicateOf → posted record ID
Posted record: isActive → true (new or updated)
```

**Active vs Inactive:**

| `isActive` | Meaning |
|------------|---------|
| `true` | Current, visible record. Displayed in UI. Included in totals. |
| `false` | Superseded pending transaction or duplicate. Hidden from UI. Excluded from totals. |

**Deduplication rules:**

1. When a posted transaction arrives with the same `plaidTransactionId` as an existing pending transaction: update the existing record (pending → posted), keep `isActive: true`
2. When a posted transaction arrives and a separate pending record exists for the same merchant + amount + date (within 3 days): mark the pending record `isActive: false`, `duplicateOf` → posted record ID
3. When two posted transactions share the same `plaidTransactionId`: upsert (this is Plaid updating the record, not a real duplicate)

### Normalization Pipeline State

The normalization pipeline is a synchronous, deterministic pass that runs within the sync job. It does not have its own lifecycle model — it executes as part of the existing `SyncStep.ANALYZING` step.

```
SyncStep: RETRIEVING_TRANSACTIONS
    ↓ (transactions stored in RawTransaction)
SyncStep: ANALYZING
    ↓ (normalization pipeline runs)
    ├── Clean merchant names
    ├── Determine transaction type
    ├── Map categories
    ├── Resolve pending/posted duplicates
    ├── Create/update NormalizedTransaction records
    ↓
SyncStep: DONE
```

## 5. UI Integration

### File Structure (New & Modified)

```
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx                        # MODIFIED — swap RecentActivity empty state for live card
│   │   └── transactions/
│   │       └── page.tsx                        # NEW — Transactions page
│   └── api/
│       └── v1/
│           └── transactions/
│               └── route.ts                    # NEW — GET normalized transactions
├── components/
│   ├── recent-activity-card.tsx                # NEW — live transaction preview card
│   ├── transaction-row.tsx                     # NEW — shared transaction row component
│   ├── transaction-filter-bar.tsx              # NEW — account/type/time filter chips
│   ├── transaction-list.tsx                    # NEW — transaction list container with footer
│   ├── transactions-empty-state.tsx            # NEW — context-aware empty state
│   └── layout/
│       └── sidebar.tsx                         # MODIFIED — add Transactions nav item
├── hooks/
│   └── use-transactions.ts                     # NEW — SWR hook for transactions API
├── services/
│   ├── sync.ts                                 # MODIFIED — call normalization after raw transaction storage
│   └── normalization.ts                        # NEW — normalization pipeline
└── lib/
    └── merchant-cleaning.ts                    # NEW — merchant name cleaning rules
```

### Screens

**Screen 1: Dashboard — Recent Activity (Updated)**

- Purpose: Show 5 most recent normalized transactions as trust proof
- Data required: 5 latest `NormalizedTransaction` records where `isActive: true` and `pending: false`
- Actions: "View All" link → navigates to `/transactions`
- Replaces the existing `EmptyStateCard` for Recent Activity when transactions exist
- Falls back to existing empty state when no normalized transactions exist

**Screen 2: Transactions Page (New)**

- Purpose: Full browsable transaction dataset with light filtering
- Data required: Paginated `NormalizedTransaction` records with filter params
- Actions: Account filter, type filter (All/Income/Expense), time filter (30d/90d)
- Empty states: no-accounts, processing, no-filter-results (three distinct states)

**Screen 3: Activation Card — Analysis Complete (Updated)**

- Purpose: Confirm analysis is complete, guide toward financial overview
- Data required: Institution list, account counts (existing)
- Actions: "See Financial Overview" (primary), "Connect Another Account" (secondary), "View transactions" (tertiary text link)
- No transaction counts displayed (already implemented in activation-card.tsx)

### Derived Data Requirements

| Value | Computed Where | When Updated | Inputs |
|-------|---------------|--------------|--------|
| `displayName` | Normalization service | On normalization run | `RawTransaction.name`, `RawTransaction.merchantName` |
| `transactionType` | Normalization service | On normalization run | `amountCents` sign |
| `category` | Normalization service | On normalization run | Plaid `category[]` + merchant name |
| `isActive` | Normalization service | On normalization / re-sync | Deduplication rules |
| Filtered transaction count | API (count query) | Per request | Filter params + `isActive: true` |
| Dashboard recent transactions | API | On page load / SWR revalidation | 5 most recent active, non-pending |

## 6. Data Model

### Relationship to Existing Schema

| From | Relation | To | Description |
|------|----------|-----|-------------|
| `User` | 1:N | `NormalizedTransaction` | User owns normalized transactions |
| `FinancialAccount` | 1:N | `NormalizedTransaction` | Transactions belong to an account |
| `RawTransaction` | 1:1 | `NormalizedTransaction` | Each normalized record traces to a raw source |
| `NormalizedTransaction` | self-ref | `NormalizedTransaction` | `duplicateOf` points to the surviving record |

### New Entities

```prisma
model NormalizedTransaction {
  id                  String              @id @default(cuid())
  userId              String
  financialAccountId  String
  rawTransactionId    String              @unique
  plaidTransactionId  String
  amountCents         Int
  isoCurrencyCode     String              @default("USD")
  date                DateTime
  displayName         String
  originalName        String
  merchantName        String?
  category            TransactionCategory @default(UNCATEGORIZED)
  transactionType     TransactionType
  pending             Boolean             @default(false)
  duplicateOf         String?
  isActive            Boolean             @default(true)

  user    User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  account FinancialAccount @relation(fields: [financialAccountId], references: [id], onDelete: Cascade)
  rawTransaction RawTransaction @relation(fields: [rawTransactionId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, date])
  @@index([userId, isActive, date])
  @@index([financialAccountId])
  @@index([plaidTransactionId])
}
```

### New Enums

```prisma
enum TransactionCategory {
  FOOD_AND_DRINK
  SHOPPING
  TRANSPORTATION
  HOUSING
  ENTERTAINMENT
  HEALTH
  PERSONAL
  INCOME
  TRANSFER
  UTILITIES
  SUBSCRIPTIONS
  UNCATEGORIZED
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

### Required Updates to Existing Models

```prisma
model User {
  // existing fields...

  // NEW
  normalizedTransactions NormalizedTransaction[]
}

model FinancialAccount {
  // existing fields...

  // existing: transactions RawTransaction[]

  // NEW
  normalizedTransactions NormalizedTransaction[]
}

model RawTransaction {
  // existing fields...

  // NEW
  normalizedTransaction NormalizedTransaction?
}
```

### Data Integrity Rules

- `NormalizedTransaction.rawTransactionId` must be unique — one normalized record per raw record
- `NormalizedTransaction.plaidTransactionId` is NOT unique — multiple normalized records may reference the same Plaid transaction (pending + posted), but only one should be `isActive: true`
- All records must have a `userId` — enforced at application layer and FK constraints
- `amountCents` must be an integer — no floating point
- `displayName` must never be empty — fallback to `originalName` if cleaning produces empty string
- `category` must have a value — fallback to `UNCATEGORIZED`
- `transactionType` must be consistent with `amountCents` sign
- `isoCurrencyCode` must be `"USD"` — non-USD `RawTransaction` records are skipped by the normalization pipeline and never produce a `NormalizedTransaction`
- Composite index on `[userId, isActive, date]` is the primary query path for the transaction list API

## 7. Data Processing & Logic

### Normalization Pipeline

The pipeline runs deterministically during the `ANALYZING` step of the sync job. It processes all `RawTransaction` records for the given `PlaidItem` that do not yet have a corresponding `NormalizedTransaction`.

```typescript
// src/services/normalization.ts

export async function runNormalizationPipeline(
  userId: string,
  plaidItemId: string,
  tx: PrismaClient,
): Promise<NormalizationResult> {
  // 1. Find all raw transactions for this item that need normalization.
  //    Only USD transactions are processed. Non-USD records are skipped
  //    and will never receive a NormalizedTransaction.
  const rawTransactions = await tx.rawTransaction.findMany({
    where: {
      userId,
      account: { plaidItemId },
      normalizedTransaction: null, // not yet normalized
      isoCurrencyCode: "USD",      // USD only
    },
    include: { account: true },
  });

  let created = 0;
  let duplicatesResolved = 0;

  for (const raw of rawTransactions) {
    // 2. Clean merchant name
    const displayName = cleanMerchantName(raw.name, raw.merchantName);

    // 3. Determine amount (preserve Plaid convention)
    const amountCents = raw.amountCents;

    // 4. Determine transaction type
    const transactionType = amountCents < 0 ? "INCOME" : "EXPENSE";

    // 5. Map category
    const category = mapCategory(raw.category, transactionType, displayName);

    // 6. Check for pending → posted deduplication
    const duplicateResult = await resolveDuplicate(
      tx,
      userId,
      raw,
      amountCents,
      displayName,
    );

    if (duplicateResult.isDuplicate) {
      duplicatesResolved++;
    }

    // 7. Create normalized record
    await tx.normalizedTransaction.create({
      data: {
        userId,
        financialAccountId: raw.financialAccountId,
        rawTransactionId: raw.id,
        plaidTransactionId: raw.plaidTransactionId,
        amountCents,
        isoCurrencyCode: raw.isoCurrencyCode ?? "USD",
        date: raw.date,
        displayName,
        originalName: raw.name,
        merchantName: raw.merchantName ?? null,
        category,
        transactionType,
        pending: raw.pending,
        isActive: !duplicateResult.isDuplicate,
        duplicateOf: duplicateResult.survivorId ?? null,
      },
    });

    created++;
  }

  return { created, duplicatesResolved };
}
```

### Merchant Name Cleaning

Deterministic, rule-based cleaning. No AI. The goal is recognizable merchant names, not perfection.

```typescript
// src/lib/merchant-cleaning.ts

export function cleanMerchantName(
  rawName: string,
  plaidMerchantName: string | null | undefined,
): string {
  // 1. Prefer Plaid's merchantName when available — it is already cleaned
  if (plaidMerchantName && plaidMerchantName.trim().length > 0) {
    return plaidMerchantName.trim();
  }

  let name = rawName.trim();

  // 2. Remove common prefixes (POS, TST*, SQ*, etc.)
  name = name.replace(/^(TST\*|SQ\s*\*|SP\s*\*|POS\s+|CHK\s+|ACH\s+|ORIG\s+)/i, "").trim();

  // 3. Remove trailing transaction IDs and reference numbers
  name = name.replace(/\s*#\d{3,}$/i, "").trim();
  name = name.replace(/\s*\*[A-Z0-9]{4,}$/i, "").trim();

  // 4. Remove trailing location suffixes (city/state patterns)
  name = name.replace(/\s+\d{5}(-\d{4})?\s*$/, "").trim(); // ZIP codes
  name = name.replace(/\s+[A-Z]{2}\s*$/, "").trim(); // state abbreviations at end

  // 5. Title case if all uppercase
  if (name === name.toUpperCase() && name.length > 2) {
    name = name
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // 6. Fallback — never return empty
  if (name.length === 0) {
    return rawName.trim();
  }

  return name;
}
```

**Known limitations (acceptable for v1):**

- May not perfectly clean all merchant formats
- Some names will remain partially raw
- This is documented in the pitch as "can be imperfect" for merchant naming

### Category Mapping

```typescript
const PLAID_CATEGORY_MAP: Record<string, TransactionCategory> = {
  "Food and Drink": "FOOD_AND_DRINK",
  "Restaurants": "FOOD_AND_DRINK",
  "Coffee Shop": "FOOD_AND_DRINK",
  "Shops": "SHOPPING",
  "Shopping": "SHOPPING",
  "Travel": "TRANSPORTATION",
  "Transportation": "TRANSPORTATION",
  "Taxi": "TRANSPORTATION",
  "Airlines and Aviation Services": "TRANSPORTATION",
  "Gas Stations": "TRANSPORTATION",
  "Payment": "HOUSING",
  "Rent": "HOUSING",
  "Mortgage": "HOUSING",
  "Recreation": "ENTERTAINMENT",
  "Entertainment": "ENTERTAINMENT",
  "Arts and Entertainment": "ENTERTAINMENT",
  "Healthcare": "HEALTH",
  "Pharmacies": "HEALTH",
  "Personal Care": "PERSONAL",
  "Service": "PERSONAL",
  "Gyms and Fitness Centers": "PERSONAL",
  "Transfer": "TRANSFER",
  "Bank Fees": "TRANSFER",
  "Interest": "TRANSFER",
  "Deposit": "INCOME",
  "Payroll": "INCOME",
  "Utilities": "UTILITIES",
  "Telecommunication Services": "UTILITIES",
  "Internet Services": "UTILITIES",
};

// Known subscription merchants — matched against cleaned displayName (case-insensitive).
// Add new entries here as needed. This is a static list; no AI or inference.
const KNOWN_SUBSCRIPTION_MERCHANTS = new Set([
  "netflix",
  "spotify",
  "hulu",
  "disney+",
  "disney plus",
  "apple",
  "apple music",
  "apple tv+",
  "apple tv plus",
  "apple one",
  "amazon prime",
  "amazon music",
  "youtube premium",
  "youtube tv",
  "hbo max",
  "max",
  "peacock",
  "paramount+",
  "paramount plus",
  "discovery+",
  "discovery plus",
  "espn+",
  "espn plus",
  "audible",
  "kindle unlimited",
  "xbox game pass",
  "playstation plus",
  "nintendo switch online",
  "adobe",
  "microsoft 365",
  "microsoft office",
  "google one",
  "dropbox",
  "icloud",
  "lastpass",
  "1password",
  "duolingo",
  "calm",
  "headspace",
  "crunchyroll",
  "funimation",
  "sirius xm",
  "siriusxm",
  "pandora",
  "tidal",
  "deezer",
  "linkedin premium",
  "notion",
  "grammarly",
]);

export function mapCategory(
  plaidCategories: string[],
  transactionType: TransactionType,
  displayName: string,
): TransactionCategory {
  // 1. Income override — if transaction type is income, classify as INCOME
  //    regardless of Plaid category (unless it's a transfer refund)
  if (transactionType === "INCOME") {
    return "INCOME";
  }

  // 2. Subscription detection — check displayName against known merchant list.
  //    Runs before Plaid category matching so streaming/software services are
  //    correctly classified even when Plaid categorizes them as "Shopping".
  const nameLower = displayName.toLowerCase();
  if (KNOWN_SUBSCRIPTION_MERCHANTS.has(nameLower)) {
    return "SUBSCRIPTIONS";
  }

  // 3. Match Plaid categories (check each level, most specific first)
  for (const cat of [...plaidCategories].reverse()) {
    const mapped = PLAID_CATEGORY_MAP[cat];
    if (mapped) return mapped;
  }

  // 4. Fallback
  return "UNCATEGORIZED";
}
```

### Pending/Posted Deduplication

```typescript
interface DuplicateResult {
  isDuplicate: boolean;
  survivorId: string | null;
}

async function resolveDuplicate(
  tx: PrismaClient,
  userId: string,
  raw: RawTransaction,
  amountCents: number,
  displayName: string,
): Promise<DuplicateResult> {
  // Case 1: This is a posted transaction — check if a pending version exists
  if (!raw.pending) {
    // Look for an active pending NormalizedTransaction with same plaidTransactionId
    const pendingVersion = await tx.normalizedTransaction.findFirst({
      where: {
        userId,
        plaidTransactionId: raw.plaidTransactionId,
        pending: true,
        isActive: true,
      },
    });

    if (pendingVersion) {
      // Mark the pending version as superseded
      await tx.normalizedTransaction.update({
        where: { id: pendingVersion.id },
        data: { isActive: false },
        // duplicateOf will be set to the new posted record's ID after creation
      });
      return { isDuplicate: false, survivorId: null };
    }

    // Fuzzy match: same account + same amount + date within 3 days + pending
    const fuzzyPending = await tx.normalizedTransaction.findFirst({
      where: {
        userId,
        financialAccountId: raw.financialAccountId,
        amountCents,
        pending: true,
        isActive: true,
        date: {
          gte: new Date(raw.date.getTime() - 3 * 24 * 60 * 60 * 1000),
          lte: new Date(raw.date.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (fuzzyPending) {
      await tx.normalizedTransaction.update({
        where: { id: fuzzyPending.id },
        data: { isActive: false },
      });
      return { isDuplicate: false, survivorId: null };
    }
  }

  // Case 2: This is a pending transaction — check if a posted version already exists
  if (raw.pending) {
    const postedVersion = await tx.normalizedTransaction.findFirst({
      where: {
        userId,
        plaidTransactionId: raw.plaidTransactionId,
        pending: false,
        isActive: true,
      },
    });

    if (postedVersion) {
      // Pending arrives after posted — mark pending as duplicate
      return { isDuplicate: true, survivorId: postedVersion.id };
    }
  }

  return { isDuplicate: false, survivorId: null };
}
```

### Integration with Sync Pipeline

The normalization pipeline runs within the existing `ANALYZING` step of `runSyncPipeline` in `src/services/sync.ts`.

```typescript
// In sync.ts — runSyncPipeline, replace the bare ANALYZING step:

// Step 3: ANALYZING — run normalization pipeline
await prisma.syncJob.update({
  where: { id: syncJobId },
  data: { step: "ANALYZING" },
});

const normResult = await prisma.$transaction(async (tx) => {
  return runNormalizationPipeline(syncJob.userId, syncJob.plaidItemId, tx as PrismaClient);
});

// Step 4: DONE
await prisma.syncJob.update({
  where: { id: syncJobId },
  data: {
    step: "DONE",
    status: "COMPLETED",
    completedAt: new Date(),
    transactionsSynced,
  },
});
```

### Update Behavior

- Normalization runs on every sync (initial + refresh)
- On refresh syncs, only `RawTransaction` records without a `NormalizedTransaction` are processed
- Pending → posted transitions are resolved on each run
- `NormalizedTransaction` records are never deleted — only marked `isActive: false`
- No caching — queries always read from the database

## 8. API Surface

### Authentication

All endpoints require an authenticated Supabase session. User resolved via `supabaseId` lookup. Same pattern as existing endpoints.

---

### List Normalized Transactions

```
GET /api/v1/transactions
```

Returns normalized, active transactions for the authenticated user with filtering support.

Query Parameters:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `accountId` | `string` | `undefined` (all) | Filter by `financialAccountId` |
| `type` | `string` | `"all"` | `"all"`, `"income"`, or `"expense"` |
| `days` | `number` | `30` | Time window: `30` or `90` |

Response (200):

```json
{
  "transactions": [
    {
      "id": "cuid_xxx",
      "amount_cents": 4299,
      "iso_currency_code": "USD",
      "date": "2026-03-22T00:00:00.000Z",
      "display_name": "Starbucks",
      "original_name": "TST* STARBUCKS #12345",
      "merchant_name": "Starbucks",
      "category": "FOOD_AND_DRINK",
      "transaction_type": "EXPENSE",
      "pending": false,
      "account": {
        "id": "cuid_aaa",
        "name": "Total Checking",
        "type": "DEPOSITORY",
        "mask": "4829"
      }
    }
  ],
  "total": 642,
  "filtered_count": 128
}
```

- `total`: count of all active normalized transactions for the user (unfiltered)
- `filtered_count`: count matching the current filters
- Sorted by `date` descending, then `amountCents` descending (absolute value) for same-date stability
- Only `isActive: true` records returned
- Pending transactions included (with `pending: true` flag)

**Filtering logic:**

```typescript
const where: Prisma.NormalizedTransactionWhereInput = {
  userId: user.id,
  isActive: true,
  date: {
    gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  },
};

if (accountId) {
  where.financialAccountId = accountId;
}

if (type === "income") {
  where.transactionType = "INCOME";
} else if (type === "expense") {
  where.transactionType = "EXPENSE";
}
```

**Sorting:**

```typescript
const orderBy = [
  { date: "desc" as const },
  { amountCents: "desc" as const },
];
```

Error (401): Unauthorized
Error (400): `validation_error` — invalid `type` or `days` value

---

### Get Recent Transactions (Dashboard)

```
GET /api/v1/transactions/recent
```

Returns the 5 most recent non-pending normalized transactions for the dashboard preview.

Response (200):

```json
{
  "transactions": [
    {
      "id": "cuid_xxx",
      "amount_cents": 4299,
      "iso_currency_code": "USD",
      "date": "2026-03-22T00:00:00.000Z",
      "display_name": "Starbucks",
      "transaction_type": "EXPENSE",
      "pending": false,
      "account": {
        "id": "cuid_aaa",
        "name": "Total Checking",
        "type": "DEPOSITORY",
        "mask": "4829"
      }
    }
  ]
}
```

- Max 5 records
- Only `isActive: true`, `pending: false`
- Sorted by `date` descending, then `amountCents` descending
- Lighter response shape (no `original_name`, `merchant_name`, `category`)

Error (401): Unauthorized

---

### List Accounts (for filter dropdown)

The existing `GET /api/v1/accounts` endpoint already returns the data needed for the Transactions page account filter dropdown. No changes required.

---

### Standard Error Format

Same as existing:

```json
{
  "error": "error_code",
  "message": "Human readable description"
}
```

## 9. Client-Side Data Fetching

### useTransactions Hook

```typescript
// src/hooks/use-transactions.ts

interface UseTransactionsParams {
  accountId?: string;
  type?: "all" | "income" | "expense";
  days?: 30 | 90;
}

export function useTransactions(params: UseTransactionsParams = {}) {
  const { accountId, type = "all", days = 30 } = params;

  const searchParams = new URLSearchParams();
  if (accountId) searchParams.set("accountId", accountId);
  if (type !== "all") searchParams.set("type", type);
  searchParams.set("days", String(days));

  const key = `/api/v1/transactions?${searchParams.toString()}`;

  return useSWR<TransactionsResponse>(key, fetcher, {
    revalidateOnFocus: true,
  });
}
```

### useRecentTransactions Hook

```typescript
// src/hooks/use-recent-transactions.ts

export function useRecentTransactions() {
  return useSWR<RecentTransactionsResponse>(
    "/api/v1/transactions/recent",
    fetcher,
    { revalidateOnFocus: true },
  );
}
```

### Sidebar Modification

Add "Transactions" to the `NAV_ITEMS` array in `src/components/layout/sidebar.tsx`, positioned after Dashboard:

```typescript
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardOutlined },
  { href: "/transactions", label: "Transactions", icon: ReceiptLongOutlined }, // NEW
  { href: "/budget", label: "Budget", icon: AccountBalanceWalletOutlined },
  { href: "/goals", label: "Goals", icon: FlagOutlined },
  { href: "/purchases", label: "Purchases", icon: ShoppingCartOutlined },
];
```

### Dashboard Integration

In `src/app/(app)/dashboard/page.tsx`, the Recent Activity section:

- When `useRecentTransactions()` returns transactions: render `RecentActivityCard`
- When no transactions: retain existing `EmptyStateCard`
- Error from API: silently fall back to empty state (dashboard should not break if one section fails)

### Filter State Management

On the Transactions page, filter state is managed with URL search params for back-button support:

```typescript
const searchParams = useSearchParams();
const router = useRouter();

const accountId = searchParams.get("accountId") ?? undefined;
const type = (searchParams.get("type") ?? "all") as "all" | "income" | "expense";
const days = Number(searchParams.get("days") ?? 30) as 30 | 90;

function updateFilter(key: string, value: string) {
  const params = new URLSearchParams(searchParams.toString());
  if (value === "all" || value === "30") {
    params.delete(key);
  } else {
    params.set(key, value);
  }
  router.replace(`/transactions?${params.toString()}`);
}
```

## 10. Testing Strategy

### Happy Path

```
TEST: normalization_pipeline_creates_normalized_transactions
GIVEN:
  - User has 10 RawTransaction records from completed sync
  - No NormalizedTransaction records exist
WHEN:
  - runNormalizationPipeline executes
THEN:
  - 10 NormalizedTransaction records created
  - All records have isActive: true
  - All records have userId matching the user
  - displayName is cleaned (not raw Plaid string)
  - transactionType is correct based on amountCents sign
  - category is mapped from Plaid categories
```

```
TEST: transactions_api_returns_filtered_results
GIVEN:
  - User has 100 active NormalizedTransactions
  - 20 are INCOME, 80 are EXPENSE
  - 60 are within last 30 days, 100 within last 90 days
WHEN:
  - GET /api/v1/transactions?type=income&days=30
THEN:
  - Response contains only INCOME transactions from last 30 days
  - filtered_count matches actual count
  - total reflects all 100 active transactions
  - Sorted by date descending
```

```
TEST: recent_transactions_returns_5_latest
GIVEN:
  - User has 50 active, non-pending NormalizedTransactions
WHEN:
  - GET /api/v1/transactions/recent
THEN:
  - Response contains exactly 5 transactions
  - All are non-pending
  - Sorted by date descending
  - Response includes account name, type, mask
```

```
TEST: dashboard_recent_activity_renders_transactions
GIVEN:
  - useRecentTransactions returns 5 transactions
WHEN:
  - Dashboard page renders
THEN:
  - RecentActivityCard displayed (not EmptyStateCard)
  - 5 transaction rows visible with merchant name, amount, date, account
  - "View All" link present, navigating to /transactions
  - Income amounts show green with + prefix
  - Expense amounts show neutral color with - prefix
```

### Merchant Name Cleaning

```
TEST: cleans_common_pos_prefixes
GIVEN:
  - rawName: "TST* STARBUCKS #12345"
  - merchantName: null
WHEN:
  - cleanMerchantName runs
THEN:
  - Returns "Starbucks"
```

```
TEST: prefers_plaid_merchant_name
GIVEN:
  - rawName: "AMZN MKTP US*2A1B3C"
  - merchantName: "Amazon"
WHEN:
  - cleanMerchantName runs
THEN:
  - Returns "Amazon"
```

```
TEST: title_cases_all_uppercase_names
GIVEN:
  - rawName: "WHOLE FOODS MARKET"
  - merchantName: null
WHEN:
  - cleanMerchantName runs
THEN:
  - Returns "Whole Foods Market"
```

```
TEST: never_returns_empty_string
GIVEN:
  - rawName: "TST*"
  - merchantName: null
WHEN:
  - cleanMerchantName runs (prefix removal yields empty)
THEN:
  - Returns "TST*" (original fallback)
```

### Deduplication

```
TEST: posted_supersedes_pending_by_plaid_id
GIVEN:
  - Pending NormalizedTransaction exists with plaidTransactionId "txn_123", isActive: true
  - New RawTransaction arrives: plaidTransactionId "txn_123", pending: false
WHEN:
  - Normalization pipeline runs
THEN:
  - Pending record: isActive → false
  - New posted record: isActive → true
  - Net active count unchanged (one transaction, not two)
```

```
TEST: fuzzy_dedup_matches_same_amount_within_3_days
GIVEN:
  - Pending NormalizedTransaction: account A, amountCents 4299, date Mar 20, isActive: true
  - New posted RawTransaction: account A, amountCents 4299, date Mar 22, different plaidTransactionId
WHEN:
  - Normalization pipeline runs
THEN:
  - Pending record: isActive → false
  - Posted record: isActive → true
```

```
TEST: fuzzy_dedup_does_not_match_different_amounts
GIVEN:
  - Pending NormalizedTransaction: account A, amountCents 4299, date Mar 20
  - New posted RawTransaction: account A, amountCents 4300, date Mar 21
WHEN:
  - Normalization pipeline runs
THEN:
  - Both records isActive: true (no dedup — amounts differ)
```

```
TEST: fuzzy_dedup_does_not_match_beyond_3_days
GIVEN:
  - Pending NormalizedTransaction: account A, amountCents 4299, date Mar 15
  - New posted RawTransaction: account A, amountCents 4299, date Mar 22
WHEN:
  - Normalization pipeline runs
THEN:
  - Both records isActive: true (no dedup — outside 3-day window)
```

### Category Mapping

```
TEST: maps_food_and_drink_category
GIVEN:
  - Plaid categories: ["Food and Drink", "Restaurants", "Coffee Shop"]
  - transactionType: EXPENSE
WHEN:
  - mapCategory runs
THEN:
  - Returns FOOD_AND_DRINK
```

```
TEST: income_overrides_plaid_category
GIVEN:
  - Plaid categories: ["Transfer", "Deposit"]
  - transactionType: INCOME
WHEN:
  - mapCategory runs
THEN:
  - Returns INCOME (not TRANSFER)
```

```
TEST: unmapped_category_returns_uncategorized
GIVEN:
  - Plaid categories: ["Something Unknown"]
  - transactionType: EXPENSE
WHEN:
  - mapCategory runs
THEN:
  - Returns UNCATEGORIZED
```

```
TEST: subscription_merchant_overrides_plaid_category
GIVEN:
  - Plaid categories: ["Shops", "Digital Purchase"]
  - transactionType: EXPENSE
  - displayName: "Netflix"
WHEN:
  - mapCategory runs
THEN:
  - Returns SUBSCRIPTIONS (name match takes priority over Plaid "Shopping" category)
```

```
TEST: subscription_detection_is_case_insensitive
GIVEN:
  - displayName: "SPOTIFY"
  - transactionType: EXPENSE
WHEN:
  - mapCategory runs
THEN:
  - Returns SUBSCRIPTIONS
```

```
TEST: non_subscription_merchant_not_misclassified
GIVEN:
  - Plaid categories: ["Shops"]
  - transactionType: EXPENSE
  - displayName: "Target"
WHEN:
  - mapCategory runs
THEN:
  - Returns SHOPPING (not SUBSCRIPTIONS — "Target" not in known list)
```

### Financial Correctness

```
TEST: amount_cents_preserved_exactly
GIVEN:
  - RawTransaction.amountCents = 4299
WHEN:
  - Normalized
THEN:
  - NormalizedTransaction.amountCents = 4299
  - No rounding, no conversion, exact integer match
```

```
TEST: transaction_type_matches_amount_sign
GIVEN:
  - RawTransaction.amountCents = 4299 (positive — expense)
  - RawTransaction.amountCents = -245000 (negative — income)
WHEN:
  - Normalized
THEN:
  - First: transactionType = EXPENSE
  - Second: transactionType = INCOME
  - Types are deterministic from amount sign
```

```
TEST: total_count_excludes_inactive_duplicates
GIVEN:
  - 100 RawTransactions with 5 pending→posted duplicates resolved
WHEN:
  - GET /api/v1/transactions
THEN:
  - total = 95 (100 - 5 deactivated pending records)
  - All returned records have isActive: true
```

### User Isolation

```
TEST: user_cannot_see_other_users_transactions
GIVEN:
  - User A has 50 NormalizedTransactions
  - User B has 20 NormalizedTransactions
WHEN:
  - User B calls GET /api/v1/transactions
THEN:
  - Response contains only User B's 20 transactions
  - User A's transactions never returned
```

```
TEST: user_cannot_filter_by_other_users_account
GIVEN:
  - User A has account "acct_a"
  - User B is authenticated
WHEN:
  - User B calls GET /api/v1/transactions?accountId=acct_a
THEN:
  - Response contains 0 transactions (filter finds nothing for User B)
  - No error — empty result, not forbidden
```

### Edge Cases

```
TEST: handles_zero_transactions_after_sync
GIVEN:
  - Sync completes with 0 RawTransactions
WHEN:
  - Normalization pipeline runs
THEN:
  - No NormalizedTransactions created
  - Pipeline completes without error
  - Dashboard shows empty state
```

```
TEST: handles_all_pending_transactions
GIVEN:
  - All 20 RawTransactions are pending: true
WHEN:
  - Normalization and API call
THEN:
  - 20 NormalizedTransactions created with pending: true
  - GET /api/v1/transactions returns all 20 (pending included)
  - GET /api/v1/transactions/recent returns 0 (pending excluded from dashboard)
```

```
TEST: re_sync_only_normalizes_new_transactions
GIVEN:
  - First sync: 50 RawTransactions → 50 NormalizedTransactions
  - Refresh sync: 60 RawTransactions (50 existing + 10 new)
WHEN:
  - Normalization pipeline runs on refresh
THEN:
  - Only 10 new NormalizedTransactions created
  - Original 50 unchanged
  - Total active: 60
```

```
TEST: non_usd_transactions_skipped_during_normalization
GIVEN:
  - User has 10 RawTransactions: 8 with isoCurrencyCode "USD", 2 with "EUR"
WHEN:
  - runNormalizationPipeline executes
THEN:
  - 8 NormalizedTransactions created (USD only)
  - The 2 EUR RawTransactions have no corresponding NormalizedTransaction
  - Pipeline completes without error
```

```
TEST: invalid_days_param_returns_400
GIVEN:
  - Authenticated user
WHEN:
  - GET /api/v1/transactions?days=999
THEN:
  - Returns 400 validation_error
  - Message indicates days must be 30 or 90
```

### Test Data Factories

```typescript
function createTestNormalizedTransaction(
  overrides?: Partial<NormalizedTransaction>,
) {
  return {
    id: "norm-txn-test",
    userId: "user-test",
    financialAccountId: "account-test",
    rawTransactionId: "raw-txn-test",
    plaidTransactionId: "txn_plaid_123",
    amountCents: 4299,
    isoCurrencyCode: "USD",
    date: new Date("2026-03-22"),
    displayName: "Starbucks",
    originalName: "TST* STARBUCKS #12345",
    merchantName: "Starbucks",
    category: "FOOD_AND_DRINK" as TransactionCategory,
    transactionType: "EXPENSE" as TransactionType,
    pending: false,
    duplicateOf: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestRawTransactionForNormalization(
  overrides?: Partial<RawTransaction>,
) {
  return {
    id: "raw-txn-test",
    userId: "user-test",
    financialAccountId: "account-test",
    plaidTransactionId: "txn_plaid_123",
    amountCents: 4299,
    isoCurrencyCode: "USD",
    date: new Date("2026-03-22"),
    authorizedDate: null,
    name: "TST* STARBUCKS #12345",
    merchantName: "Starbucks",
    category: ["Food and Drink", "Restaurants", "Coffee Shop"],
    pending: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

## 11. Acceptance Criteria

### 1. Normalization Pipeline
- [ ] Pipeline runs during ANALYZING step of sync
- [ ] All RawTransactions produce corresponding NormalizedTransactions
- [ ] Merchant names are cleaned and recognizable
- [ ] Categories mapped from Plaid categories to P.R.I.M.E. taxonomy
- [ ] Known subscription merchants detected by display name and classified as SUBSCRIPTIONS
- [ ] Non-USD transactions skipped (no NormalizedTransaction created)
- [ ] Transaction type (INCOME/EXPENSE) derived from amount sign
- [ ] Amounts stored as exact integers in cents
- [ ] Same input always produces same output (deterministic)

### 2. Deduplication
- [ ] Pending → posted transitions resolved correctly
- [ ] Pending records marked isActive: false when posted version arrives
- [ ] Fuzzy matching deduplicates by account + amount + 3-day window
- [ ] No false positives on fuzzy matching (different amounts or >3 days are not deduped)
- [ ] Active transaction count excludes duplicates

### 3. Transactions API
- [ ] GET /api/v1/transactions returns active normalized transactions
- [ ] Account filter works correctly
- [ ] Type filter (income/expense/all) works correctly
- [ ] Time filter (30d/90d) works correctly
- [ ] Sorted by date descending with stable secondary sort
- [ ] Response includes total and filtered_count
- [ ] GET /api/v1/transactions/recent returns max 5 non-pending transactions
- [ ] All endpoints enforce user scoping

### 4. Dashboard Integration
- [ ] Recent Activity card shows 5 latest cleaned transactions when available
- [ ] "View All" link navigates to /transactions
- [ ] Income amounts display in green with + prefix
- [ ] Empty state maintained when no transactions exist
- [ ] API errors fall back to empty state silently

### 5. Transactions Page
- [ ] /transactions route exists and is accessible
- [ ] Transactions nav item added to sidebar (after Dashboard)
- [ ] Filter bar with account dropdown, type chips, time chips
- [ ] Transaction list with merchant, amount, date, account columns
- [ ] Pending transactions display with "Pending" badge
- [ ] Footer shows filtered vs total count
- [ ] Three distinct empty states (no accounts, processing, no filter results)
- [ ] Trust label displayed above transaction card
- [ ] Filter state persisted in URL params

### 6. Activation Card
- [ ] Primary CTA is "See Financial Overview" (not transaction-focused)
- [ ] "View transactions" is tertiary text link
- [ ] No raw transaction counts displayed
- [ ] Institution rows say "Analyzed" not "Synced"

### 7. Security & Isolation
- [ ] All API queries include userId
- [ ] No cross-user transaction access
- [ ] No sensitive data in API responses
- [ ] No financial data in logs

## 12. Explicit Non-Goals (v1)

- No category filters on the Transactions page (deferred)
- No transaction editing or manual categorization
- No advanced search or text filtering
- No multi-filter combination logic
- No charts, graphs, or spending visualizations
- No transaction detail view or drill-down modal
- No CSV/PDF export
- No infinite scroll or server-side pagination (full filtered set returned; acceptable for 90-day window)
- No recurring transaction detection (deferred to future pitch)
- No spending pattern analysis
- No AI-based merchant classification
- No notification badges for new transactions
- No transaction grouping
- No budget integration from transaction data
- No balance calculations from transaction sums (balances come from Plaid balance API)

## 13. Decisions

- `Subscription detection` — **Resolved:** Implemented via a static `KNOWN_SUBSCRIPTION_MERCHANTS` set matched against `displayName` (case-insensitive). Applied before Plaid category matching. List is additive — new merchants can be added without schema changes.
- `Currency handling` — **Resolved:** USD only. Non-USD `RawTransaction` records are silently skipped by the normalization pipeline and never produce a `NormalizedTransaction`. No multi-currency support in v1.
- `Re-normalization` — **Resolved:** No re-processing of existing records. Only `RawTransaction` records without a `NormalizedTransaction` are processed on each pipeline run. If cleaning rules improve, new syncs will pick up new transactions with improved rules; historical records retain their original normalized output.

## 14. Future Considerations

- **Recurring detection** — Use NormalizedTransaction data to detect recurring charges (subscriptions, bills, income patterns). This feeds into budgeting and safe-to-spend.
- **Category refinement** — User-corrected categories, category splitting, sub-categories.
- **Search** — Full-text search across displayName and merchantName.
- **Pagination** — Server-side cursor pagination for users with high transaction volumes.
- **Transaction grouping** — Group by merchant, date, or category for summary views.
- **Anomaly detection** — Flag unusual transactions based on historical patterns.
- **Balance reconciliation** — Cross-reference transaction sums with Plaid balance API to detect sync gaps.
- **Incremental normalization** — Process transactions as they arrive via webhooks rather than batch during sync.

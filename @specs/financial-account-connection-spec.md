---
version: 1.0.0
status: review
author: claude
last_updated: 2026-03-22
design_doc_reference: "design-docs/financial-account-connection-initial-financial-activation-design-doc.md"
---

# Financial Account Connection & Initial Financial Activation — Technical Spec

## 1. Summary

This feature connects the user's financial accounts via Plaid, securely stores connection credentials, triggers an initial data sync (balances + transaction history), and transitions the dashboard through a guided activation flow from empty state to "financial profile ready."

The system gains the ability to hold real financial account data. New models (`PlaidItem`, `FinancialAccount`) represent the Plaid connection and individual accounts. A `SyncJob` model tracks the async ingestion lifecycle. The backend exchanges Plaid tokens, persists account metadata, fetches initial balances and transactions, and exposes sync status for the frontend to poll.

Success is defined as: a user completes the Plaid Link flow, the backend securely stores the access token, creates account records from Plaid metadata, triggers an initial sync that fetches balances and transactions, the frontend reflects real-time sync progress, and the dashboard transitions to a "connected" state — all without exposing raw financial data or implying premature insights.

## 2. Problem

The system currently has:

- Authenticated users with provisioned tenants
- A structured workspace shell with navigation
- Empty-state dashboard with a disabled "Connect Accounts" button

The system cannot:

- Connect to any financial institution
- Store account metadata or credentials
- Fetch balances or transaction history
- Transition from "empty" to "active" state
- Answer any financial question

Without this, no downstream feature (budgets, goals, purchase readiness, insights) can function. This is the foundational data layer.

## 3. Core Concepts

### PlaidItem

Represents a single Plaid connection to a financial institution. One user can have multiple PlaidItems (one per institution).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | Owner — FK to `User.id` |
| `plaidItemId` | `String` | Plaid's `item_id` — unique identifier for this connection |
| `accessToken` | `String` | Plaid access token — encrypted at rest. Never exposed to client. |
| `institutionId` | `String?` | Plaid institution ID (e.g., `ins_3`) |
| `institutionName` | `String?` | Display name (e.g., "Chase") |
| `status` | `PlaidItemStatus` | Connection health status |
| `consentExpiresAt` | `DateTime?` | When Plaid consent expires (if applicable) |
| `lastSyncedAt` | `DateTime?` | Last successful sync completion |
| `createdAt` | `DateTime` | Record creation |
| `updatedAt` | `DateTime` | Last modification |

**Relationships:** One PlaidItem has many FinancialAccounts. One PlaidItem has many SyncJobs.

### FinancialAccount

Represents a single bank account (checking, savings, credit card, etc.) within a PlaidItem.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | Owner — FK to `User.id` |
| `plaidItemId` | `String` | FK to `PlaidItem.id` |
| `plaidAccountId` | `String` | Plaid's `account_id` for this account |
| `name` | `String` | Account display name from Plaid (e.g., "Total Checking") |
| `officialName` | `String?` | Official account name if provided |
| `type` | `AccountType` | Account type: CHECKING, SAVINGS, CREDIT, LOAN, INVESTMENT, OTHER |
| `subtype` | `String?` | Plaid subtype string (e.g., "money market") |
| `mask` | `String?` | Last 4 digits of account number |
| `currentBalanceCents` | `Int?` | Current balance in cents. Null before first sync. |
| `availableBalanceCents` | `Int?` | Available balance in cents. Null if not provided. |
| `isoCurrencyCode` | `String` | Currency code (default "USD") |
| `isActive` | `Boolean` | Whether this account is actively synced |
| `createdAt` | `DateTime` | Record creation |
| `updatedAt` | `DateTime` | Last modification |

**Relationships:** Belongs to one PlaidItem. Belongs to one User.

### SyncJob

Tracks the lifecycle of a data sync operation. Created when a sync is triggered (initial or refresh).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | Owner — FK to `User.id` |
| `plaidItemId` | `String` | FK to `PlaidItem.id` |
| `type` | `SyncJobType` | `INITIAL` or `REFRESH` |
| `status` | `SyncJobStatus` | Current sync status |
| `step` | `SyncStep` | Current step in the sync pipeline |
| `startedAt` | `DateTime` | When the job began |
| `completedAt` | `DateTime?` | When the job finished (success or failure) |
| `errorMessage` | `String?` | Error description if failed. Never includes tokens or raw payloads. |
| `accountsSynced` | `Int` | Count of accounts synced |
| `transactionsSynced` | `Int` | Count of transactions fetched |
| `createdAt` | `DateTime` | Record creation |
| `updatedAt` | `DateTime` | Last modification |

### RawTransaction

Stores raw transaction data from Plaid before normalization (Pitch 3). Kept as-is for the ingestion boundary.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | Owner — FK to `User.id` |
| `financialAccountId` | `String` | FK to `FinancialAccount.id` |
| `plaidTransactionId` | `String` | Plaid's `transaction_id` — unique |
| `amountCents` | `Int` | Transaction amount in cents. Positive = debit/spend, negative = credit/income (Plaid convention). |
| `isoCurrencyCode` | `String` | Currency code |
| `date` | `DateTime` | Transaction date (UTC) |
| `authorizedDate` | `DateTime?` | Authorization date if different |
| `name` | `String` | Merchant/transaction name from Plaid |
| `merchantName` | `String?` | Clean merchant name if available |
| `category` | `String[]` | Plaid category array (raw, not P.R.I.M.E. categories) |
| `pending` | `Boolean` | Whether the transaction is pending |
| `createdAt` | `DateTime` | Record creation |
| `updatedAt` | `DateTime` | Last modification |

**Note:** RawTransaction is the ingestion boundary. Normalization, P.R.I.M.E. categorization, and recurring detection are deferred to Pitch 3. This spec stores what Plaid provides.

## 4. States & Lifecycle

### PlaidItem Status

```
CONNECTING → ACTIVE → ERROR
                ↓
             INACTIVE
```

| Status | Meaning |
|--------|---------|
| `CONNECTING` | Token exchanged, account records being created |
| `ACTIVE` | Connection healthy, syncs succeeding |
| `ERROR` | Plaid reports connection issue (login required, etc.) |
| `INACTIVE` | Manually disconnected or consent expired |

**Transitions:**

| From | To | Trigger |
|------|-----|---------|
| (new) | `CONNECTING` | Token exchange succeeds |
| `CONNECTING` | `ACTIVE` | First sync completes successfully |
| `CONNECTING` | `ERROR` | First sync fails |
| `ACTIVE` | `ERROR` | Sync failure or Plaid webhook reports issue |
| `ERROR` | `ACTIVE` | Successful re-sync |
| `ACTIVE` | `INACTIVE` | User disconnects (future) or consent expires |

### SyncJob Status

```
PENDING → IN_PROGRESS → COMPLETED
                 ↓
              FAILED
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Job created, not yet started |
| `IN_PROGRESS` | Actively fetching data |
| `COMPLETED` | All steps finished successfully |
| `FAILED` | An error occurred. `errorMessage` populated. |

### SyncJob Steps (ordered pipeline)

```
CONNECTING → SYNCING_BALANCES → RETRIEVING_TRANSACTIONS → ANALYZING → DONE
```

| Step | Behavior |
|------|----------|
| `CONNECTING` | Exchanging token, creating account records |
| `SYNCING_BALANCES` | Fetching current balances from Plaid |
| `RETRIEVING_TRANSACTIONS` | Fetching initial transaction window (90 days) |
| `ANALYZING` | Marking data as ready for downstream processing |
| `DONE` | Sync complete |

Steps are updated sequentially by the sync pipeline. The frontend polls the current step to render progress.

### Dashboard State Derivation

The dashboard state is derived from backend data, not stored explicitly:

| Condition | Dashboard State |
|-----------|----------------|
| No PlaidItems for user | **Pre-Connection** |
| PlaidItem exists + SyncJob with status `IN_PROGRESS` or `PENDING` | **Syncing** |
| PlaidItem exists + latest SyncJob `COMPLETED` + first visit | **Activation Complete** |
| PlaidItem exists + latest SyncJob `COMPLETED` + return visit | **Connected** |
| PlaidItem exists + latest SyncJob `FAILED` | **Syncing** (with error state on failed step) |

"First visit" vs "return visit" for Activation Complete is determined by a `hasSeenActivation` flag on the user or by checking if the latest sync completed within the current session. Simplest approach: always show **Connected** state after reload; show **Activation Complete** only as a transient client-side state immediately after sync completes.

## 5. UI Integration

### File Structure (New & Modified)

```
src/
├── app/
│   ├── (app)/
│   │   └── dashboard/
│   │       └── page.tsx                    # MODIFIED — state-driven card rendering
│   └── api/
│       └── v1/
│           └── plaid/
│               ├── create-link-token/
│               │   └── route.ts            # NEW — POST create Plaid Link token
│               └── exchange-token/
│                   └── route.ts            # NEW — POST exchange public_token
│           └── accounts/
│               ├── route.ts                # NEW — GET list connected accounts
│               └── status/
│                   └── route.ts            # NEW — GET sync status
├── components/
│   ├── connection-card.tsx                 # NEW — pre-connection CTA with trust badges
│   ├── trust-badge.tsx                     # NEW — reusable icon + label badge
│   ├── sync-progress-card.tsx              # NEW — sync step progress
│   ├── sync-step.tsx                       # NEW — individual progress step row
│   ├── activation-card.tsx                 # NEW — activation complete confirmation
│   ├── connected-accounts-card.tsx         # NEW — steady-state connected view
│   ├── connected-institution-row.tsx       # NEW — institution with accounts
│   └── plaid-link-button.tsx               # NEW — Plaid Link wrapper component
├── hooks/
│   └── use-plaid-link.ts                   # NEW — Plaid Link lifecycle hook
├── services/
│   ├── plaid.ts                            # NEW — Plaid API client (server-side)
│   └── sync.ts                             # NEW — sync pipeline logic
└── lib/
    └── encryption.ts                       # NEW — access token encryption utilities
```

### Screens

**Screen 1: Pre-Connection**

- Purpose: Guide user to connect accounts
- Data required: None (absence of PlaidItems triggers this state)
- Elements: Trust badges, Connect Accounts CTA
- Action: Click CTA → create link token → open Plaid Link

**Screen 2: Sync Progress**

- Purpose: Show system is actively working
- Data required: `SyncJob.step`, `SyncJob.status`, `PlaidItem.institutionName`, account count
- Elements: Institution header, 4-step progress, time estimate
- Action: None — auto-transitions on completion

**Screen 3: Activation Complete**

- Purpose: Confirm success, set expectations
- Data required: Connected institutions list, account counts, sync status
- Elements: Success icon, institution rows, Connect Another CTA
- Action: Connect Another → re-open Plaid Link

**Screen 4: Connected (Steady State)**

- Purpose: Show connected accounts inventory on return visits
- Data required: All PlaidItems with their FinancialAccounts, sync timestamps
- Elements: Institution groups with account rows (name, type, mask), Active status, last sync time, Add Account CTA
- Action: Add Account → open Plaid Link

### Derived Data Requirements

| Value | Computed Where | When Updated | Inputs |
|-------|---------------|--------------|--------|
| Dashboard state | Client (SWR) | On poll (3-5s during sync), on page load | PlaidItem existence, SyncJob status/step |
| Account count per institution | API response | On sync completion | FinancialAccount count grouped by PlaidItem |
| Last synced timestamp | API response | On sync completion | `PlaidItem.lastSyncedAt` |
| Sync step progress | API response | During sync (polled) | `SyncJob.step` |

## 6. Data Model

### Relationship to Existing Schema

| From | Relation | To | Description |
|------|----------|-----|-------------|
| `User` | 1:N | `PlaidItem` | A user can connect multiple institutions |
| `User` | 1:N | `FinancialAccount` | Denormalized for query efficiency |
| `User` | 1:N | `SyncJob` | Denormalized for query efficiency |
| `User` | 1:N | `RawTransaction` | Denormalized for query efficiency |
| `PlaidItem` | 1:N | `FinancialAccount` | One Plaid connection holds multiple accounts |
| `PlaidItem` | 1:N | `SyncJob` | Each sync operation tracked |
| `FinancialAccount` | 1:N | `RawTransaction` | Transactions belong to an account |

### New Entities

```prisma
model PlaidItem {
  id              String          @id @default(cuid())
  userId          String
  plaidItemId     String          @unique
  accessToken     String          // Encrypted at rest
  institutionId   String?
  institutionName String?
  status          PlaidItemStatus @default(CONNECTING)
  consentExpiresAt DateTime?
  lastSyncedAt    DateTime?

  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  accounts FinancialAccount[]
  syncJobs SyncJob[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model FinancialAccount {
  id                    String      @id @default(cuid())
  userId                String
  plaidItemId           String
  plaidAccountId        String      @unique
  name                  String
  officialName          String?
  type                  AccountType
  subtype               String?
  mask                  String?
  currentBalanceCents   Int?
  availableBalanceCents Int?
  isoCurrencyCode       String      @default("USD")
  isActive              Boolean     @default(true)

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plaidItem   PlaidItem        @relation(fields: [plaidItemId], references: [id], onDelete: Cascade)
  transactions RawTransaction[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([plaidItemId])
}

model SyncJob {
  id               String        @id @default(cuid())
  userId           String
  plaidItemId      String
  type             SyncJobType
  status           SyncJobStatus @default(PENDING)
  step             SyncStep      @default(CONNECTING)
  startedAt        DateTime      @default(now())
  completedAt      DateTime?
  errorMessage     String?
  accountsSynced   Int           @default(0)
  transactionsSynced Int         @default(0)

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plaidItem PlaidItem @relation(fields: [plaidItemId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([plaidItemId])
}

model RawTransaction {
  id                 String   @id @default(cuid())
  userId             String
  financialAccountId String
  plaidTransactionId String   @unique
  amountCents        Int
  isoCurrencyCode    String   @default("USD")
  date               DateTime
  authorizedDate     DateTime?
  name               String
  merchantName       String?
  category           String[]
  pending            Boolean  @default(false)

  user    User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  account FinancialAccount @relation(fields: [financialAccountId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([financialAccountId])
  @@index([date])
}
```

### Enums

```prisma
enum PlaidItemStatus {
  CONNECTING
  ACTIVE
  ERROR
  INACTIVE
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT
  LOAN
  INVESTMENT
  OTHER
}

enum SyncJobType {
  INITIAL
  REFRESH
}

enum SyncJobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}

enum SyncStep {
  CONNECTING
  SYNCING_BALANCES
  RETRIEVING_TRANSACTIONS
  ANALYZING
  DONE
}
```

### Required Updates to Existing Models

```prisma
model User {
  // existing fields...

  // NEW
  plaidItems        PlaidItem[]
  financialAccounts FinancialAccount[]
  syncJobs          SyncJob[]
  rawTransactions   RawTransaction[]
}
```

### Data Integrity Rules

- `PlaidItem.plaidItemId` must be unique across the system (Plaid guarantees uniqueness)
- `FinancialAccount.plaidAccountId` must be unique (one account cannot belong to multiple items)
- `RawTransaction.plaidTransactionId` must be unique (deduplication key)
- All records must have a `userId` — enforced at the application layer and by FK constraints
- `accessToken` must never appear in API responses, logs, or error messages
- Balance values in cents (integers) only — no floating point
- Transaction `amountCents` follows Plaid convention: positive = money out, negative = money in. Conversion to P.R.I.M.E. conventions is deferred to normalization (Pitch 3).

## 7. Data Processing & Logic

### Token Exchange Pipeline

```
1. Frontend calls POST /api/v1/plaid/create-link-token
2. Backend calls plaidClient.linkTokenCreate() with user ID
3. Frontend receives link_token, opens Plaid Link
4. User completes Plaid flow → frontend receives public_token + metadata
5. Frontend calls POST /api/v1/plaid/exchange-token with public_token + metadata
6. Backend calls plaidClient.itemPublicTokenExchange() → receives access_token + item_id
7. Backend (in transaction):
   a. Encrypts access_token
   b. Creates PlaidItem record (status: CONNECTING)
   c. Creates FinancialAccount records from metadata.accounts
   d. Creates SyncJob record (type: INITIAL, status: PENDING)
8. Backend triggers sync pipeline (async)
9. Returns PlaidItem ID + SyncJob ID to frontend
```

### Sync Pipeline

The sync pipeline runs **inline** within the `POST /api/v1/plaid/exchange-token` route after records are created. The API response is returned only after the sync completes. It updates the SyncJob step as it progresses. The frontend polls `/api/v1/accounts/status` during this time.

```typescript
async function runSyncPipeline(syncJobId: string): Promise<void> {
  // Step 1: CONNECTING (already done during token exchange)
  await updateSyncStep(syncJobId, "SYNCING_BALANCES", "IN_PROGRESS");

  // Step 2: Fetch balances
  const balances = await plaidClient.accountsBalanceGet({ access_token });
  await updateAccountBalances(plaidItemId, balances.accounts);
  await updateSyncStep(syncJobId, "RETRIEVING_TRANSACTIONS");

  // Step 3: Fetch transactions (90-day window)
  const endDate = today();
  const startDate = subtractDays(endDate, 90);
  const transactions = await fetchAllTransactions(access_token, startDate, endDate);
  await storeRawTransactions(plaidItemId, transactions);
  await updateSyncStep(syncJobId, "ANALYZING");

  // Step 4: Mark ready
  await markSyncComplete(syncJobId, plaidItemId);
}
```

**Fetch All Transactions:** Plaid paginates transactions. The sync must page through all results:

```typescript
async function fetchAllTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<PlaidTransaction[]> {
  const allTransactions: PlaidTransaction[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: 500, offset },
    });
    allTransactions.push(...response.data.transactions);
    hasMore = allTransactions.length < response.data.total_transactions;
    offset = allTransactions.length;
  }

  return allTransactions;
}
```

**Balance Storage:** Convert Plaid float amounts to integer cents:

```typescript
function toCents(amount: number | null): number | null {
  if (amount === null || amount === undefined) return null;
  return Math.round(amount * 100);
}
```

**Transaction Storage:** Convert amounts and upsert by `plaidTransactionId`:

```typescript
// Amount conversion: Plaid amounts are positive for debits, negative for credits
// Store as-is in cents for the raw layer. Normalization (Pitch 3) will apply P.R.I.M.E. conventions.
const amountCents = Math.round(plaidTransaction.amount * 100);
```

### Error Handling

| Error | Behavior |
|-------|----------|
| Token exchange fails (Plaid API error) | Return 502 to frontend. No records created. |
| Plaid API rate limit during sync | Retry with exponential backoff (max 3 retries). |
| Balance fetch fails | SyncJob status → `FAILED`, step stays at `SYNCING_BALANCES`. PlaidItem status → `ERROR`. |
| Transaction fetch fails | SyncJob status → `FAILED`, step stays at `RETRIEVING_TRANSACTIONS`. Balances already stored remain valid. |
| Duplicate PlaidItem (same `plaidItemId`) | Return 409 with existing PlaidItem info. |
| Duplicate transaction (`plaidTransactionId` conflict) | Skip — upsert behavior. Not an error. |

### Access Token Encryption

The Plaid access token must be encrypted at rest. Use AES-256-GCM:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.PLAID_TOKEN_ENCRYPTION_KEY!; // 32-byte hex key

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8");
}
```

**Environment variable required:** `PLAID_TOKEN_ENCRYPTION_KEY` — 32-byte hex-encoded key. Must be generated securely and stored in environment, never committed.

## 8. API Surface

### Authentication

All endpoints require an authenticated Supabase session. The server extracts the user from the session cookie via `createClient()` from `@/lib/supabase/server`. The `userId` is resolved by looking up the User record by `supabaseId`.

```typescript
async function getAuthenticatedUser(): Promise<User> {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();
  if (!supabaseUser) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });
  if (!user) throw new UnauthorizedError();

  return user;
}
```

---

### Create Plaid Link Token

```
POST /api/v1/plaid/create-link-token
```

Creates a Plaid Link token for the frontend to initialize the Plaid Link UI.

Request: (empty body — user derived from session)

Response (200):

```json
{
  "link_token": "link-sandbox-xxxxxxxx",
  "expiration": "2026-03-22T12:00:00Z"
}
```

Error (401): Unauthorized
Error (502): Plaid API unreachable

---

### Exchange Public Token

```
POST /api/v1/plaid/exchange-token
```

Exchanges the Plaid public token for an access token. Creates PlaidItem, FinancialAccount records, and triggers the initial sync.

Request:

```json
{
  "public_token": "public-sandbox-xxxxxxxx",
  "institution": {
    "institution_id": "ins_3",
    "name": "Chase"
  },
  "accounts": [
    {
      "id": "plaid-account-id-1",
      "name": "Total Checking",
      "official_name": "TOTAL CHECKING",
      "type": "depository",
      "subtype": "checking",
      "mask": "4829"
    }
  ]
}
```

Response (201):

```json
{
  "plaid_item_id": "cuid_xxx",
  "sync_job_id": "cuid_yyy",
  "accounts_created": 3
}
```

Error (400): `validation_error` — missing required fields
Error (401): Unauthorized
Error (409): `duplicate_resource` — PlaidItem with this `plaidItemId` already exists
Error (502): Plaid token exchange failed

---

### Get Accounts & Connection Status

```
GET /api/v1/accounts/status
```

Returns the user's connection state: all PlaidItems with their accounts and the latest sync job status. This is the single endpoint the frontend polls during sync and uses to determine dashboard state.

Response (200):

```json
{
  "items": [
    {
      "id": "cuid_xxx",
      "institution_id": "ins_3",
      "institution_name": "Chase",
      "status": "ACTIVE",
      "last_synced_at": "2026-03-22T10:30:00Z",
      "accounts": [
        {
          "id": "cuid_aaa",
          "name": "Total Checking",
          "type": "CHECKING",
          "mask": "4829",
          "is_active": true
        },
        {
          "id": "cuid_bbb",
          "name": "Chase Savings",
          "type": "SAVINGS",
          "mask": "7201",
          "is_active": true
        }
      ],
      "latest_sync": {
        "id": "cuid_yyy",
        "status": "IN_PROGRESS",
        "step": "RETRIEVING_TRANSACTIONS",
        "type": "INITIAL",
        "started_at": "2026-03-22T10:29:55Z",
        "completed_at": null,
        "error_message": null,
        "accounts_synced": 2,
        "transactions_synced": 0
      }
    }
  ],
  "has_connected_accounts": true,
  "has_active_sync": true
}
```

When no items exist:

```json
{
  "items": [],
  "has_connected_accounts": false,
  "has_active_sync": false
}
```

Error (401): Unauthorized

---

### List Connected Accounts

```
GET /api/v1/accounts
```

Returns all connected financial accounts for the user, grouped by institution.

Response (200):

```json
{
  "accounts": [
    {
      "id": "cuid_aaa",
      "name": "Total Checking",
      "type": "CHECKING",
      "mask": "4829",
      "is_active": true,
      "institution_name": "Chase"
    }
  ],
  "total": 4
}
```

Error (401): Unauthorized

---

### Retry Sync

```
POST /api/v1/plaid/sync/:plaidItemId/retry
```

Retries a failed sync job for the specified PlaidItem. Creates a new SyncJob.

Request: (empty body)

Response (201):

```json
{
  "sync_job_id": "cuid_zzz"
}
```

Error (400): `invalid_state_transition` — no failed sync to retry
Error (401): Unauthorized
Error (403): `forbidden` — PlaidItem does not belong to user
Error (404): `not_found` — PlaidItem not found

---

### Standard Error Format

```json
{
  "error": "error_code",
  "message": "Human readable description",
  "details": {}
}
```

## 9. Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLAID_CLIENT_ID` | Plaid API client ID | Yes |
| `PLAID_SECRET` | Plaid API secret (sandbox/development/production) | Yes |
| `PLAID_ENV` | Plaid environment: `sandbox`, `development`, or `production` | Yes |
| `PLAID_TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption of access tokens | Yes |
| `PLAID_PRODUCTS` | Comma-separated Plaid products. Default: `transactions` | No |
| `PLAID_COUNTRY_CODES` | Comma-separated country codes. Default: `US` | No |

## 10. Testing Strategy

### Happy Path

```
TEST: creates_plaid_item_and_accounts_on_token_exchange
GIVEN:
  - Authenticated user exists
  - Valid public_token from Plaid Link
  - Plaid returns access_token and item_id
WHEN:
  - POST /api/v1/plaid/exchange-token with public_token and account metadata
THEN:
  - PlaidItem created with status CONNECTING
  - FinancialAccount records created for each account in metadata
  - SyncJob created with type INITIAL, status PENDING
  - Response returns plaid_item_id, sync_job_id, accounts_created count
  - All records scoped to the authenticated user's userId
```

```
TEST: sync_pipeline_completes_all_steps
GIVEN:
  - PlaidItem exists with valid access_token
  - SyncJob in PENDING status
  - Plaid API returns balances and transactions
WHEN:
  - Sync pipeline runs
THEN:
  - SyncJob step progresses: CONNECTING → SYNCING_BALANCES → RETRIEVING_TRANSACTIONS → ANALYZING → DONE
  - SyncJob status transitions: PENDING → IN_PROGRESS → COMPLETED
  - Account balances updated in cents (integer)
  - RawTransaction records created for all fetched transactions
  - PlaidItem status transitions: CONNECTING → ACTIVE
  - PlaidItem.lastSyncedAt updated
  - SyncJob.accountsSynced and transactionsSynced reflect real counts
```

```
TEST: status_endpoint_returns_correct_dashboard_state
GIVEN:
  - User has one PlaidItem with 3 accounts
  - Latest SyncJob is COMPLETED
WHEN:
  - GET /api/v1/accounts/status
THEN:
  - Response includes item with institution name, 3 accounts
  - has_connected_accounts is true
  - has_active_sync is false
  - latest_sync.status is COMPLETED
  - Account records include name, type, mask — no balances exposed
```

### Validation

```
TEST: rejects_exchange_with_missing_public_token
GIVEN:
  - Authenticated user
WHEN:
  - POST /api/v1/plaid/exchange-token with empty body
THEN:
  - Returns 400 validation_error
  - No records created
```

```
TEST: rejects_duplicate_plaid_item
GIVEN:
  - User already has a PlaidItem with plaidItemId "item_123"
WHEN:
  - POST /api/v1/plaid/exchange-token results in same plaidItemId
THEN:
  - Returns 409 duplicate_resource
  - No duplicate records created
```

### Edge Cases

```
TEST: handles_plaid_api_failure_during_token_exchange
GIVEN:
  - Authenticated user
  - Plaid API returns error on itemPublicTokenExchange
WHEN:
  - POST /api/v1/plaid/exchange-token
THEN:
  - Returns 502 with error message
  - No PlaidItem, FinancialAccount, or SyncJob records created
```

```
TEST: handles_sync_failure_at_balance_step
GIVEN:
  - SyncJob in progress at SYNCING_BALANCES step
  - Plaid balance API returns error after retries
WHEN:
  - Sync pipeline fails
THEN:
  - SyncJob status → FAILED, step remains SYNCING_BALANCES
  - PlaidItem status → ERROR
  - errorMessage set (no sensitive data)
  - Account records still exist (created during token exchange)
```

```
TEST: deduplicates_transactions_on_re_sync
GIVEN:
  - RawTransactions exist from previous sync
  - New sync fetches overlapping transactions
WHEN:
  - Sync pipeline stores transactions
THEN:
  - Existing transactions not duplicated (upsert by plaidTransactionId)
  - New transactions added
  - transactionsSynced count reflects only net new
```

```
TEST: converts_balances_to_cents_correctly
GIVEN:
  - Plaid returns balance of 1234.56
WHEN:
  - Balance is stored
THEN:
  - currentBalanceCents = 123456 (integer)
  - No floating point remainder
```

```
TEST: handles_null_balances
GIVEN:
  - Plaid returns null for available balance (common for credit accounts)
WHEN:
  - Balance is stored
THEN:
  - availableBalanceCents = null
  - currentBalanceCents populated if provided
```

### User Isolation

```
TEST: user_cannot_access_other_users_accounts
GIVEN:
  - User A has PlaidItem with accounts
  - User B is authenticated
WHEN:
  - User B calls GET /api/v1/accounts/status
THEN:
  - Response contains only User B's items (empty if none)
  - User A's data never returned
```

```
TEST: user_cannot_retry_other_users_sync
GIVEN:
  - User A has a failed SyncJob
  - User B is authenticated
WHEN:
  - User B calls POST /api/v1/plaid/sync/:userAPlaidItemId/retry
THEN:
  - Returns 403 forbidden
  - No SyncJob created
```

### Financial Correctness

```
TEST: balance_storage_exact_for_known_values
GIVEN:
  - Plaid returns balances: current=5000.01, available=4999.50
WHEN:
  - Stored to FinancialAccount
THEN:
  - currentBalanceCents = 500001
  - availableBalanceCents = 499950
  - Values are exact integers, no rounding drift
```

```
TEST: transaction_amount_stored_in_cents
GIVEN:
  - Plaid returns transaction with amount 42.99
WHEN:
  - Stored to RawTransaction
THEN:
  - amountCents = 4299
```

```
TEST: large_transaction_set_fully_paginated
GIVEN:
  - Plaid reports total_transactions = 1200
  - Transactions returned in pages of 500
WHEN:
  - fetchAllTransactions runs
THEN:
  - 3 API calls made (500 + 500 + 200)
  - All 1200 transactions stored
  - transactionsSynced = 1200
```

### Data Integrity

```
TEST: token_exchange_is_atomic
GIVEN:
  - Token exchange succeeds
  - Account creation fails mid-transaction
WHEN:
  - Transaction rolls back
THEN:
  - No PlaidItem record exists
  - No FinancialAccount records exist
  - No SyncJob record exists
```

```
TEST: access_token_encrypted_at_rest
GIVEN:
  - Token exchange creates PlaidItem
WHEN:
  - PlaidItem.accessToken is read from database
THEN:
  - Value is not plaintext
  - Decrypting with correct key returns original access_token
  - Decrypting with wrong key throws
```

### Test Factories

```typescript
function createTestPlaidItem(overrides?: Partial<PlaidItem>) {
  return {
    id: "plaid-item-test",
    userId: "user-test",
    plaidItemId: "item_sandbox_123",
    accessToken: encrypt("access-sandbox-test-token"),
    institutionId: "ins_3",
    institutionName: "Chase",
    status: "ACTIVE" as PlaidItemStatus,
    consentExpiresAt: null,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestFinancialAccount(overrides?: Partial<FinancialAccount>) {
  return {
    id: "account-test",
    userId: "user-test",
    plaidItemId: "plaid-item-test",
    plaidAccountId: "acct_sandbox_123",
    name: "Total Checking",
    officialName: "TOTAL CHECKING",
    type: "CHECKING" as AccountType,
    subtype: "checking",
    mask: "4829",
    currentBalanceCents: 500000,
    availableBalanceCents: 495000,
    isoCurrencyCode: "USD",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestSyncJob(overrides?: Partial<SyncJob>) {
  return {
    id: "sync-job-test",
    userId: "user-test",
    plaidItemId: "plaid-item-test",
    type: "INITIAL" as SyncJobType,
    status: "COMPLETED" as SyncJobStatus,
    step: "DONE" as SyncStep,
    startedAt: new Date(),
    completedAt: new Date(),
    errorMessage: null,
    accountsSynced: 3,
    transactionsSynced: 150,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestRawTransaction(overrides?: Partial<RawTransaction>) {
  return {
    id: "txn-test",
    userId: "user-test",
    financialAccountId: "account-test",
    plaidTransactionId: "txn_plaid_123",
    amountCents: 4299,
    isoCurrencyCode: "USD",
    date: new Date("2026-03-15"),
    authorizedDate: null,
    name: "AMAZON.COM",
    merchantName: "Amazon",
    category: ["Shopping", "Online"],
    pending: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

## 11. Acceptance Criteria

### 1. Plaid Integration
- [ ] Link token created successfully for authenticated user
- [ ] Plaid Link opens in frontend and completes flow
- [ ] Public token exchanged for access token
- [ ] Access token encrypted before storage — never in logs, responses, or errors

### 2. Account Persistence
- [ ] PlaidItem created with correct institution metadata
- [ ] FinancialAccount records created matching Plaid account selection
- [ ] Account type mapped correctly (depository→CHECKING/SAVINGS, credit→CREDIT, etc.)
- [ ] Mask (last 4 digits) stored correctly
- [ ] Duplicate PlaidItems rejected (409)
- [ ] Duplicate accounts deduplicated by plaidAccountId

### 3. Sync Pipeline
- [ ] SyncJob created and progresses through all steps
- [ ] Balances fetched and stored as integer cents — no floating point
- [ ] Transactions fetched (90-day window) with full pagination
- [ ] Transactions deduplicated by plaidTransactionId
- [ ] SyncJob completes and PlaidItem status → ACTIVE
- [ ] Sync failure handled gracefully — SyncJob FAILED, PlaidItem ERROR
- [ ] Retry creates new SyncJob and re-runs pipeline

### 4. API
- [ ] All endpoints enforce authentication
- [ ] All endpoints enforce user scoping — no cross-user access
- [ ] Status endpoint returns correct dashboard state derivation
- [ ] No sensitive data in responses (no access tokens, no full account numbers, no balances in status endpoint)
- [ ] Error responses follow standard format

### 5. Frontend Integration
- [ ] Dashboard renders correct state based on status API
- [ ] Pre-connection card shows trust badges and active CTA
- [ ] Sync progress card polls and shows real-time step updates
- [ ] Activation complete card shows on first sync completion
- [ ] Connected state shows account inventory on return visits
- [ ] Connect Another Account opens Plaid Link for additional institutions

### 6. Security
- [ ] Access tokens encrypted at rest with AES-256-GCM
- [ ] Encryption key in environment variable, not in code
- [ ] No sensitive financial data in logs
- [ ] No balances or transaction data exposed in connection/status APIs

## 12. Explicit Non-Goals (v1)

- No transaction normalization or P.R.I.M.E. categorization (Pitch 3)
- No balance display on dashboard summary cards
- No transaction display in Recent Activity
- No recurring detection
- No budget or goal logic
- No Plaid webhook handling (initial sync only, polling-based)
- No account disconnection or reconnection flows
- No multi-institution sync progress (one progress card at a time)
- No investment account balance detail (holdings, securities)
- No real-time balance updates (only on sync)
- No manual account entry

## 13. Decisions

- `Plaid environment strategy` — **Resolved:** Use `sandbox` for local/test, `development` for staging, `production` for release. Controlled entirely by `PLAID_ENV` environment variable.
- `Sync execution model` — **Resolved:** Run sync inline within the `POST /api/v1/plaid/exchange-token` route (Option A). Simpler for MVP; the full sync typically completes in <30s. Revisit if timeouts become an issue in production.
- `Transaction window` — **Resolved:** 90 days for initial sync. No expansion in v1.
- `Encryption key rotation` — **Resolved:** No rotation mechanism in v1. Accepted risk. Future consideration if key is compromised.

## 14. Future Considerations

- **Plaid webhooks** — Replace polling with webhook-driven sync updates for near-real-time data freshness
- **Incremental sync** — Use Plaid's transactions/sync endpoint for delta updates instead of full re-fetch
- **Account reconnection** — Handle expired connections, MFA re-verification
- **Multi-user/household** — Tenant-scoped accounts instead of user-scoped
- **Investment detail** — Holdings, securities for net-worth calculation
- **Transaction normalization** (Pitch 3) — Clean merchant names, apply P.R.I.M.E. categories, detect recurring
- **Balance history** — Store balance snapshots over time for trend analysis

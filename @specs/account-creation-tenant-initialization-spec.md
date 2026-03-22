---
version: 1.0.0
status: draft
author: Claude
last_updated: 2026-03-21
design_doc_reference: "@design-docs/account-creation-tenant-initialization-design-doc.md"
pitch_reference: "@pitches/account-creation-tenant-initialization.md"
---

# Account Creation & Tenant Initialization — Technical Spec

## 1. Summary

This feature establishes the foundational entry point into P.R.I.M.E. — passwordless authentication (email OTP and Google OAuth) with automatic tenant provisioning.

When a user authenticates for the first time, the system creates a `User` record linked to the Supabase Auth identity, provisions an isolated `Tenant` workspace, and establishes a `Membership` binding the user to that tenant as owner. Returning users are routed directly to their dashboard. The entire provisioning flow is invisible to the user — they authenticate and arrive.

**Success criteria:**

- A new user can sign up via email OTP or Google OAuth and land in a provisioned workspace in under 5 seconds
- Tenant creation is atomic — no partial setups exist in the database
- Every query is user-scoped; cross-tenant access is impossible
- Returning users bypass onboarding and reach the dashboard directly

---

## 2. Problem

The system currently has a minimal `User` model with no authentication, no workspace isolation, and no tenant concept. Without this feature:

- No user can enter the system
- No data isolation boundary exists
- No downstream feature (accounts, transactions, goals, decisions) can be built
- No trust foundation is established before sensitive financial actions

This is the root dependency for the entire P.R.I.M.E. product.

---

## 3. Core Concepts

### User

The authenticated identity. Created on first successful authentication. Linked 1:1 to a Supabase Auth identity.

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key, internal to P.R.I.M.E. |
| `supabaseId` | `String` | Supabase Auth user ID. Immutable after creation. |
| `email` | `String` | Verified email address. Lowercased, trimmed. |
| `name` | `String?` | Display name. Populated from Google profile if available. |
| `avatarUrl` | `String?` | Profile image URL from OAuth provider. |
| `createdAt` | `DateTime` | Account creation timestamp (UTC). |
| `updatedAt` | `DateTime` | Last modification timestamp (UTC). |

### Tenant

An isolated workspace. Every piece of financial data in P.R.I.M.E. belongs to a tenant. MVP: one user → one tenant.

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key. |
| `name` | `String` | Workspace display name. Defaults to `"{email}'s workspace"`. |
| `createdAt` | `DateTime` | Provisioning timestamp (UTC). |
| `updatedAt` | `DateTime` | Last modification timestamp (UTC). |

### Membership

Binds a user to a tenant with a role. MVP: only `OWNER` role exists.

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key. |
| `userId` | `String` | FK → User. |
| `tenantId` | `String` | FK → Tenant. |
| `role` | `MembershipRole` | `OWNER` for MVP. |
| `createdAt` | `DateTime` | Binding timestamp (UTC). |

### Relationships

- `User` 1 → many `Membership` (MVP: exactly 1)
- `Tenant` 1 → many `Membership` (MVP: exactly 1)
- `User` ↔ `Tenant` via `Membership`

### Ownership Rules

- Every `User` must have exactly one `Membership` with role `OWNER`
- Every `Tenant` must have exactly one `Membership` with role `OWNER`
- A `Tenant` without a `Membership` is invalid and must not exist
- A `User` without a `Membership` is invalid and must not exist

---

## 4. States & Lifecycle

### User Provisioning State

This is not a persisted field — it describes the logical flow:

```
UNAUTHENTICATED → AUTH_IN_PROGRESS → PROVISIONING → ACTIVE
```

| Transition | Trigger | System Behavior |
|---|---|---|
| `UNAUTHENTICATED → AUTH_IN_PROGRESS` | User submits email or clicks Google | Supabase Auth handles identity verification |
| `AUTH_IN_PROGRESS → PROVISIONING` | Auth callback received with valid session | System checks if User record exists |
| `PROVISIONING → ACTIVE` | User + Tenant + Membership created atomically | Redirect to `/welcome` (new) or `/dashboard` (existing) |

### Auth Provider States (Supabase-managed)

| State | Description |
|---|---|
| `awaiting_verification` | OTP sent, user has not verified yet |
| `authenticated` | Session is active and valid |
| `expired` | Session has expired (out of scope — Pitch 2) |

### Error States

| State | Trigger | Handling |
|---|---|---|
| `auth_failed` | Invalid OTP, OAuth error | Show inline error, allow retry |
| `provisioning_failed` | Transaction failure during User/Tenant/Membership creation | Show toast, allow retry. No partial records persisted. |
| `rate_limited` | Too many OTP requests or verification attempts | Show rate limit message, enforce cooldown |

---

## 5. UI Integration

Reference: `@design-docs/account-creation-tenant-initialization-design-doc.md`

### Screen 1: Signup (`/signup`)

**Purpose:** Entry point for new users.

**Data required:** None (unauthenticated).

| Element | Data Source |
|---|---|
| Email input | User input |
| Continue button | Triggers `supabase.auth.signInWithOtp({ email })` |
| Google button | Triggers `supabase.auth.signInWithOAuth({ provider: 'google' })` |

**Actions:**
- Email submit → send OTP, navigate to `/verify` with email in router state
- Google click → OAuth popup, on success redirect via auth callback

**Validation:**
- Email: required, valid format, trimmed + lowercased before submission
- Rate limiting: Supabase enforces; surface error if 429 returned

### Screen 2: Verify (`/verify`)

**Purpose:** OTP verification for email auth.

**Data required:** Email address (from router state).

| Element | Data Source |
|---|---|
| Email display | Router state from `/signup` or `/login` |
| OTP input (single text field) | User input — accepts variable-length numeric codes |
| Verify button | Triggers `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| Resend button | Triggers `supabase.auth.signInWithOtp({ email })` with 60s cooldown |

**Guard:** If no email in state, redirect to `/signup`.

**Actions:**
- Verify success → auth callback handles provisioning → redirect
- Verify failure → inline error, clear OTP field, re-focus input
- Resend → 60s cooldown timer, toast confirmation
- Back → return to `/signup` (or `/login`) with email pre-filled

### Screen 3: Welcome (`/welcome`)

**Purpose:** Trust confirmation for first-time users.

**Data required:** Authenticated session, confirmed new user.

| Element | Data Source |
|---|---|
| Success icon | Static |
| Heading | Static: "Your private financial workspace is ready." |
| Trust message | Static: "Your data is encrypted and only accessible by you." |
| Continue button | Navigates to `/dashboard` |

**Guard:** If user is not new (already has tenant from a previous session), redirect to `/dashboard`.

### Screen 4: Login (`/login`)

**Purpose:** Re-entry for existing users.

**Data required:** None (unauthenticated).

Identical to Signup except copy changes:
- Heading: "Welcome back"
- Subheading: "Sign in to your financial workspace"
- Footer: links to `/signup`

**Behavior is forgiving:** both `/signup` and `/login` handle new and existing users identically at the system level.

### Derived Data Requirements

| Value | Computed Where | When Updated |
|---|---|---|
| `isNewUser` | Auth callback (API) | On auth callback — checks if User record exists for Supabase ID |
| `redirectPath` | Auth callback (API) | On auth callback — `/welcome` for new, `/dashboard` for existing |

No financial data is computed in this feature.

---

## 6. Data Model

### Relationship to Existing Schema

| From | Relation | To | Description |
|---|---|---|---|
| `User` | 1:many | `Membership` | User belongs to tenants via memberships |
| `Tenant` | 1:many | `Membership` | Tenant has members via memberships |
| `Membership` | many:1 | `User` | Membership binds a user |
| `Membership` | many:1 | `Tenant` | Membership binds to a tenant |

### Updated User Model

```prisma
model User {
  id          String   @id @default(cuid())
  supabaseId  String   @unique
  email       String   @unique
  name        String?
  avatarUrl   String?

  memberships Membership[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([supabaseId])
}
```

### New: Tenant Model

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String

  memberships Membership[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### New: Membership Model

```prisma
model Membership {
  id        String         @id @default(cuid())
  userId    String
  tenantId  String
  role      MembershipRole

  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
}
```

### New: MembershipRole Enum

```prisma
enum MembershipRole {
  OWNER
}
```

### Data Integrity Rules

- `User.supabaseId` must be unique — enforced by DB constraint
- `User.email` must be unique — enforced by DB constraint
- `Membership(userId, tenantId)` must be unique — enforced by compound unique constraint
- User + Tenant + Membership must be created in a single transaction — no partial records
- Deleting a User cascades to Memberships
- Deleting a Tenant cascades to Memberships
- MVP: exactly one Membership per User, exactly one Membership per Tenant (application-level enforcement, not DB constraint — to allow future multi-tenant)

---

## 7. Data Processing & Logic

### Provisioning Logic

**Trigger:** Auth callback receives a valid Supabase session for a user whose `supabaseId` does not exist in the `User` table.

**Steps (single transaction):**

```typescript
async function provisionUser(
  supabaseUser: SupabaseUser,
  tx: PrismaClient,
): Promise<{ user: User; tenant: Tenant; membership: Membership }> {
  const user = await tx.user.create({
    data: {
      supabaseId: supabaseUser.id,
      email: supabaseUser.email!.toLowerCase().trim(),
      name: supabaseUser.user_metadata?.full_name ?? null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
    },
  });

  const tenant = await tx.tenant.create({
    data: {
      name: `${user.email}'s workspace`,
    },
  });

  const membership = await tx.membership.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  return { user, tenant, membership };
}
```

**Guarantees:**
- If any step fails, the entire transaction rolls back
- No User exists without a Tenant
- No Tenant exists without an Owner
- Email is always lowercased and trimmed before storage

### Returning User Logic

**Trigger:** Auth callback receives a valid Supabase session for a user whose `supabaseId` already exists.

**Steps:**
1. Look up `User` by `supabaseId`
2. Optionally update `name` and `avatarUrl` from latest OAuth metadata (if changed)
3. Redirect to `/dashboard`

### Duplicate Prevention

A race condition can occur if a user completes auth twice simultaneously (e.g., magic link in two tabs):

- `User.supabaseId` unique constraint prevents duplicate User records
- If the second request hits the constraint, catch the Prisma unique constraint error (`P2002`), look up the existing user, and proceed as a returning user
- This is not an error state — it is expected and handled gracefully

### New vs. Existing User Detection

```typescript
async function getOrProvisionUser(
  supabaseUser: SupabaseUser,
): Promise<{ user: User; isNew: boolean }> {
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (existingUser) {
    return { user: existingUser, isNew: false };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return provisionUser(supabaseUser, tx as PrismaClient);
    });
    return { user: result.user, isNew: true };
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { supabaseId: supabaseUser.id },
      });
      return { user, isNew: false };
    }
    throw error;
  }
}
```

---

## 8. API Surface

### Auth Callback

```
Handle Auth Callback
GET /api/auth/callback
```

**Purpose:** Supabase redirects here after OAuth completion or when a user clicks the magic link in their OTP email. (Supabase OTP emails include both a numeric code and a clickable link — either path works.) Exchanges the auth code for a session, provisions the user if new, and redirects.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `code` | `string` | Auth code from Supabase |
| `next` | `string?` | Optional redirect override (default: auto-detect) |

**Behavior:**

1. Exchange `code` for session via `supabase.auth.exchangeCodeForSession(code)`
2. If exchange fails → redirect to `/signup?error=auth_failed`
3. Get Supabase user from session
4. Call `getOrProvisionUser(supabaseUser)`
5. If `isNew` → redirect to `/welcome`
6. If existing → redirect to `next` param or `/dashboard`

**Error handling:**

| Error | Response |
|---|---|
| Missing `code` param | Redirect to `/signup?error=missing_code` |
| Code exchange failure | Redirect to `/signup?error=auth_failed` |
| Provisioning failure | Redirect to `/signup?error=provisioning_failed` |

This is a **Route Handler** (Next.js), not a JSON API — it redirects, not returns JSON.

### Supabase Client Calls (Client-Side)

These are not custom API endpoints — they are Supabase SDK calls made from the browser:

| Action | SDK Call |
|---|---|
| Send OTP | `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` |
| Verify OTP | `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` |
| Get session | `supabase.auth.getSession()` |
| Sign out | `supabase.auth.signOut()` |

### Middleware

```
src/middleware.ts
```

**Purpose:** Protect authenticated routes and redirect authenticated users away from auth pages.

**Logic:**

| Route Pattern | Auth State | Action |
|---|---|---|
| `/signup`, `/login`, `/verify` | Authenticated | Redirect to `/dashboard` |
| `/welcome` | Unauthenticated | Redirect to `/signup` |
| `/dashboard`, `/api/*` (protected) | Unauthenticated | Redirect to `/signup` |
| `/signup`, `/login`, `/verify` | Unauthenticated | Allow |
| `/welcome` | Authenticated | Allow |

**Implementation:** Uses `@supabase/ssr` to read the session from cookies in the middleware. Does not make database calls — session validity is determined by Supabase token.

---

## 9. Supabase Client Configuration

### Browser Client

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### Server Client

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
```

### Environment Variables Required

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `http://127.0.0.1:54321` (local) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJ...` |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

---

## 10. File Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth route group (unauthenticated layout)
│   │   ├── signup/
│   │   │   └── page.tsx           # Signup screen
│   │   ├── login/
│   │   │   └── page.tsx           # Login screen
│   │   ├── verify/
│   │   │   └── page.tsx           # OTP verification screen
│   │   └── layout.tsx             # Shared auth layout (centered card)
│   ├── (app)/                     # Authenticated route group
│   │   ├── welcome/
│   │   │   └── page.tsx           # Workspace ready screen
│   │   └── dashboard/
│   │       └── page.tsx           # Dashboard (placeholder)
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts       # Auth callback handler
│   ├── layout.tsx                 # Root layout
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   └── server.ts              # Server Supabase client
│   └── prisma.ts                  # Prisma client singleton
├── services/
│   └── provisioning.ts            # User + Tenant provisioning logic
├── middleware.ts                   # Route protection middleware
└── components/
    └── auth/
        ├── auth-card.tsx           # Shared card wrapper
        ├── email-form.tsx          # Email input + Continue
        ├── google-sign-in-button.tsx
        ├── otp-input.tsx           # Single text field for variable-length OTP codes
        └── auth-divider.tsx        # "or" divider
```

---

## 11. Testing Strategy

### Provisioning Tests

```
TEST: provisions_user_tenant_membership_atomically
GIVEN:
  - A valid Supabase user identity that does not exist in the database
WHEN:
  - provisionUser is called
THEN:
  - User record is created with correct supabaseId and email
  - Tenant record is created with default name
  - Membership record is created with role OWNER
  - All three records reference each other correctly

TEST: rolls_back_on_tenant_creation_failure
GIVEN:
  - A valid Supabase user identity
  - Tenant creation is forced to fail (e.g., via mock)
WHEN:
  - provisionUser is called
THEN:
  - No User record exists in the database
  - No Tenant record exists in the database
  - No Membership record exists in the database
  - Error is thrown

TEST: handles_duplicate_supabase_id_race_condition
GIVEN:
  - A valid Supabase user identity
  - A User with that supabaseId already exists (created by concurrent request)
WHEN:
  - provisionUser is called and hits unique constraint error
THEN:
  - Existing user is returned
  - isNew is false
  - No duplicate records created

TEST: lowercases_and_trims_email
GIVEN:
  - Supabase user with email "  User@Example.COM  "
WHEN:
  - provisionUser is called
THEN:
  - User.email is "user@example.com"
```

### User Detection Tests

```
TEST: detects_new_user
GIVEN:
  - No User record exists for the given supabaseId
WHEN:
  - getOrProvisionUser is called
THEN:
  - Returns isNew: true
  - User, Tenant, Membership created

TEST: detects_existing_user
GIVEN:
  - A User record already exists for the given supabaseId
WHEN:
  - getOrProvisionUser is called
THEN:
  - Returns isNew: false
  - No new records created
```

### User Isolation Tests

```
TEST: user_cannot_access_other_tenant
GIVEN:
  - User A with Tenant A
  - User B with Tenant B
WHEN:
  - A query for Tenant B is made with User A's userId
THEN:
  - No results returned (empty set or null, not an error)

TEST: membership_enforces_user_tenant_uniqueness
GIVEN:
  - An existing Membership for User A → Tenant A
WHEN:
  - A second Membership for User A → Tenant A is attempted
THEN:
  - Unique constraint error is raised
```

### Middleware Tests

```
TEST: redirects_authenticated_user_from_signup_to_dashboard
GIVEN:
  - User has a valid session cookie
WHEN:
  - User navigates to /signup
THEN:
  - Redirected to /dashboard

TEST: redirects_unauthenticated_user_from_dashboard_to_signup
GIVEN:
  - No valid session cookie
WHEN:
  - User navigates to /dashboard
THEN:
  - Redirected to /signup

TEST: allows_unauthenticated_user_to_access_signup
GIVEN:
  - No valid session cookie
WHEN:
  - User navigates to /signup
THEN:
  - Page renders normally
```

### Auth Callback Tests

```
TEST: callback_provisions_new_user_and_redirects_to_welcome
GIVEN:
  - Valid auth code from Supabase
  - No existing User for the authenticated identity
WHEN:
  - GET /api/auth/callback?code=valid_code
THEN:
  - User + Tenant + Membership created
  - Redirect to /welcome

TEST: callback_redirects_existing_user_to_dashboard
GIVEN:
  - Valid auth code from Supabase
  - User already exists for the authenticated identity
WHEN:
  - GET /api/auth/callback?code=valid_code
THEN:
  - No new records created
  - Redirect to /dashboard

TEST: callback_redirects_to_signup_on_invalid_code
GIVEN:
  - Invalid or expired auth code
WHEN:
  - GET /api/auth/callback?code=invalid
THEN:
  - Redirect to /signup?error=auth_failed
```

### Test Data Factories

```typescript
function createTestUser(
  prisma: PrismaClient,
  overrides?: Partial<Prisma.UserCreateInput>,
) {
  return prisma.user.create({
    data: {
      supabaseId: overrides?.supabaseId ?? `supabase-${cuid()}`,
      email: overrides?.email ?? `test-${cuid()}@example.com`,
      name: overrides?.name ?? null,
      avatarUrl: overrides?.avatarUrl ?? null,
      ...overrides,
    },
  });
}

function createTestTenant(
  prisma: PrismaClient,
  overrides?: Partial<Prisma.TenantCreateInput>,
) {
  return prisma.tenant.create({
    data: {
      name: overrides?.name ?? "Test Workspace",
      ...overrides,
    },
  });
}

function createTestUserWithTenant(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const user = await createTestUser(tx as PrismaClient);
    const tenant = await createTestTenant(tx as PrismaClient);
    const membership = await (tx as PrismaClient).membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "OWNER",
      },
    });
    return { user, tenant, membership };
  });
}
```

---

## 12. Acceptance Criteria

### 1. Authentication
- [ ] User can sign up via email OTP
- [ ] User can sign up via Google OAuth
- [ ] User can sign in via email OTP
- [ ] User can sign in via Google OAuth
- [ ] Invalid OTP shows inline error and clears fields
- [ ] Expired OTP shows appropriate message
- [ ] OTP resend works with 60s cooldown
- [ ] Rate limiting is surfaced to the user
- [ ] Google OAuth failure shows toast

### 2. Provisioning
- [ ] New user triggers atomic creation of User + Tenant + Membership
- [ ] Transaction rollback prevents partial records on failure
- [ ] Duplicate Supabase ID race condition is handled gracefully
- [ ] Email is stored lowercased and trimmed
- [ ] Tenant name defaults to `"{email}'s workspace"`
- [ ] Membership role is `OWNER`

### 3. Routing
- [ ] New user → `/welcome` after auth
- [ ] Existing user → `/dashboard` after auth
- [ ] Authenticated user accessing `/signup` or `/login` → `/dashboard`
- [ ] Unauthenticated user accessing `/dashboard` → `/signup`
- [ ] `/verify` without email state → `/signup`
- [ ] `/welcome` for non-new user → `/dashboard`

### 4. User Isolation
- [ ] All queries enforce `userId` scoping
- [ ] No cross-tenant data access paths exist
- [ ] Membership uniqueness constraint enforced

### 5. UI
- [ ] Matches design doc screens exactly
- [ ] Loading states on all buttons during async operations
- [ ] Parallel auth attempts prevented (both buttons disable)
- [ ] OTP text field accepts variable-length codes, paste support
- [ ] Welcome screen success icon animates on mount
- [ ] Toast notifications for errors and confirmations
- [ ] Responsive on mobile (card fills width, OTP inputs fit)

---

## 13. Explicit Non-Goals (v1)

- ❌ Session management, refresh tokens, or session persistence (Pitch 2)
- ❌ Password-based authentication
- ❌ MFA or biometrics
- ❌ Apple Sign-In or other OAuth providers beyond Google
- ❌ Multiple tenants per user
- ❌ Auth settings UI
- ❌ Custom auth implementation (must use Supabase Auth)
- ❌ Email template customization for OTP/magic links
- ❌ Account deletion or data export
- ❌ Admin panel for user management
- ❌ Onboarding tutorial beyond the welcome confirmation
- ❌ Financial data, Plaid, or transaction systems

---

## 14. Resolved Decisions

- **OTP + Magic Link (both):** Supabase OTP emails include both a numeric code and a clickable magic link. The user can either enter the code on the `/verify` screen or click the link in the email (which hits `/api/auth/callback`). Both paths are supported. The OTP input is a single text field (not fixed 6-digit) because Supabase codes can vary in length.
- **Google duplicate handling:** Rely on Supabase identity linking. If a user signs up with email and later signs in with Google using the same email, Supabase links the identities. Same email = same user. No application-level deduplication needed.
- **Tenant naming:** Default is `"{email}'s workspace"`. Not editable in v1. May be added in a future settings feature.

## 15. Open Questions

None at this time.

---

## 16. Future Considerations

- **Session management (Pitch 2):** Will add refresh token handling, session persistence, and device management on top of this auth foundation.
- **Multi-tenant:** The `Membership` model already supports multiple memberships per user. Enabling multi-tenant is a policy change, not a schema change.
- **Additional OAuth providers:** Adding Apple, GitHub, etc. requires only Supabase config and a new button — no schema changes.
- **MFA:** Supabase supports TOTP MFA. Can be added as an opt-in layer without changing the provisioning flow.
- **All downstream features** (accounts, transactions, goals, decisions) will be scoped to `Tenant` via the user's active membership. The `tenantId` will be resolved from the authenticated user's membership in every request.

# Financial Account Connection & Initial Financial Activation — Design Document

**Version:** 1.0
**Focus:** Guided Plaid account connection, sync progress experience, and financial activation — transforming an empty workspace into a system that is actively working with real financial data.

---

## 1. Vision

After signup, the user has a clean workspace but zero financial data. The system cannot help them until real accounts are connected. This feature turns the empty dashboard into a guided activation flow: the user connects their bank accounts via Plaid, watches the system begin working, and arrives at a state where P.R.I.M.E. is actively preparing their financial picture.

**Design north star:** Guided financial activation. The user should feel that connecting accounts is safe, simple, and immediately productive — not a technical chore. Every screen state communicates what is happening, why it matters, and what comes next.

---

## 2. Design Principles

### 1. Trust Before Action

Before the user clicks "Connect Accounts," they must understand: read-only access, secure connection, no ability to move money. Trust messaging is not decoration — it is a prerequisite for action.

### 2. Progress Over Loading

The system must never show a raw spinner. Every wait state communicates what the system is doing ("Connecting accounts," "Syncing balances," "Analyzing activity") so the user feels the system is working intelligently, not stalling.

### 3. Honest State

Sync status must reflect real backend state. Never show "analysis complete" before it is. Never imply financial conclusions before data is processed. If something is delayed or incomplete, say so clearly.

### 4. Minimal Decisions

The user makes one decision: connect accounts. Everything else — token exchange, account creation, sync trigger, state transitions — is automatic. The flow should feel like one continuous motion from CTA to activation.

### 5. First Value, Not Full Value

This feature delivers "your data is being prepared," not "here are your insights." The design must set expectations correctly — the system is active, but insights come next.

---

## 3. Visual Language

> All styling inherits from the P.R.I.M.E. design system and existing MUI component library. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `grey.50` | `#F9FAFB` | Page background (inherited from app shell) |
| `grey.100` | `#F3F4F6` | Sidebar background (inherited) |
| `grey.200` | `#E5E7EB` | Card borders, dividers |
| `grey.300` | `#D1D5DB` | Disabled / placeholder content |
| `grey.400` | `#9CA3AF` | Secondary text, muted labels |
| `grey.500` | `#6B7280` | Supporting body text |
| `grey.900` | `#111827` | Primary headings |
| `blue.600` | `#2563EB` | Primary CTA, active progress indicators |
| `blue.700` | `#1D4ED8` | CTA hover state |
| `emerald.600` | `#059669` | Success / activation complete |
| `emerald.50` | `#ECFDF5` | Success icon background |
| `red.600` | `#DC2626` | Error states |
| `amber.600` | `#D97706` | Warning / slow sync states |

### Status Colors

| State | Color | Usage |
|---|---|---|
| Ready to connect | `grey.400` | Pre-connection empty state |
| Connecting / syncing | `blue.600` | Active progress steps |
| Completed step | `emerald.600` | Finished progress steps |
| Activation complete | `emerald.600` | Success confirmation |
| Error / failed | `red.600` | Connection or sync failure |
| Slow / delayed | `amber.600` | Sync taking longer than expected |

### Typography

All typography uses the MUI default theme (Roboto) as established in the codebase. Feature-specific usage:

| Element | MUI Variant | sx Overrides | Usage |
|---|---|---|---|
| Section heading | `h5` | `fontWeight: 600` | "Connect your accounts" |
| Body / description | `body2` | `color: grey.500` | Trust messaging, descriptions |
| Progress step label | `body2` | `fontWeight: 500` | "Syncing balances" |
| Progress sublabel | `caption` | `color: grey.400` | Step descriptions |
| Trust badge text | `caption` | `fontWeight: 500` | "Read-only access" |
| Success heading | `h5` | `fontWeight: 600, color: grey.900` | "Your financial profile is ready" |

### Spacing

Inherits the existing app shell spacing system:
- Main content padding: `p: { xs: 2, lg: 3 }` (inherited from AppLayout)
- Card internal padding: `p: 3` to `p: 5` depending on content density
- Element vertical spacing within cards: `gap: 2` (16px)
- Section spacing: `gap: 3` (24px)

### Border Radius / Surface Language

Follows existing Card treatment:
- Cards: MUI `variant="outlined"` (1px border, `grey.200`)
- Buttons: MUI default radius (`4px`) or `borderRadius: 2` (8px) for primary CTAs
- Trust badges: `borderRadius: 1` (4px) with light background fill
- Progress indicators: `borderRadius: '50%'` for step circles

---

## 4. Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ App Shell (Sidebar + Header — inherited from AppLayout)         │
│ ├─ Dashboard (active)                                           │
│ ├─ Budget                                                       │
│ ├─ Goals                                                        │
│ ├─ Purchases                                                    │
│ └─ Settings                                                     │
│                                                                 │
│ Main Content Area                                               │
│ ┌─ Summary Cards (Net Worth / Spending / Bills) ──────────────┐ │
│ │ Placeholder values (—) — unchanged from current dashboard   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ STATE A: Pre-Connection (default)                               │
│ ┌─ Connection Card ───────────────────────────────────────────┐ │
│ │ Trust messaging + [Connect Accounts] CTA                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ STATE B: Syncing (after Plaid completes)                        │
│ ┌─ Sync Progress Card ───────────────────────────────────────┐ │
│ │ Connected institution + step-by-step progress               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ STATE C: Activation Complete                                    │
│ ┌─ Activation Card ──────────────────────────────────────────┐ │
│ │ Success confirmation + "preparing insights" messaging       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Recent Activity ──────┐  ┌─ Insights ─────────────────────┐ │
│ │ Empty state (unchanged)│  │ Empty state (unchanged)         │ │
│ └────────────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Plaid Link — opens as overlay/modal (Plaid-controlled)
```

---

## 5. Screen Specifications

---

### Screen 1: Dashboard — Pre-Connection State

#### Purpose

Guide the user to connect their first financial account with clear trust messaging and a single CTA.

#### URL Pattern

`/dashboard`

#### Primary User Question

> "What do I do to get started?"

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Net Worth: —]    [Spending: —]    [Upcoming Bills: —]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [bank icon]                                    │
│                                                             │
│   Connect your financial accounts                           │
│                                                             │
│   P.R.I.M.E. securely connects to your bank to             │
│   organize transactions, track spending, and help           │
│   you make confident financial decisions.                   │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────────┐            │
│   │ Read-only│  │ Encrypted│  │ No money     │            │
│   │ access   │  │ & secure │  │ movement     │            │
│   └──────────┘  └──────────┘  └──────────────┘            │
│                                                             │
│              [ Connect Accounts ]                           │
│                                                             │
│   Secured by Plaid — used by thousands of apps              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Recent Activity]          │  [Insights]                   │
│  No transactions yet        │  No insights yet              │
│  ...                        │  ...                          │
└─────────────────────────────────────────────────────────────┘
```

#### Connection Card (replaces current GetStartedCard)

| Element | Styling & Behavior |
|---|---|
| **Card** | MUI `Card variant="outlined"`, `sx={{ p: 5, textAlign: 'center' }}` |
| **Icon** | MUI `AccountBalanceOutlined`, `sx={{ fontSize: 48, color: 'grey.400' }}` |
| **Heading** | "Connect your financial accounts" — MUI `Typography variant="h6"`, `sx={{ fontWeight: 600, color: 'grey.900', mt: 2 }}` |
| **Description** | "P.R.I.M.E. securely connects to your bank to organize transactions, track spending, and help you make confident financial decisions." — `Typography variant="body2"`, `sx={{ color: 'grey.500', maxWidth: 480, mx: 'auto', mt: 1 }}` |
| **Trust badges** | Row of 3 badges, `display: 'flex', justifyContent: 'center', gap: 2, mt: 3`. Each badge: MUI `Box` with `sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.75, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}` |
| **Trust badge — Read-only** | `VisibilityOutlined` icon (16px, `grey.500`) + "Read-only access" `Typography caption fontWeight: 500` |
| **Trust badge — Encrypted** | `LockOutlined` icon (16px, `grey.500`) + "Encrypted & secure" |
| **Trust badge — No movement** | `BlockOutlined` icon (16px, `grey.500`) + "No money movement" |
| **CTA button** | "Connect Accounts" — MUI `Button variant="contained"`, `sx={{ mt: 3, px: 4, py: 1.25, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}` |
| **Plaid attribution** | "Secured by Plaid" — `Typography caption`, `sx={{ color: 'grey.400', mt: 1.5 }}` |

#### Code Reference

```jsx
<Card variant="outlined" sx={{ p: 5, textAlign: "center" }}>
  <AccountBalanceOutlined sx={{ fontSize: 48, color: "grey.400" }} />

  <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}>
    Connect your financial accounts
  </Typography>

  <Typography
    variant="body2"
    sx={{ color: "grey.500", maxWidth: 480, mx: "auto", mt: 1 }}
  >
    P.R.I.M.E. securely connects to your bank to organize transactions,
    track spending, and help you make confident financial decisions.
  </Typography>

  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      gap: 2,
      mt: 3,
      flexWrap: "wrap",
    }}
  >
    <TrustBadge icon={VisibilityOutlined} label="Read-only access" />
    <TrustBadge icon={LockOutlined} label="Encrypted & secure" />
    <TrustBadge icon={BlockOutlined} label="No money movement" />
  </Box>

  <Button
    variant="contained"
    onClick={handleConnectAccounts}
    sx={{
      mt: 3,
      px: 4,
      py: 1.25,
      borderRadius: 2,
      textTransform: "none",
      fontWeight: 600,
    }}
  >
    Connect Accounts
  </Button>

  <Typography variant="caption" sx={{ display: "block", color: "grey.400", mt: 1.5 }}>
    Secured by Plaid
  </Typography>
</Card>
```

#### Behavior

- **CTA click:** Calls backend to create a Plaid Link token, then opens the Plaid Link modal
- **Plaid Link opens:** Plaid-controlled overlay — user selects institution, authenticates, selects accounts
- **Plaid Link success:** `onSuccess` callback receives `public_token` + account metadata. Sends to backend. Dashboard transitions to Sync Progress state.
- **Plaid Link exit (no selection):** Modal closes, dashboard remains in pre-connection state. No toast needed.
- **Plaid Link error:** Toast: "Could not connect to your bank. Please try again." (5s)

---

### Screen 2: Dashboard — Sync Progress State

#### Purpose

Show the user that the system is actively working with their financial data. Maintain trust and engagement during the async sync process.

#### URL Pattern

`/dashboard` (same URL, state-driven)

#### Primary User Question

> "Is it working? What's happening with my data?"

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Net Worth: —]    [Spending: —]    [Upcoming Bills: —]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [institution logo]  Chase Bank                            │
│                       3 accounts connected                  │
│                                                             │
│   ─────────────────────────────────────────                 │
│                                                             │
│   (o) Connecting accounts .................. done           │
│   (o) Syncing balances ..................... done           │
│   (o) Retrieving transactions .............. in progress   │
│   ( ) Analyzing your financial activity .... pending        │
│                                                             │
│   This usually takes a minute or two.                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Recent Activity]          │  [Insights]                   │
│  No transactions yet        │  No insights yet              │
│  ...                        │  ...                          │
└─────────────────────────────────────────────────────────────┘
```

#### Sync Progress Card

| Element | Styling & Behavior |
|---|---|
| **Card** | MUI `Card variant="outlined"`, `sx={{ p: 4 }}` |
| **Institution row** | `Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}`. Institution icon: 40x40 rounded square (from Plaid metadata or generic bank icon). Institution name: `Typography variant="subtitle1" fontWeight: 600`. Account count: `Typography variant="body2" color="grey.500"` |
| **Divider** | MUI `Divider sx={{ my: 3 }}` |
| **Progress steps** | Vertical list, `display: 'flex', flexDirection: 'column', gap: 2.5` |
| **Step — completed** | Circle: 24px, `bgcolor: 'success.main'` with `CheckOutlined` icon (14px, white). Label: `Typography body2 fontWeight: 500 color: grey.900`. Status: `Typography caption color: success.main` — "Done" |
| **Step — in progress** | Circle: 24px, `border: 2px solid`, `borderColor: 'primary.main'` with pulsing dot animation. Label: `Typography body2 fontWeight: 500 color: grey.900`. Status: `CircularProgress size={14}` |
| **Step — pending** | Circle: 24px, `bgcolor: 'grey.200'`. Label: `Typography body2 color: grey.400` |
| **Time estimate** | "This usually takes a minute or two." — `Typography caption color: grey.400`, `sx={{ mt: 2 }}` |

#### Steps

| Step | Label | Description |
|---|---|---|
| 1 | Connecting accounts | Plaid token exchange + account record creation |
| 2 | Syncing balances | Fetching current account balances |
| 3 | Retrieving transactions | Fetching initial transaction history window |
| 4 | Analyzing your financial activity | Backend marks data as ready for processing |

#### Code Reference

```jsx
<Card variant="outlined" sx={{ p: 4 }}>
  {/* Institution header */}
  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
    <Box
      component="img"
      src={institutionLogo}
      alt=""
      sx={{ width: 40, height: 40, borderRadius: 1 }}
    />
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {institutionName}
      </Typography>
      <Typography variant="body2" sx={{ color: "grey.500" }}>
        {accountCount} {accountCount === 1 ? "account" : "accounts"} connected
      </Typography>
    </Box>
  </Box>

  <Divider sx={{ my: 3 }} />

  {/* Progress steps */}
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
    {steps.map((step) => (
      <SyncStep
        key={step.id}
        label={step.label}
        status={step.status}
      />
    ))}
  </Box>

  <Typography variant="caption" sx={{ color: "grey.400", mt: 2, display: "block" }}>
    This usually takes a minute or two.
  </Typography>
</Card>
```

#### Behavior

- **State polling:** Frontend polls backend sync status endpoint every 3–5 seconds via SWR with `refreshInterval`
- **Step transitions:** Steps animate from pending to in-progress to completed sequentially based on backend state
- **All steps complete:** Automatically transitions to Activation Complete state (no user action required)
- **Slow sync (>60s):** Time estimate text changes to "Taking a bit longer than usual. Hang tight." with `color: amber.600`
- **Sync failure:** Toast: "Something went wrong syncing your accounts. We'll retry automatically." Card shows a "Retry" button below the failed step. Failed step circle turns `red.600`.
- **Page refresh during sync:** Sync card persists — state is backend-driven, not client-only

---

### Screen 3: Dashboard — Activation Complete State

#### Purpose

Confirm that the user's financial data is connected and the system is preparing insights. Set expectations for what comes next.

#### URL Pattern

`/dashboard` (same URL, state-driven)

#### Primary User Question

> "Is it done? What happens now?"

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Net Worth: —]    [Spending: —]    [Upcoming Bills: —]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [checkmark icon]                               │
│                                                             │
│   Your financial profile is ready                           │
│                                                             │
│   We've connected your accounts and started                 │
│   analyzing your financial activity. Your                   │
│   insights are being prepared.                              │
│                                                             │
│   ┌───────────────────────────────────────┐                │
│   │  [bank icon]  Chase Bank              │                │
│   │               3 accounts  ·  Synced   │                │
│   └───────────────────────────────────────┘                │
│                                                             │
│   [ + Connect Another Account ]                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Recent Activity]          │  [Insights]                   │
│  No transactions yet        │  No insights yet              │
│  ...                        │  ...                          │
└─────────────────────────────────────────────────────────────┘
```

#### Activation Card

| Element | Styling & Behavior |
|---|---|
| **Card** | MUI `Card variant="outlined"`, `sx={{ p: 5, textAlign: 'center' }}` |
| **Success icon** | MUI `CheckCircleOutlined`, `sx={{ fontSize: 48, color: 'success.main' }}`. Animate on mount: scale from 0.8 to 1.0, 300ms ease-out. |
| **Heading** | "Your financial profile is ready" — `Typography variant="h6" fontWeight: 600 color: grey.900 mt: 2` |
| **Description** | "We've connected your accounts and started analyzing your financial activity. Your insights are being prepared." — `Typography body2 color: grey.500 maxWidth: 440 mx: auto mt: 1` |
| **Connected accounts list** | `Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 360, mx: 'auto' }}`. Per institution: `Box` with institution icon (32px), name (`body2 fontWeight: 500`), account count + "Synced" status (`caption color: success.main`) |
| **Connect another CTA** | "Connect Another Account" — MUI `Button variant="outlined"`, `sx={{ mt: 3, textTransform: 'none' }}` |

#### Code Reference

```jsx
<Card variant="outlined" sx={{ p: 5, textAlign: "center" }}>
  <CheckCircleOutlined
    sx={{
      fontSize: 48,
      color: "success.main",
      animation: "scaleIn 300ms ease-out",
    }}
  />

  <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mt: 2 }}>
    Your financial profile is ready
  </Typography>

  <Typography
    variant="body2"
    sx={{ color: "grey.500", maxWidth: 440, mx: "auto", mt: 1 }}
  >
    We&apos;ve connected your accounts and started analyzing your financial
    activity. Your insights are being prepared.
  </Typography>

  {/* Connected institutions */}
  <Box
    sx={{
      mt: 3,
      display: "flex",
      flexDirection: "column",
      gap: 1,
      maxWidth: 360,
      mx: "auto",
    }}
  >
    {institutions.map((inst) => (
      <ConnectedInstitutionRow key={inst.id} institution={inst} />
    ))}
  </Box>

  <Button
    variant="outlined"
    onClick={handleConnectAnother}
    sx={{ mt: 3, textTransform: "none" }}
  >
    Connect Another Account
  </Button>
</Card>
```

#### Behavior

- **Mount animation:** Success icon scales in with 300ms ease-out
- **Connect Another Account:** Opens Plaid Link again for additional institutions. On success, adds to connected list and re-runs sync for new accounts.
- **Persistence:** This state is the new "default" dashboard card once at least one account is connected and synced. The pre-connection card never returns (unless all accounts are disconnected, which is out of scope).
- **Transition:** Once Pitch 3+ delivers real financial data, this card is replaced by actual financial content. For now it remains as the activation confirmation.

---

## 6. Navigation Flows

```
┌─ /dashboard (pre-connection) ────────────────────────────────┐
│                                                               │
│  [Connect Accounts] ──────────────────────────────────────────│──→ Plaid Link (overlay)
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌─ Plaid Link ──────────────────────────────────────────────────┐
│                                                               │
│  onSuccess ───────────────────────────────────────────────────│──→ /dashboard (syncing)
│  onExit (no selection) ───────────────────────────────────────│──→ /dashboard (pre-connection)
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌─ /dashboard (syncing) ────────────────────────────────────────┐
│                                                               │
│  all steps complete (automatic) ──────────────────────────────│──→ /dashboard (activation complete)
│  sync failure + [Retry] ──────────────────────────────────────│──→ /dashboard (syncing, retry)
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌─ /dashboard (activation complete) ────────────────────────────┐
│                                                               │
│  [Connect Another Account] ───────────────────────────────────│──→ Plaid Link (overlay)
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Navigation type:** All transitions are state-driven on the same `/dashboard` URL. No page navigation occurs. Plaid Link is an overlay controlled by `react-plaid-link`.

**State carried:**
- Pre-connection -> Plaid Link: Plaid Link token (from backend API)
- Plaid Link -> Syncing: `public_token`, account metadata (via `onSuccess` callback)
- Syncing -> Activation Complete: backend sync status (polled via SWR)

**Deep-link behavior:**
- `/dashboard` always renders the correct state based on backend data (has accounts? sync status?)
- No separate URLs for sync states — this prevents stale bookmarks

---

## 7. Interaction Specifications

### Keyboard Navigation

| Context | Key | Action |
|---|---|---|
| Pre-connection card | `Tab` | Focus Connect Accounts button |
| Pre-connection card | `Enter` / `Space` | Open Plaid Link |
| Activation complete | `Tab` | Focus Connect Another Account button |
| Activation complete | `Enter` / `Space` | Open Plaid Link for additional account |

### Loading States

**Plaid Link token creation (before overlay opens):**
- "Connect Accounts" button shows a 16px `CircularProgress` replacing text
- Button disabled during loading
- If token creation fails: toast error, button re-enables

**Sync progress:**
- No skeleton. The Sync Progress Card itself IS the loading experience.
- Steps transition sequentially with smooth state changes
- In-progress step has a subtle pulse animation on the circle indicator

**Dashboard state determination (page load):**
- Brief skeleton shimmer on the main card area while SWR fetches account/sync status
- Duration: typically <500ms (single API call)
- Skeleton: `Box` with `bgcolor: grey.100`, `borderRadius: 1`, same dimensions as Connection Card

### Error States

**Plaid Link token creation failure:**

```jsx
// Toast notification
toast.error("Could not start account connection. Please try again.");
```

**Plaid Link internal error (bank unreachable, auth failed):**

```jsx
// Toast notification — Plaid provides error metadata
toast.error("Could not connect to your bank. Please try again.");
```

**Sync failure (backend reports error):**

The Sync Progress Card shows the failed step with an error indicator and a retry action:

```jsx
<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
  <Box
    sx={{
      width: 24,
      height: 24,
      borderRadius: "50%",
      bgcolor: "error.main",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <CloseOutlined sx={{ fontSize: 14, color: "white" }} />
  </Box>
  <Typography variant="body2" sx={{ fontWeight: 500, color: "error.main" }}>
    {step.label}
  </Typography>
</Box>
<Button
  size="small"
  onClick={handleRetry}
  sx={{ mt: 1, ml: 5, textTransform: "none" }}
>
  Retry
</Button>
```

### Empty States

**Pre-connection:** The Connection Card IS the empty state — it replaces the current disabled "Connect Accounts" button with an active, trust-messaging-rich CTA.

**Post-connection, pre-insight:** The activation complete card clearly communicates "insights are being prepared" — the Recent Activity and Insights cards remain in their existing empty states from the current dashboard.

### Toast Notifications

| Action | Message | Duration |
|---|---|---|
| Plaid Link token failure | "Could not start account connection. Please try again." | 5s |
| Plaid Link bank error | "Could not connect to your bank. Please try again." | 5s |
| Sync failure | "Something went wrong syncing your accounts. We'll retry automatically." | 5s |
| Retry triggered | "Retrying sync..." | 3s |
| All syncs complete | "Accounts connected successfully." | 3s |

Toast position: top-center (using existing `sonner` setup from app shell).

### Trust Messaging

| Location | Message | Purpose |
|---|---|---|
| Pre-connection badge 1 | "Read-only access" | Reassure: P.R.I.M.E. cannot modify accounts |
| Pre-connection badge 2 | "Encrypted & secure" | Reassure: data is protected |
| Pre-connection badge 3 | "No money movement" | Reassure: no transfers or payments possible |
| Pre-connection footer | "Secured by Plaid" | Third-party trust signal |
| Sync progress | "Connecting accounts" / "Syncing balances" etc. | Show exactly what the system is doing |
| Sync time estimate | "This usually takes a minute or two." | Set expectations, prevent anxiety |
| Activation description | "We've connected your accounts and started analyzing your financial activity." | Confirm what happened — no vague language |
| Activation description | "Your insights are being prepared." | Honest: insights are not ready yet |

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Desktop | >= 1024px | Full layout with sidebar. Cards at standard width. Trust badges in a row. |
| Tablet | 768–1023px | No sidebar (inherited). Cards full-width. Trust badges in a row. |
| Mobile | < 768px | No sidebar (drawer). Cards full-width. Trust badges stack vertically. Summary cards stack to single column. |

### Mobile Adaptations

- **Trust badges:** Stack vertically on `xs` breakpoint: `flexDirection: { xs: 'column', sm: 'row' }`
- **Connection card padding:** Reduces from `p: 5` to `p: 3` on mobile
- **Sync progress card:** Full width, no changes needed — vertical step list is inherently mobile-friendly
- **Institution row in activation:** Full width, no changes needed
- **Touch targets:** All buttons meet 44px minimum height (MUI default + padding)
- **Plaid Link:** Plaid handles its own responsive behavior — opens as full-screen on mobile

---

## 9. Component Inventory

| Component | Location | Notes |
|---|---|---|
| `ConnectionCard` | Dashboard (pre-connection) | Replaces current `GetStartedCard`. Contains trust messaging + Plaid CTA. |
| `TrustBadge` | ConnectionCard | Small reusable badge with icon + label. Used 3x in connection card. |
| `SyncProgressCard` | Dashboard (syncing) | Shows institution header + step progress. |
| `SyncStep` | SyncProgressCard | Single progress step row with status circle + label. |
| `ActivationCard` | Dashboard (activation complete) | Success confirmation with connected accounts list. |
| `ConnectedInstitutionRow` | ActivationCard | Single institution with icon, name, account count, sync status. |
| `PlaidLinkButton` | ConnectionCard, ActivationCard | Wraps `react-plaid-link` hook — handles token creation + Plaid Link lifecycle. May be a hook rather than a component. |

All components are P.R.I.M.E.-specific. `TrustBadge` may be reused in future features where trust messaging appears (e.g., settings, data permissions).

---

## 10. Out of Scope (v1)

Per the pitch document's boundaries and no-gos:

- **Transaction display** — No showing raw transaction data during or after sync
- **Balance display** — Summary cards remain as placeholders until Pitch 3+ delivers real values
- **Categorization UI** — No spending categories or labels
- **Budget previews** — No budget-related UI
- **Chart or graph display** — No financial visualizations during loading
- **AI-generated insights** — No fake or premature insights
- **Manual account entry** — Must use Plaid only
- **Account management** — No edit, disconnect, or reconnect flows
- **Multi-institution progress** — v1 shows a single sync progress card. Multiple institutions are a future extension.
- **Sync progress percentages** — Steps are binary (pending/in-progress/done), not percentage-based
- **Reconnection flows** — Handling expired or broken Plaid connections is a future feature
- **Normalization pipeline** — Belongs to Pitch 3

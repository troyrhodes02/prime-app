# Financial Baseline Engine — Design Document

**Version:** 1.0
**Focus:** The dashboard evolution from data display to financial understanding — replacing placeholder summary cards with live baseline metrics (available monthly money, income, spending) powered by deterministic analysis of normalized transactions.

---

## 1. Vision

Users who have connected accounts and can see clean transactions still cannot answer the most basic financial question: "How much money do I actually have available?" This feature removes that gap by interpreting transaction history into a clear financial baseline — monthly income, monthly spending, and available money — and surfacing it as the centerpiece of the dashboard. The user stops calculating and starts understanding.

**Design north star:** Calm financial clarity. The most important number — available monthly money — is the first thing the user sees. Supporting context exists to build trust, not to overwhelm. The dashboard shifts from "here is your data" to "here is your situation."

---

## 2. Design Principles

### 1. The Answer Comes First

The available monthly money figure is the highest-priority element on the dashboard. Every other element exists to support or explain it. If the user glances at the dashboard for two seconds, they should see this number.

### 2. Trust Through Transparency

Because this is the first time the system produces a financial conclusion (not just cleaned data), the user must understand what the number is based on. A short explanation line beneath every metric builds confidence without requiring the user to investigate.

### 3. Estimates Must Feel Honest

These are estimates derived from transaction history, not exact account balances. The UI must communicate this clearly — using language like "estimated" and "based on recent activity" — without undermining the value of the insight. The tilde (~) prefix on available money reinforces approximation.

### 4. Internal Complexity, External Simplicity

The system performs income detection, transfer filtering, spending smoothing, and pattern recognition internally. None of this complexity is exposed. The user sees three clean numbers and a short explanation for each.

### 5. Progressive Value

This is the first "payworthy" moment. The design must make the user feel that P.R.I.M.E. understood their finances — not just organized their transactions. The emotional shift is from "I see my data" to "I understand my situation."

---

## 3. Visual Language

> All styling inherits from the P.R.I.M.E. design system or current product visual language. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary.main` | `#2563EB` | Available money amount (primary metric), active states |
| `grey.50` | `#F9FAFB` | Page background |
| `grey.100` | `#F3F4F6` | Card internal dividers |
| `grey.200` | `#E5E7EB` | Card borders |
| `grey.500` | `#6B7280` | Supporting text, explanations, labels |
| `grey.700` | `#374151` | Secondary metric amounts (income, spending) |
| `grey.900` | `#111827` | Card titles |
| `success.main` | `#059669` | Income amount, income icon tint |
| `error.light` | `#FEF2F2` | Spending icon background tint (subtle) |
| `error.main` | `#DC2626` | Spending amount |
| `common.white` | `#FFFFFF` | Card backgrounds |

### Status Colors

| State | Color | Usage |
|-------|-------|-------|
| Healthy available money | `primary.main` | Available money figure when positive |
| Negative available money | `error.main` | Available money figure when spending exceeds income |
| Income indicator | `success.main` | Income amount text |
| Spending indicator | `error.main` | Spending amount text (neutral-leaning, factual) |
| Insufficient data | `grey.500` | Placeholder dash and explanation when baseline cannot be computed |

### Typography

| Element | Size | Weight | Line-Height | Usage |
|---------|------|--------|-------------|-------|
| Available money amount | 32px (h4) | 700 | 1.2 | Primary baseline metric — centerpiece |
| Available money label | 14px (body2) | 500 | 1.5 | "Available Monthly" above the amount |
| Explanation text | 13px (body2) | 400 | 1.6 | "Based on your recent income and spending" |
| Supporting card label | 12px (caption) | 500 | 1.5 | "Monthly Income", "Monthly Spending" — uppercase |
| Supporting card amount | 22px (h5) | 600 | 1.3 | Income and spending figures |
| Confidence note | 12px (caption) | 400 | 1.5 | "Estimated from 90 days of activity" |

### Spacing

- Summary card grid gap: 16px (existing)
- Primary card internal padding: 32px vertical, 24px horizontal
- Supporting card internal padding: 20px
- Gap between primary metric and explanation: 8px
- Gap between label and amount: 4px

### Surface Language

- Primary baseline card: `border-radius: 8px`, `border: 1px solid grey.200`, `background: white`, no shadow — same as existing cards but taller due to content hierarchy
- Supporting summary cards: Same surface treatment as existing `SummaryCard` components
- No elevation changes — flat, calm, trust-first

---

## 4. Information Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar                                                              │
│ ├─ Dashboard                                                         │
│ ├─ Transactions                                                      │
│ ├─ Budget                                                            │
│ ├─ Goals                                                             │
│ ├─ Purchases                                                         │
│ ─────────────                                                        │
│ ├─ Settings                                                          │
│                                                                      │
│ Main Content — Dashboard                                             │
│                                                                      │
│ ┌─ Summary Cards (updated) ──────────────────────────────────────┐  │
│ │ [Monthly Income]  [Monthly Spending]  [Upcoming Bills]          │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌─ Available Monthly Money (NEW — CENTERPIECE) ──────────────────┐  │
│ │  ~$1,240 available per month                                    │  │
│ │  Based on your recent income and spending patterns              │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌─ Connection / Accounts Card ───────────────────────────────────┐  │
│ │ (existing behavior, no changes)                                 │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌─ Recent Activity ──────────┐  ┌─ Insights ─────────────────────┐  │
│ │ 5 cleaned transactions     │  │ (empty state — unchanged)       │  │
│ │ [View All Transactions]    │  │                                 │  │
│ └────────────────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Layout Changes from Previous State

| Element | Before | After |
|---------|--------|-------|
| Summary cards row | Net Worth, Spending This Month, Upcoming Bills (all placeholder dashes) | Monthly Income (live), Monthly Spending (live), Upcoming Bills (placeholder) |
| Available money card | Did not exist | **New** — inserted between summary cards and connection/accounts card |
| Connection/accounts card | Unchanged | Unchanged |
| Recent Activity / Insights | Unchanged | Unchanged |

### Route Map

| Route | Label | Status |
|-------|-------|--------|
| `/dashboard` | Dashboard | Updated — summary cards + baseline card populated |

No new routes are introduced by this feature.

---

## 5. Screen Specifications

---

### Screen 1: Dashboard — Summary Cards (Updated)

#### Purpose

Replace the placeholder "Net Worth" and "Spending This Month" summary cards with live income and spending estimates, giving immediate supporting context for the primary baseline metric.

#### URL Pattern

`/dashboard`

#### Primary User Question

"How much am I earning and spending each month?"

#### Layout

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MONTHLY INCOME  │  │ MONTHLY SPENDING │  │  UPCOMING BILLS  │
│                  │  │                  │  │                  │
│  +$4,820         │  │  -$3,580         │  │  —               │
│                  │  │                  │  │                  │
│  Estimated from  │  │  Estimated from  │  │                  │
│  recent activity │  │  recent activity │  │                  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### Summary Card — Income

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 20px |
| **Label** | caption, 12px, weight 500, `color: grey.500`, uppercase, letter-spacing 0.05em. Text: "Monthly Income" |
| **Amount** | h5, 22px, weight 600, `color: success.main`, `font-variant-numeric: tabular-nums`, margin-top 4px. Format: "+$4,820". Prefix "+" always shown |
| **Confidence note** | caption, 12px, weight 400, `color: grey.500`, margin-top 4px. Text: "Estimated from recent activity" |

#### Summary Card — Spending

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | Same surface as Income card |
| **Label** | Same styling. Text: "Monthly Spending" |
| **Amount** | h5, 22px, weight 600, `color: error.main`, `font-variant-numeric: tabular-nums`, margin-top 4px. Format: "-$3,580". Prefix "-" always shown |
| **Confidence note** | Same as Income card |

#### Summary Card — Upcoming Bills

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | Same surface |
| **Label** | Same styling. Text: "Upcoming Bills" |
| **Amount** | h6, weight 600, `color: grey.300`, margin-top 4px. Text: "—" (em dash placeholder) |
| **Confidence note** | Not shown — card remains in placeholder state |

#### Code Reference

```jsx
// Updated: src/app/(app)/dashboard/page.tsx
function SummaryCard({
  label,
  amount,
  amountColor,
  prefix,
  note,
}: {
  label: string;
  amount?: number | null;
  amountColor?: string;
  prefix?: string;
  note?: string;
}) {
  const hasValue = amount != null;

  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'grey.500',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant={hasValue ? 'h5' : 'h6'}
        sx={{
          fontWeight: 600,
          color: hasValue ? amountColor : 'grey.300',
          mt: 0.5,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {hasValue ? `${prefix}${formatCurrency(amount)}` : '—'}
      </Typography>
      {hasValue && note && (
        <Typography variant="caption" sx={{ color: 'grey.500', mt: 0.5, display: 'block' }}>
          {note}
        </Typography>
      )}
    </Card>
  );
}
```

#### Empty State (Pre-Baseline)

When the baseline has not been computed (no connected accounts, or insufficient data):

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MONTHLY INCOME  │  │ MONTHLY SPENDING │  │  UPCOMING BILLS  │
│                  │  │                  │  │                  │
│  —               │  │  —               │  │  —               │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

All three cards show the em dash placeholder. No confidence note shown. This is the existing behavior — no visual regression.

#### Behavior

- Summary cards fetch baseline data from `GET /api/v1/baseline`
- When baseline data is available, Income and Spending cards show live values
- When baseline data is unavailable (API returns `null` baseline or error), cards fall back to placeholder state
- Cards re-fetch when account sync completes (SWR revalidation)
- Amounts are in cents from the API, formatted to dollars on display

---

### Screen 2: Dashboard — Available Monthly Money Card (New)

#### Purpose

The centerpiece of the Financial Baseline Engine. Answers the user's primary financial question: "How much money do I actually have available each month?"

#### URL Pattern

`/dashboard`

#### Primary User Question

"How much money do I have available?"

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                     Available Monthly                              │
│                                                                   │
│                       ~$1,240                                     │
│                                                                   │
│          Based on your recent income and spending                  │
│          patterns over the last 90 days.                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Available Money Card

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 32px 24px, text-align center |
| **Label** | body2, 14px, weight 500, `color: grey.500`. Text: "Available Monthly" |
| **Amount** | h4, 32px, weight 700, `font-variant-numeric: tabular-nums`, margin-top 4px. Prefix "~" always shown. Color: `primary.main` when positive, `error.main` when negative or zero |
| **Explanation** | body2, 13px, weight 400, `color: grey.500`, max-width 360px, margin auto, margin-top 8px, line-height 1.6. Text: "Based on your recent income and spending patterns over the last {days} days." |

#### Code Reference

```jsx
// New: src/components/baseline-card.tsx
<Card variant="outlined" sx={{ py: 4, px: 3, textAlign: 'center' }}>
  <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.500' }}>
    Available Monthly
  </Typography>
  <Typography
    variant="h4"
    sx={{
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: availableCents >= 0 ? 'primary.main' : 'error.main',
      mt: 0.5,
    }}
  >
    ~{formatCurrency(Math.abs(availableCents))}
  </Typography>
  <Typography
    variant="body2"
    sx={{ color: 'grey.500', fontSize: 13, mt: 1, maxWidth: 360, mx: 'auto', lineHeight: 1.6 }}
  >
    Based on your recent income and spending patterns over the last {windowDays} days.
  </Typography>
</Card>
```

#### Negative Available Money State

When spending exceeds income:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                     Available Monthly                              │
│                                                                   │
│                       -$340                                       │
│                                                                   │
│        Your recent spending has exceeded your income.              │
│        This is based on the last 90 days of activity.              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

| Element | Styling & Behavior |
|---------|-------------------|
| **Amount** | `color: error.main`. No tilde prefix — the negative sign communicates the state. Format: "-$340" |
| **Explanation** | Text changes to: "Your recent spending has exceeded your income. This is based on the last {days} days of activity." Tone is factual, not alarmist |

#### Insufficient Data State

When transactions exist but the history window is too short (< 30 days):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                     Available Monthly                              │
│                                                                   │
│                         —                                         │
│                                                                   │
│         P.R.I.M.E. needs more transaction history to               │
│         estimate your available money. Check back soon.            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

| Element | Styling & Behavior |
|---------|-------------------|
| **Amount** | h4, 32px, weight 700, `color: grey.300`. Text: "—" |
| **Explanation** | Text: "P.R.I.M.E. needs more transaction history to estimate your available money. Check back soon." `color: grey.500` |

#### Empty State (Pre-Connection)

When no accounts are connected, the baseline card is **not rendered**. The dashboard shows the existing layout with placeholder summary cards and the connection card. The baseline card only appears after the first successful sync produces normalized transactions.

#### Behavior

- Card fetches from `GET /api/v1/baseline`
- Response includes: `monthlyIncomeCents`, `monthlySpendingCents`, `availableCents`, `windowDays`, `status` (`ready` | `insufficient_data` | `unavailable`)
- When `status: "ready"` — show full baseline card with amounts
- When `status: "insufficient_data"` — show insufficient data state
- When `status: "unavailable"` or API error — do not render the card
- Card revalidates on SWR focus and when sync completes
- All financial values are integers in cents, formatted to dollars on display
- The tilde (~) prefix is a UI-only addition, reinforcing that this is an estimate

---

### Screen 3: Dashboard — Full Updated Layout

#### Purpose

Show the complete dashboard layout with all baseline elements integrated.

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ MONTHLY       │  │ MONTHLY      │  │ UPCOMING     │           │
│  │ INCOME        │  │ SPENDING     │  │ BILLS        │           │
│  │               │  │              │  │              │           │
│  │ +$4,820       │  │ -$3,580      │  │ —            │           │
│  │ Estimated from│  │ Estimated    │  │              │           │
│  │ recent        │  │ from recent  │  │              │           │
│  │ activity      │  │ activity     │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌─ Available Monthly Money ─────────────────────────────────┐  │
│  │                                                             │  │
│  │                  Available Monthly                          │  │
│  │                    ~$1,240                                  │  │
│  │     Based on your recent income and spending                │  │
│  │     patterns over the last 90 days.                         │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Connected Accounts / Connection Card ────────────────────┐  │
│  │ (existing behavior — no changes)                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Recent Activity ──────┐  ┌─ Insights ─────────────────────┐  │
│  │ 5 cleaned transactions │  │ (empty state — unchanged)       │  │
│  │ [View All]             │  │                                 │  │
│  └────────────────────────┘  └─────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Render Order Logic

The baseline card renders between the summary cards row and the main connection/accounts card. It follows these rules:

| Dashboard State | Baseline Card | Summary Cards |
|----------------|---------------|---------------|
| `pre_connection` | Not rendered | All placeholder dashes |
| `syncing` | Not rendered | All placeholder dashes |
| `activation_complete` | Not rendered (activation card takes priority) | All placeholder dashes |
| `connected` + baseline `unavailable` | Not rendered | All placeholder dashes |
| `connected` + baseline `insufficient_data` | Rendered — insufficient data state | All placeholder dashes |
| `connected` + baseline `ready` | Rendered — full amounts | Income and Spending live, Upcoming Bills placeholder |

---

## 6. Navigation Flows

### Baseline Availability Flow

```
┌─ Account Connection Complete ──────────────────┐
│  Sync pipeline finishes                         │
│  Activation card shown                          │
└─────────────────────────────────────────────────┘
          │
          ▼ (user dismisses activation)
┌─ Dashboard (connected state) ──────────────────┐
│  Baseline API called                            │
│  status: "ready" | "insufficient_data"          │
└─────────────────────────────────────────────────┘
          │
          ├─ ready ──→ Full baseline card + live summary cards
          │
          └─ insufficient_data ──→ Baseline card with "needs more history" message
                                    Summary cards remain as placeholders
```

### No New Navigation Targets

This feature does not introduce new pages or navigation links. All changes are contained within the existing `/dashboard` route. The sidebar is unchanged.

---

## 7. Interaction Specifications

### Keyboard Navigation

| Context | Key | Action |
|---------|-----|--------|
| Summary cards | `Tab` | Move focus between cards (natural tab order) |
| Baseline card | `Tab` | Card is informational — receives no interactive focus |

### Loading States

**Initial dashboard load with baseline:**

Summary cards and baseline card show skeleton placeholders while `GET /api/v1/baseline` resolves.

```jsx
// Summary card skeleton
<Card variant="outlined" sx={{ p: 2.5 }}>
  <Skeleton width={100} height={14} />
  <Skeleton width={80} height={28} sx={{ mt: 0.5 }} />
  <Skeleton width={140} height={12} sx={{ mt: 0.5 }} />
</Card>

// Baseline card skeleton
<Card variant="outlined" sx={{ py: 4, px: 3, textAlign: 'center' }}>
  <Skeleton width={120} height={16} sx={{ mx: 'auto' }} />
  <Skeleton width={160} height={38} sx={{ mx: 'auto', mt: 0.5 }} />
  <Skeleton width={280} height={14} sx={{ mx: 'auto', mt: 1 }} />
</Card>
```

**Post-sync revalidation:**

No skeleton flash — SWR revalidates in background. Values update in-place when new data arrives.

### Error States

**Baseline API failure:**

The baseline card and live summary card values are not rendered. The dashboard falls back to the pre-baseline layout (placeholder dashes in summary cards, no baseline card). No error message is shown — the dashboard should not feel broken because one enrichment failed.

This matches the existing pattern where the Recent Activity card falls back silently to its empty state on API failure.

### Empty States

| State | Baseline Card | Summary Cards |
|-------|---------------|---------------|
| No accounts connected | Not shown | Placeholder dashes |
| Accounts connected, sync in progress | Not shown | Placeholder dashes |
| Sync complete, < 30 days of data | Insufficient data message | Placeholder dashes |
| Sync complete, >= 30 days of data | Full baseline display | Live income + spending |

### Toast Notifications

No toasts are introduced by this feature. The baseline computation is passive — it runs server-side and the result appears on the next dashboard load or SWR revalidation. There is no user-initiated action to confirm or fail.

### Trust Messaging

| Context | Message |
|---------|---------|
| Summary card confidence | "Estimated from recent activity" |
| Baseline card explanation (positive) | "Based on your recent income and spending patterns over the last {days} days." |
| Baseline card explanation (negative) | "Your recent spending has exceeded your income. This is based on the last {days} days of activity." |
| Insufficient data | "P.R.I.M.E. needs more transaction history to estimate your available money. Check back soon." |
| Tilde prefix | The "~" before the available money amount signals approximation without requiring explanation |

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >=1024px | Full 3-column summary grid, baseline card full-width |
| Tablet | 768-1023px | 3-column grid maintained, baseline card full-width |
| Mobile | <768px | Summary cards stack to single column, baseline card full-width |

### Mobile Adaptations

**Summary cards:**
- Stack vertically (1 column) below 768px — existing behavior via `gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }`

**Baseline card:**
- Full-width, centered text — works at all sizes without modification
- Amount font-size remains 32px on mobile (large enough to be the focal point, small enough to fit)
- Explanation text max-width 360px prevents overly wide lines on desktop; on mobile, natural wrapping handles it

**Priority:**
- On mobile, the baseline card is the most important element after the summary cards
- It must remain visible without scrolling past the fold on most devices

---

## 9. Component Inventory

| Component | Location | Notes |
|-----------|----------|-------|
| `BaselineCard` | Dashboard | **New.** Centerpiece card showing available monthly money with explanation. Handles ready, insufficient data, and hidden states |
| `SummaryCard` (updated) | Dashboard | **Modified.** Accepts optional `amount`, `amountColor`, `prefix`, and `note` props to display live values or fall back to placeholder |

### Existing Components — No Changes

| Component | Status |
|-----------|--------|
| `ConnectionCard` | Unchanged |
| `SyncProgressCard` | Unchanged |
| `ActivationCard` | Unchanged |
| `ConnectedAccountsCard` | Unchanged |
| `RecentActivityCard` | Unchanged |
| `EmptyStateCard` | Unchanged |
| Sidebar | Unchanged — no new nav items |

### Hooks

| Hook | Notes |
|------|-------|
| `useBaseline` | **New.** SWR hook for `GET /api/v1/baseline`. Returns `{ monthlyIncomeCents, monthlySpendingCents, availableCents, windowDays, status }` |

---

## 10. Out of Scope (v1)

- No category-level spending breakdown UI
- No subscription or recurring transaction display
- No income source breakdown (e.g., employer vs side income)
- No spending trend charts or graphs
- No historical baseline comparison (month-over-month)
- No user-editable income or spending overrides
- No budget creation or management
- No goal integration or affordability calculations
- No "safe to spend" or "daily allowance" calculations
- No AI-generated financial advice or recommendations
- No alerts or notifications when baseline changes
- No detailed explanation drill-down (tapping the card for more info)
- No Net Worth calculation (remains placeholder — depends on balance aggregation logic)
- No Upcoming Bills calculation (remains placeholder — depends on recurring detection)

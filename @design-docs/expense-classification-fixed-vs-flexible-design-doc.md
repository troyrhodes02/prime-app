# Expense Classification (Fixed vs Flexible) — Design Document

**Version:** 1.0
**Focus:** Classifying user spending into fixed (non-negotiable) and flexible (adjustable) categories, surfacing the breakdown on the dashboard and budget page so users instantly understand what portion of their spending they control.

---

## 1. Vision

Users who see their income, spending, and available money still cannot answer: "What part of my spending can I actually change?" All expenses look equal — rent feels the same as dining out. This feature introduces the behavioral distinction between fixed and flexible spending, making it immediately visible how much of a user's money is locked into obligations versus available for discretionary choices.

**Design north star:** Effortless spending clarity. The user glances at one card and knows exactly how much of their spending is controllable. No setup, no configuration, no mental math. The system classifies, the user understands.

---

## 2. Design Principles

### 1. The Split Is the Insight

The fixed vs flexible breakdown is not a data table — it is a financial conclusion. The design must present the ratio as the primary takeaway, not the individual transaction classifications that produced it.

### 2. Controllable Money Is the Answer

Users do not care about classification taxonomy. They care about one thing: "How much can I actually change?" The flexible amount must be the most prominent number. Fixed spending is the context that explains it.

### 3. Classification Must Feel Automatic

The system classifies transactions without user effort. The UI must reinforce this by showing results immediately, without setup screens, configuration flows, or onboarding steps. If a classification is uncertain, the system handles it gracefully — not by blocking the user.

### 4. Corrections Must Be Effortless

When the system misclassifies a transaction, the user should be able to correct it with minimal friction. But the correction flow must never feel like a required workflow — it is an optional refinement, not a setup step.

### 5. The Budget Page Earns Its Place

The budget page currently shows an empty state. This feature transforms it into the first meaningful budget surface — but only with classification data, not with budget creation or management complexity.

---

## 3. Visual Language

> All styling inherits from the P.R.I.M.E. design system or current product visual language. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary.main` | `#2563EB` | Flexible spending amount (the controllable portion — primary emphasis) |
| `grey.50` | `#F9FAFB` | Page background |
| `grey.100` | `#F3F4F6` | Card internal dividers, progress bar track |
| `grey.200` | `#E5E7EB` | Card borders |
| `grey.500` | `#6B7280` | Labels, supporting text, explanations |
| `grey.700` | `#374151` | Fixed spending amount, secondary metric text |
| `grey.900` | `#111827` | Card titles, section headings |
| `warning.main` | `#D97706` | High fixed-ratio warning state (>85% of income) |
| `common.white` | `#FFFFFF` | Card backgrounds |

### Status Colors

| State | Color | Usage |
|-------|-------|-------|
| Flexible spending (controllable) | `primary.main` | Flexible amount, flexible bar segment |
| Fixed spending (locked) | `grey.700` | Fixed amount text |
| Fixed bar segment | `grey.400` | Visual bar representing fixed portion |
| High fixed ratio warning | `warning.main` | Insight text when fixed exceeds 85% of income |
| Insufficient data | `grey.500` | Placeholder state explanations |

### Typography

| Element | Size | Weight | Line-Height | Usage |
|---------|------|--------|-------------|-------|
| Flexible spending amount | 28px (h5) | 700 | 1.2 | Primary emphasis — controllable money |
| Fixed spending amount | 22px (h5) | 600 | 1.3 | Secondary emphasis — locked money |
| Card title | 14px (body2) | 600 | 1.5 | "Spending Breakdown" |
| Category label | 14px (body2) | 500 | 1.5 | "Fixed Expenses", "Flexible Spending" |
| Amount in list | 14px (body2) | 600 | 1.5 | Individual category amounts |
| Percentage label | 13px (body2) | 500 | 1.5 | "72% of income" |
| Insight text | 13px (body2) | 400 | 1.6 | Bottom insight message |
| Explanation text | 12px (caption) | 400 | 1.5 | Confidence notes, classification basis |

### Spacing

- Dashboard card padding: 24px
- Budget page section gap: 24px
- Category list item vertical padding: 12px
- Gap between bar and amounts: 16px
- Gap between label and amount: 4px
- Divider margin: 16px vertical

### Surface Language

- Classification cards: `border-radius: 8px`, `border: 1px solid grey.200`, `background: white`, no shadow — consistent with existing dashboard cards
- Progress/ratio bar: `border-radius: 4px`, `height: 8px`, two-segment (fixed grey.400 + flexible primary.main)
- Category list items: no border, subtle bottom divider `grey.100`

---

## 4. Information Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar                                                              │
│ ├─ Dashboard                                                         │
│ ├─ Transactions                                                      │
│ ├─ Budget  ← first meaningful content                                │
│ ├─ Goals                                                             │
│ ├─ Purchases                                                         │
│ ─────────────                                                        │
│ ├─ Settings                                                          │
│                                                                      │
│ Main Content — Dashboard                                             │
│                                                                      │
│ ┌─ Summary Cards ──────────────────────────────────────────────────┐ │
│ │ [Monthly Income]  [Monthly Spending]  [Upcoming Bills]            │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Available Monthly Money (Baseline) ─────────────────────────────┐ │
│ │ ~$1,240 available per month                                       │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Spending Breakdown (NEW) ───────────────────────────────────────┐ │
│ │ Fixed: $2,100  |  Flexible: $900                                  │ │
│ │ [===========fixed==========|===flex===]                           │ │
│ │ "You control 30% of your spending"                                │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Connected Accounts ─────────────────────────────────────────────┐ │
│ │ (existing behavior)                                               │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Recent Activity ──────┐  ┌─ Insights ──────────────────────────┐ │
│ │ (existing)             │  │ (existing)                           │ │
│ └────────────────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────┐
│ Main Content — Budget Page (NEW)                                     │
│                                                                      │
│ ┌─ Spending Overview ──────────────────────────────────────────────┐ │
│ │ Total Spending: $3,000                                            │ │
│ │ [===========fixed==========|===flex===]                           │ │
│ │ Fixed: $2,100 (70%)  |  Flexible: $900 (30%)                     │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Fixed Expenses ────────────┐  ┌─ Flexible Spending ────────────┐ │
│ │ Housing         $1,400      │  │ Food & Drink      $380         │ │
│ │ Utilities         $180      │  │ Shopping           $220        │ │
│ │ Subscriptions     $120      │  │ Entertainment      $150        │ │
│ │ Insurance         $200      │  │ Personal           $100        │ │
│ │ Transportation    $200      │  │ Health              $50        │ │
│ └─────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                      │
│ ┌─ Insight ────────────────────────────────────────────────────────┐ │
│ │ "72% of your income is committed to fixed expenses.              │ │
│ │  You control the remaining 28%."                                  │ │
│ └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Layout Changes from Previous State

| Element | Before | After |
|---------|--------|-------|
| Dashboard — Spending Breakdown card | Did not exist | **New** — inserted between baseline card and connection/accounts card |
| Budget page | Empty state placeholder | **Replaced** — full spending overview with fixed/flexible breakdown by category |

### Route Map

| Route | Label | Status |
|-------|-------|--------|
| `/dashboard` | Dashboard | Updated — spending breakdown card added |
| `/budget` | Budget | Updated — empty state replaced with classification view |

No new routes are introduced.

---

## 5. Screen Specifications

---

### Screen 1: Dashboard — Spending Breakdown Card (New)

#### Purpose

Show the user how their monthly spending splits between fixed obligations and flexible discretionary spending, answering: "How much of my spending can I actually control?"

#### URL Pattern

`/dashboard`

#### Primary User Question

"What portion of my spending is controllable?"

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Spending Breakdown                                               │
│                                                                   │
│  [████████████████████████░░░░░░░░░░]                            │
│                                                                   │
│  Fixed Expenses          Flexible Spending                        │
│  $2,100                  $900                                     │
│  70% of spending         30% of spending                          │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  "You control 30% of your monthly spending."                      │
│                          [View Budget →]                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Spending Breakdown Card

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 24px |
| **Title** | body2, 14px, weight 600, `color: grey.900`. Text: "Spending Breakdown" |
| **Ratio bar** | Height 8px, `border-radius: 4px`, full width, margin-top 16px. Two segments: fixed (`grey.400`) + flexible (`primary.main`). Width proportional to amounts |
| **Fixed label** | body2, 14px, weight 500, `color: grey.500`, margin-top 16px. Text: "Fixed Expenses" |
| **Fixed amount** | h5, 22px, weight 600, `color: grey.700`, margin-top 4px. Format: "$2,100" |
| **Fixed percentage** | body2, 13px, weight 500, `color: grey.500`, margin-top 2px. Format: "70% of spending" |
| **Flexible label** | body2, 14px, weight 500, `color: grey.500`, margin-top 16px. Text: "Flexible Spending" |
| **Flexible amount** | h5, 22px, weight 700, `color: primary.main`, margin-top 4px. Format: "$900". Bolder weight — this is the actionable number |
| **Flexible percentage** | body2, 13px, weight 500, `color: grey.500`, margin-top 2px. Format: "30% of spending" |
| **Divider** | `border-top: 1px solid grey.100`, margin 16px 0 |
| **Insight text** | body2, 13px, weight 400, `color: grey.500`, line-height 1.6. Dynamic text (see Insight Logic below) |
| **View Budget link** | body2, 13px, weight 500, `color: primary.main`, cursor pointer. Text: "View Budget →". Navigates to `/budget` |

#### Insight Logic

| Condition | Insight Text |
|-----------|-------------|
| Flexible >= 30% of spending | "You control {flexPct}% of your monthly spending." |
| Flexible 15–29% of spending | "Most of your spending is fixed. You control {flexPct}%." |
| Flexible < 15% of spending | "Nearly all your spending is committed to fixed expenses." |
| Fixed > 85% of income | "Your fixed expenses use {fixedOfIncomePct}% of your income. Consider reviewing obligations." (color: `warning.main`) |

#### Code Reference

```jsx
// New: src/components/expense-breakdown-card.tsx
<Card variant="outlined" sx={{ p: 3 }}>
  <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.900' }}>
    Spending Breakdown
  </Typography>

  {/* Ratio bar */}
  <Box sx={{ display: 'flex', mt: 2, height: 8, borderRadius: 1, overflow: 'hidden' }}>
    <Box sx={{ width: `${fixedPct}%`, bgcolor: 'grey.400' }} />
    <Box sx={{ width: `${flexPct}%`, bgcolor: 'primary.main' }} />
  </Box>

  {/* Amounts */}
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.500' }}>
        Fixed Expenses
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.700', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(fixedCents)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: 'grey.500', mt: 0.25 }}>
        {fixedPct}% of spending
      </Typography>
    </Box>
    <Box sx={{ textAlign: 'right' }}>
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.500' }}>
        Flexible Spending
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(flexibleCents)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: 'grey.500', mt: 0.25 }}>
        {flexPct}% of spending
      </Typography>
    </Box>
  </Box>

  <Divider sx={{ my: 2 }} />

  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" sx={{ fontSize: 13, color: insightColor, lineHeight: 1.6 }}>
      {insightText}
    </Typography>
    <Typography
      component={Link}
      href="/budget"
      variant="body2"
      sx={{ fontSize: 13, fontWeight: 500, color: 'primary.main', textDecoration: 'none', whiteSpace: 'nowrap', ml: 2 }}
    >
      View Budget →
    </Typography>
  </Box>
</Card>
```

#### Empty State (Pre-Classification)

When classification data is not available (no baseline, no connected accounts, or insufficient transaction history):

```
┌─────────────────────────────────────────────────────────────────┐
│  Spending Breakdown                                               │
│                                                                   │
│  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]                          │
│                                                                   │
│  Fixed Expenses          Flexible Spending                        │
│  —                       —                                        │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  "P.R.I.M.E. will classify your spending once enough             │
│   transaction history is available."                              │
└─────────────────────────────────────────────────────────────────┘
```

| Element | Styling & Behavior |
|---------|-------------------|
| **Ratio bar** | Full width, single segment, `bgcolor: grey.100` |
| **Amounts** | h6, weight 600, `color: grey.300`. Text: "—" |
| **Insight text** | "P.R.I.M.E. will classify your spending once enough transaction history is available." `color: grey.500` |
| **View Budget link** | Not shown in empty state |

#### Render Conditions

| Dashboard State | Classification Card |
|----------------|-------------------|
| `pre_connection` | Not rendered |
| `syncing` | Not rendered |
| `activation_complete` | Not rendered |
| `connected` + baseline not `ready` | Not rendered |
| `connected` + baseline `ready` + classification unavailable | Rendered — empty state |
| `connected` + baseline `ready` + classification ready | Rendered — full breakdown |

#### Behavior

- Card fetches from `GET /api/v1/expense-classification`
- Response includes: `fixedCents`, `flexibleCents`, `fixedPct`, `flexiblePct`, `status` (`ready` | `insufficient_data` | `unavailable`)
- Card only renders when baseline is `ready` (depends on baseline data for income context)
- Card revalidates on SWR focus and when sync completes
- All financial values are integers in cents, formatted to dollars on display
- Percentages are computed server-side as integers (no floating point in UI)

---

### Screen 2: Budget Page — Spending Overview (New)

#### Purpose

Replace the budget page empty state with the first meaningful budget surface: a full spending classification breakdown by category, answering "Where does my fixed and flexible money go?"

#### URL Pattern

`/budget`

#### Primary User Question

"Where exactly does my money go, and what can I change?"

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Monthly Spending                                                 │
│                                                                   │
│  Total: $3,000                                                    │
│                                                                   │
│  [████████████████████████░░░░░░░░░░]                            │
│  Fixed: $2,100 (70%)           Flexible: $900 (30%)               │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  "72% of your income is committed to fixed expenses.              │
│   You control the remaining 28%."                                 │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┐  ┌───────────────────────────────┐
│  Fixed Expenses      $2,100   │  │  Flexible Spending     $900   │
│  ──────────────────────────── │  │  ──────────────────────────── │
│  Housing             $1,400   │  │  Food & Drink          $380   │
│  Insurance             $200   │  │  Shopping               $220  │
│  Transportation        $200   │  │  Entertainment          $150  │
│  Utilities             $180   │  │  Personal               $100  │
│  Subscriptions         $120   │  │  Health                  $50  │
└───────────────────────────────┘  └───────────────────────────────┘
```

#### Monthly Spending Overview Card

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 24px |
| **Title** | h6, 18px, weight 600, `color: grey.900`. Text: "Monthly Spending" |
| **Total amount** | body1, 16px, weight 600, `color: grey.700`, margin-top 4px. Format: "Total: $3,000" |
| **Ratio bar** | Height 8px, `border-radius: 4px`, full width, margin-top 16px. Same as dashboard card |
| **Fixed label + amount** | Inline. Label: body2, 14px, weight 500, `color: grey.500`. Amount: body2, 14px, weight 600, `color: grey.700`. Percentage in parentheses |
| **Flexible label + amount** | Inline, right-aligned. Label: body2, 14px, weight 500, `color: grey.500`. Amount: body2, 14px, weight 600, `color: primary.main`. Percentage in parentheses |
| **Divider** | `border-top: 1px solid grey.100`, margin 16px 0 |
| **Insight text** | body2, 13px, weight 400, `color: grey.500`, line-height 1.6. Uses income context from baseline. Format: "{fixedOfIncomePct}% of your income is committed to fixed expenses. You control the remaining {flexOfIncomePct}%." |

#### Category Breakdown Cards

Two cards side-by-side showing categories within each classification.

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 24px |
| **Card title** | body2, 14px, weight 600, `color: grey.900`. Text: "Fixed Expenses" / "Flexible Spending" |
| **Card total** | body2, 14px, weight 600, `color: grey.700` (fixed) / `color: primary.main` (flexible). Positioned right of title |
| **Divider** | `border-top: 1px solid grey.100`, margin 12px 0 |
| **Category row** | `display: flex`, `justify-content: space-between`, padding 12px 0, `border-bottom: 1px solid grey.100` (except last) |
| **Category name** | body2, 14px, weight 400, `color: grey.700` |
| **Category amount** | body2, 14px, weight 600, `color: grey.700`, `font-variant-numeric: tabular-nums` |

Categories are sorted by amount descending within each classification.

#### Code Reference

```jsx
// Updated: src/app/(app)/budget/page.tsx
'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import { EmptyStatePage } from '@/components/empty-state-page';
import { useExpenseClassification } from '@/hooks/use-expense-classification';
import { useBaseline } from '@/hooks/use-baseline';

export default function BudgetPage() {
  const { data: classification, isLoading } = useExpenseClassification();
  const { data: baseline } = useBaseline();

  if (isLoading) {
    return <BudgetSkeleton />;
  }

  if (!classification || classification.status !== 'ready') {
    return (
      <EmptyStatePage
        icon={AccountBalanceWalletOutlined}
        heading="Your budget will appear here"
        description="Once your accounts are connected, P.R.I.M.E. will categorize your spending and help you understand where your money goes."
      />
    );
  }

  const { fixed_cents, flexible_cents, fixed_pct, flexible_pct, fixed_categories, flexible_categories } = classification;
  const totalCents = fixed_cents + flexible_cents;

  // Income context for insight
  const incomeCents = baseline?.status === 'ready' ? baseline.monthly_income_cents : null;
  const fixedOfIncomePct = incomeCents ? Math.round((fixed_cents / incomeCents) * 100) : null;
  const flexOfIncomePct = incomeCents ? Math.round((flexible_cents / incomeCents) * 100) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Overview card */}
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.900' }}>
          Monthly Spending
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.700', mt: 0.5 }}>
          Total: {formatCurrency(totalCents)}
        </Typography>

        {/* Ratio bar */}
        <Box sx={{ display: 'flex', mt: 2, height: 8, borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ width: `${fixed_pct}%`, bgcolor: 'grey.400' }} />
          <Box sx={{ width: `${flexible_pct}%`, bgcolor: 'primary.main' }} />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'grey.500' }}>
            Fixed: <Box component="span" sx={{ fontWeight: 600, color: 'grey.700' }}>{formatCurrency(fixed_cents)}</Box> ({fixed_pct}%)
          </Typography>
          <Typography variant="body2" sx={{ color: 'grey.500' }}>
            Flexible: <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>{formatCurrency(flexible_cents)}</Box> ({flexible_pct}%)
          </Typography>
        </Box>

        {fixedOfIncomePct != null && flexOfIncomePct != null && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontSize: 13, color: 'grey.500', lineHeight: 1.6 }}>
              {fixedOfIncomePct}% of your income is committed to fixed expenses. You control the remaining {flexOfIncomePct}%.
            </Typography>
          </>
        )}
      </Card>

      {/* Category breakdown */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <CategoryCard
          title="Fixed Expenses"
          totalCents={fixed_cents}
          totalColor="grey.700"
          categories={fixed_categories}
        />
        <CategoryCard
          title="Flexible Spending"
          totalCents={flexible_cents}
          totalColor="primary.main"
          categories={flexible_categories}
        />
      </Box>
    </Box>
  );
}
```

#### Category Card Code Reference

```jsx
// Within budget page or extracted component
function CategoryCard({
  title,
  totalCents,
  totalColor,
  categories,
}: {
  title: string;
  totalCents: number;
  totalColor: string;
  categories: Array<{ name: string; amount_cents: number }>;
}) {
  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.900' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: totalColor, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(totalCents)}
        </Typography>
      </Box>
      <Divider sx={{ my: 1.5 }} />
      {categories.map((cat, i) => (
        <Box
          key={cat.name}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1.5,
            borderBottom: i < categories.length - 1 ? '1px solid' : 'none',
            borderColor: 'grey.100',
          }}
        >
          <Typography variant="body2" sx={{ color: 'grey.700' }}>
            {cat.name}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.700', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(cat.amount_cents)}
          </Typography>
        </Box>
      ))}
    </Card>
  );
}
```

#### Empty State (Budget Page)

When classification is not available, the existing `EmptyStatePage` component remains:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    [wallet icon]                                  │
│                                                                   │
│            Your budget will appear here                           │
│                                                                   │
│     Once your accounts are connected, P.R.I.M.E. will            │
│     categorize your spending and help you understand              │
│     where your money goes.                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

No changes to the empty state design — it remains as-is until classification data is available.

#### Behavior

- Budget page fetches from `GET /api/v1/expense-classification` (full response with category breakdown)
- Also fetches baseline via `useBaseline` for income-based insight text
- When classification `status: "ready"` — show full budget view
- When classification unavailable or `status: "insufficient_data"` — show existing empty state
- Categories sorted by `amount_cents` descending within each classification
- All financial values are integers in cents, formatted to dollars on display
- Percentages are integers computed server-side

---

### Screen 3: Dashboard — Full Updated Layout

#### Purpose

Show the complete dashboard layout with the spending breakdown card integrated.

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ MONTHLY       │  │ MONTHLY      │  │ UPCOMING     │           │
│  │ INCOME        │  │ SPENDING     │  │ BILLS        │           │
│  │ +$4,820       │  │ -$3,580      │  │ —            │           │
│  │ Estimated from│  │ Estimated    │  │              │           │
│  │ recent        │  │ from recent  │  │              │           │
│  │ activity      │  │ activity     │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌─ Available Monthly Money ─────────────────────────────────┐  │
│  │                  Available Monthly                          │  │
│  │                    ~$1,240                                  │  │
│  │     Based on your recent income and spending                │  │
│  │     patterns over the last 90 days.                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Spending Breakdown (NEW) ────────────────────────────────┐  │
│  │  [████████████████████████░░░░░░░░░░]                      │  │
│  │  Fixed: $2,100 (70%)     Flexible: $900 (30%)              │  │
│  │  "You control 30% of your monthly spending."  View Budget →│  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Connected Accounts ──────────────────────────────────────┐  │
│  │ (existing behavior — no changes)                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Recent Activity ──────┐  ┌─ Insights ─────────────────────┐  │
│  │ (existing)             │  │ (existing)                       │  │
│  └────────────────────────┘  └─────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Render Order Logic

| Dashboard State | Baseline Card | Spending Breakdown Card |
|----------------|---------------|------------------------|
| `pre_connection` | Not rendered | Not rendered |
| `syncing` | Not rendered | Not rendered |
| `activation_complete` | Not rendered | Not rendered |
| `connected` + baseline not `ready` | Per existing logic | Not rendered |
| `connected` + baseline `ready` + classification unavailable | Rendered | Rendered — empty state |
| `connected` + baseline `ready` + classification `ready` | Rendered | Rendered — full breakdown |

The spending breakdown card always renders below the baseline card and above the connection/accounts card.

---

## 6. Navigation Flows

### Dashboard to Budget

```
┌─ Dashboard ─────────────────────────────┐
│  Spending Breakdown card                 │
│  click "View Budget →" ─────────────────│──→ /budget (full classification view)
└──────────────────────────────────────────┘
```

### Budget Page — Self-Contained

```
┌─ Budget ────────────────────────────────┐
│  No outbound navigation in v1           │
│  User reads classification breakdown    │
│  Sidebar navigation back to dashboard   │
└──────────────────────────────────────────┘
```

### Navigation Notes

- "View Budget →" is a standard Next.js Link, not a modal or drawer
- State does not carry between screens — budget page independently fetches its data
- Both surfaces show the same underlying data, so they stay consistent automatically
- The "View Budget →" link is only shown when classification data is available

---

## 7. Interaction Specifications

### Keyboard Navigation

| Context | Key | Action |
|---------|-----|--------|
| Dashboard — Spending Breakdown card | `Tab` | Focus moves to "View Budget →" link |
| Dashboard — "View Budget →" link | `Enter` | Navigate to `/budget` |
| Budget — Category rows | `Tab` | Natural focus order through card content (informational only, no interactive elements) |

### Loading States

**Dashboard — Spending Breakdown card:**

```jsx
<Card variant="outlined" sx={{ p: 3 }}>
  <Skeleton width={140} height={16} />
  <Skeleton height={8} sx={{ mt: 2, borderRadius: 1 }} />
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
    <Box>
      <Skeleton width={100} height={14} />
      <Skeleton width={70} height={28} sx={{ mt: 0.5 }} />
    </Box>
    <Box sx={{ textAlign: 'right' }}>
      <Skeleton width={120} height={14} />
      <Skeleton width={60} height={28} sx={{ mt: 0.5 }} />
    </Box>
  </Box>
</Card>
```

**Budget page:**

Skeleton layout mirrors the final layout — overview card skeleton + two category card skeletons side-by-side with placeholder rows.

**Post-sync revalidation:**

No skeleton flash — SWR revalidates in background. Values update in-place.

### Error States

**Classification API failure (dashboard):**

The spending breakdown card is not rendered. The dashboard falls back to layout without it. No error message shown — consistent with baseline card silent fallback pattern.

**Classification API failure (budget page):**

The existing empty state placeholder is shown. No error toast or message — the budget page simply appears as if classification has not been computed yet.

### Empty States

| State | Dashboard Card | Budget Page |
|-------|---------------|-------------|
| No accounts connected | Not shown | Empty state placeholder |
| Sync in progress | Not shown | Empty state placeholder |
| Baseline not ready | Not shown | Empty state placeholder |
| Baseline ready, classification not available | Empty state (bar + dashes) | Empty state placeholder |
| Classification ready | Full breakdown | Full classification view |

### Toast Notifications

No toasts are introduced by this feature. Classification is computed server-side during sync pipeline processing. There is no user-initiated classification action.

### Trust Messaging

| Context | Message |
|---------|---------|
| Dashboard insight | Dynamic based on ratio (see Insight Logic table above) |
| Budget income insight | "{X}% of your income is committed to fixed expenses. You control the remaining {Y}%." |
| Classification basis | Not explicitly shown — classification inherits trust from the baseline ("Estimated from recent activity" on summary cards). Classification feels like a natural extension of existing analysis |
| High fixed ratio | Warning-toned insight when fixed > 85% of income. Factual, not judgmental |

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >=1024px | Full layout as specified |
| Tablet | 768-1023px | Dashboard card full-width. Budget category cards remain side-by-side |
| Mobile | <768px | All cards stack. Budget category cards stack to single column |

### Mobile Adaptations

**Dashboard — Spending Breakdown card:**
- Full-width, no change needed — layout is already single-column friendly
- Fixed/Flexible amounts stack vertically instead of side-by-side below 480px
- Ratio bar remains full-width at all sizes

**Budget page:**
- Overview card: full-width, no change needed
- Category cards: stack to single column below 768px via `gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }`
- Category rows remain full-width within their card

**Priority on mobile:**
- The ratio bar and amounts must be visible without scrolling
- The insight text is secondary but should remain visible on first screen
- Category breakdown is scrollable detail

---

## 9. Component Inventory

| Component | Location | Notes |
|-----------|----------|-------|
| `ExpenseBreakdownCard` | Dashboard | **New.** Summary card with ratio bar, fixed/flexible amounts, insight text, and link to budget page. Handles ready and empty states |
| `CategoryCard` | Budget page | **New.** Lists categories within a classification (fixed or flexible) with amounts sorted descending |
| `BudgetPage` (updated) | `/budget` | **Modified.** Replaces empty state with overview card + two category cards when classification data is available |

### Existing Components — No Changes

| Component | Status |
|-----------|--------|
| `BaselineCard` | Unchanged |
| `SummaryCard` | Unchanged |
| `ConnectionCard` | Unchanged |
| `SyncProgressCard` | Unchanged |
| `ActivationCard` | Unchanged |
| `ConnectedAccountsCard` | Unchanged |
| `RecentActivityCard` | Unchanged |
| `EmptyStateCard` | Unchanged |
| `EmptyStatePage` | Unchanged (still used as budget page fallback) |
| Sidebar | Unchanged — no new nav items |

### Hooks

| Hook | Notes |
|------|-------|
| `useExpenseClassification` | **New.** SWR hook for `GET /api/v1/expense-classification`. Returns `{ fixed_cents, flexible_cents, fixed_pct, flexible_pct, fixed_categories, flexible_categories, status }` |

---

## 10. Out of Scope (v1)

- No manual reclassification UI (user overrides are a future extension)
- No individual transaction drill-down from category rows
- No budget creation, editing, or goal-setting
- No spending trend charts or historical comparison
- No subscription detection or management
- No spending recommendations or optimization suggestions
- No alerts when classification ratios change
- No AI-driven classification logic
- No custom category creation
- No transaction-level classification visibility (e.g., tagging individual transactions as fixed/flexible in the transactions list)
- No category-level confidence indicators
- No configuration or settings for classification rules

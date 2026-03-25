# Transaction Ingestion & Normalization Engine — Design Document

**Version:** 1.0
**Focus:** The normalization pipeline, dashboard transaction preview, and dedicated Transactions page that transform raw Plaid data into a clean, trustworthy, explorable financial dataset.

---

## 1. Vision

After connecting accounts, users have raw financial data but no usable understanding. Merchant names are inconsistent, duplicates exist, and pending records mix with posted ones. This feature cleans, normalizes, and deduplicates transactions — then surfaces the result as the first verifiable financial dataset in the product. Users should feel that P.R.I.M.E. understood their data, not just imported it.

**Design north star:** Visible data trust. Clean transactions, recognizable merchants, honest counts, and a calm browsing surface that lets users verify what the system processed — without overwhelming them with analysis tools they don't need yet.

---

## 2. Design Principles

### 1. Trust Through Transparency

The user must see evidence that their data was processed — not just displayed. Counts of transactions processed, duplicates removed, and merchants cleaned are trust signals, not vanity metrics.

### 2. Visibility Without Analysis

The Transactions page exists for verification and browsing, not budgeting or pattern detection. Every design choice must resist the urge to add analytical features.

### 3. Clean Data Speaks for Itself

If merchant names are recognizable and amounts are correct, the interface needs minimal decoration. The data quality is the design.

### 4. Progressive Disclosure Over Density

Dashboard shows a preview (5-10 items). The Transactions page shows the full set with light filters. No screen tries to show everything at once.

### 5. Automation Feels Real

Processing steps ("Organizing transactions...", "Removing duplicates...") must communicate real work, not fake loading. The completion summary proves the system did something measurable.

---

## 3. Visual Language

> All styling inherits from the P.R.I.M.E. design system or current product visual language. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary.main` | `#2563EB` | "View All Transactions" link, active filter chips |
| `grey.50` | `#F9FAFB` | Page background |
| `grey.100` | `#F3F4F6` | Filter bar background |
| `grey.200` | `#E5E7EB` | Borders, dividers, inactive filter chips |
| `grey.500` | `#6B7280` | Secondary text, merchant subtext, account indicators |
| `grey.700` | `#374151` | Merchant names, row text |
| `grey.900` | `#111827` | Page heading, amounts |
| `success.light` | `#ECFDF5` | Income amount background tint |
| `success.main` | `#059669` | Income amounts (positive) |
| `error.main` | `#DC2626` | Expense amounts (negative) — used sparingly, only on amounts |
| `common.white` | `#FFFFFF` | Card backgrounds, transaction rows |

### Status Colors

| State | Color | Usage |
|-------|-------|-------|
| Processing active | `primary.main` | Active step indicator, spinner |
| Processing complete | `#059669` (success) | Completion checkmark, summary counts |
| Income transaction | `#059669` | Positive amount text |
| Expense transaction | `grey.900` | Negative amount text (neutral, not alarming) |
| Pending transaction | `grey.500` + italic | Pending label, reduced visual weight |

### Typography

| Element | Size | Weight | Line-Height | Usage |
|---------|------|--------|-------------|-------|
| Page heading | 24px (h5) | 600 | 1.3 | "Transactions" page title |
| Section heading | 18px (h6) | 600 | 1.4 | "Recent Activity" card title |
| Merchant name | 14px (body2) | 500 | 1.5 | Primary transaction identifier |
| Amount | 14px (body2) | 600 | 1.5 | Transaction amount, tabular-nums |
| Date / account | 12px (caption) | 400 | 1.5 | Row metadata |
| Filter label | 13px (body2) | 500 | 1.5 | Active filter chip text |
| Trust label | 12px (caption) | 400 | 1.5 | "Automatically cleaned and organized" |
| Summary count | 20px (h6) | 600 | 1.3 | Completion summary numbers |

### Spacing

- Transaction row height: 56px
- Transaction row padding: 16px horizontal
- Filter bar padding: 12px 16px
- Card internal padding: 24px (section cards), 0 (transaction list flush)
- Gap between filter chips: 8px
- Gap between dashboard cards: 16px (existing)

### Surface Language

- Transaction list card: `border-radius: 8px`, `border: 1px solid grey.200`, `background: white`, no shadow
- Filter bar: Contained within card top, `border-bottom: 1px solid grey.200`, `background: grey.50`
- Transaction rows: No individual borders — separated by `border-bottom: 1px solid grey.100` between rows
- Filter chips: `border-radius: 16px`, `border: 1px solid grey.200`, `background: white` (inactive), `background: primary.main at 8%`, `border-color: primary.main`, `color: primary.main` (active)

---

## 4. Information Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar                                                              │
│ ├─ Dashboard                                                         │
│ ├─ Transactions  [NEW]                                               │
│ ├─ Budget                                                            │
│ ├─ Goals                                                             │
│ ├─ Purchases                                                         │
│ ─────────────                                                        │
│ ├─ Settings                                                          │
│                                                                      │
│ Main Content                                                         │
│                                                                      │
│ DASHBOARD (updated)                                                  │
│ ┌─ Summary Cards ─────────────────────────────────────────────────┐  │
│ │ [Net Worth]  [Spending This Month]  [Upcoming Bills]            │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌─ Connection/Accounts Card ──────────────────────────────────────┐  │
│ │ (existing behavior, no changes)                                 │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌─ Recent Activity ──────┐  ┌─ Insights ─────────────────────────┐  │
│ │ 5 cleaned transactions │  │ (empty state — unchanged)           │  │
│ │ [View All Transactions]│  │                                     │  │
│ └────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                      │
│ TRANSACTIONS PAGE (new)                                              │
│ ┌─ Filter Bar ────────────────────────────────────────────────────┐  │
│ │ [Account ▾]  [All | Income | Expense]  [30 days | 90 days]     │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌─ Transaction List ──────────────────────────────────────────────┐  │
│ │ Merchant · Amount · Date · Account                              │  │
│ │ ...rows...                                                      │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌─ Trust Label ───────────────────────────────────────────────────┐  │
│ │ "Transactions are automatically cleaned and organized"          │  │
│ └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Route Map

| Route | Label | Status |
|-------|-------|--------|
| `/dashboard` | Dashboard | Updated — Recent Activity populated |
| `/transactions` | Transactions | **New** — primary surface for this pitch |

---

## 5. Screen Specifications

---

### Screen 1: Dashboard — Recent Activity (Updated)

#### Purpose

Show a preview of the user's most recent cleaned transactions, proving the system processed their data. Provide a clear path to the full Transactions page.

#### URL Pattern

`/dashboard`

#### Primary User Question

"Did P.R.I.M.E. actually process my transactions?"

#### Layout

```
┌─ Recent Activity ──────────────────────────────────────────────┐
│  Recent Activity                           View All →          │
│  ──────────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Starbucks               -$4.85       Mar 22  · Checking │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Amazon                 -$34.99       Mar 21  · Checking │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Employer Direct Dep  +$2,450.00      Mar 20  · Checking │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Netflix               -$15.99       Mar 19  · Checking  │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Whole Foods            -$87.42       Mar 18  · Credit   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

#### Recent Activity Card

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, no padding (flush list) |
| **Card header** | Flex row, justify-between, padding 16px 20px, `border-bottom: 1px solid grey.100` |
| **Title** | h6, 16px, weight 600, `color: grey.900` — "Recent Activity" |
| **View All link** | body2, 14px, weight 500, `color: primary.main`, cursor pointer, hover underline. Text: "View All". Navigates to `/transactions` |
| **Transaction row** | Flex row, align-center, justify-between, padding 12px 20px, `border-bottom: 1px solid grey.100` (except last) |
| **Merchant name** | body2, 14px, weight 500, `color: grey.700`, flex 1, `text-overflow: ellipsis` |
| **Amount** | body2, 14px, weight 600, `font-variant-numeric: tabular-nums`. Income: `color: success.main`, prefix "+". Expense: `color: grey.900`, prefix "-" |
| **Date + Account** | caption, 12px, weight 400, `color: grey.500`. Format: "Mar 22 · Checking". Right-aligned, `white-space: nowrap` |
| **Max rows** | 5 transactions shown. If fewer than 5 exist, show all. If 0, show empty state |

#### Code Reference

```jsx
// Updated: src/components/recent-activity-card.tsx
<Card variant="outlined" sx={{ overflow: 'hidden' }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'grey.100' }}>
    <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, color: 'grey.900' }}>
      Recent Activity
    </Typography>
    <Typography
      component={Link}
      href="/transactions"
      variant="body2"
      sx={{ fontWeight: 500, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
    >
      View All
    </Typography>
  </Box>

  {transactions.map((txn, i) => (
    <Box
      key={txn.id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2.5,
        py: 1.5,
        borderBottom: i < transactions.length - 1 ? '1px solid' : 'none',
        borderColor: 'grey.100',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.700', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 2 }}>
        {txn.displayName}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: txn.isIncome ? 'success.main' : 'grey.900' }}>
          {txn.isIncome ? '+' : '-'}{formatCurrency(Math.abs(txn.amountCents))}
        </Typography>
        <Typography variant="caption" sx={{ color: 'grey.500', whiteSpace: 'nowrap' }}>
          {formatDate(txn.date)} · {txn.accountName}
        </Typography>
      </Box>
    </Box>
  ))}
</Card>
```

#### Empty State

When no transactions exist (pre-connection), retain the existing empty state:

```
┌─ Recent Activity ──────────────────────────────────────────────┐
│  Recent Activity                                                │
│                                                                 │
│           [ReceiptLongOutlined icon]                            │
│           No transactions yet                                   │
│           Transactions will appear here once your               │
│           accounts are connected.                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Behavior

- Fetches the 5 most recent non-pending normalized transactions via API
- Sorted by date descending, then by amount descending for same-date stability
- "View All" link only appears when transactions exist
- If only pending transactions exist and no posted transactions, show empty state
- Card replaces the existing `EmptyStateCard` for "Recent Activity" when transactions are available

---

### Screen 2: Transactions Page

#### Purpose

The primary surface for this pitch. Lets users browse their full cleaned transaction dataset with light filtering. Establishes trust by showing recognizable merchants, correct amounts, and organized data.

#### URL Pattern

`/transactions`

#### Primary User Question

"Are my transactions correct and complete?"

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Transactions                                                    │
│                                                                  │
│  ┌─ Trust Label ─────────────────────────────────────────────┐  │
│  │  Transactions are automatically cleaned and organized      │  │
│  │  by P.R.I.M.E.                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Transaction Card ────────────────────────────────────────┐  │
│  │ ┌─ Filter Bar ──────────────────────────────────────────┐ │  │
│  │ │ [All Accounts ▾]  [All] [Income] [Expense]            │ │  │
│  │ │                            [Last 30 days] [Last 90 d] │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  Merchant                    Amount    Date    Account    │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Starbucks                   -$4.85    Mar 22  Checking  │  │
│  │  Amazon                     -$34.99    Mar 21  Checking  │  │
│  │  Employer Direct Dep      +$2,450.00   Mar 20  Checking  │  │
│  │  Netflix                    -$15.99    Mar 19  Checking  │  │
│  │  Whole Foods                -$87.42    Mar 18  Visa ··42 │  │
│  │  Trader Joe's               -$62.18    Mar 17  Visa ··42 │  │
│  │  ...                                                      │  │
│  │                                                           │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Showing 128 of 642 transactions                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Trust Label

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Flex row, align-center, gap 8px, margin-bottom 16px |
| **Icon** | `AutoFixHighOutlined`, 16px, `color: grey.400` |
| **Text** | caption, 12px, weight 400, `color: grey.500`. Text: "Transactions are automatically cleaned and organized by P.R.I.M.E." |

#### Filter Bar

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Flex row, wrap, align-center, justify-between, padding 12px 20px, `background: grey.50`, `border-bottom: 1px solid grey.200` |
| **Left group** | Flex row, gap 8px, align-center |
| **Account select** | MUI `Select` variant outlined, size small, min-width 160px. Default: "All Accounts". Options: one entry per connected `FinancialAccount` showing account name + mask (e.g., "Checking ··4521"). Value: `financialAccountId` or `"all"` |
| **Type chips** | Three toggle chips: "All", "Income", "Expense". Only one active at a time. Active: `background: primary.main at 8%`, `border: 1px solid primary.main`, `color: primary.main`. Inactive: `background: white`, `border: 1px solid grey.200`, `color: grey.700` |
| **Right group** | Flex row, gap 8px, align-center |
| **Time chips** | Two toggle chips: "Last 30 days", "Last 90 days". Default: "Last 30 days". Same chip styling as Type chips |

#### Transaction List

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Within card, below filter bar. No additional padding |
| **Column headers** | Hidden visually — the data is self-explanatory. Accessible via `aria-label` on the list |
| **Transaction row** | Flex row, align-center, padding 14px 20px, `border-bottom: 1px solid grey.100`. Hover: `background: grey.50` |
| **Merchant name** | body2, 14px, weight 500, `color: grey.700`, flex 1, truncate with ellipsis. Uses `displayName` (cleaned merchant name, falling back to raw name) |
| **Pending badge** | If `pending: true`: chip label "Pending", caption 11px, `color: grey.500`, `background: grey.100`, `border-radius: 8px`, padding 2px 8px, margin-left 8px |
| **Amount** | body2, 14px, weight 600, `font-variant-numeric: tabular-nums`, width 120px, text-align right. Income: `color: success.main`, prefix "+". Expense: `color: grey.900`, prefix "-" |
| **Date** | caption, 12px, weight 400, `color: grey.500`, width 80px. Format: "Mar 22" (current year omitted), "Dec 15, 2025" (prior year shown) |
| **Account indicator** | caption, 12px, weight 400, `color: grey.500`, width 100px, text-align right. Shows account name or "Visa ··4521" format for credit cards |

#### Footer

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Padding 12px 20px, `border-top: 1px solid grey.200`, `background: grey.50` |
| **Count text** | caption, 12px, weight 400, `color: grey.500`. Format: "Showing {filtered} of {total} transactions" |

#### Code Reference

```jsx
// src/app/(app)/transactions/page.tsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  {/* Trust label */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <AutoFixHighOutlined sx={{ fontSize: 16, color: 'grey.400' }} />
    <Typography variant="caption" sx={{ color: 'grey.500' }}>
      Transactions are automatically cleaned and organized by P.R.I.M.E.
    </Typography>
  </Box>

  {/* Transaction card */}
  <Card variant="outlined" sx={{ overflow: 'hidden' }}>
    {/* Filter bar */}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2.5, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'grey.200' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Select size="small" value={accountFilter} onChange={handleAccountChange} sx={{ minWidth: 160 }}>
          <MenuItem value="all">All Accounts</MenuItem>
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>{a.displayLabel}</MenuItem>
          ))}
        </Select>

        {['All', 'Income', 'Expense'].map((type) => (
          <Chip
            key={type}
            label={type}
            onClick={() => setTypeFilter(type.toLowerCase())}
            variant={typeFilter === type.toLowerCase() ? 'filled' : 'outlined'}
            sx={{
              bgcolor: typeFilter === type.toLowerCase() ? 'rgba(37, 99, 235, 0.08)' : 'white',
              borderColor: typeFilter === type.toLowerCase() ? 'primary.main' : 'grey.200',
              color: typeFilter === type.toLowerCase() ? 'primary.main' : 'grey.700',
              fontWeight: 500,
              fontSize: 13,
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {[{ label: 'Last 30 days', value: 30 }, { label: 'Last 90 days', value: 90 }].map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            onClick={() => setDaysFilter(t.value)}
            variant={daysFilter === t.value ? 'filled' : 'outlined'}
            sx={{
              bgcolor: daysFilter === t.value ? 'rgba(37, 99, 235, 0.08)' : 'white',
              borderColor: daysFilter === t.value ? 'primary.main' : 'grey.200',
              color: daysFilter === t.value ? 'primary.main' : 'grey.700',
              fontWeight: 500,
              fontSize: 13,
            }}
          />
        ))}
      </Box>
    </Box>

    {/* Transaction rows */}
    <Box role="list" aria-label="Transactions">
      {filteredTransactions.map((txn, i) => (
        <Box
          key={txn.id}
          role="listitem"
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2.5,
            py: 1.75,
            borderBottom: i < filteredTransactions.length - 1 ? '1px solid' : 'none',
            borderColor: 'grey.100',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', mr: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {txn.displayName}
            </Typography>
            {txn.pending && (
              <Chip label="Pending" size="small" sx={{ ml: 1, height: 20, fontSize: 11, color: 'grey.500', bgcolor: 'grey.100' }} />
            )}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 120, textAlign: 'right', color: txn.isIncome ? 'success.main' : 'grey.900' }}>
            {txn.isIncome ? '+' : '-'}{formatCurrency(Math.abs(txn.amountCents))}
          </Typography>
          <Typography variant="caption" sx={{ color: 'grey.500', width: 80, textAlign: 'right', ml: 2 }}>
            {formatDate(txn.date)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'grey.500', width: 100, textAlign: 'right', ml: 2 }}>
            {txn.accountLabel}
          </Typography>
        </Box>
      ))}
    </Box>

    {/* Footer */}
    <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'grey.200', bgcolor: 'grey.50' }}>
      <Typography variant="caption" sx={{ color: 'grey.500' }}>
        Showing {filteredTransactions.length} of {totalCount} transactions
      </Typography>
    </Box>
  </Card>
</Box>
```

#### Empty State

When the user has connected accounts but no transactions have been normalized yet:

```
┌─ Transactions ─────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │           [ReceiptLongOutlined icon, 48px]               │  │
│  │                                                          │  │
│  │        No transactions yet                               │  │
│  │                                                          │  │
│  │        Your transactions will appear here once           │  │
│  │        P.R.I.M.E. finishes processing your accounts.    │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

When the user has no connected accounts at all:

```
┌─ Transactions ─────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │           [AccountBalanceOutlined icon, 48px]            │  │
│  │                                                          │  │
│  │        Connect your accounts to see transactions         │  │
│  │                                                          │  │
│  │        P.R.I.M.E. will automatically organize and        │  │
│  │        clean your transaction history.                   │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

When filters return no results:

```
┌─ (within Transaction Card, below filter bar) ──────────────────┐
│                                                                 │
│           No transactions match your filters.                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Element | Styling & Behavior |
|---------|-------------------|
| **No-results text** | body2, 14px, `color: grey.500`, text-align center, padding 48px 20px |

#### Behavior

- Page fetches normalized transactions from `GET /api/v1/transactions` with query params: `accountId`, `type` (all/income/expense), `days` (30/90)
- Default filters: All Accounts, All types, Last 30 days
- Filter changes update URL query params for shareability and back-button support
- Sorted by date descending, then amount descending for stability
- Pending transactions appear with reduced visual weight and "Pending" badge
- All amounts formatted in user's currency with proper locale formatting
- All dates displayed in user's local timezone
- Income is determined by Plaid amount convention: negative Plaid amounts are income (money in), positive amounts are expenses (money out)

---

### Screen 3: Activation Card — Analysis Complete (Updated)

#### Purpose

After the sync pipeline completes, confirm the system has understood the user's financial data and orient them toward their financial overview. This state must communicate intelligence and forward momentum — not raw processing counts.

#### Trigger

Sync pipeline transitions from ANALYZING → DONE. Dashboard state transitions to `activation_complete`.

#### Primary User Question

"Is P.R.I.M.E. ready to help me understand my finances?"

#### Layout

```
┌─ Analysis Complete ────────────────────────────────────────────┐
│                                                                 │
│        [Small green checkmark circle — 40px]                    │
│                                                                 │
│   Analysis complete                                             │
│                                                                 │
│   P.R.I.M.E. has reviewed your financial activity across        │
│   3 accounts and is building your financial picture.            │
│   Insights are being prepared.                                  │
│                                                                 │
│   ┌─ Institution row ──────────────────────────────────────┐   │
│   │ [bank icon]  Chase  ·  3 accounts  ·  Analyzed  [✓]   │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                 │
│              [ See Financial Overview ]   ← primary            │
│                                                                 │
│   ────────────────────────────────────────────────────────     │
│                                                                 │
│   [+ Connect Another Account]       View transactions →         │
│         ↑ small outlined                ↑ gray text link        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Status Indicator

| Element | Styling & Behavior |
|---------|-------------------|
| **Circle** | 40px, `border-radius: 50%`, `background: #ECFDF5`, flex center |
| **Icon** | `CheckCircleOutlined`, 22px, `color: #059669` |
| **Animation** | Scale in 300ms ease-out on mount |

#### Messaging

| Element | Styling & Behavior |
|---------|-------------------|
| **Headline** | h6, 18px, weight 600, `color: grey.900`, margin-top 16px. Text: "Analysis complete" |
| **Subtitle** | body2, 14px, `color: grey.500`, max-width 400px, margin auto, margin-top 8px, line-height 1.6. Includes actual account count. Text: "P.R.I.M.E. has reviewed your financial activity across N accounts and is building your financial picture. Insights are being prepared." |

#### Institution List

Same as pre-existing component. Status label changes from "Synced" → "Analyzed" to reinforce intelligence framing.

#### Action Hierarchy

| Element | Styling & Behavior |
|---------|-------------------|
| **Primary CTA** | MUI `Button` variant contained, no elevation, `px: 3.5, py: 1.25`. Text: "See Financial Overview". **TODO:** navigates to `/overview` once built; calls `onDismiss` in the interim |
| **Divider** | `border-top: 1px solid grey.200`, max-width 360px, margin 28px auto 20px |
| **Secondary row** | Flex row, justify-center, gap 24px |
| **Connect Another** | MUI `Button` variant outlined, size small, `color: grey.700`, `border-color: grey.300`, starts with `AddOutlined` icon. Opens Plaid Link |
| **View transactions** | Plain button element, 13px, `color: grey.400`, hover `color: grey.600`. Text: "View transactions". **TODO:** navigates to `/transactions` once built; calls `onDismiss` in the interim |

#### Behavior

- Raw transaction counts and duplicate counts are **not shown** — this state is about financial understanding, not processing receipts
- "See Financial Overview" is the primary forward action; secondary actions exist for users who want to verify or extend
- Card transitions to `connected` state when the user dismisses or navigates away and returns
- Institution rows labeled "Analyzed" (not "Synced") throughout this state

---

## 6. Navigation Flows

### Post-Connection Flow (Updated)

```
┌─ Dashboard (syncing state) ─────────────────────────┐
│  SyncProgressCard showing pipeline steps             │
│  "Syncing balances..." → "Retrieving transactions..."│
│  → "Analyzing..."                                    │
└──────────────────────────────────────────────────────┘
          │
          ▼ (sync completes)
┌─ Dashboard (activation_complete) ───────────────────┐
│  ActivationCard with completion summary              │
│  "642 transactions processed, 17 duplicates removed" │
│  [View Transactions]  [Connect Another Account]      │
└──────────────────────────────────────────────────────┘
          │
          ├─ Click "View Transactions" ──→ /transactions
          │
          └─ Click "Connect Another" ──→ Plaid Link → syncing
```

### Dashboard → Transactions

```
┌─ Dashboard ─────────────────────────────────────────┐
│  Recent Activity card                                │
│  click "View All" ──────────────────────────────────│──→ /transactions
└──────────────────────────────────────────────────────┘
```

### Sidebar Navigation

```
┌─ Sidebar ───────────────────────────────────────────┐
│  [Dashboard]     ──→  /dashboard                     │
│  [Transactions]  ──→  /transactions    [NEW]         │
│  [Budget]        ──→  /budget                        │
│  [Goals]         ──→  /goals                         │
│  [Purchases]     ──→  /purchases                     │
│  ─────────                                           │
│  [Settings]      ──→  /settings                      │
└──────────────────────────────────────────────────────┘
```

---

## 7. Interaction Specifications

### Keyboard Navigation

| Context | Key | Action |
|---------|-----|--------|
| Filter chips | `Tab` | Move focus between chips |
| Filter chips | `Enter` / `Space` | Activate filter |
| Account select | `Enter` | Open dropdown |
| Account select | `Arrow Up/Down` | Navigate options |
| Transaction list | `Tab` | Move between rows (for accessibility) |

### Loading States

**Transactions page initial load:**

```jsx
// Skeleton: 8 rows of placeholder content
<Card variant="outlined" sx={{ overflow: 'hidden' }}>
  {/* Filter bar skeleton */}
  <Box sx={{ display: 'flex', gap: 1, px: 2.5, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'grey.200' }}>
    <Skeleton variant="rounded" width={160} height={32} />
    <Skeleton variant="rounded" width={48} height={32} sx={{ borderRadius: 4 }} />
    <Skeleton variant="rounded" width={64} height={32} sx={{ borderRadius: 4 }} />
    <Skeleton variant="rounded" width={72} height={32} sx={{ borderRadius: 4 }} />
  </Box>

  {/* Row skeletons */}
  {Array.from({ length: 8 }).map((_, i) => (
    <Box key={i} sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'grey.100' }}>
      <Skeleton width="40%" height={20} />
      <Box sx={{ flex: 1 }} />
      <Skeleton width={80} height={20} />
      <Skeleton width={60} height={16} sx={{ ml: 2 }} />
      <Skeleton width={80} height={16} sx={{ ml: 2 }} />
    </Box>
  ))}
</Card>
```

**Dashboard Recent Activity loading:**

Same skeleton pattern with 5 rows instead of 8.

**Filter change:**

No full skeleton — transaction list updates in-place. A subtle opacity reduction (0.6) on the list during fetch provides feedback without layout shift.

### Error States

**API failure on Transactions page:**

```jsx
<Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
  <ErrorOutlineOutlined sx={{ fontSize: 48, color: 'grey.400' }} />
  <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.900', mt: 2 }}>
    Unable to load transactions
  </Typography>
  <Typography variant="body2" sx={{ color: 'grey.500', mt: 1 }}>
    Something went wrong. Please try again.
  </Typography>
  <Button variant="outlined" onClick={retry} sx={{ mt: 3 }}>
    Retry
  </Button>
</Card>
```

**Dashboard Recent Activity API failure:**

Fall back silently to the existing empty state card. No error displayed — dashboard should not feel broken if one section fails.

### Toast Notifications

| Action | Message | Duration |
|--------|---------|----------|
| Filter produces 0 results | (no toast — inline "No transactions match your filters" text) | — |
| API retry success | "Transactions loaded." | 3s |
| API retry failure | "Unable to load transactions. Please try again." | 5s |

### Trust Messaging

| Context | Message |
|---------|---------|
| Transactions page header | "Transactions are automatically cleaned and organized by P.R.I.M.E." |
| Pending transactions | "Pending" badge — distinguishes unconfirmed from posted |
| Completion summary | Exact counts: "{N} transactions processed", "{N} duplicates removed" |
| Empty state (connected) | "Your transactions will appear here once P.R.I.M.E. finishes processing your accounts." |

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >=1024px | Full layout as specified |
| Tablet | 768-1023px | Filter bar wraps, transaction rows compress |
| Mobile | <768px | Stacked filters, simplified transaction rows |

### Mobile Adaptations

**Filter bar:**
- Account select full-width on its own row
- Type chips and time chips wrap to second row
- Filter bar stacks vertically with 8px gap between rows

**Transaction rows:**
- Account indicator hidden (available in detail later)
- Date moves below merchant name as secondary line
- Amount remains right-aligned on the primary line

**Mobile transaction row layout:**

```
┌──────────────────────────────────────────┐
│  Starbucks              [Pending]  -$4.85│
│  Mar 22                                  │
├──────────────────────────────────────────┤
│  Amazon                           -$34.99│
│  Mar 21                                  │
└──────────────────────────────────────────┘
```

| Element | Mobile Adaptation |
|---------|-------------------|
| **Row** | Two-line layout. Line 1: merchant + amount. Line 2: date |
| **Merchant** | Same styling, truncates earlier |
| **Amount** | Same styling, right-aligned on line 1 |
| **Date** | caption, `color: grey.500`, left-aligned on line 2 |
| **Account indicator** | Hidden on mobile |
| **Row padding** | 12px 16px |

**Dashboard Recent Activity:**
- Same mobile treatment as Transactions page rows (two-line layout)
- Shows 3 items instead of 5 on mobile

---

## 9. Component Inventory

| Component | Location | Notes |
|-----------|----------|-------|
| `RecentActivityCard` | Dashboard | **New.** Replaces `EmptyStateCard` for "Recent Activity" when transactions exist. Shows 5 most recent transactions + "View All" link |
| `TransactionRow` | Transactions page, RecentActivityCard | **New.** Shared row component for displaying a single normalized transaction |
| `TransactionFilterBar` | Transactions page | **New.** Account select + type chips + time chips |
| `TransactionList` | Transactions page | **New.** Container for transaction rows with footer count |
| `TransactionsEmptyState` | Transactions page | **New.** Context-aware empty state (no accounts vs. processing vs. no filter results) |

### Existing Components Modified

| Component | Change |
|-----------|--------|
| `Sidebar` | Add "Transactions" nav item with `ReceiptLongOutlined` icon, positioned after Dashboard |
| `ActivationCard` | Add processing summary stats (accounts, transactions, duplicates) and "View Transactions" CTA |
| Dashboard `page.tsx` | Replace Recent Activity `EmptyStateCard` with `RecentActivityCard` when transactions exist |

---

## 10. Out of Scope (v1)

- No category filters or category display
- No custom tagging or manual categorization
- No transaction editing or correction
- No advanced search or text filtering
- No multi-filter logic (combining multiple filters is additive only)
- No charts, graphs, or spending visualizations
- No transaction detail view or drill-down
- No export (CSV, PDF)
- No infinite scroll or pagination — all filtered results render (acceptable for 90-day window)
- No budgeting integration
- No spending analysis or pattern detection
- No AI-based merchant classification
- No notification badges for new transactions
- No transaction grouping or recurring detection

# Financial Workspace Shell & Auth Integration Layer — Design Document

**Version:** 1.0
**Focus:** The application shell, navigation system, dashboard landing page, empty states, and auth-to-app transition that transform login into a real product experience.

---

## 1. Vision

After authentication, users currently land on a placeholder card with no structure, no navigation, and no sense of place. This design creates the financial workspace shell — the persistent frame that surrounds every future feature in P.R.I.M.E. The user should feel, within seconds of logging in, that they have arrived inside a calm, purposeful product built to manage their money.

**Design north star:** Structured financial home. Persistent navigation, clear hierarchy, intentional empty states, and a layout that communicates "this is where your financial life is organized" — even before any data exists.

---

## 2. Design Principles

### 1. Structure Before Content

The shell must feel complete and intentional even when every section is empty. Layout, navigation, and hierarchy communicate product maturity. An empty workspace that feels structured is better than a populated workspace that feels chaotic.

### 2. Navigation as a Promise

Sidebar links to `/budget`, `/goals`, `/purchases` are visible before those features exist. They signal what the product will do and give the user a mental model of where things live. Empty routes with clear messaging are better than hidden routes.

### 3. The Dashboard Is the Decision Surface

The dashboard is not a landing page — it is the future home of every financial insight, alert, and decision output. Even in its empty state, it must establish the visual hierarchy and spatial zones that will hold real content.

### 4. Auth Disappears After Login

Once authenticated, the user should never see auth UI unless they log out. Session restore, redirects, and route protection must be seamless. The transition from "logging in" to "using the product" should feel instant.

### 5. Calm Over Clever

No animations, gradients, or decorative elements that do not serve comprehension. The workspace should feel like a clean desk — ready for work, not performing for attention.

---

## 3. Visual Language

> All styling inherits from the P.R.I.M.E. design system or current product visual language. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary.main` | `#2563EB` | Active nav item, primary actions |
| `primary.dark` | `#1D4ED8` | Hover states on primary elements |
| `grey.50` | `#F9FAFB` | Page background |
| `grey.100` | `#F3F4F6` | Sidebar background |
| `grey.200` | `#E5E7EB` | Dividers, borders |
| `grey.500` | `#6B7280` | Secondary text, inactive nav icons |
| `grey.700` | `#374151` | Nav item text |
| `grey.900` | `#111827` | Primary headings |
| `common.white` | `#FFFFFF` | Main content background, header background |

### Status Colors (Empty State)

| State | Color | Usage |
|-------|-------|-------|
| Informational | `grey.500` | Empty state icons and secondary text |
| Call-to-action | `primary.main` | "Connect accounts" link/button in empty states |

### Typography

| Element | Size | Weight | Line-Height | Usage |
|---------|------|--------|-------------|-------|
| Page heading | 24px (h5) | 600 | 1.3 | Dashboard title |
| Section heading | 18px (h6) | 600 | 1.4 | Card/section titles |
| Nav item | 14px (body2) | 500 | 1.5 | Sidebar navigation links |
| Body text | 14px (body2) | 400 | 1.5 | Empty state descriptions |
| Caption | 12px (caption) | 400 | 1.5 | Timestamps, metadata |
| Logo | 18px | 700 | 1 | "P.R.I.M.E." in sidebar header |

### Spacing

- Sidebar width: 260px (desktop), collapsed on mobile
- Header height: 64px
- Content padding: 24px (desktop), 16px (mobile)
- Card gap: 16px
- Section gap: 24px

### Surface Language

- Cards: `border-radius: 8px`, `border: 1px solid grey.200`, `background: white`
- Sidebar: `border-right: 1px solid grey.200`, `background: grey.100`
- Header: `border-bottom: 1px solid grey.200`, `background: white`
- No drop shadows on layout chrome (sidebar, header). Subtle shadow on content cards only: `0 1px 2px 0 rgb(0 0 0 / 0.05)`

---

## 4. Information Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ App Shell                                                            │
│                                                                      │
│ ┌─ Sidebar (260px) ──────┐ ┌─ Header ─────────────────────────────┐ │
│ │                         │ │  Page Title              User + Logout│ │
│ │  P.R.I.M.E. (logo)     │ └──────────────────────────────────────┘ │
│ │                         │                                          │
│ │  Dashboard       [active]│ ┌─ Main Content ────────────────────┐  │
│ │  Budget                  │ │                                    │  │
│ │  Goals                   │ │  ┌─ Summary Cards Row ──────────┐ │  │
│ │  Purchases               │ │  │ [Placeholder] [Placeholder]  │ │  │
│ │                          │ │  │ [Placeholder] [Placeholder]  │ │  │
│ │                          │ │  └──────────────────────────────┘ │  │
│ │                          │ │                                    │  │
│ │                          │ │  ┌─ Financial Overview ──────────┐ │  │
│ │                          │ │  │ Empty state:                  │ │  │
│ │                          │ │  │ "Connect your accounts to     │ │  │
│ │                          │ │  │  see your financial picture"  │ │  │
│ │                          │ │  └──────────────────────────────┘ │  │
│ │                          │ │                                    │  │
│ │                          │ │  ┌─ Recent Activity ─────────────┐ │  │
│ │  ─────────────           │ │  │ Empty state:                  │ │  │
│ │  Settings                │ │  │ "No transactions yet"         │ │  │
│ │                          │ │  └──────────────────────────────┘ │  │
│ └──────────────────────────┘ └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Route Map

| Route | Label | Status |
|-------|-------|--------|
| `/dashboard` | Dashboard | Empty state (this pitch) |
| `/budget` | Budget | Empty state (this pitch) |
| `/goals` | Goals | Empty state (this pitch) |
| `/purchases` | Purchases | Empty state (this pitch) |
| `/settings` | Settings | Empty state (this pitch) |

---

## 5. Screen Specifications

---

### Screen 1: Application Shell (AppLayout)

#### Purpose

Persistent frame wrapping all protected routes. Provides sidebar navigation, header with user context, and main content area.

#### Primary User Question

"Where am I, and where can I go?"

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─ Sidebar ──────────┐ ┌─ Header ────────────────────────┐ │
│ │                     │ │                                  │ │
│ │  P.R.I.M.E.        │ │  [Page Title]      [User] [Out] │ │
│ │                     │ │                                  │ │
│ │  ☐ Dashboard        │ └──────────────────────────────────┘ │
│ │  ☐ Budget           │                                      │
│ │  ☐ Goals            │ ┌─ Content ────────────────────────┐ │
│ │  ☐ Purchases        │ │                                  │ │
│ │                     │ │  {children}                      │ │
│ │                     │ │                                  │ │
│ │                     │ │                                  │ │
│ │                     │ │                                  │ │
│ │  ───────────        │ │                                  │ │
│ │  ☐ Settings         │ │                                  │ │
│ └─────────────────────┘ └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Sidebar

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Width 260px, `background: grey.100`, `border-right: 1px solid grey.200`, full viewport height, fixed position, flex column |
| **Logo** | "P.R.I.M.E." text, 18px, weight 700, `color: grey.900`, padding 24px horizontal, 20px vertical, top of sidebar |
| **Nav section** | Flex column, gap 4px, padding 0 12px, `margin-top: 8px` |
| **Nav item (inactive)** | Height 40px, `border-radius: 6px`, padding 8px 12px, `color: grey.700`, 14px weight 500, icon 20px `color: grey.500`, hover `background: grey.200` |
| **Nav item (active)** | Same as inactive but `background: primary.main` at 8% opacity, `color: primary.main`, icon `color: primary.main`, font-weight 600 |
| **Nav icon** | MUI icon, 20px, 8px right margin. Dashboard: `DashboardOutlined`, Budget: `AccountBalanceWalletOutlined`, Goals: `FlagOutlined`, Purchases: `ShoppingCartOutlined`, Settings: `SettingsOutlined` |
| **Divider** | `border-top: 1px solid grey.200`, margin 8px 12px, separates main nav from Settings |
| **Settings item** | Positioned at bottom of nav group below divider, same styling as other nav items |

#### Header

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Height 64px, `background: white`, `border-bottom: 1px solid grey.200`, flex row, align-center, justify-between, padding 0 24px |
| **Page title** | h5, 24px, weight 600, `color: grey.900` — dynamically set by active route |
| **User area** | Flex row, align-center, gap 12px |
| **User email** | body2, 14px, `color: grey.500`, truncated at 200px max-width |
| **Logout button** | MUI `IconButton`, `LogoutOutlined` icon, 20px, `color: grey.500`, hover `color: grey.700`. Calls Supabase `signOut()`, redirects to `/login` |

#### Content Area

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | Flex 1, `margin-left: 260px` (sidebar width), `margin-top: 64px` (header height), `background: grey.50`, `min-height: calc(100vh - 64px)`, padding 24px |

#### Code Reference

```jsx
// src/components/layout/app-layout.tsx
<Box sx={{ display: 'flex', minHeight: '100vh' }}>
  {/* Sidebar */}
  <Box
    component="nav"
    sx={{
      width: 260,
      flexShrink: 0,
      bgcolor: 'grey.100',
      borderRight: '1px solid',
      borderColor: 'grey.200',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Typography
      sx={{
        fontSize: 18,
        fontWeight: 700,
        color: 'grey.900',
        px: 3,
        py: 2.5,
      }}
    >
      P.R.I.M.E.
    </Typography>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1.5, mt: 1 }}>
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} active={pathname === item.href} />
      ))}
    </Box>

    <Divider sx={{ mx: 1.5, my: 1 }} />

    <Box sx={{ px: 1.5 }}>
      <NavItem href="/settings" icon={SettingsOutlined} label="Settings" active={pathname === '/settings'} />
    </Box>
  </Box>

  {/* Main area */}
  <Box sx={{ flexGrow: 1, ml: '260px' }}>
    {/* Header */}
    <Box
      component="header"
      sx={{
        height: 64,
        bgcolor: 'common.white',
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.900' }}>
        {pageTitle}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="body2" sx={{ color: 'grey.500', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userEmail}
        </Typography>
        <IconButton onClick={handleLogout} size="small" sx={{ color: 'grey.500', '&:hover': { color: 'grey.700' } }}>
          <LogoutOutlined fontSize="small" />
        </IconButton>
      </Box>
    </Box>

    {/* Content */}
    <Box
      component="main"
      sx={{
        p: 3,
        bgcolor: 'grey.50',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      {children}
    </Box>
  </Box>
</Box>
```

#### Behavior

- Sidebar is always visible on desktop
- Active nav item determined by `usePathname()`
- Page title derived from active route
- Logout calls `supabase.auth.signOut()`, then `router.push('/login')`
- On logout success: toast "Signed out"

---

### Screen 2: Dashboard (Empty State)

#### Purpose

First screen users see after login. Establishes the spatial zones that will hold financial summaries, insights, and activity. In empty state, communicates what the product will do and what step comes next.

#### URL Pattern

`/dashboard`

#### Primary User Question

"What is this product going to show me, and what do I do first?"

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                   │
│                                                              │
│  ┌─ Summary Cards ────────────────────────────────────────┐  │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │  │
│  │ │  Net Worth   │ │  This Month  │ │  Upcoming    │    │  │
│  │ │  --          │ │  --          │ │  --          │    │  │
│  │ └──────────────┘ └──────────────┘ └──────────────┘    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Get Started ──────────────────────────────────────────┐  │
│  │                                                        │  │
│  │        [Icon: AccountBalanceOutlined]                   │  │
│  │                                                        │  │
│  │   Connect your financial accounts to get started       │  │
│  │                                                        │  │
│  │   P.R.I.M.E. will automatically organize your          │  │
│  │   transactions, track your spending, and help you      │  │
│  │   make confident financial decisions.                   │  │
│  │                                                        │  │
│  │   [ Connect Accounts ]  (disabled / placeholder)       │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Recent Activity ─────────────┐ ┌─ Insights ──────────┐  │
│  │                               │ │                      │  │
│  │  No transactions yet.         │ │  No insights yet.    │  │
│  │                               │ │                      │  │
│  │  Transactions will appear     │ │  Insights will       │  │
│  │  here once your accounts      │ │  appear here as      │  │
│  │  are connected.               │ │  P.R.I.M.E. learns   │  │
│  │                               │ │  your finances.      │  │
│  └───────────────────────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Summary Cards Row

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | CSS Grid, 3 columns (1fr each), gap 16px. On mobile: single column stack |
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 20px |
| **Card label** | caption, 12px, weight 500, `color: grey.500`, text-transform uppercase, letter-spacing 0.5px |
| **Card value** | h6, 24px, weight 600, `color: grey.300` (placeholder dash "—") |
| **Cards shown** | "Net Worth", "Spending This Month", "Upcoming Bills" — all showing "—" as placeholder |

#### Get Started Card

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 40px, text-align center |
| **Icon** | `AccountBalanceOutlined`, 48px, `color: grey.400` |
| **Heading** | h6, 18px, weight 600, `color: grey.900`, margin-top 16px |
| **Description** | body2, 14px, `color: grey.500`, max-width 420px, margin auto, margin-top 8px |
| **CTA button** | MUI `Button` variant outlined, `color: primary.main`, margin-top 24px, disabled (Plaid not yet built). Label: "Connect Accounts" |
| **Disabled note** | caption, 12px, `color: grey.400`, margin-top 8px: "Coming soon" |

#### Bottom Row (Activity + Insights)

| Element | Styling & Behavior |
|---------|-------------------|
| **Container** | CSS Grid, 2 columns (1fr 1fr), gap 16px, margin-top 16px. On mobile: single column |
| **Card** | Same card styling as summary cards, padding 24px, min-height 180px |
| **Card title** | h6, 16px, weight 600, `color: grey.900`, margin-bottom 16px |
| **Empty icon** | Feature-specific MUI icon, 32px, `color: grey.300` |
| **Empty heading** | body2, 14px, weight 500, `color: grey.500`, margin-top 12px |
| **Empty description** | body2, 14px, `color: grey.400`, margin-top 4px |

#### Code Reference

```jsx
// src/app/(app)/dashboard/page.tsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  {/* Summary Cards */}
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
    {summaryCards.map((card) => (
      <Card key={card.label} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {card.label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.300', mt: 0.5 }}>
          —
        </Typography>
      </Card>
    ))}
  </Box>

  {/* Get Started */}
  <Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
    <AccountBalanceOutlined sx={{ fontSize: 48, color: 'grey.400' }} />
    <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.900', mt: 2 }}>
      Connect your financial accounts to get started
    </Typography>
    <Typography variant="body2" sx={{ color: 'grey.500', maxWidth: 420, mx: 'auto', mt: 1 }}>
      P.R.I.M.E. will automatically organize your transactions, track your spending,
      and help you make confident financial decisions.
    </Typography>
    <Button variant="outlined" disabled sx={{ mt: 3 }}>
      Connect Accounts
    </Button>
    <Typography variant="caption" sx={{ display: 'block', color: 'grey.400', mt: 1 }}>
      Coming soon
    </Typography>
  </Card>

  {/* Bottom Row */}
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
    <EmptyStateCard
      title="Recent Activity"
      icon={ReceiptLongOutlined}
      heading="No transactions yet"
      description="Transactions will appear here once your accounts are connected."
    />
    <EmptyStateCard
      title="Insights"
      icon={LightbulbOutlined}
      heading="No insights yet"
      description="Insights will appear here as P.R.I.M.E. learns your finances."
    />
  </Box>
</Box>
```

#### Behavior

- All cards are static in this version — no data fetching
- "Connect Accounts" button is disabled (Plaid is out of scope)
- Summary card values show "—" in `grey.300` to indicate placeholder, not zero
- Page renders client-side (needs Supabase client for user email in header)

---

### Screen 3: Empty Route Pages (Budget, Goals, Purchases, Settings)

#### Purpose

Placeholder pages for future features. Each communicates what will exist here and prevents confusion when a user clicks a nav item.

#### URL Patterns

`/budget`, `/goals`, `/purchases`, `/settings`

#### Primary User Question

"What will this section do?"

#### Layout (Shared Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Title]                                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │          [Feature Icon]                                │  │
│  │                                                        │  │
│  │     [Feature Heading]                                  │  │
│  │                                                        │  │
│  │     [Feature Description]                              │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Empty State Content Per Route

| Route | Icon | Heading | Description |
|-------|------|---------|-------------|
| `/budget` | `AccountBalanceWalletOutlined` | "Your budget will appear here" | "Once your accounts are connected, P.R.I.M.E. will categorize your spending and help you understand where your money goes." |
| `/goals` | `FlagOutlined` | "Your goals will appear here" | "Set savings targets, track your progress, and get clear timelines for when you can reach your financial goals." |
| `/purchases` | `ShoppingCartOutlined` | "Purchase planning will appear here" | "Evaluate whether you can afford a purchase, when you can afford it, and what trade-offs it creates." |
| `/settings` | `SettingsOutlined` | "Settings" | "Account preferences, connected accounts, and notification settings will be managed here." |

#### Empty State Card

| Element | Styling & Behavior |
|---------|-------------------|
| **Card** | `background: white`, `border: 1px solid grey.200`, `border-radius: 8px`, padding 60px 40px, text-align center, max-width 480px, margin auto, margin-top 48px |
| **Icon** | Feature-specific, 48px, `color: grey.400` |
| **Heading** | h6, 18px, weight 600, `color: grey.900`, margin-top 16px |
| **Description** | body2, 14px, `color: grey.500`, margin-top 8px, max-width 360px, margin auto |

#### Code Reference

```jsx
// Shared: src/components/empty-state-page.tsx
<Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
  <Card variant="outlined" sx={{ p: '60px 40px', textAlign: 'center', maxWidth: 480 }}>
    <Icon sx={{ fontSize: 48, color: 'grey.400' }} />
    <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.900', mt: 2 }}>
      {heading}
    </Typography>
    <Typography variant="body2" sx={{ color: 'grey.500', mt: 1, maxWidth: 360, mx: 'auto' }}>
      {description}
    </Typography>
  </Card>
</Box>
```

#### Behavior

- All pages are static, no data fetching
- Each page uses the shared `EmptyStatePage` component with route-specific props
- The header title updates to match the route label

---

### Screen 4: Welcome Modal (First-Time Auth Only)

#### Purpose

Congratulates the user on account creation and confirms their workspace is ready. Appears as a modal overlay on `/dashboard?welcome=true` so the full shell (sidebar, header, dashboard) is visible behind it — reinforcing that the user has arrived in a real product.

#### Trigger

- Auth callback redirects new users to `/dashboard?welcome=true`
- Modal opens when `welcome=true` query param is present
- Only appears once per account (first signup/login)
- Does not appear on session restore, subsequent logins, or direct navigation to `/dashboard`

#### Primary User Question

"Did my account get created successfully?"

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─ Sidebar ──────────┐ ┌─ Header ────────────────────────┐ │
│ │  (dimmed behind     │ │  (dimmed behind overlay)        │ │
│ │   overlay)          │ │                                  │ │
│ │                     │ └──────────────────────────────────┘ │
│ │                     │                                      │
│ │                     │  ┌─ Modal ───────────────────────┐  │
│ │                     │  │                               │  │
│ │                     │  │      [Green Checkmark]        │  │
│ │                     │  │                               │  │
│ │                     │  │  Your private financial       │  │
│ │                     │  │  workspace is ready.          │  │
│ │                     │  │                               │  │
│ │                     │  │  Your data is encrypted and   │  │
│ │                     │  │  only accessible by you.      │  │
│ │                     │  │                               │  │
│ │                     │  │  [ Continue to Dashboard ]    │  │
│ │                     │  │                               │  │
│ │                     │  └───────────────────────────────┘  │
│ │                     │                                      │
│ └─────────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Modal

| Element | Styling & Behavior |
|---------|-------------------|
| **Overlay** | MUI `Dialog`, `maxWidth="xs"`, `fullWidth`, semi-transparent backdrop. Shell fully visible but dimmed behind. |
| **Card** | White background, `border-radius: 12px`, padding 40px, text-align center |
| **Checkmark icon** | 48px circle, `background: #ECFDF5` (success light), centered green checkmark `#059669`, subtle scale-in animation (300ms ease-out) |
| **Heading** | h5, 20px, weight 600, `color: grey.900`, margin-top 16px. Text: "Your private financial workspace is ready." |
| **Description** | body2, 14px, `color: grey.500`, margin-top 8px. Text: "Your data is encrypted and only accessible by you." |
| **CTA button** | MUI `Button` variant contained, full width, primary color, no elevation, margin-top 24px. Label: "Continue to Dashboard" |

#### Code Reference

```jsx
// src/components/welcome-modal.tsx
<Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
  <Box sx={{ p: 5, textAlign: 'center' }}>
    <Box
      sx={{
        mx: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: '50%',
        bgcolor: '#ECFDF5',
      }}
    >
      <CheckIcon sx={{ color: '#059669' }} />
    </Box>
    <Typography variant="h5" sx={{ mt: 2, fontWeight: 600, color: 'grey.900' }}>
      Your private financial workspace is ready.
    </Typography>
    <Typography sx={{ mt: 1, fontSize: '0.875rem', color: 'grey.500' }}>
      Your data is encrypted and only accessible by you.
    </Typography>
    <Button
      fullWidth
      variant="contained"
      disableElevation
      onClick={handleClose}
      sx={{ mt: 3, py: 1.25 }}
    >
      Continue to Dashboard
    </Button>
  </Box>
</Dialog>
```

#### Behavior

- On "Continue to Dashboard" click: modal closes, `?welcome=true` param is removed from URL (via `router.replace('/dashboard')`)
- Clicking the backdrop also closes the modal and removes the param
- No Escape key close — user should acknowledge the message
- The dashboard content is fully rendered behind the modal
- Modal does not reappear on page refresh after dismissal (param is gone)

---

## 6. Navigation Flows

### Auth → App Transition

```
┌─ /signup or /login ─────────────────────────────┐
│  User enters email                               │
│  → Redirect to /verify                           │
└──────────────────────────────────────────────────┘
          │
          ▼
┌─ /verify ────────────────────────────────────────┐
│  User enters OTP code                            │
│  → Supabase verifies                             │
│  → /api/auth/callback?source=otp                 │
└──────────────────────────────────────────────────┘
          │
          ├─ New user ──→ /dashboard?welcome=true (modal overlay)
          │
          └─ Existing user ──→ /dashboard
```

### Session Restore

```
┌─ User returns (has session cookie) ──────────────┐
│  Hits any protected route                         │
│  → Middleware validates session                    │
│  → Page renders inside AppLayout                  │
└───────────────────────────────────────────────────┘

┌─ User returns (no session) ──────────────────────┐
│  Hits any protected route                         │
│  → Middleware redirects to /signup                 │
└───────────────────────────────────────────────────┘

┌─ Authenticated user hits /login or /signup ───────┐
│  → Middleware redirects to /dashboard              │
└───────────────────────────────────────────────────┘
```

### In-App Navigation

```
┌─ Sidebar ────────────────────────────────────────┐
│  [Dashboard]  ──→  /dashboard                     │
│  [Budget]     ──→  /budget                        │
│  [Goals]      ──→  /goals                         │
│  [Purchases]  ──→  /purchases                     │
│  ─────────                                        │
│  [Settings]   ──→  /settings                      │
└───────────────────────────────────────────────────┘

Navigation: client-side via Next.js Link (no full reload)
Active state: determined by current pathname match
```

### Logout

```
┌─ Header [Logout icon] ──────────────────────────┐
│  Click → supabase.auth.signOut()                 │
│  → Clear session                                 │
│  → router.push('/login')                         │
│  → Toast: "Signed out"                           │
└──────────────────────────────────────────────────┘
```

---

## 7. Interaction Specifications

### Keyboard Navigation

| Context | Key | Action |
|---------|-----|--------|
| Sidebar nav | `Tab` | Move focus between nav items |
| Sidebar nav | `Enter` | Navigate to focused route |
| Logout button | `Enter` / `Space` | Trigger logout |

### Loading States

The shell layout (sidebar + header) renders immediately from the (app) layout. Content area shows a centered `CircularProgress` spinner while page content loads.

```jsx
// Loading state for any page
<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
  <CircularProgress size={32} />
</Box>
```

No skeleton screens needed for v1 — pages are static with no data fetching.

### Error States

Auth errors during logout:

```jsx
// If signOut fails
toast.error('Failed to sign out. Please try again.');
```

No other error states in v1 — all pages are static.

### Toast Notifications

| Action | Message | Duration |
|--------|---------|----------|
| Logout success | "Signed out" | 3s |
| Logout failure | "Failed to sign out. Please try again." | 5s |

### Trust Messaging

Not required for this pitch. The shell contains no financial data, no sync behavior, and no computed values. Trust messaging will be designed per-feature as financial data surfaces are added.

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | ≥1024px | Full sidebar + header + content |
| Tablet | 768–1023px | Sidebar collapses to hamburger menu |
| Mobile | <768px | Sidebar hidden, hamburger in header |

### Mobile Adaptations

**Sidebar:**
- Hidden by default on tablet/mobile
- Hamburger icon (`MenuOutlined`) appears in header left
- Click opens sidebar as a temporary MUI `Drawer` (overlay, left-anchored)
- Clicking a nav item closes the drawer and navigates
- Clicking outside or pressing Escape closes the drawer

**Header:**
- Hamburger button added to left side
- Page title remains centered or left-aligned
- User email hidden on mobile (space constraint) — only logout icon shown

**Content:**
- Padding reduces from 24px to 16px
- Summary cards stack to single column
- Bottom row (Activity + Insights) stacks to single column

**Mobile Header Layout:**

```
┌──────────────────────────────────────────┐
│ [☰]  Dashboard                    [Out]  │
└──────────────────────────────────────────┘
```

---

## 9. Component Inventory

| Component | Location | Notes |
|-----------|----------|-------|
| `AppLayout` | Shell (all protected pages) | New. Sidebar + header + content wrapper. Used in `(app)/layout.tsx` |
| `Sidebar` | AppLayout | New. Navigation list, logo, responsive drawer on mobile |
| `NavItem` | Sidebar | New. Single nav link with icon, label, active state |
| `AppHeader` | AppLayout | New. Page title, user email, logout button |
| `EmptyStatePage` | Budget, Goals, Purchases, Settings | New. Reusable centered card with icon, heading, description |
| `EmptyStateCard` | Dashboard | New. Smaller inline empty state for dashboard sections |
| `SummaryCard` | Dashboard | New. Label + value card for financial summary row |
| `WelcomeModal` | Dashboard (first-time only) | New. MUI Dialog overlay shown on `/dashboard?welcome=true`. Replaces the `/welcome` page. |

---

## 10. Out of Scope (v1)

- No Plaid integration or account connection flow
- No real financial data, transactions, or balances
- No budgeting, goal tracking, or purchase evaluation logic
- No AI-powered insights or recommendations
- No notification system or alert badges
- No user profile or avatar management
- No theme switching or dark mode
- No keyboard shortcuts beyond standard tab navigation
- No search functionality
- No breadcrumbs or nested navigation
- No onboarding tour or walkthrough
- No rebuild of auth logic, middleware, Supabase setup, or OTP flow
- No signup/login component changes

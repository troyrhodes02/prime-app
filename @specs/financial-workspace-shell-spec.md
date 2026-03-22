---
version: 1.0.0
status: draft
author: claude
last_updated: 2026-03-22
design_doc_reference: "@design-docs/financial-workspace-shell-design-doc.md"
---

# Financial Workspace Shell & Auth Integration Layer — Technical Spec

## 1. Summary

This feature replaces the placeholder post-login experience with a persistent application shell (sidebar, header, content area), a navigation system across five routes, empty-state pages for each route, and refined auth-to-app transition behavior. No new data models, API routes, or financial logic are introduced. The scope is exclusively UI layout, client-side navigation, and auth integration at the routing layer.

The system gains a structured workspace frame that every future feature renders inside. Success is defined as: an authenticated user lands on `/dashboard` inside a fully rendered shell with working navigation to all five routes, each showing an intentional empty state, with logout functioning correctly.

## 2. Problem

After authentication, users land on a centered placeholder card (`src/app/(app)/dashboard/page.tsx`) that shows their email and a "Features are coming soon" message. There is:

- No sidebar or header
- No navigation between sections
- No visual indication of what the product will do
- No logout mechanism inside the app UI
- No route pages for `/budget`, `/goals`, `/purchases`, `/settings`
- The middleware `PROTECTED_ROUTES` array only covers `/welcome` and `/dashboard`
- The `/welcome` page is a separate route instead of a modal overlay on the dashboard

The gap between "I logged in" and "I'm using a product" blocks the ability to ship any feature that needs a navigation context or layout frame.

## 3. Core Concepts

This feature introduces no new data entities. It introduces UI-layer concepts only:

| Concept | Description |
|---------|-------------|
| **AppLayout** | Persistent shell wrapping all `(app)` route group pages. Contains sidebar, header, and content area. |
| **Navigation Item** | A sidebar link with icon, label, href, and active state. Active state derived from current pathname. |
| **Page Title** | Header text that updates based on the active route. Derived from a static route-to-title map. |
| **Empty State** | A structured placeholder UI shown on routes that have no functional content yet. Communicates what the section will do. |
| **Welcome Modal** | A one-time MUI Dialog overlay shown on the dashboard for first-time signups. Triggered by `?welcome=true` query param. Confirms workspace creation, then dismisses. |

### Route-to-Title Map

| Pathname | Title | Nav Icon |
|----------|-------|----------|
| `/dashboard` | Dashboard | `DashboardOutlined` |
| `/budget` | Budget | `AccountBalanceWalletOutlined` |
| `/goals` | Goals | `FlagOutlined` |
| `/purchases` | Purchases | `ShoppingCartOutlined` |
| `/settings` | Settings | `SettingsOutlined` |

## 4. States & Lifecycle

### Shell Render States

| State | Condition | Behavior |
|-------|-----------|----------|
| **Loading** | Supabase `getUser()` in progress | Shell renders sidebar + header with no email. Content shows `CircularProgress` centered. |
| **Authenticated** | User session valid | Full shell with user email in header. Content renders active route page. |
| **Logout in progress** | User clicked logout | Logout button disabled. `signOut()` executing. |
| **Logged out** | `signOut()` succeeded | Redirect to `/login`. Toast: "Signed out". |
| **Logout failed** | `signOut()` threw error | Toast: "Failed to sign out. Please try again." Button re-enabled. |

### Mobile Sidebar States

| State | Condition | Behavior |
|-------|-----------|----------|
| **Closed** | Default on viewport < 1024px | Sidebar hidden. Hamburger icon visible in header. |
| **Open** | User tapped hamburger | MUI `Drawer` slides in from left. Overlay visible. |
| **Closing** | User tapped nav item, overlay, or pressed Escape | Drawer closes. Navigation executes. |

## 5. UI Integration

### File Structure (New & Modified)

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx              ← MODIFIED: wrap children with AppLayout
│   │   ├── dashboard/page.tsx      ← MODIFIED: replace placeholder with empty-state dashboard + welcome modal
│   │   ├── welcome/page.tsx        ← DELETED
│   │   ├── budget/page.tsx         ← NEW
│   │   ├── goals/page.tsx          ← NEW
│   │   ├── purchases/page.tsx      ← NEW
│   │   └── settings/page.tsx       ← NEW
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx          ← NEW
│   │   ├── sidebar.tsx             ← NEW
│   │   ├── nav-item.tsx            ← NEW
│   │   └── app-header.tsx          ← NEW
│   ├── welcome-modal.tsx           ← NEW (replaces welcome page)
│   ├── empty-state-page.tsx        ← NEW
│   └── empty-state-card.tsx        ← NEW
├── middleware.ts                    ← MODIFIED: expand route matching, remove /welcome
```

---

### 5.1 AppLayout (`src/components/layout/app-layout.tsx`)

**Type:** Client component (`"use client"`)

**Purpose:** Persistent wrapper for all `(app)` routes. Renders Sidebar, AppHeader, and content area.

**Props:**

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}
```

**Behavior:**

- Fetches user email via `createClient().auth.getUser()` on mount
- Passes `userEmail` to `AppHeader`
- Passes current pathname (via `usePathname()`) to `Sidebar` and `AppHeader` for active state and title
- Manages mobile drawer open/close state (`useState<boolean>`)

**Layout structure:**

```typescript
<Box sx={{ display: 'flex', minHeight: '100vh' }}>
  <Sidebar
    pathname={pathname}
    mobileOpen={mobileOpen}
    onMobileClose={() => setMobileOpen(false)}
  />
  <Box sx={{ flexGrow: 1, ml: { xs: 0, lg: '260px' } }}>
    <AppHeader
      title={pageTitle}
      userEmail={userEmail}
      onMenuClick={() => setMobileOpen(true)}
      onLogout={handleLogout}
    />
    <Box component="main" sx={{ p: { xs: 2, lg: 3 }, bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)' }}>
      {children}
    </Box>
  </Box>
</Box>
```

**Logout handler:**

```typescript
async function handleLogout() {
  setLoggingOut(true);
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    toast.success('Signed out');
    router.push('/login');
  } catch {
    toast.error('Failed to sign out. Please try again.');
    setLoggingOut(false);
  }
}
```

**Page title derivation:**

```typescript
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/budget': 'Budget',
  '/goals': 'Goals',
  '/purchases': 'Purchases',
  '/settings': 'Settings',
};

const pageTitle = ROUTE_TITLES[pathname] ?? 'P.R.I.M.E.';
```

---

### 5.2 Sidebar (`src/components/layout/sidebar.tsx`)

**Type:** Client component (`"use client"`)

**Props:**

```typescript
interface SidebarProps {
  pathname: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}
```

**Behavior:**

- Desktop (≥1024px): Renders as a fixed `Box` with `position: fixed`, width 260px
- Mobile (<1024px): Renders as MUI `Drawer` with `variant="temporary"`, `anchor="left"`, controlled by `mobileOpen`
- Both render the same inner content (logo + nav items)

**Nav items configuration:**

```typescript
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlined },
  { href: '/budget', label: 'Budget', icon: AccountBalanceWalletOutlined },
  { href: '/goals', label: 'Goals', icon: FlagOutlined },
  { href: '/purchases', label: 'Purchases', icon: ShoppingCartOutlined },
];

const BOTTOM_NAV_ITEMS = [
  { href: '/settings', label: 'Settings', icon: SettingsOutlined },
];
```

**Inner content structure:**

```typescript
function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {/* Logo */}
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'grey.900', letterSpacing: '-0.02em' }}>
          P.R.I.M.E.
        </Typography>
        <Box component="img" src="/prime-logo.svg" alt="" sx={{ height: 24, width: 'auto' }} />
      </Box>

      {/* Main nav */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1.5, mt: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} onClick={onNavigate} />
        ))}
      </Box>

      <Divider sx={{ mx: 1.5, my: 1 }} />

      {/* Bottom nav */}
      <Box sx={{ px: 1.5 }}>
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} onClick={onNavigate} />
        ))}
      </Box>
    </>
  );
}
```

**Desktop rendering:**

```typescript
<Box
  component="nav"
  sx={{
    display: { xs: 'none', lg: 'flex' },
    flexDirection: 'column',
    width: 260,
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    bgcolor: 'grey.100',
    borderRight: '1px solid',
    borderColor: 'grey.200',
  }}
>
  <SidebarContent pathname={pathname} />
</Box>
```

**Mobile rendering:**

```typescript
<Drawer
  variant="temporary"
  anchor="left"
  open={mobileOpen}
  onClose={onMobileClose}
  ModalProps={{ keepMounted: true }}
  sx={{
    display: { xs: 'block', lg: 'none' },
    '& .MuiDrawer-paper': {
      width: 260,
      bgcolor: 'grey.100',
      borderRight: '1px solid',
      borderColor: 'grey.200',
    },
  }}
>
  <SidebarContent pathname={pathname} onNavigate={onMobileClose} />
</Drawer>
```

---

### 5.3 NavItem (`src/components/layout/nav-item.tsx`)

**Type:** Client component (`"use client"`)

**Props:**

```typescript
interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}
```

**Rendering:**

Uses Next.js `Link` wrapping a styled `Box`:

```typescript
<Link href={href} onClick={onClick} style={{ textDecoration: 'none' }}>
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      px: 1.5,
      py: 1,
      borderRadius: '6px',
      fontSize: '0.875rem',
      fontWeight: active ? 600 : 500,
      color: active ? 'primary.main' : 'grey.700',
      bgcolor: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
      '&:hover': {
        bgcolor: active ? 'rgba(37, 99, 235, 0.08)' : 'grey.200',
      },
      transition: 'background-color 150ms',
    }}
  >
    <Icon sx={{ fontSize: 20, color: active ? 'primary.main' : 'grey.500' }} />
    {label}
  </Box>
</Link>
```

---

### 5.4 AppHeader (`src/components/layout/app-header.tsx`)

**Type:** Client component (`"use client"`)

**Props:**

```typescript
interface AppHeaderProps {
  title: string;
  userEmail: string | null;
  onMenuClick: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
}
```

**Layout:**

```typescript
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
    px: { xs: 2, lg: 3 },
    position: 'sticky',
    top: 0,
    zIndex: (theme) => theme.zIndex.appBar,
  }}
>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    {/* Mobile hamburger — hidden on desktop */}
    <IconButton
      onClick={onMenuClick}
      size="small"
      sx={{ display: { xs: 'flex', lg: 'none' }, color: 'grey.500' }}
    >
      <MenuOutlined fontSize="small" />
    </IconButton>
    <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.900', letterSpacing: '-0.01em' }}>
      {title}
    </Typography>
  </Box>

  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    {userEmail && (
      <Typography
        variant="body2"
        sx={{
          color: 'grey.500',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {userEmail}
      </Typography>
    )}
    <IconButton
      onClick={onLogout}
      disabled={loggingOut}
      size="small"
      sx={{ color: 'grey.500', '&:hover': { color: 'grey.700' } }}
    >
      <LogoutOutlined fontSize="small" />
    </IconButton>
  </Box>
</Box>
```

---

### 5.5 (app) Layout Modification (`src/app/(app)/layout.tsx`)

**Current:**

```typescript
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**New:**

```typescript
import { AppLayout } from "@/components/layout/app-layout";

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
```

This wraps all `(app)` routes in the shell.

---

### 5.6 Dashboard Page (`src/app/(app)/dashboard/page.tsx`)

**Replaces:** Current centered placeholder card and the separate `/welcome` page.

**Type:** Client component (`"use client"`) — reads `?welcome=true` search param to conditionally show the welcome modal. The user email is handled by AppLayout/AppHeader, not the page itself.

**Content structure:**

```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { WelcomeModal } from "@/components/welcome-modal";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showWelcome = searchParams.get("welcome") === "true";

  function handleWelcomeClose() {
    router.replace("/dashboard");
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Summary Cards Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <SummaryCard label="Net Worth" />
          <SummaryCard label="Spending This Month" />
          <SummaryCard label="Upcoming Bills" />
        </Box>

        {/* Get Started Card */}
        <GetStartedCard />

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

      <WelcomeModal open={showWelcome} onClose={handleWelcomeClose} />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
```

**SummaryCard** (inline or extracted to `src/components/summary-card.tsx`):

```typescript
interface SummaryCardProps {
  label: string;
}

function SummaryCard({ label }: SummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Typography
        variant="caption"
        sx={{ color: 'grey.500', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.300', mt: 0.5 }}>
        —
      </Typography>
    </Card>
  );
}
```

**GetStartedCard** (inline in dashboard page):

```typescript
function GetStartedCard() {
  return (
    <Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
      <AccountBalanceOutlined sx={{ fontSize: 48, color: 'grey.400' }} />
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.900', mt: 2 }}>
        Connect your financial accounts to get started
      </Typography>
      <Typography variant="body2" sx={{ color: 'grey.500', maxWidth: 420, mx: 'auto', mt: 1 }}>
        P.R.I.M.E. will automatically organize your transactions, track your spending, and help you make confident financial decisions.
      </Typography>
      <Button variant="outlined" disabled sx={{ mt: 3 }}>
        Connect Accounts
      </Button>
      <Typography variant="caption" sx={{ display: 'block', color: 'grey.400', mt: 1 }}>
        Coming soon
      </Typography>
    </Card>
  );
}
```

---

### 5.7 EmptyStateCard (`src/components/empty-state-card.tsx`)

**Purpose:** Inline empty state block used within the dashboard for sections like "Recent Activity" and "Insights".

```typescript
interface EmptyStateCardProps {
  title: string;
  icon: React.ElementType;
  heading: string;
  description: string;
}

export function EmptyStateCard({ title, icon: Icon, heading, description }: EmptyStateCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3, minHeight: 180 }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'grey.900', mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
        <Icon sx={{ fontSize: 32, color: 'grey.300' }} />
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.500', mt: 1.5 }}>
          {heading}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.400', mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </Card>
  );
}
```

---

### 5.8 EmptyStatePage (`src/components/empty-state-page.tsx`)

**Purpose:** Full-page empty state for routes that have no content yet (Budget, Goals, Purchases, Settings).

```typescript
interface EmptyStatePageProps {
  icon: React.ElementType;
  heading: string;
  description: string;
}

export function EmptyStatePage({ icon: Icon, heading, description }: EmptyStatePageProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <Card variant="outlined" sx={{ py: '60px', px: 5, textAlign: 'center', maxWidth: 480, width: '100%' }}>
        <Icon sx={{ fontSize: 48, color: 'grey.400' }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.900', mt: 2 }}>
          {heading}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.500', mt: 1, maxWidth: 360, mx: 'auto' }}>
          {description}
        </Typography>
      </Card>
    </Box>
  );
}
```

---

### 5.9 New Route Pages

Each route page is a thin wrapper around `EmptyStatePage`.

**`src/app/(app)/budget/page.tsx`**

```typescript
import { EmptyStatePage } from "@/components/empty-state-page";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";

export default function BudgetPage() {
  return (
    <EmptyStatePage
      icon={AccountBalanceWalletOutlined}
      heading="Your budget will appear here"
      description="Once your accounts are connected, P.R.I.M.E. will categorize your spending and help you understand where your money goes."
    />
  );
}
```

**`src/app/(app)/goals/page.tsx`**

```typescript
import { EmptyStatePage } from "@/components/empty-state-page";
import FlagOutlined from "@mui/icons-material/FlagOutlined";

export default function GoalsPage() {
  return (
    <EmptyStatePage
      icon={FlagOutlined}
      heading="Your goals will appear here"
      description="Set savings targets, track your progress, and get clear timelines for when you can reach your financial goals."
    />
  );
}
```

**`src/app/(app)/purchases/page.tsx`**

```typescript
import { EmptyStatePage } from "@/components/empty-state-page";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";

export default function PurchasesPage() {
  return (
    <EmptyStatePage
      icon={ShoppingCartOutlined}
      heading="Purchase planning will appear here"
      description="Evaluate whether you can afford a purchase, when you can afford it, and what trade-offs it creates."
    />
  );
}
```

**`src/app/(app)/settings/page.tsx`**

```typescript
import { EmptyStatePage } from "@/components/empty-state-page";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

export default function SettingsPage() {
  return (
    <EmptyStatePage
      icon={SettingsOutlined}
      heading="Settings"
      description="Account preferences, connected accounts, and notification settings will be managed here."
    />
  );
}
```

---

### 5.10 WelcomeModal (`src/components/welcome-modal.tsx`)

**Replaces:** The `/welcome` page (`src/app/(app)/welcome/page.tsx`), which is deleted.

**Type:** Client component (`"use client"`)

**Purpose:** One-time modal overlay shown on the dashboard for first-time signups. The full shell and dashboard content are visible (dimmed) behind it, reinforcing that the user has arrived in a real product.

**Props:**

```typescript
interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}
```

**Implementation:**

```typescript
"use client";

import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import SvgIcon from "@mui/material/SvgIcon";

function CheckIcon() {
  return (
    <SvgIcon sx={{ fontSize: 24, color: "#059669" }}>
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown
    >
      <Box sx={{ p: 5, textAlign: "center" }}>
        <Box
          sx={{
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: "#ECFDF5",
          }}
        >
          <CheckIcon />
        </Box>
        <Typography
          variant="h5"
          sx={{ mt: 2, fontWeight: 600, color: "grey.900" }}
        >
          Your private financial workspace is ready.
        </Typography>
        <Typography
          sx={{ mt: 1, fontSize: "0.875rem", color: "grey.500" }}
        >
          Your data is encrypted and only accessible by you.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          disableElevation
          onClick={onClose}
          sx={{ mt: 3, py: 1.25 }}
        >
          Continue to Dashboard
        </Button>
      </Box>
    </Dialog>
  );
}
```

**Behavior:**

- Opens when `?welcome=true` is in the URL (controlled by dashboard page)
- "Continue to Dashboard" calls `onClose`, which triggers `router.replace('/dashboard')` — removing the query param
- Clicking the backdrop also closes the modal and removes the param
- `disableEscapeKeyDown` — user should acknowledge the message via button or backdrop click
- The modal does not reappear on page refresh after dismissal because the param is gone
- The dashboard content is fully rendered behind the modal overlay

### 5.11 Delete Welcome Page

**Delete:** `src/app/(app)/welcome/page.tsx`

The `/welcome` route is no longer needed. The welcome experience is now a modal on `/dashboard?welcome=true`.

---

## 6. Middleware Modification

### Current State

The middleware `PROTECTED_ROUTES` array and `config.matcher` only cover `/welcome` and `/dashboard`. The new routes (`/budget`, `/goals`, `/purchases`, `/settings`) are unprotected.

### Required Changes (`src/middleware.ts`)

**Update `PROTECTED_ROUTES`:**

```typescript
const PROTECTED_ROUTES = ["/dashboard", "/budget", "/goals", "/purchases", "/settings"];
```

**Update `config.matcher`:**

```typescript
export const config = {
  matcher: [
    "/signup",
    "/login",
    "/verify",
    "/dashboard",
    "/dashboard/:path*",
    "/budget",
    "/budget/:path*",
    "/goals",
    "/goals/:path*",
    "/purchases",
    "/purchases/:path*",
    "/settings",
    "/settings/:path*",
    "/api/((?!auth/).*)",
  ],
};
```

This ensures unauthenticated users accessing any app route are redirected to `/signup`, and authenticated users on auth routes are redirected to `/dashboard`.

### Auth Callback Modification (`src/app/api/auth/callback/route.ts`)

The callback currently redirects new users to `/welcome?new=true`. Update to redirect to `/dashboard?welcome=true` instead.

**Change:**

```typescript
// BEFORE
if (isNew) {
  return NextResponse.redirect(`${origin}/welcome?new=true`);
}

// AFTER
if (isNew) {
  return NextResponse.redirect(`${origin}/dashboard?welcome=true`);
}
```

This is the only backend change. The welcome modal on the dashboard reads this param.

---

## 7. Data Model

**No schema changes.** This feature introduces no new database models, no new fields, and no migrations. All data (user email, session) is read from the existing Supabase auth session on the client.

---

## 8. Data Processing & Logic

**No financial logic.** This feature is purely UI layout and navigation. All content is static. The only runtime data is:

| Data | Source | When Fetched |
|------|--------|-------------|
| User email | `supabase.auth.getUser()` | On `AppLayout` mount (client-side) |
| Current pathname | `usePathname()` (Next.js) | Reactive, updates on navigation |
| Mobile drawer state | `useState` | Local component state |
| Welcome modal open | `useSearchParams()` → `?welcome=true` | On dashboard mount. Removed via `router.replace('/dashboard')` on dismiss. |

---

## 9. API Surface

**No new API routes.** This feature does not introduce any backend endpoints. The only API interaction is the existing Supabase client-side `auth.getUser()` and `auth.signOut()` calls.

---

## 10. Testing Strategy

### 10.1 Component Tests

```
TEST: app_layout_renders_sidebar_and_header
GIVEN:
  - User is authenticated with email "test@example.com"
WHEN:
  - AppLayout renders with children
THEN:
  - Sidebar is present with 5 nav items (Dashboard, Budget, Goals, Purchases, Settings)
  - Header displays "test@example.com"
  - Header displays page title
  - Logout button is present
  - Children render in content area
```

```
TEST: sidebar_active_state_matches_pathname
GIVEN:
  - Current pathname is "/budget"
WHEN:
  - Sidebar renders
THEN:
  - Budget nav item has active styling (primary color, semibold, primary background)
  - All other nav items have inactive styling
```

```
TEST: nav_item_navigates_on_click
GIVEN:
  - User is on "/dashboard"
WHEN:
  - User clicks "Goals" nav item
THEN:
  - Route changes to "/goals"
  - Goals nav item becomes active
  - Page title updates to "Goals"
```

```
TEST: page_title_derived_from_route
GIVEN:
  - Route-to-title map is defined
WHEN:
  - Pathname is "/purchases"
THEN:
  - Header title is "Purchases"
```

```
TEST: unknown_route_shows_fallback_title
GIVEN:
  - Pathname is "/unknown"
WHEN:
  - AppLayout renders
THEN:
  - Header title is "P.R.I.M.E."
```

### 10.2 Logout Tests

```
TEST: logout_success_redirects_to_login
GIVEN:
  - User is authenticated
  - supabase.auth.signOut() will succeed
WHEN:
  - User clicks logout button
THEN:
  - supabase.auth.signOut() is called
  - Toast "Signed out" is shown
  - User is redirected to "/login"
```

```
TEST: logout_failure_shows_error_toast
GIVEN:
  - User is authenticated
  - supabase.auth.signOut() will throw an error
WHEN:
  - User clicks logout button
THEN:
  - Toast "Failed to sign out. Please try again." is shown
  - User remains on current page
  - Logout button is re-enabled
```

### 10.3 Responsive Tests

```
TEST: mobile_sidebar_hidden_by_default
GIVEN:
  - Viewport width is 768px
WHEN:
  - AppLayout renders
THEN:
  - Sidebar is not visible
  - Hamburger menu icon is visible in header
```

```
TEST: mobile_sidebar_opens_as_drawer
GIVEN:
  - Viewport width is 768px
WHEN:
  - User clicks hamburger icon
THEN:
  - MUI Drawer opens from left with sidebar content
  - Overlay is visible
```

```
TEST: mobile_sidebar_closes_on_nav
GIVEN:
  - Mobile drawer is open
WHEN:
  - User clicks a nav item
THEN:
  - Drawer closes
  - Navigation occurs
```

### 10.4 Welcome Modal Tests

```
TEST: welcome_modal_shows_on_first_signup
GIVEN:
  - User just signed up (new account)
  - Auth callback redirected to /dashboard?welcome=true
WHEN:
  - Dashboard page renders
THEN:
  - Welcome modal is visible as a Dialog overlay
  - Dashboard content (summary cards, get started card) is rendered behind modal
  - Modal shows "Your private financial workspace is ready."
  - "Continue to Dashboard" button is visible
```

```
TEST: welcome_modal_closes_and_removes_param
GIVEN:
  - Welcome modal is open on /dashboard?welcome=true
WHEN:
  - User clicks "Continue to Dashboard"
THEN:
  - Modal closes
  - URL becomes /dashboard (no query param)
  - Dashboard content is fully visible
```

```
TEST: welcome_modal_closes_on_backdrop_click
GIVEN:
  - Welcome modal is open on /dashboard?welcome=true
WHEN:
  - User clicks the backdrop overlay
THEN:
  - Modal closes
  - URL becomes /dashboard (no query param)
```

```
TEST: welcome_modal_does_not_show_on_normal_login
GIVEN:
  - User is an existing user (not first signup)
WHEN:
  - User logs in and lands on /dashboard
THEN:
  - No welcome modal appears
  - URL is /dashboard (no ?welcome param)
```

```
TEST: welcome_modal_does_not_reappear_on_refresh
GIVEN:
  - User dismissed the welcome modal (URL is now /dashboard)
WHEN:
  - User refreshes the page
THEN:
  - No welcome modal appears
```

### 10.5 Empty State Tests

```
TEST: dashboard_renders_empty_state_structure
GIVEN:
  - No financial data exists
WHEN:
  - Dashboard page renders
THEN:
  - 3 summary cards are visible with "—" placeholder values
  - Get Started card is visible with disabled "Connect Accounts" button
  - Recent Activity empty state card is visible
  - Insights empty state card is visible
```

```
TEST: empty_route_pages_render_correctly
GIVEN:
  - No feature data exists
WHEN:
  - Budget page renders
THEN:
  - EmptyStatePage renders with wallet icon, heading "Your budget will appear here", and description text
```

### 10.6 Middleware Tests

```
TEST: unauthenticated_user_redirected_from_new_routes
GIVEN:
  - User is not authenticated
WHEN:
  - User navigates to "/budget", "/goals", "/purchases", or "/settings"
THEN:
  - User is redirected to "/signup"
```

```
TEST: authenticated_user_accesses_new_routes
GIVEN:
  - User is authenticated
WHEN:
  - User navigates to "/budget"
THEN:
  - Page renders normally (no redirect)
```

### 10.7 User Isolation

```
TEST: user_email_from_own_session_only
GIVEN:
  - User A is authenticated with "a@example.com"
WHEN:
  - AppLayout fetches user email
THEN:
  - Only User A's email is displayed
  - No cross-user data is accessible
```

---

## 11. Acceptance Criteria

### 1. Application Shell
- [ ] Sidebar renders with P.R.I.M.E. logo text + SVG and 5 nav items
- [ ] Header renders with dynamic page title, user email, and logout button
- [ ] Content area renders child page content
- [ ] Shell persists across route navigation (no full re-render)

### 2. Navigation
- [ ] All 5 routes are accessible: `/dashboard`, `/budget`, `/goals`, `/purchases`, `/settings`
- [ ] Active nav item reflects current pathname
- [ ] Navigation is client-side (no full page reload)
- [ ] Page title in header updates on navigation

### 3. Dashboard
- [ ] 3 summary cards with placeholder values ("—")
- [ ] Get Started card with disabled "Connect Accounts" button
- [ ] Recent Activity and Insights empty state cards
- [ ] Responsive grid: 3-col → 1-col on mobile; 2-col → 1-col on mobile

### 4. Empty State Pages
- [ ] Budget, Goals, Purchases, Settings each render EmptyStatePage with correct icon, heading, description
- [ ] Each page renders inside the shell (sidebar + header visible)

### 5. Auth Integration
- [ ] Login redirects to `/dashboard`
- [ ] First-time signup redirects to `/dashboard?welcome=true`
- [ ] Welcome modal appears as Dialog overlay on first signup, dashboard visible behind it
- [ ] Welcome modal closes on "Continue to Dashboard" click, `?welcome` param removed
- [ ] Welcome modal does not appear on subsequent logins or session restore
- [ ] `/welcome` page is deleted, route no longer exists
- [ ] Session restore renders shell correctly
- [ ] Authenticated users redirected away from `/login` and `/signup`
- [ ] Unauthenticated users redirected to `/signup` from all protected routes
- [ ] Logout clears session, redirects to `/login`, shows toast

### 6. Responsive
- [ ] Desktop (≥1024px): Fixed sidebar, full header
- [ ] Tablet/Mobile (<1024px): Sidebar hidden, hamburger in header, drawer opens on tap
- [ ] User email hidden on mobile, only logout icon shown
- [ ] Content padding adjusts (24px desktop, 16px mobile)

---

## 12. Explicit Non-Goals (v1)

- No new database models or migrations
- No new API routes
- No financial data fetching or rendering
- No Plaid integration or account connection logic
- No budgeting, goal tracking, or purchase evaluation features
- No AI-powered insights or recommendations
- No notification badges or alert system
- No user profile editing or avatar management
- No theme switching or dark mode
- No search functionality
- No onboarding tour or walkthrough
- No changes to auth logic, OTP flow, or Supabase configuration
- No SWR or data fetching patterns (all content is static)

---

## 13. Open Questions

None. All design decisions are resolved.

---

## 14. Future Considerations

- **Dashboard content:** Summary cards will connect to real data (account balances, spending totals, upcoming bills) once Plaid integration and financial data ingestion are built.
- **Get Started card:** The disabled "Connect Accounts" button becomes active with the Plaid pitch. The card itself may be replaced by real content once accounts are linked.
- **Empty state → active state transitions:** Each route page (Budget, Goals, Purchases, Settings) will replace `EmptyStatePage` with real content as those features are implemented. The `EmptyStatePage` component remains useful as a fallback.
- **Sidebar extensibility:** New nav items (e.g., Insights, Notifications) can be added to the `NAV_ITEMS` array without structural changes.
- **SWR introduction:** When data fetching is needed, SWR will be introduced for reads. The shell itself will not need SWR since it only reads auth session state.

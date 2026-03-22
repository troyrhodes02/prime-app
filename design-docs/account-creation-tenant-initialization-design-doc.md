# Account Creation & Tenant Initialization — Design Document

**Version:** 1.0
**Focus:** Passwordless signup and automatic workspace provisioning — the entry point into P.R.I.M.E.

---

## 1. Vision

Before P.R.I.M.E. can deliver any financial insight, a user must have a secure, private workspace. Traditional signup flows with passwords create friction and doubt — especially for a product that handles real financial data. This feature replaces that friction with passwordless authentication (email magic link and Google OAuth), then silently provisions an isolated financial workspace so the user lands directly in a ready environment.

**Design north star:** Instant trust. The signup experience should feel fast, modern, and secure — reinforcing that P.R.I.M.E. takes financial privacy seriously before the user has shared a single account number.

---

## 2. Design Principles

### 1. Speed Is Trust

The faster a user moves from intent to workspace, the more they trust the product. Every extra field, confirmation, or delay erodes confidence. The entire flow must feel like one fluid motion.

### 2. Security Without Complexity

Passwordless auth is both more secure and simpler than passwords. The UI must communicate this — the absence of a password field is a feature, not a limitation. Reassurance copy should be minimal and confident, not defensive.

### 3. Invisible Provisioning

Tenant creation, ownership mapping, and workspace initialization happen automatically. The user should never see setup steps, spinners about "creating your workspace," or configuration screens. They authenticate, and they arrive.

### 4. One Path, Two Options

Email and Google are two ways to do the same thing. The UI must not create a decision burden — both options are equally prominent, and the user picks whichever feels natural.

### 5. Trust Before Data

The first thing a user sees after authentication should confirm that their private workspace exists and is ready. This sets the emotional foundation before any sensitive financial actions (like linking bank accounts).

---

## 3. Visual Language

> All styling inherits from the P.R.I.M.E. design system or current product visual language. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-primary` | `#FFFFFF` | Page background |
| `--color-bg-surface` | `#F9FAFB` | Card / panel background |
| `--color-bg-elevated` | `#FFFFFF` | Auth card on surface |
| `--color-text-primary` | `#111827` | Headings, primary labels |
| `--color-text-secondary` | `#6B7280` | Supporting copy, descriptions |
| `--color-text-muted` | `#9CA3AF` | Placeholder text, footer links |
| `--color-brand-primary` | `#2563EB` | Primary CTA button, links |
| `--color-brand-hover` | `#1D4ED8` | Primary CTA hover state |
| `--color-border-default` | `#E5E7EB` | Input borders, dividers |
| `--color-border-focus` | `#2563EB` | Input focus ring |
| `--color-success` | `#059669` | Workspace ready confirmation |
| `--color-error` | `#DC2626` | Validation errors, failed auth |
| `--color-google-bg` | `#FFFFFF` | Google button background |
| `--color-google-border` | `#D1D5DB` | Google button border |

### Status Colors

| State | Color | Usage |
|---|---|---|
| Success / workspace ready | `#059669` | Confirmation icon and text |
| Error / auth failed | `#DC2626` | Error messages, retry prompts |
| Loading / in-progress | `#2563EB` | Spinner, progress indicators |

### Typography

| Element | Size | Weight | Line Height | Tailwind |
|---|---|---|---|---|
| Page heading | 24px | 600 | 32px | `text-2xl font-semibold` |
| Subheading | 16px | 500 | 24px | `text-base font-medium` |
| Body text | 14px | 400 | 20px | `text-sm` |
| Input label | 14px | 500 | 20px | `text-sm font-medium` |
| Input text | 14px | 400 | 20px | `text-sm` |
| Button text | 14px | 500 | 20px | `text-sm font-medium` |
| Caption / footer | 12px | 400 | 16px | `text-xs` |

Font family: Geist Sans (`var(--font-geist-sans)`)

### Spacing

Base unit: 4px. Feature uses 4, 8, 12, 16, 20, 24, 32, 48 increments.

- Auth card internal padding: 32px (`p-8`)
- Element vertical spacing within card: 16px (`space-y-4`)
- Section separators: 24px (`my-6`)
- Page-level centering: flexbox center with min-height viewport

### Border Radius / Surface Language

| Element | Radius | Tailwind |
|---|---|---|
| Auth card | 12px | `rounded-xl` |
| Input fields | 8px | `rounded-lg` |
| Buttons | 8px | `rounded-lg` |
| Google button | 8px | `rounded-lg` |

Auth card elevation: `shadow-sm` on surface background. No heavy drop shadows.

---

## 4. Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ P.R.I.M.E. Auth Flow (pre-authenticated)                       │
│                                                                 │
│ ┌─ /signup ───────────────────────────────────────────────────┐ │
│ │ Auth Card                                                   │ │
│ │ ├─ Logo + Product Name                                      │ │
│ │ ├─ Heading: "Get started"                                   │ │
│ │ ├─ Email input + Continue button                            │ │
│ │ ├─ ── or ── divider                                         │ │
│ │ ├─ Continue with Google button                              │ │
│ │ └─ Footer: sign-in link                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ /verify ───────────────────────────────────────────────────┐ │
│ │ Verification Card                                           │ │
│ │ ├─ Heading: "Check your email"                              │ │
│ │ ├─ Sent-to confirmation                                     │ │
│ │ ├─ OTP input (6-digit)                                      │ │
│ │ └─ Resend / Back options                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ /welcome ──────────────────────────────────────────────────┐ │
│ │ Workspace Ready Card                                        │ │
│ │ ├─ Success icon                                             │ │
│ │ ├─ "Your private financial workspace is ready."             │ │
│ │ ├─ Brief trust message                                      │ │
│ │ └─ Continue to Dashboard button                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ──── authenticated boundary ────                                │
│                                                                 │
│ ┌─ /dashboard ────────────────────────────────────────────────┐ │
│ │ (Next feature — out of scope)                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Screen Specifications

---

### Screen 1: Signup

#### Purpose

Allow the user to begin authentication via email or Google — fast, with zero password friction.

#### URL Pattern

`/signup`

#### Primary User Question

> "How do I get into this product?"

#### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              ┌────────────────────┐              │
│              │                    │              │
│              │   [P.R.I.M.E.]    │              │
│              │                    │              │
│              │   Get started      │              │
│              │                    │              │
│              │   Securely access  │              │
│              │   your financial   │              │
│              │   workspace        │              │
│              │                    │              │
│              │   ┌──────────────┐ │              │
│              │   │ Email        │ │              │
│              │   └──────────────┘ │              │
│              │   [  Continue   ]  │              │
│              │                    │              │
│              │   ──── or ────     │              │
│              │                    │              │
│              │   [G Continue w/ ] │              │
│              │   [  Google     ]  │              │
│              │                    │              │
│              │   Already have an  │              │
│              │   account? Sign in │              │
│              │                    │              │
│              └────────────────────┘              │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Logo & Heading Section

| Element | Styling & Behavior |
|---|---|
| **Logo** | P.R.I.M.E. wordmark or icon, centered, `mb-6` |
| **Heading** | "Get started" — `text-2xl font-semibold text-gray-900` |
| **Subheading** | "Securely access your financial workspace" — `text-sm text-gray-500 mt-1` |

#### Email Input Section

| Element | Styling & Behavior |
|---|---|
| **Email label** | "Email address" — `text-sm font-medium text-gray-700`, visually hidden if using placeholder only |
| **Email input** | `w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent` placeholder: "you@example.com" |
| **Continue button** | "Continue" — `w-full rounded-lg bg-blue-600 text-white text-sm font-medium py-2.5 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed` |

#### Divider

| Element | Styling & Behavior |
|---|---|
| **Divider** | Horizontal rule with centered "or" text — `flex items-center gap-3 my-6`. Lines: `flex-1 h-px bg-gray-200`. Text: `text-xs text-gray-400 uppercase tracking-wide` |

#### Google Button

| Element | Styling & Behavior |
|---|---|
| **Google button** | "Continue with Google" — `w-full rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2` with Google "G" icon (16x16) |

#### Footer

| Element | Styling & Behavior |
|---|---|
| **Sign-in link** | "Already have an account? Sign in" — `text-xs text-gray-400`. "Sign in" is a link: `text-blue-600 hover:underline` |

#### Code Reference

```jsx
<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
  <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
    {/* Logo */}
    <div className="mb-6 text-center">
      <span className="text-xl font-semibold tracking-tight text-gray-900">
        P.R.I.M.E.
      </span>
    </div>

    {/* Heading */}
    <h1 className="text-center text-2xl font-semibold text-gray-900">
      Get started
    </h1>
    <p className="mt-1 text-center text-sm text-gray-500">
      Securely access your financial workspace
    </p>

    {/* Email form */}
    <form onSubmit={handleEmailSubmit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        placeholder="you@example.com"
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-600
                   focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium
                   text-white hover:bg-blue-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </form>

    {/* Divider */}
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs uppercase tracking-wide text-gray-400">or</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>

    {/* Google */}
    <button
      onClick={handleGoogleSignIn}
      className="flex w-full items-center justify-center gap-2 rounded-lg
                 border border-gray-300 bg-white py-2.5 text-sm font-medium
                 text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <GoogleIcon className="h-4 w-4" />
      Continue with Google
    </button>

    {/* Footer */}
    <p className="mt-6 text-center text-xs text-gray-400">
      Already have an account?{" "}
      <a href="/login" className="text-blue-600 hover:underline">
        Sign in
      </a>
    </p>
  </div>
</div>
```

#### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Email | `email` input | Yes (email path) | Standard email validation. Trimmed, lowercased before submission. |

#### Validation

- **Empty email:** Button disabled until input is non-empty
- **Invalid email format:** Show inline error below input: "Enter a valid email address" in `text-xs text-red-600 mt-1`
- **Rate limiting:** If too many attempts, show: "Too many attempts. Try again shortly." as inline error
- **Google OAuth failure:** Toast notification (see Interaction Specifications)

#### Empty State

Not applicable — this is the entry screen.

#### Behavior

- **Email submit success:** Navigate to `/verify` with email passed as state
- **Google sign-in success (new user):** System creates user + tenant, redirects to `/welcome`
- **Google sign-in success (existing user):** Redirects to `/dashboard`
- **Google sign-in failure:** Toast: "Could not sign in with Google. Try again."
- **Focus:** Email input auto-focused on page load
- **Loading:** "Continue" button shows spinner and disables during submission. Google button disables simultaneously to prevent parallel auth attempts.

---

### Screen 2: Email Verification

#### Purpose

Confirm the user's email identity via a 6-digit OTP code sent by the auth provider.

#### URL Pattern

`/verify`

#### Trigger

User submits email on the signup screen and the auth provider sends a magic link / OTP.

#### Primary User Question

> "I entered my email — what do I do now?"

#### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              ┌────────────────────┐              │
│              │                    │              │
│              │   [P.R.I.M.E.]    │              │
│              │                    │              │
│              │   Check your email │              │
│              │                    │              │
│              │   We sent a code   │              │
│              │   to you@email.com │              │
│              │                    │              │
│              │   ┌─┬─┬─┬─┬─┬─┐   │              │
│              │   │ │ │ │ │ │ │   │              │
│              │   └─┴─┴─┴─┴─┴─┘   │              │
│              │                    │              │
│              │   [   Verify    ]  │              │
│              │                    │              │
│              │   Didn't get it?   │              │
│              │   Resend code      │              │
│              │                    │              │
│              │   <- Back          │              │
│              │                    │              │
│              └────────────────────┘              │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Heading Section

| Element | Styling & Behavior |
|---|---|
| **Logo** | Same as signup screen |
| **Heading** | "Check your email" — `text-2xl font-semibold text-gray-900` |
| **Description** | "We sent a verification code to **{email}**" — `text-sm text-gray-500 mt-1`. Email bold: `font-medium text-gray-700` |

#### OTP Input

| Element | Styling & Behavior |
|---|---|
| **OTP fields** | 6 individual digit inputs, each: `w-10 h-12 rounded-lg border border-gray-200 text-center text-lg font-medium focus:ring-2 focus:ring-blue-600 focus:border-transparent`. Auto-advance on digit entry. Backspace moves to previous field. |
| **Verify button** | "Verify" — same styling as Continue button on signup. Disabled until all 6 digits entered. |

#### Footer Actions

| Element | Styling & Behavior |
|---|---|
| **Resend** | "Didn't receive a code? Resend" — `text-xs text-gray-400`. "Resend" link: `text-blue-600 hover:underline`. After click, changes to "Code sent" for 30s with countdown before re-enabling. |
| **Back** | "Back" with left arrow — `text-sm text-gray-500 hover:text-gray-700`. Returns to `/signup` with email pre-filled. |

#### Code Reference

```jsx
<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
  <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
    <div className="mb-6 text-center">
      <span className="text-xl font-semibold tracking-tight text-gray-900">
        P.R.I.M.E.
      </span>
    </div>

    <h1 className="text-center text-2xl font-semibold text-gray-900">
      Check your email
    </h1>
    <p className="mt-1 text-center text-sm text-gray-500">
      We sent a verification code to{" "}
      <span className="font-medium text-gray-700">{email}</span>
    </p>

    <form onSubmit={handleVerify} className="mt-6">
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="h-12 w-10 rounded-lg border border-gray-200 text-center
                       text-lg font-medium focus:outline-none focus:ring-2
                       focus:ring-blue-600 focus:border-transparent"
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={code.length < 6 || loading}
        className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm
                   font-medium text-white hover:bg-blue-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Verify
      </button>
    </form>

    <p className="mt-4 text-center text-xs text-gray-400">
      Didn&apos;t receive a code?{" "}
      <button
        onClick={handleResend}
        disabled={resendCooldown > 0}
        className="text-blue-600 hover:underline disabled:text-gray-300
                   disabled:no-underline"
      >
        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
      </button>
    </p>

    <button
      onClick={() => router.push("/signup")}
      className="mt-4 flex w-full items-center justify-center gap-1
                 text-sm text-gray-500 hover:text-gray-700 transition-colors"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      Back
    </button>
  </div>
</div>
```

#### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| OTP code | 6x single-digit inputs | Yes | Numeric only. Auto-advance. Paste support for full 6-digit code. |

#### Validation

- **Incomplete code:** Verify button disabled
- **Invalid code:** Inline error below OTP inputs: "Invalid code. Check your email and try again." — `text-xs text-red-600 mt-2 text-center`
- **Expired code:** Same error styling: "This code has expired. Request a new one."
- **Max attempts:** "Too many attempts. Please start over." with auto-redirect to `/signup` after 3s

#### Empty State

Not applicable.

#### Behavior

- **Verification success (new user):** System creates user + tenant in background, then redirects to `/welcome`
- **Verification success (existing user):** Redirects to `/dashboard`
- **Verification failure:** Show inline error, clear OTP fields, focus first field
- **Resend:** 60-second cooldown with visible countdown. Toast on resend: "Code sent"
- **Back:** Returns to signup with email pre-filled
- **Paste support:** Pasting a 6-digit code fills all fields and auto-submits
- **Focus:** First OTP field auto-focused on mount

---

### Screen 3: Workspace Ready

#### Purpose

Confirm that the user's private financial workspace has been created and is ready to use. Build trust before any sensitive financial actions.

#### URL Pattern

`/welcome`

#### Trigger

Successful first-time authentication (email verification or Google OAuth for a new user).

#### Primary User Question

> "Am I set up? Is this secure?"

#### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              ┌────────────────────┐              │
│              │                    │              │
│              │       [check]      │              │
│              │                    │              │
│              │   Your private     │              │
│              │   financial        │              │
│              │   workspace is     │              │
│              │   ready.           │              │
│              │                    │              │
│              │   Your data is     │              │
│              │   encrypted and    │              │
│              │   only accessible  │              │
│              │   by you.          │              │
│              │                    │              │
│              │  [ Continue to     │              │
│              │    Dashboard    ]  │              │
│              │                    │              │
│              └────────────────────┘              │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Content

| Element | Styling & Behavior |
|---|---|
| **Success icon** | Checkmark in circle — `h-12 w-12 text-emerald-600 mx-auto`. Animated: scale-in with slight bounce on mount (CSS `animate-scale-in`, 300ms). |
| **Heading** | "Your private financial workspace is ready." — `text-2xl font-semibold text-gray-900 text-center mt-4` |
| **Trust message** | "Your data is encrypted and only accessible by you." — `text-sm text-gray-500 text-center mt-2` |
| **CTA button** | "Continue to Dashboard" — `w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors mt-6` |

#### Code Reference

```jsx
<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
  <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center
                    rounded-full bg-emerald-50 animate-scale-in">
      <CheckIcon className="h-6 w-6 text-emerald-600" />
    </div>

    <h1 className="mt-4 text-2xl font-semibold text-gray-900">
      Your private financial workspace is ready.
    </h1>

    <p className="mt-2 text-sm text-gray-500">
      Your data is encrypted and only accessible by you.
    </p>

    <button
      onClick={() => router.push("/dashboard")}
      className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 text-sm
                 font-medium text-white hover:bg-blue-700 transition-colors"
    >
      Continue to Dashboard
    </button>
  </div>
</div>
```

#### Empty State

Not applicable — this screen only appears after successful provisioning.

#### Behavior

- **On mount:** Success icon animates in (scale from 0.8 to 1.0 with ease-out, 300ms)
- **CTA click:** Navigate to `/dashboard`
- **Auto-redirect:** If user navigates directly to `/welcome` without being a new user, redirect to `/dashboard`
- **Session:** User is fully authenticated at this point. Session token is active.

---

### Screen 4: Sign In (Returning Users)

#### Purpose

Allow existing users to re-enter their workspace with the same passwordless methods.

#### URL Pattern

`/login`

#### Primary User Question

> "How do I get back in?"

#### Layout

Identical to the Signup screen with these differences:

| Element | Change |
|---|---|
| **Heading** | "Welcome back" |
| **Subheading** | "Sign in to your financial workspace" |
| **Footer** | "Don't have an account? Get started" linking to `/signup` |

#### Behavior

- **Email submit:** Same verification flow via `/verify`
- **Google sign-in (existing user):** Direct redirect to `/dashboard`
- **Google sign-in (no account):** Creates user + tenant, redirects to `/welcome`
- **Email sign-in (no account):** Creates user + tenant after verification, redirects to `/welcome`

The system is forgiving — whether the user hits `/signup` or `/login`, authentication always works. The distinction is cosmetic (copy changes) to match user intent.

---

## 6. Navigation Flows

```
┌─ /signup ───────────────────────────────────────┐
│                                                 │
│  [Email + Continue] ────────────────────────────│──→ /verify
│                                                 │
│  [Continue with Google] ─── new user ───────────│──→ /welcome
│                          └── existing user ─────│──→ /dashboard
│                                                 │
│  "Sign in" link ────────────────────────────────│──→ /login
└─────────────────────────────────────────────────┘

┌─ /verify ───────────────────────────────────────┐
│                                                 │
│  [Verify OTP] ─── new user ─────────────────────│──→ /welcome
│               └── existing user ────────────────│──→ /dashboard
│                                                 │
│  [Back] ────────────────────────────────────────│──→ /signup (or /login)
└─────────────────────────────────────────────────┘

┌─ /welcome ──────────────────────────────────────┐
│                                                 │
│  [Continue to Dashboard] ───────────────────────│──→ /dashboard
│                                                 │
│  (first-session only — never shown again)       │
└─────────────────────────────────────────────────┘

┌─ /login ────────────────────────────────────────┐
│                                                 │
│  Same flows as /signup                          │
│  "Get started" link ────────────────────────────│──→ /signup
└─────────────────────────────────────────────────┘
```

**State carried between screens:**
- `/signup` -> `/verify`: email address (via router state or query param)
- `/verify` -> `/welcome`: authentication session (cookie/token)
- `/welcome` -> `/dashboard`: authenticated session

**Deep-link behavior:**
- `/signup`, `/login`: Always accessible when unauthenticated
- `/verify`: Requires email state; redirects to `/signup` if accessed directly
- `/welcome`: First-session only; redirects to `/dashboard` if user already has a workspace
- All auth routes redirect to `/dashboard` if user is already authenticated

---

## 7. Interaction Specifications

### Keyboard Navigation

| Context | Key | Action |
|---|---|---|
| Signup | `Tab` | Move between email input, Continue, Google button |
| Signup | `Enter` | Submit email form (when focused in email or Continue) |
| Verify | `0-9` | Enter digit, auto-advance to next field |
| Verify | `Backspace` | Clear current, move to previous field |
| Verify | `Ctrl/Cmd+V` | Paste full 6-digit code |
| Verify | `Enter` | Submit verification (when all digits filled) |
| Welcome | `Enter` | Activate Continue to Dashboard |

### Loading States

**Email submission:**
- "Continue" button text replaced with a 16px spinner
- Button remains full-width, disabled
- Google button also disabled to prevent parallel auth
- No skeleton — the form stays visible

**Google OAuth:**
- Google button shows spinner replacing text
- Email form disabled
- If OAuth popup takes >5s, no additional UI — browser handles the popup

**Verification:**
- "Verify" button shows spinner
- OTP inputs disabled during verification

**Workspace provisioning:**
- Invisible to user. The redirect to `/welcome` only happens after provisioning completes.
- If provisioning takes >3s (unlikely), show a centered spinner with "Setting up your workspace..." on a blank page. This should be rare.

### Error States

**Auth provider unreachable:**

```jsx
<div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
  Something went wrong. Please try again.
</div>
```

**Invalid OTP (inline on verify screen):**

```jsx
<p className="mt-2 text-center text-xs text-red-600">
  Invalid code. Check your email and try again.
</p>
```

### Empty States

No empty states in this feature — all screens have defined content by default.

### Toast Notifications

| Action | Message | Duration |
|---|---|---|
| Google auth failure | "Could not sign in with Google. Try again." | 5s |
| OTP resent | "Verification code sent" | 3s |
| Rate limited | "Too many attempts. Try again shortly." | 5s |
| Provisioning failure | "Could not create your workspace. Please try again." | 5s |

Toast position: top-center. Styling: `rounded-lg px-4 py-2.5 text-sm font-medium shadow-md`. Success: `bg-gray-900 text-white`. Error: `bg-red-600 text-white`.

### Trust Messaging

| Location | Message | Purpose |
|---|---|---|
| Signup subheading | "Securely access your financial workspace" | Frames auth as security, not friction |
| Signup — no password field | (Absence itself) | Signals modern, secure approach |
| Welcome heading | "Your private financial workspace is ready." | Confirms isolation and ownership |
| Welcome body | "Your data is encrypted and only accessible by you." | Explicit privacy reassurance before financial data entry |

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Desktop | >= 1024px | Auth card centered, `max-w-sm` (384px) |
| Tablet | 768-1023px | Same as desktop — card is already narrow enough |
| Mobile | < 768px | Card fills width with `px-4` page padding. Card padding reduces to `p-6`. |

### Mobile Adaptations

- **Auth card:** Full width minus 16px padding on each side. Rounded corners preserved.
- **Card padding:** Reduced from `p-8` to `p-6` on screens < 640px
- **OTP inputs:** Slightly smaller: `h-11 w-9` to fit 6 digits + gaps within mobile width
- **Touch targets:** All buttons minimum 44px height (already met by `py-2.5` on `text-sm`)
- **Google button:** Full width, same as desktop
- **Keyboard:** Mobile keyboards use `inputMode="email"` for email field, `inputMode="numeric"` for OTP
- **Viewport:** Page uses `min-h-screen` with flex centering — works with mobile address bar changes

No layout stacking changes needed — the single-column card layout is inherently mobile-compatible.

---

## 9. Component Inventory

| Component | Location | Notes |
|---|---|---|
| `AuthCard` | All auth screens | Shared wrapper: centered card with logo, shadow, padding. Reusable across signup/login/verify/welcome. |
| `EmailForm` | Signup, Login | Email input + Continue button. Handles validation and loading state. |
| `GoogleSignInButton` | Signup, Login | Styled Google OAuth trigger with icon. |
| `OtpInput` | Verify | 6-digit input group with auto-advance, paste support, backspace handling. |
| `AuthDivider` | Signup, Login | "or" divider between email and Google options. |
| `Toast` | Global | Top-center toast notification system. Could use existing library (e.g., sonner). |
| `SuccessIcon` | Welcome | Animated checkmark in circle. Single-use but simple enough to inline. |

All components are P.R.I.M.E.-specific for this feature. `Toast` should be a global utility reused across the product.

---

## 10. Out of Scope (v1)

Per the pitch document's boundaries and no-gos:

- **Session management** — No refresh tokens, session persistence, or device management (Pitch 2)
- **Password-based auth** — No password creation, storage, or reset flows
- **MFA / biometrics** — Future feature
- **Apple Sign-In** — Mobile phase
- **Multi-provider beyond Google** — MVP constraint
- **Auth settings UI** — No user-facing auth configuration
- **Custom auth implementation** — Must use Supabase Auth (or equivalent provider)
- **Multiple tenants per user** — One user, one tenant for MVP
- **Onboarding tutorial / guided setup** — Welcome screen confirms readiness; further onboarding is a separate feature
- **Email customization** — Magic link / OTP email templates use provider defaults
- **Account deletion / data export** — Separate feature
- **Admin controls** — No admin panel for user management

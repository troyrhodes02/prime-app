# Account Creation & Tenant Initialization

> **Source:** [Linear Document](https://linear.app/prime-app/document/account-creation-and-tenant-initialization-96ee60170e6c)

## 0. Workflow Alignment

| Field | Value |
| -- | -- |
| **Product layer** | Financial Data Aggregation |
| **Implementation phase** | Foundation |
| **Dependency notes** | No upstream dependencies. This remains the root entry point for all future features including authentication sessions, Plaid linking, and financial insights. |
| **Execution fit assessment** | Strong fit. Still a clean vertical slice. Authentication methods (passwordless + Google) are included only as **entry mechanisms**, not full session management systems. |

**Workflow mapping**

* **Workflow stage:** data modeling + backend logic + onboarding UI + auth provider integration
* **Claude Code skill areas:** data-modeling, backend-logic, system-orchestration, auth-integration, ui/frontend

---

## 1. Problem

Before P.R.I.M.E. can deliver any financial insight, the system must establish a **trusted, private financial environment** for the user.

However, traditional signup flows introduce friction and doubt:

* Password creation adds unnecessary effort
* Weak or reused passwords reduce trust in a financial product
* Long signup flows delay time-to-value
* Users hesitate before connecting financial accounts

For P.R.I.M.E., this is even more critical because:

> The user is not just creating an account — they are entering a system that will analyze and guide real financial decisions.

Without a **low-friction, high-trust entry point**, users may never reach the stage where they connect accounts or receive insights.

What the user needs immediately:

* A fast way to enter the system
* Confidence that access is secure
* Assurance that their financial environment is private and ready

---

## 2. Financial Clarity Impact

This feature still delivers **trust clarity**, now improved with **frictionless access**:

> "I can securely access my financial workspace without dealing with passwords."

Clarity improvements:

* The system feels modern and secure
* Entry is fast and intentional
* Trust increases before sensitive actions (like linking accounts)

---

## 3. User Value & Monetization Impact

### Immediate Value

* User can enter the system in seconds using:
  * Email (magic link / OTP)
  * Google sign-in
* No password friction
* Immediate workspace creation

### Ongoing Value

* Easier return access → higher retention
* Lower login friction → more frequent usage

### Monetization Impact

This improves:

* **Conversion rate** (less signup friction)
* **Activation rate** (more users reach Plaid connection)
* **Retention** (easier re-entry)
* **Trust perception** (modern auth methods feel safer than passwords)

---

## 4. Time-to-Value Impact

### Before

* User creates password
* Possible friction or hesitation
* Slower onboarding

### After

1. User enters email OR clicks "Continue with Google"
2. Auth completes instantly (magic link or OAuth)
3. Tenant is provisioned automatically
4. User enters their workspace

### Impact

* Removes unnecessary steps
* Reduces cognitive load
* Accelerates path to first financial insight

---

## 5. Appetite

| Dimension | Rating |
| -- | -- |
| **Build effort** | 3–5 days |
| **System complexity** | Medium |
| **UI complexity** | Low |
| **Data dependency risk** | Low |
| **Financial trust risk** | High |

**Priority classification:**

* MVP-critical

---

## 6. Solution

### 6.1 Feature Overview

This feature allows users to:

* Sign up using **passwordless email authentication**
* Or sign in using **Google OAuth**

Upon successful authentication, the system:

* Creates the user
* Automatically provisions a private tenant/workspace
* Assigns ownership
* Routes the user into their environment

> **P.R.I.M.E. creates your secure financial workspace instantly — no passwords required.**

---

### 6.2 User Workflow

**Option A — Email (Passwordless)**

1. User enters email
2. System sends magic link or OTP
3. User verifies
4. User account is created
5. Tenant/workspace is created
6. User enters workspace

**Option B — Google Sign-In**

1. User clicks "Continue with Google"
2. OAuth flow completes
3. User account is created (if new)
4. Tenant/workspace is created
5. User enters workspace

---

### 6.3 System Behavior

**Inputs**

* Email (passwordless)
* OR Google OAuth identity

**Processing**

* Validate identity via auth provider
* Create user (if new)
* Create tenant/workspace
* Create user ↔ tenant ownership mapping
* Initialize workspace state

**Outputs**

* User account
* Tenant/workspace
* Ownership relationship
* Access into isolated environment

---

### 6.4 Insight Surface

**Where**

* Onboarding

**What**

* Confirmation banner/card

**Message**

> "Your private financial workspace is ready."

---

### 6.5 UI / UX Shape

**Signup Screen**

* Email input field
* "Continue" (magic link)
* Divider
* "Continue with Google" button

**Design priorities**

1. Simplicity
2. Trust
3. Speed

**Copy example**

* "Securely access your financial workspace"
* "No password required"

---

## 7. Automation & Intelligence Logic

### 7.1 Data Logic

* One user → one tenant (MVP)
* Automatic provisioning (no manual setup)
* Deterministic mapping

### 7.2 Insight Logic

Trigger:

* Successful auth + tenant creation

Output:

* Trust confirmation state

### 7.3 Guarantees

* No shared tenants
* No partial setups
* No password storage complexity
* No AI involved

---

## 8. Data Dependencies

Required:

* Auth provider (Supabase Auth recommended)
* User model
* Tenant model
* Membership model

Not required:

* Financial data
* Plaid
* Transactions

---

## 9. Data Trust & Risk Boundaries

**Critical correctness**

* Identity verification
* Tenant isolation
* Ownership mapping

**New risk introduced**

* OAuth misconfiguration
* Magic link expiration/validation

Mitigation:

* Use proven auth provider (Supabase/Auth0/Firebase)

---

## 10. Validation Requirements

### Product Validation

* Can user sign up via email or Google?
* Is tenant always created?

### Behavioral Signals

* Signup completion rate
* Google vs email usage split
* Drop-off reduction

### Trust Validation

* No cross-user access
* No duplicate tenants per user

---

## 11. First Impression Test

**Screen:** post-auth success
**Insight:** "Your private financial workspace is ready."
**Reaction:**

> "That was fast… and this feels secure."

---

## 12. Rabbit Holes

Avoid:

* Password-based auth system
* Complex auth settings UI
* Multi-provider expansion beyond Google (for MVP)
* Session management (Pitch 2)
* MFA (later feature)

---

## 13. No-Gos

* No password creation flow
* No password reset system
* No custom auth implementation (use provider)
* No over-engineering identity layer

---

## 14. System Impact

**Now includes:**

* Authentication / identity provider integration
* Tenant creation
* Security boundaries

Still does NOT include:

* Session persistence logic (Pitch 2)
* Financial systems

---

## 15. Risks

* OAuth misconfiguration
* Magic link delivery issues (email reliability)
* Duplicate account edge cases (Google vs email)

---

## 16. Future Extensions

* Apple Sign-In (mobile phase)
* Multi-provider auth
* MFA / biometrics
* Session device management

---

## 17. Solo Developer Notes

**Recommended stack**

* Supabase Auth:
  * Magic links
  * Google OAuth
* Prisma:
  * User
  * Tenant
  * Membership

**Flow**

1. Auth success callback
2. Check if user exists
3. If not → create user + tenant
4. Redirect into app

---

## 18. Internal FAQ

* **Why no passwords?**
  Reduces friction + improves security posture
* **Is Google enough for MVP?**
  Yes — covers majority of users
* **Does this still align with roadmap?**
  Yes — this is still account entry, not session management

---

## 19. Feature Boundaries

**This Feature DOES:**

* Passwordless signup (email)
* Google sign-in
* Create user
* Create tenant/workspace
* Assign ownership
* Confirm workspace readiness

**This Feature DOES NOT:**

* Manage sessions (Pitch 2)
* Handle refresh tokens
* Build auth settings UI
* Add MFA
* Support multiple tenants per user (yet)

# Pitch: Expense Classification (Fixed vs Flexible)

## 0. Workflow Alignment

| Field | Value |
| -- | -- |
| **Product layer** | Budget Intelligence Engine |
| **Implementation phase** | Core MVP |
| **Dependency notes** | Requires transaction ingestion + normalization (Pitch 3) and income baseline (Pitch 4) |
| **Execution fit assessment** | Clean vertical slice. Deterministic backend logic + simple UI surfacing. No need to split. |

This aligns directly with the Budget Intelligence system described in the architecture.

---

## 1. Problem

After transactions are ingested, users still **don't understand what part of their spending is controllable vs locked in.**

### Current User Confusion

Users cannot answer:

* "How much of my spending is actually flexible?"
* "What can I realistically cut?"
* "Why do I feel broke even with income?"

### Mental Model Problem

All spending looks equal:

* Rent = Dining out = Netflix = Groceries

Which leads to:

* Poor prioritization
* Unrealistic budgeting attempts
* Incorrect financial decisions

### Existing Behavior

Users:

* Guess what they can cut
* Do mental math or spreadsheets
* Ignore financial data due to fragmentation

---

## 2. Financial Clarity Impact

This feature introduces a **core behavioral distinction:**

> **Fixed vs Flexible spending**

### What becomes instantly clear:

* What is **non-negotiable (fixed)**
* What is **adjustable (flexible)**
* What portion of income is actually controllable

### Before:

> "I spend $3,000/month… I should cut back"

### After:

> "$2,100 is fixed. I only control $900."

This becomes the **foundation for all downstream decisions.**

---

## 3. User Value & Monetization Impact

### Immediate Value

Within seconds:

* User sees exactly how much of their money is:
  * Locked
  * Controllable

### Ongoing Value

This powers:

* Budgeting
* Alerts
* Goal planning
* Purchase decisions

### Monetization Impact

Directly increases:

* Trust → numbers feel accurate
* Retention → users revisit spending breakdown
* Perceived intelligence → system "understands" behavior
* Decision confidence

Without this, P.R.I.M.E. feels like a basic tracker — not a decision engine.

---

## 4. Time-to-Value Impact

### Before:

* Raw transactions → user must interpret

### After:

* Immediate structured understanding

### Time Reduction:

* From ~10–15 minutes of thinking
  → **< 10 seconds of clarity**

### First-session impact:

* Strong contribution to the "aha moment"

---

## 5. Appetite (Scope)

| Dimension | Rating |
| -- | -- |
| **Build effort** | 2–3 days |
| **System complexity** | Low |
| **UI complexity** | Low |
| **Data dependency risk** | Low |
| **Financial trust risk** | Medium |

**Priority:**
MVP-critical

---

## 6. Solution

---

### 6.1 Feature Overview

Automatically classifies all transactions into:

* **Fixed (Non-negotiable)**
* **Flexible (Adjustable)**

This creates the **behavioral model required for the Budget Intelligence Engine**.

---

### 6.2 User Workflow

1. User connects financial accounts
2. Transactions are processed automatically
3. User lands on dashboard
4. User sees:
   * "Fixed Expenses: $X"
   * "Flexible Spending: $Y"
5. Optional:
   * User reviews classifications
   * Adjusts edge cases (rare)
6. System updates instantly

---

### 6.3 System Behavior

#### Inputs:

* Normalized transactions
* Category mappings
* Merchant data
* Transaction history

---

### Classification Logic

**Step 1 — Baseline Classification**

* Use category mapping (Plaid + internal mapping)

---

**Step 2 — Pattern Detection (Primary Signal)**

* Detect recurring transactions using:
  * Frequency (monthly cadence)
  * Amount consistency
  * Merchant/account consistency

---

**Step 3 — Signal Combination**

* Combine:
  * Category signals
  * Keyword signals (if present)
  * Recurrence patterns

---

**Step 4 — Confidence Scoring**

* Assign classification confidence:

| Confidence | Behavior |
| -- | -- |
| High | Auto-classify |
| Medium | Classify + monitor |
| Low | Request user confirmation |

---

**Step 5 — Final Classification**

**Fixed Expenses:**

* Recurring + high-confidence obligations
* Examples:
  * Rent
  * Loans
  * Insurance
  * Utilities

**Flexible Expenses:**

* Non-recurring or discretionary spending
* Examples:
  * Dining
  * Shopping
  * Entertainment
  * Non-essential subscriptions

---

**Step 6 — Learning Layer**

* Persist confirmed classifications
* Improve future automatic classification accuracy

---

### Outputs:

* Total fixed expenses
* Total flexible spending
* Percentage breakdown

---

### 6.4 Insight Surface

**Where:**

* Home dashboard
* Budget dashboard

**Format:**

* Summary card
* Visual breakdown

**Example Insight:**

> "72% of your income is committed to fixed expenses. You control the remaining 28%."

**Visibility:**
High

---

### 6.5 UI / UX Shape

```
Monthly Overview

Fixed Expenses     $2,100
Flexible Spending  $900

[ Visual bar split ]

"Most of your spending is fixed. Focus on reducing dining + subscriptions."
```

### UX Principles:

* Immediate clarity
* No setup required
* Minimal cognitive load

---

## 7. Automation & Intelligence Logic

---

### 7.1 Data Processing Logic

* Transaction ingestion + normalization
* Category mapping system
* Keyword detection (supporting only)
* Recurrence detection engine:
  * Frequency analysis
  * Amount consistency checks
* Confidence scoring system
* Minimal user confirmation flow (low-confidence cases only)
* Persistent merchant-level classification memory

---

### 7.2 Insight Logic

Trigger:

* After transaction processing completes

Behavior:

* Always displayed (core insight, not conditional)

---

### 7.3 Deterministic Guarantees

* Same input → same output
* No AI-driven financial classification
* No approximated totals
* User overrides persist

---

## 8. Data Dependencies

* Transaction history (minimum ~30 days, improves over time)
* Category mapping system
* Recurrence detection

Works with partial data, improves with more history.

---

## 9. Data Trust & Risk Boundaries

### Must be correct:

* Total fixed vs flexible values
* No double counting

### May be imperfect:

* Initial classification of ambiguous recurring payments

### Risk:

* Misclassification → incorrect financial conclusions

### Mitigation:

* Confidence scoring
* Lightweight user confirmation
* Persistent corrections

---

## 10. Validation Requirements

### Product Validation

* Users notice immediately
* High interaction with breakdown

### Value Validation

* Users gain new understanding instantly

### Behavioral Signals

* Engagement with budget view
* Low correction friction
* Reduced confusion

---

## 11. First Impression Test

User connects account → sees:

> "You only control $842 of your monthly spending."

Reaction:

> "That explains everything."

---

## 12. Rabbit Holes

Avoid:

* Complex category systems
* Manual-heavy classification flows
* AI-driven classification logic
* Over-customization

---

## 13. No-Gos

* No manual setup
* No heavy user input
* No AI controlling financial classification
* No unnecessary complexity

---

## 14. System Impact

**This feature affects:**

* Transaction normalization
* Categorization system
* Budget Intelligence Engine
* Dashboard UX

**This feature does NOT affect:**

* Goal Planning Engine
* Purchase Readiness Engine
* AI Reasoning Layer

---

## 15. Risks

* Misclassification → trust issues
* Poor visibility → low perceived value
* Over-complication → breaks MVP simplicity

---

## 16. Future Extensions

* Subscription detection (Pitch 10)
* Behavioral insights
* Spending optimization recommendations

---

## 17. Solo Developer Notes

* Start with rule-based classification
* Focus on recurrence detection accuracy
* Keep override system simple
* Prioritize correctness over intelligence

---

## 18. Internal FAQ

* Improves financial clarity → YES
* Drives decisions → YES
* Monetization impact → YES
* MVP aligned → YES

---

## 19. Feature Boundaries

### This Feature DOES:

* Classify expenses into fixed vs flexible
* Provide totals and breakdown
* Establish behavioral financial model

### This Feature DOES NOT:

* Calculate budgets
* Generate recommendations
* Perform purchase analysis
* Expand into subscription optimization

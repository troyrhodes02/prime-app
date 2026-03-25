# Pitch: Financial Baseline Engine

## 0. Workflow Alignment

This pitch follows transaction normalization and introduces the first layer of **financial understanding**.

| Field | Value |
| -- | -- |
| Product layer | Financial Understanding |
| Implementation phase | Core MVP |
| Dependency notes | Requires Pitch 3 (clean transaction dataset) |
| Execution fit | High — deterministic + controlled interpretation |

---

## 1. Problem

After transactions are cleaned and visible, the user still cannot answer:

* How much money do I actually have available?
* Am I overspending?
* Is my current lifestyle sustainable?

Raw transactions — even clean ones — do not provide **financial meaning**.

Most apps stop here and force the user to:

* mentally calculate totals
* estimate patterns
* guess affordability

P.R.I.M.E. must instead:

> **interpret financial behavior into a usable baseline**

---

## 2. Financial Clarity Impact

This is the first pitch that produces a **real financial answer**.

It transforms:

* data → understanding
* activity → structure
* transactions → reality

---

### What becomes clear:

* monthly income (normalized)
* total spending
* spending structure (internally)
* net available money

---

### Core output:

> "You have ~$X available per month"

---

### Mental shift:

> "I don't need to figure it out — the system already did."

---

## 3. User Value & Monetization Impact

### Immediate Value

* First actionable financial insight
* Removes guesswork instantly

### Ongoing Value

* Foundation for:
  * budgeting
  * goals
  * purchase decisions

### Monetization Impact

* This is the first "payworthy" moment
* Users feel real intelligence, not just data display

---

## 4. Time-to-Value Impact

**Before:**

* Clean data, but no meaning

**After:**

* Immediate understanding of financial position

This is the first true:

> "Oh... this is actually useful"

moment.

---

## 5. Appetite

| Dimension | Rating |
| -- | -- |
| Build effort | Medium |
| System complexity | High |
| UI complexity | Medium |
| Trust risk | Very High |

**Classification:**

* MVP-critical

---

## 6. Solution

---

## 6.1 Feature Overview

This feature builds the user's **financial baseline** by:

* detecting income
* calculating spending
* analyzing patterns
* estimating usable monthly money

It introduces:

> the first **decision-ready output**

---

## 6.2 User Workflow

1. User completes transaction processing (Pitch 3)
2. System analyzes financial behavior
3. User lands on updated dashboard
4. System presents:
   * available monthly money
   * high-level context
5. User can now:
   * understand their position
   * move toward budgeting/goals

---

## 6.3 System Behavior

### Inputs

* normalized transactions
* account data
* transaction history window

---

### Processing

#### 1. Income Detection

* identify inflows
* filter out transfers/internal movement
* normalize to monthly estimate

---

#### 2. Spending Calculation

* total monthly outflow
* smooth irregular spikes

---

#### 3. Pattern Recognition (Internal)

* detect recurring behavior (light)
* infer obligations vs flexible spending
* identify baseline spending ranges

---

#### 4. Cash Flow Calculation

> Monthly Available =
> Income - Smoothed Spending

---

### Outputs

* monthly income estimate
* monthly spending estimate
* available money estimate
* baseline financial profile

---

## 6.4 Insight Surface

### Where:

* Dashboard (PRIMARY)
* Not in transactions
* Not in separate page (yet)

---

### Format:

#### Primary Card:

> "You have ~$X available per month"

---

#### Supporting Context:

* income estimate
* spending estimate
* short explanation

---

### Example:

> **$1,240 available monthly**
> Based on your income and recent spending patterns

---

---

## 6.5 UI / UX Shape

---

### Dashboard Evolution

Your current cards:

* Net Worth
* Spending This Month

---

### Updated Structure:

#### New Primary Card (CENTERPIECE)

> **Available Monthly Money**

* Large number
* clear label
* subtle explanation

---

#### Supporting Cards:

* Income (monthly)
* Spending (monthly)

---

---

### Messaging Tone

Balanced (as selected):

* realistic
* not aggressive
* not overly safe

---

### Example Messaging:

> "Based on your recent activity, this is what you typically have available each month."

---

---

## 7. Automation & Intelligence Logic

---

### System Behavior: Balanced

* uses real patterns
* smooths extremes
* avoids overreaction

---

### Deterministic Rules

* no AI in calculations
* consistent outputs
* explainable logic

---

---

### Internal Depth (IMPORTANT)

System DOES:

* deep classification
* recurring detection
* spending structure inference

---

System DOES NOT expose:

* full breakdown
* category-level UI
* subscription UI

---

---

## 8. Data Dependencies

Required:

* sufficient transaction history

Minimum:

* ~30-90 days preferred

Handles:

* partial data (with messaging)

---

---

## 9. Data Trust & Risk Boundaries

---

### Must be accurate:

* income estimate
* spending estimate
* available money

---

### Can be imperfect:

* classification depth
* recurring detection

---

---

## 10. Validation Requirements

---

### Product:

* Do users understand their position instantly?

---

### Value:

* Does this remove mental calculation?

---

### Behavioral:

* engagement with baseline card
* movement to next features

---

### Trust:

* user corrections
* confusion signals

---

---

## 11. First Impression Test

User sees:

> "You have $1,240 available monthly"

Reaction:

> "Oh... okay, I get my situation now"

---

---

## 12. Rabbit Holes

Avoid:

* full budgeting system
* subscription UI
* category dashboards
* deep breakdowns

---

---

## 13. No-Gos

* vague insights
* over-complex UI
* forcing user to analyze
* exposing incomplete systems

---

---

## 14. System Impact

Affects:

* dashboard
* financial logic layer
* insight generation

---

Does NOT affect:

* budgeting system
* goals
* subscriptions UI

---

---

## 15. Risks

* incorrect income detection
* misinterpreting transfers
* over/under estimating spending
* misleading available money

---

---

## 16. Future Extensions

Later pitches:

* budgeting engine
* goals
* subscription system
* deeper breakdowns

---

---

## 17. Solo Developer Notes

Build order:

1. income detection
2. spending calculation
3. smoothing logic
4. available money calc
5. dashboard card

---

Must be correct:

* totals
* inflow vs transfer detection
* consistency

---

---

## 18. Internal FAQ

* Is this valuable?
  Yes — Extremely — first real answer
* Is this too complex?
  No — complexity is internal
* Is this aligned with P.R.I.M.E.?
  Yes — decision-first system

---

---

## 19. Feature Boundaries

---

### DOES:

* interpret financial data
* calculate baseline
* surface available money
* enable decision readiness

---

### DOES NOT:

* build budgets
* track subscriptions visually
* allow user edits
* provide deep breakdown UI

# Pitch: Transaction Ingestion & Normalization Engine

## 0. Workflow Alignment

This pitch sits directly after account connection and transforms raw financial data into a clean, structured dataset.

It enables the first **trustworthy financial layer** in the system and introduces the first **data visibility surface** for the user.

| Field | Value |
| -- | -- |
| Product layer | Financial Data Aggregation |
| Implementation phase | Core MVP |
| Dependency notes | Requires Pitch 1 (account + tenant) and Pitch 2 (account connection) |
| Execution fit | Deterministic system with required UI surfacing |

---

## 1. Problem

After connecting accounts, users technically have data — but not usable financial understanding.

Raw transaction feeds:

* contain inconsistent merchant names
* include duplicates
* mix pending and posted records
* use unreliable category systems

Without cleaning this:

* totals are untrustworthy
* patterns are meaningless
* users cannot verify correctness

Most apps fail here by:

> dumping raw data into a dashboard and calling it "insight"

P.R.I.M.E. must instead:

> **prepare data before interpretation**

---

## 2. Financial Clarity Impact

This pitch does not generate insights yet — it enables them.

What becomes clear:

* transactions are real and deduplicated
* merchants are recognizable
* data is structured and consistent
* the system is actively processing, not passively displaying

Mental shift:

> "This app didn't just import my data — it understood it."

---

## 3. User Value & Monetization Impact

### Immediate Value

* User sees processed results immediately after connection
* System feels intelligent and proactive

### Ongoing Value

* Every future feature depends on this being correct
* Improves trust in all downstream decisions

### Monetization Impact

* Increases trust → higher conversion
* Improves perceived intelligence → premium feel
* Reduces churn caused by "messy data" experiences

---

## 4. Time-to-Value Impact

**Before:**

* Connect account → unclear results → low trust

**After:**

* Connect account → processing → clean dataset → ready for insights

This creates the first real:

> "This already knows my finances" moment

---

## 5. Appetite

| Dimension | Rating |
| -- | -- |
| Build effort | Medium (3-5 days) |
| System complexity | Medium |
| UI complexity | Low-Medium |
| Data risk | High |
| Trust risk | High |

**Classification:**

* MVP-critical

---

## 6. Solution

---

## 6.1 Feature Overview

This feature:

* ingests financial transactions
* normalizes and cleans data
* removes duplicates
* standardizes categories
* **surfaces a clean, explorable transaction dataset in the UI**

It introduces:

> the first **trust surface** in the product

---

## 6.2 User Workflow

1. User connects account(s)
2. System enters "analyzing" state
3. Transactions are fetched and processed
4. System:
   * cleans merchants
   * removes duplicates
   * normalizes data
5. User sees completion summary
6. Dashboard updates with:
   * Recent Activity (cleaned)
   * "View All Transactions" entry point
7. User can open full **Transactions page**

---

## 6.3 System Behavior

### Inputs

* Plaid transactions
* account metadata
* merchant strings
* categories
* transaction IDs

---

### Processing

* normalize structure
* clean merchant names
* deduplicate transactions
* handle pending → posted transitions
* map categories
* persist clean records

---

### Outputs

* normalized transaction dataset
* ingestion summary
* UI-ready transaction feed

---

## 6.4 Insight Surface (UPDATED)

### Where this appears:

* Onboarding (processing + completion)
* Dashboard (Recent Activity preview)
* **Transactions page (NEW — primary surface)**

---

### What format:

* Summary card (processing result)
* Clean transaction list (preview)
* **Full transaction list (dedicated page)**
* "View All Transactions" navigation

---

## 6.5 UI / UX Shape (UPDATED)

### 1. Processing Screen

* "Analyzing your finances..."
* "Organizing transactions..."
* "Removing duplicates..."

---

### 2. Completion Summary

Example:

* 3 accounts connected
* 642 transactions processed
* 17 duplicates removed
* Data ready for analysis

---

### 3. Dashboard Integration

#### Recent Activity (existing)

* Shows cleaned transactions
* Limited preview (5-10 items)

#### New CTA:

> **"View All Transactions"**

---

### 4. Transactions Page (NEW — CRITICAL)

This is the **primary UI addition for this pitch**.

---

### Purpose:

> Provide visibility and trust — NOT analysis

---

### Structure:

#### Top Filters (STRICTLY LIMITED)

* Account (dropdown)
* Type:
  * Income
  * Expense
* Time:
  * Last 30 days
  * Last 90 days

---

#### Transaction List:

* Merchant (cleaned)
* Amount
* Date
* Account indicator

---

#### Optional label:

> "Transactions are automatically cleaned and organized by P.R.I.M.E."

---

### Explicit Constraints (VERY IMPORTANT)

This page is NOT:

* a budgeting tool
* a category explorer
* a financial analysis dashboard
* a manual editing system

---

### Not allowed in MVP:

* category filters
* custom tagging
* transaction editing
* advanced search
* multi-filter logic
* charts/graphs

---

## 7. Automation & Intelligence Logic

### Deterministic Only

* No AI in ingestion
* No AI in deduplication
* No AI in totals

---

### Core Rules:

* same input → same output
* all transactions traceable
* duplicates handled predictably
* totals always accurate

---

## 8. Data Dependencies

Required:

* connected accounts
* transaction history

Supports:

* partial datasets (with clear messaging)

---

## 9. Data Trust & Risk Boundaries

### Must be exact:

* amounts
* dates
* totals
* dedupe logic

### Can be imperfect:

* merchant naming
* category mapping

---

## 10. Validation Requirements

### Product:

* Do users trust the data?

### Value:

* Does it feel "processed," not imported?

### Behavioral:

* % clicking "View All Transactions"
* time spent validating data

### Trust:

* mismatch reports
* duplicate errors

---

## 11. First Impression Test

User sees:

> "642 transactions processed and organized"

Then clicks:

> "View All Transactions"

Reaction:

> "Yeah... this pulled everything and cleaned it"

---

## 12. Rabbit Holes

Avoid:

* advanced filtering systems
* user editing flows
* analytics dashboards
* ML merchant classification

---

## 13. No-Gos

* raw data dump
* backend-only feature
* overwhelming UI
* forcing user to analyze data manually

---

## 14. System Impact

Affects:

* ingestion
* normalization
* dashboard
* **transactions UI (NEW)**

Does NOT affect:

* budgeting
* goals
* insights
* AI advisor

---

## 15. Risks

* incorrect deduplication
* misleading totals
* over-cleaning merchants
* weak category mapping
* UI not clearly communicating value

---

## 16. Future Extensions

Later:

* category filtering
* editing
* search
* transaction grouping
* anomaly detection

---

## 17. Solo Developer Notes

Build order:

1. ingestion
2. normalization
3. dedupe
4. storage
5. dashboard preview
6. **transactions page (required)**
7. completion UI

---

## 18. Internal FAQ

* Is this visible enough?
  Yes — now includes Transactions page
* Is this just data?
  No — it's structured + surfaced
* Does this build trust?
  Yes — first trust layer

---

## 19. Feature Boundaries

### DOES:

* clean data
* normalize transactions
* deduplicate
* surface transaction dataset
* provide light filtering
* enable user verification

---

### DOES NOT:

* provide insights
* analyze spending
* create budgets
* detect patterns
* give recommendations

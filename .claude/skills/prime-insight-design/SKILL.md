---
name: prime-insight-design
description: Generate structured insight definitions for P.R.I.M.E. features. Use when a feature creates, modifies, prioritizes, or depends on financial insights derived from balances, transactions, recurring obligations, spending behavior, goals, purchase simulations, or their relationships. This skill defines what the insight is, why it matters, what triggers it, how it should be explained, and how it should be surfaced so the product delivers real financial clarity rather than raw data.
---

# P.R.I.M.E. Insight Design

Generate structured insight definitions for P.R.I.M.E. features.

P.R.I.M.E. is not a dashboard-first product. It is a financial decision engine. This skill exists to make sure features that depend on insights are designed as actual decision-support systems — not just metrics, charts, or loosely interpreted observations.

An insight is only valid if it helps the user understand something meaningful about their financial position, what is changing, what is risky, what is delaying progress, what a purchase would do to their finances, or what action would improve their situation.

## Purpose

Use this skill to define:

- what the insight actually says
- what user question it answers
- what data it depends on
- what exact conditions trigger it
- how it should be prioritized
- how it should be explained
- what action or implication it suggests
- where it should surface in the product

The output should be detailed enough to inform:
- pitch writing
- design docs
- technical specs
- rule implementation
- UI copy
- acceptance criteria

## Core Insight Standard

Every insight in P.R.I.M.E. must satisfy all of the following:

1. **Clarity**
   - It makes something meaningfully easier to understand about the user's finances

2. **Truthfulness**
   - It is based on real, explainable underlying financial data
   - It does not imply certainty beyond what the data supports

3. **Actionability**
   - It implies a useful next thought, question, or decision

4. **Visibility**
   - It can be surfaced in a way the user will actually notice

5. **Retention Value**
   - It contributes to why the product is worth returning to

If an insight fails one of these, it should be revised or rejected.

## What Counts as an Insight

Good insight types for P.R.I.M.E. include:
- safe-to-spend clarity
- overspending risk
- goal delay warning
- recurring obligation detection
- subscription burden warning
- affordability readiness classification
- post-purchase cash buffer risk
- spending category drag on goal progress
- unusual spending spike
- savings shortfall explanation
- timeline slippage alert
- scenario tradeoff explanation

These are insights because they interpret data into something meaningful.

## What Does NOT Count as an Insight

These are not insights on their own:
- current balance
- total spent this month
- list of transactions
- chart without explanation
- category ranking without implication
- raw budget percentage with no interpretation
- goal date without feasibility logic
- risk badge without explanation

If it is only data display, it is not enough.

## Prerequisites

Before generating insight definitions, review:

1. **Pitch or feature description**
   - what financial problem the feature solves
   - why it matters
   - what is in scope

2. **Related design or product context**
   - where this insight will surface
   - what the user sees before and after

3. **Relevant system context**
   - available data sources
   - deterministic calculation requirements
   - reliability constraints
   - existing insight patterns if they exist

## Output Structure

For each insight, include the following sections in order.

---

## 1. Insight Name

A concise, product-usable name.

Examples:
- Safe to Spend This Month
- Goal Delay Warning
- Overspending Risk Alert
- Purchase Readiness: Risky
- Subscription Burden Detected
- Post-Purchase Buffer Warning

---

## 2. Insight Purpose

One short paragraph covering:
- what this insight helps the user understand
- why that understanding matters
- what financial question it answers

Example:
> This insight helps the user see when their current spending behavior is likely to delay a goal. It matters because users often know they are spending, but not how that behavior changes their timeline. It answers the question: “Is my current behavior pushing my goal further away?”

---

## 3. Core User Question

State the exact question this insight answers.

Examples:
- “Can I safely spend this right now?”
- “When can I afford this?”
- “What is slowing down my goal?”
- “Am I on track to overspend?”
- “What happens if I make this purchase?”
- “What recurring costs are quietly reducing my flexibility?”

This section is mandatory.

---

## 4. Why This Is Valuable

Explain:
- what becomes clearer because this insight exists
- why a user would care
- why this helps justify ongoing product value

Cover both:
- **Immediate value**
- **Ongoing value**

---

## 5. Required Data Inputs

List the exact data required.

Example format:

| Input | Required | Notes |
|-------|----------|------|
| Account balances | Yes | Needed for cash position and liquidity calculations |
| Transaction history | Yes | Needed for spending and behavior analysis |
| Recurring obligation detection | Optional | Required for obligation-based insights |
| Goal definition | No | Only required for goal-related insights |
| Purchase simulation inputs | No | Only required for purchase-readiness insights |

Be explicit about minimum viable data.

---

## 6. Trigger Logic

Define the exact conditions under which the insight appears.

Use precise, deterministic language.

Example:
- Generate when projected month-end discretionary spending exceeds available flexible budget by at least $100
- Generate when a user's current savings pace causes projected goal completion to slip by at least 14 days relative to the target date
- Generate when a purchase would reduce remaining liquid cash below the required post-purchase buffer
- Generate when recurring subscriptions exceed X% of monthly disposable income
- Generate when spending in a flexible category is trending at least 20% above normal pace for the current point in the month

Include:
- thresholds
- date windows
- comparison windows
- fallback behavior
- minimum sample sizes
- assumption rules if applicable

This is one of the most important sections.

---

## 7. Non-Trigger Conditions

Define when the insight must NOT appear.

Examples:
- Do not generate if less than 30 days of transaction history exist and no safe fallback is defined
- Do not generate if the available balance is stale or incomplete
- Do not generate if the goal has missing required parameters
- Do not generate if the purchase scenario is missing ongoing cost assumptions required for the calculation
- Do not generate if the difference is too small to matter
- Do not generate if the underlying categorization confidence is too weak for the explanation being made

This protects trust and prevents noisy insight feeds.

---

## 8. Explanation Logic

Define how the system should explain the insight once triggered.

Include three layers:

### Statement
The short headline version.

### Explanation
The plain-language interpretation.

### Implication / Suggested Action
What the user should think about next.

Example:

**Statement:**  
At your current spending pace, your car goal is likely to be delayed by 3 weeks.

**Explanation:**  
Your recent discretionary spending is reducing the amount available to save each month, which pushes your projected timeline later than your current target.

**Implication / Suggested Action:**  
Review the categories contributing most to the gap, or adjust your target date or monthly savings plan.

All wording should be:
- direct
- non-hyped
- trustworthy
- specific
- non-judgmental

---

## 9. Priority Logic

Define how important this insight is relative to others.

Include:
- what makes it high, medium, or low priority
- whether severity increases with stronger thresholds
- tie-breaking rules if needed

Example:
- High priority if a purchase causes buffer breach or a goal slips by more than 30 days
- Medium priority if the impact is noticeable but still recoverable
- Low priority if the condition is minor, informational, or early-stage only

---

## 10. Trust Boundaries

Define what must be true for this insight to remain trustworthy.

Include:
- what data is exact
- what is inferred
- what could be misleading if shown incorrectly
- what should never be approximated

Examples:
- Account balances used in purchase-readiness outputs must be exact within the synced dataset
- Goal projections may use deterministic assumptions but must clearly indicate the assumptions being applied
- Subscription burden messaging must not appear unless recurring classification is reliable enough
- Safe-to-spend conclusions must not imply certainty if pending transactions or stale sync materially affect the result
- AI wording may explain an insight, but must not replace deterministic financial math

This section is mandatory.

---

## 11. Surface Recommendation

Define where this insight should appear.

Possible surfaces:
- Dashboard
- Insight Feed
- Goal Detail View
- Purchase Readiness Screen
- Scenario Comparison View
- Monitoring / Alerts
- Onboarding summary
- AI advisor follow-up

Also define:
- visibility level
- whether it should appear as a card, highlight, alert, inline module, or conversational explanation
- whether it deserves first-session exposure

---

## 12. UX Notes

Define what the UI must do to make this insight effective.

Examples:
- Keep the financial conclusion visible above supporting numbers
- Do not hide the explanation behind a click
- Show the relevant date window directly in the card
- Show what changed and by how much
- Differentiate exact values from projected values
- Include a direct link to the affected goal, category, or purchase scenario when possible

Focus on clarity and noticeability.

---

## 13. Edge Cases

List realistic cases the system must handle.

Examples:
- Transaction history is too short to support a stable comparison
- Large one-time spending distorts the category trend
- The user has irregular income that affects monthly baseline reliability
- A paycheck lands late and temporarily makes readiness look worse than normal
- New subscriptions are detected but not yet confirmed as recurring
- A goal is technically feasible but leaves too little post-purchase flexibility
- Scenario inputs are partially user-provided and partially estimated
- Sync lag causes incomplete visibility into the current month

---

## 14. Acceptance Criteria

Use a checklist format.

Example:

- [ ] Insight only appears when trigger conditions are met
- [ ] Insight does not appear when data quality is insufficient
- [ ] Statement uses exact or clearly labeled projected values
- [ ] Explanation matches the actual condition detected
- [ ] Surface location is defined
- [ ] Priority logic is defined
- [ ] Trust boundaries are explicit
- [ ] Suggested action does not exceed what the data supports

---

## 15. Explicit Non-Goals

List what this insight is not trying to do.

Examples:
- ❌ Predict long-term financial outcomes beyond supported assumptions
- ❌ Provide regulated financial advice
- ❌ Replace detailed financial planning
- ❌ Use AI to invent missing financial facts
- ❌ Explain root cause beyond available data
- ❌ Turn a simple insight into a full management workflow

This keeps the insight honest and in scope.

## Insight Writing Rules

### 1. Use Financial User Language, Not Internal Logic Language

Write:
- “Your current spending pace is likely to delay this goal”

Not:
- “Monthly savings delta breached the projection threshold”

### 2. Be Specific

Use exact time windows, thresholds, and conditions.

### 3. Avoid False Precision

Do not imply certainty beyond the input data and assumptions.

### 4. Avoid Alarmism

Insights can be important without sounding dramatic or shame-based.

### 5. Prefer Interpretation Over Decoration

The value is in the meaning, not the styling.

## P.R.I.M.E.-Specific Rules

### Financial Insights
Must be based on exact deterministic financial calculations wherever they influence a core conclusion.

### Goal Insights
Must clearly distinguish between current trajectory, target trajectory, and projected delay or feasibility.

### Purchase Insights
Must support one or more core product questions:
- Can I afford this?
- When can I afford this?
- What happens if I do this?

### Monitoring Insights
Must be threshold-based, noticeable, and tied to an understandable behavioral consequence.

### AI Explanation
AI may explain or reframe structured insights, but must not invent the underlying financial output.

### MVP Discipline
Prefer simple, rule-based, believable insight logic over sophisticated but fragile logic.

## Workflow

1. Read the feature or pitch context
2. Identify whether the feature creates or depends on an insight
3. Define the core user question
4. Define the required data inputs
5. Define trigger and non-trigger logic
6. Define statement, explanation, and implication
7. Define priority and trust boundaries
8. Define surface recommendation
9. Add edge cases and acceptance criteria
10. Reject or refine any insight that is weak, noisy, misleading, or too broad

## Quality Standard

A strong P.R.I.M.E. insight definition should make it obvious:
- what the insight is
- why it matters
- when it appears
- when it must not appear
- what data it relies on
- how it should be explained
- how it contributes to financial clarity and product value

If the output is just a metric description or vague observation, it is not good enough.
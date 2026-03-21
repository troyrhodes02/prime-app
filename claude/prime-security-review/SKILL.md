---
name: prime-security-review
description: Perform a structured security and data integrity review of P.R.I.M.E. features. Use after generating specs, APIs, or implementation plans to identify risks related to financial data handling, user isolation, authentication, authorization, and data leakage. Focus on preventing breaches, misuse, misleading financial outputs, and silent trust failures.
---

# P.R.I.M.E. Security Review

Audit features for security, data integrity, and trust risks before implementation or deployment.

P.R.I.M.E. handles:
- financial account data
- balances and transactions
- recurring obligations
- goals and purchase scenarios
- derived financial insights and decision outputs

This means failures are not just technical — they are **trust failures**.

This skill exists to ensure:
- no data leaks
- no cross-user or cross-household access
- no incorrect or misleading financial outputs
- no unsafe handling of sensitive data

---

## Core Principle

**P.R.I.M.E. must be safer than the user's expectations.**

Not just:
- “secure enough”
- “probably fine”
- “industry standard”

But:
- predictable
- isolated
- explainable
- non-destructive

---

## Purpose

Use this skill to review:

- technical specs
- API design
- database models
- feature logic
- integration flows
- onboarding flows
- insight systems
- goal and purchase-readiness logic

The goal is to identify:
- vulnerabilities
- trust-breaking edge cases
- incorrect assumptions
- silent failure risks

---

## Output Structure

---

## 1. Feature Overview

Summarize:
- what the feature does
- what data it touches
- what systems are involved

Keep concise but clear.

---

## 2. Data Sensitivity Classification

Classify all data used:

| Data Type | Sensitivity | Notes |
|----------|------------|------|
| Financial transactions | High | Exact amounts, merchants, dates |
| Account balances | High | Core financial state |
| Recurring obligations | High | Sensitive and decision-critical |
| Goal data | Medium/High | Financial intent and planning |
| Purchase scenario inputs | Medium/High | May reveal major planned spending |
| Insight outputs | Medium | Derived, but can still reveal sensitive state |
| User metadata | Low/Medium | Depends on scope |

Sensitivity levels:
- Low
- Medium
- High

---

## 3. Authentication Risks

Evaluate:

- how the user is authenticated
- whether endpoints assume auth incorrectly
- whether any route can be accessed without proper validation

Check for:
- missing auth checks
- reliance on client-side validation
- unsafe defaults

---

## 4. Authorization & User Isolation

This is the most critical section.

Verify:

- all queries are scoped to the authenticated user or permitted household/workspace boundary
- resource access is validated against the owning user context
- no ID-only lookups without ownership filtering
- joins do not accidentally expose another user's data

Example risks:
- fetching by ID without user constraint
- returning related records from another user
- caching data across users
- exposing another person's linked financial source or scenario data

---

## 5. Data Exposure Risks

Check for:

- API responses returning unnecessary fields
- sensitive data included in logs
- internal IDs exposed unnecessarily
- full objects returned where summaries are enough

Ensure:
- minimal required data is returned
- sensitive fields are omitted or masked where appropriate

---

## 6. Financial Data Integrity Risks

Verify:

- all financial calculations are exact
- no floating point usage for money
- no rounding inconsistencies
- aggregation logic is deterministic

Check:
- partial updates
- inconsistent totals
- mismatched categorization
- incorrect readiness or projection outputs
- stale balance usage in decision-critical flows

---

## 7. Time & Projection Risks

If time windows, goal timelines, or projected completion dates are used:

- ensure timestamps are normalized
- avoid timezone ambiguity where relevant
- prevent incorrect duration or pacing calculations
- ensure projections clearly separate exact inputs from modeled assumptions
- ensure weak or incomplete data does not produce misleading timeline outputs

---

## 8. Integration Risks

For external integrations:

- ensure read-only behavior is enforced where intended
- confirm no write operations occur unless explicitly intended
- validate token handling
- ensure tokens are not logged or exposed

Check:
- token storage safety
- refresh logic
- revocation handling
- sync failure behavior
- stale data handling
- error handling

---

## 9. Insight Trust Risks

Evaluate:

- whether insights are based on reliable data
- whether thresholds are clearly defined
- whether outputs could mislead users

Check:
- false positives
- false certainty
- insights appearing with insufficient data
- AI explanation overstating deterministic conclusions
- purchase or goal advice appearing more certain than the actual inputs allow

---

## 10. Input Validation Risks

Verify:

- all inputs are validated (e.g., Zod or equivalent)
- invalid states are rejected
- edge cases are handled explicitly

Check:
- missing required fields
- invalid enum values
- malformed payloads
- impossible financial values
- negative or contradictory scenario inputs
- invalid date ranges

---

## 11. Error Handling Risks

Ensure:

- errors do not leak internal details
- consistent error format is used
- sensitive data is not included in error messages

Also verify:
- sync failures do not appear as successful analysis
- partial financial states are labeled clearly
- calculation failures do not silently fall back to misleading outputs

---

## 12. Logging Risks

Verify logs do not include:

- raw financial data
- account/routing details
- access tokens
- full external provider payloads
- personally identifiable information unless necessary

Logs should include:
- IDs
- counts
- event types
- safe summaries

---

## 13. Concurrency & Race Conditions

Check:

- concurrent updates to the same financial state
- duplicate processing
- conflicting writes
- overlapping sync jobs
- repeated scenario recalculations

Ensure:
- transactions are used where needed
- operations are idempotent when appropriate
- stale jobs cannot overwrite newer trusted states

---

## 14. Failure Mode Analysis

Define what happens when:

- integration fails
- partial data is available
- processing is interrupted
- network issues occur
- balances are stale
- categorization is incomplete
- recurring detection is uncertain

Ensure:
- system does not enter inconsistent state
- user is not shown misleading financial output
- trust-sensitive surfaces degrade safely

---

## 15. Abuse & Misuse Scenarios

Consider:

- user attempting to access another user's data
- repeated requests (rate abuse)
- malformed or malicious payloads
- attempting to bypass validation or scenario rules
- forcing unsupported financial states into decision outputs
- abusing export, query, or insight surfaces to exfiltrate data

---

## 16. Mitigation Recommendations

For each identified risk:

- describe the fix
- describe where it should be applied
- classify severity:
  - Critical
  - High
  - Medium
  - Low

---

## 17. Acceptance Criteria

- [ ] All endpoints enforce authentication
- [ ] All data access is properly user-scoped
- [ ] No sensitive data is leaked via API or logs
- [ ] Financial calculations are exact and deterministic
- [ ] Insight generation is trustworthy
- [ ] Input validation is enforced
- [ ] Errors are safe and consistent
- [ ] External integrations are handled securely
- [ ] Projected outputs clearly distinguish assumptions from exact values

---

## 18. Explicit Non-Goals

- ❌ Full enterprise security architecture
- ❌ Compliance certification (SOC2, etc.)
- ❌ Advanced intrusion detection systems

Focus on:
- practical product-level safety
- correctness
- trust

---

## P.R.I.M.E.-Specific Rules

### 1. User Isolation Is Mandatory
No exceptions. Every query must respect user ownership boundaries.

### 2. Financial Data Must Be Exact
Incorrect balances, totals, or affordability outputs = loss of trust.

### 3. Insights Must Be Honest
Do not show insights when data is insufficient, stale, or too uncertain.

### 4. Read-Only Means Read-Only
Financial integrations must not modify external accounts unless explicitly intended.

### 5. Minimal Exposure
Return only what the UI needs.

### 6. Deterministic Math Comes First
Core financial outputs must be driven by exact deterministic calculations, not loose heuristics or AI guesswork.

### 7. Projected Outputs Must Be Framed Carefully
Goal dates, purchase readiness, and future-impact simulations must clearly communicate assumptions and must not present projections as guaranteed outcomes.

---

## Workflow

1. Review feature or spec
2. Identify all data flows
3. Classify sensitivity
4. Evaluate auth + user isolation
5. Check data exposure
6. Validate calculations and logic
7. Analyze failure modes
8. Identify abuse scenarios
9. Recommend mitigations

---

## Quality Standard

A strong security review should answer:

- Could this leak data?
- Could this return incorrect financial information?
- Could this break user isolation?
- Could this mislead the user?

If the answer is “possibly,” the issue must be addressed before implementation.
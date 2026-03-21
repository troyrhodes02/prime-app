---
name: prime-spec
description: Generate detailed technical specifications for P.R.I.M.E. features. Use when creating new feature specs, updating existing specs, or when the user mentions "spec", "specification", "technical design", or needs to document a feature for implementation. Specs define data models, system behavior, APIs, and testing to support P.R.I.M.E.'s decision-engine, clarity-first product. Requires a design document as input for UI/UX context.
---

# P.R.I.M.E. Specification Generator

Generate detailed technical specifications for P.R.I.M.E. features following consistent, implementation-ready conventions.

P.R.I.M.E. is a financial decision engine that transforms financial data into clear, trustworthy answers about affordability, timing, and impact. The purpose of a spec is not just to define how something is built, but to ensure the system produces **correct, deterministic, and explainable financial outputs**.

Specs must prioritize:

- Correctness of financial data
- Clarity of derived outputs
- Deterministic financial logic
- Minimal user intervention
- Reliable automation
- Strict user-level data isolation

---

## Where Specs Fit

```text
Pitch Document → Design Document → Technical Spec
(why + scope)    (what users see)   (how it's built)
```

- **Pitch** defines problem, value, scope, and decision impact
- **Design Doc** defines what the user sees and how they interact
- **Spec** defines how the system produces that experience reliably and correctly

---

## Prerequisites

Before writing a spec, ensure you have:

- **Design document** — Required. Defines UI structure, flows, and user-facing behavior.
- **Existing data models** — Review current Prisma schema and system entities.
- **P.R.I.M.E. system context** — Understand how this feature fits into:
  - User financial context
  - Account + transaction ingestion
  - Categorization & recurring detection
  - Goals
  - Purchase readiness
  - Decision outputs (safe-to-spend, projections, alerts)
- **Related artifacts when applicable** — Feature breakdowns, existing specs, roadmap context.

---

## Spec File Conventions

- **Filename:** `feature-name-spec.md` (kebab-case)
- **Location:** Project docs directory or as specified by user
- **Format:** Markdown with Prisma code blocks for data models

---

## Core Technical Principles for P.R.I.M.E.

Every spec must enforce:

**1. Financial Accuracy Is Non-Negotiable**
All balances, totals, and projections must be correct. No floating point errors. No silent rounding inconsistencies. No assumptions that could mislead the user.

**2. User Data Isolation Is Mandatory**
All data must be scoped to a user (or future household context). No cross-user access paths. Queries must always enforce ownership constraints.

**3. Deterministic Logic First**
Core outputs must be explainable and reproducible. Financial math must not depend on AI inference. AI may explain results, but must not generate them.

**4. Automation Over Manual Input**
Systems should infer, classify, and detect where possible. Manual correction is allowed, but should not be required repeatedly.

**5. Decision Readiness**

Data structures must support answering:

- Can I afford this?
- When can I afford this?
- What happens if I do this?

If the data model cannot support those, it is incomplete.

**6. Simplicity Over Flexibility**
Avoid building generalized systems "for later." Model only what is required for the current feature.

---

## Required Sections

### 1. Metadata Header

```
---
version: 1.0.0
status: draft | review | approved
author: [name]
last_updated: YYYY-MM-DD
design_doc_reference: [link or filename to source design doc]
---
```

---

### 2. Summary

2–3 paragraphs covering:

- What the feature does (one sentence)
- The core system behavior or abstraction introduced
- What new decision capability the system gains
- Success criteria (when is this feature considered working)

Focus on outcomes, not implementation details.

---

### 3. Problem

- Current system limitations
- What the system cannot represent or compute today
- What financial questions cannot be answered
- Why this blocks decision clarity

This must connect directly to the pitch and design doc.

---

### 4. Core Concepts

Define each entity or concept introduced or modified:

| Field        | Description              |
| ------------ | ------------------------ |
| `field_name` | What it represents       |

Include:

- Relationships between concepts
- Ownership (user, system, derived)
- Required vs optional fields
- Distinctions between similar concepts

Concepts must support:

- Correct aggregation
- Deterministic outputs
- Decision logic
- Future extension without overengineering

---

### 5. States & Lifecycle

Define system states and transitions.

Include:

- Valid states (enum)
- Allowed transitions
- Triggers for each transition
- Invalid transitions and handling

Examples:

- Sync states (`PENDING → SYNCED → FAILED`)
- Categorization states
- Goal states
- Readiness states
- Processing states

---

### 6. UI Integration

Reference the design doc.

**Screens**

For each screen:

- Purpose
- Data required

| Element | Description |
| ------- | ----------- |

- Actions supported
- Visual indicators and derived values

**Modals & Flows**

- Trigger conditions
- Required data
- Validation rules
- Side effects (data updates, recalculations)

**Derived Data Requirements**

Explicitly define:

- What values are computed
- Where they are computed (API vs DB vs client)
- When they update

Examples:

- Safe-to-spend value
- Goal completion date
- Affordability classification
- Risk flags

---

### 7. Data Model

**Relationship to Existing Schema**

| From | Relation | To | Description |
| ---- | -------- | -- | ----------- |

**New Entities**

```prisma
model EntityName {
  id       String @id @default(uuid())
  userId   String

  // fields...

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

**Enums**

```prisma
enum EnumName {
  VALUE_ONE
  VALUE_TWO
}
```

**Required Updates to Existing Models**

```prisma
model ExistingModel {
  // existing fields...

  // NEW
  newRelation NewEntity[]
}
```

**Data Integrity Rules**

Define constraints such as:

- Uniqueness
- Required relationships
- Deduplication rules
- Consistency guarantees

---

### 8. Data Processing & Logic

Define how raw data becomes structured data and decision outputs.

**Ingestion Logic**

- Source of data
- Normalization rules
- Deduplication

**Classification Logic**

- Expense vs discretionary vs recurring
- Category assignment
- Confidence handling

**Recurring Detection Logic**

- Frequency detection
- Threshold rules
- Validation

**Aggregation Logic**

- Totals
- Category breakdowns
- Rolling windows

**Decision Logic** *(CRITICAL SECTION)*

Define:

- Safe-to-spend calculation
- Goal projection logic
- Purchase readiness classification
- Risk detection thresholds

All logic must be:

- Deterministic
- Explainable
- Testable

**Update Behavior**

- When recalculation occurs
- Triggers (new transaction, user action, sync)
- Caching behavior if any

---

### 9. API Surface

**Base URL**

```
/api/v1
```

**Authentication**

- Bearer token required
- Must enforce user scoping on all endpoints

**Endpoints**

```
[Action] [Resource]
[METHOD] /path/:param
```

Query Parameters:

| Param | Type | Description |
| ----- | ---- | ----------- |

Request:

```json
{
  "field": "value"
}
```

Response:

```json
{
  "field": "value"
}
```

**Error Response Format**

```json
{
  "error": "error_code",
  "message": "Human readable description",
  "details": {}
}
```

**Standard Error Codes**

| Code               | HTTP Status | Description                          |
| ------------------ | ----------- | ------------------------------------ |
| `not_found`        | 404         | Resource does not exist              |
| `validation_error` | 400         | Invalid request payload              |
| `unauthorized`     | 401         | Missing or invalid auth              |
| `forbidden`        | 403         | Authenticated but not permitted      |

---

### 10. Testing Strategy

Use `GIVEN / WHEN / THEN` format.

```
TEST: test_name_snake_case
GIVEN:
  - Preconditions
WHEN:
  - Action
THEN:
  - Expected outcome
```

**Required Test Categories**

- Happy Path
- Validation
- Edge Cases
- State Transitions
- Data Integrity
- User Isolation
- Integration Scenarios
- Financial correctness tests *(CRITICAL)*

**Test Data Factories**

```typescript
function createTestEntity(overrides?: Partial<Entity>): Entity {
  return {
    id: uuid(),
    userId: "test-user",
    ...overrides,
  };
}
```

---

### 11. Acceptance Criteria

Grouped checklist:

```
1. [Feature Area]
- [ ] Specific testable behavior
- [ ] Financial outputs are correct
- [ ] UI receives correct data
- [ ] Decision outputs are explainable
```

---

### 12. Explicit Non-Goals (v1)

- ❌ Feature not included
- ❌ Future extension deferred
- ❌ Additional complexity not required

Include when applicable:

- ❌ No predictive AI-driven financial decisions
- ❌ No investment or advanced planning systems
- ❌ No overgeneralized infrastructure
- ❌ Manual-heavy workflows avoided

---

### 13. Open Questions

- `Topic` — description of tradeoff or missing detail

---

### 14. Future Considerations

- How this enables future features
- What can expand later
- What systems may evolve

---

## Style Guidelines

**Code Blocks**

- Prisma for schema
- TypeScript for logic/tests
- JSON for API examples

**Detail Level**

- Be explicit about types, nullability, and constraints
- Define how values are computed
- Include success and failure cases
- Avoid vague behavior

**Tone**

- Direct and technical
- Use "must", "should", "may" intentionally
- No ambiguous requirements

---

## Workflow

1. Receive design doc
2. Understand system impact
3. Identify required data and behavior
4. Clarify unknowns when necessary
5. Define core concepts
6. Design data model
7. Define logic and transformations
8. Define API surface
9. Define testing strategy
10. Finalize and validate against design doc

---

## Interview Guidelines

When clarifying with the user:

- Focus on missing logic, not UI
- Ask about:
  - Data relationships
  - Edge cases
  - Update timing
  - Correctness guarantees
- Keep questions minimal and high-impact
- Use existing project context first

---

## Output Quality Standard

A strong P.R.I.M.E. spec makes it obvious:

- How data flows through the system
- How correctness is guaranteed
- How financial outputs are computed
- How user data is protected
- How decision outputs become possible

If the spec defines structure but not behavior, it is incomplete.

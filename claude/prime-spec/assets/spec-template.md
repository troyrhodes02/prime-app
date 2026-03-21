---
version: 1.0.0
status: draft
author: [Your Name]
last_updated: YYYY-MM-DD
design_doc_reference: [Link or filename to source design doc]
---

# [Feature Name]

## Summary

[2–3 paragraphs covering:
- what the feature does
- the core system abstraction or behavior introduced
- what capability this unlocks for P.R.I.M.E.
- what "working" means for this feature]

---

## Problem

[Describe:
- current system limitations
- what the system cannot represent, compute, or surface today
- what financial questions remain unanswered
- why this blocks clarity, trust, or decision support]

---

## Core Concepts

### [Concept / Entity Name]

[Description of what this concept represents in the P.R.I.M.E. system]

| Field        | Description       |
| ------------ | ----------------- |
| `id`         | Unique identifier |
| `field_name` | Description       |

Include:

- Ownership
- Relationship to user financial context
- Required vs optional fields
- Distinctions from similar concepts

---

## States & Lifecycle

### States

| State       | Description |
| ----------- | ----------- |
| `STATE_ONE` | Description |
| `STATE_TWO` | Description |

### State Transitions

```text
[Initial] → STATE_ONE (trigger)
STATE_ONE → STATE_TWO (trigger)
```

Include:

- Valid transitions
- Invalid transitions
- What triggers each state change
- What the system must do when a transition occurs

---

## UI Integration

Reference the design doc for full UI/UX specifications.

### Screens

#### [Screen Name]

**Purpose:** [What this screen helps the user understand or do]

**Data Required:**

| Element      | Description |
| ------------ | ----------- |
| Header       | Contents    |
| Main content | Contents    |

**Actions:**

- Action 1
- Action 2

**Derived Values:**

- Computed value 1
- Computed value 2

### Modals & Flows

#### [Modal / Flow Name]

**Trigger:** [What opens this modal or flow]

**Required Data:** [Description]

**User Decisions:**

- Option A: [Result]
- Option B: [Result]

**Validation Rules:**

- Rule 1
- Rule 2

### Keyboard Shortcuts

| Shortcut | Action      |
| -------- | ----------- |
| `key`    | Description |

---

## Data Model

### Relationship to Existing Schema

| From           | Relation | To        | Description |
| -------------- | -------- | --------- | ----------- |
| ExistingEntity | has many | NewEntity | Description |

### New Entities

#### [Entity Name]

```prisma
model EntityName {
  id        String      @id @default(uuid())
  userId    String
  field     String
  state     EntityState @default(INITIAL)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([userId])
  @@index([field])
}

enum EntityState {
  INITIAL
  ACTIVE
  ARCHIVED
}
```

### Required Updates to Existing Models

```prisma
// Add to ExistingModel
model ExistingModel {
  // ... existing fields ...

  // NEW
  newRelation  NewEntity[]
}
```

### Data Integrity Rules

- [Constraint 1]
- [Constraint 2]
- [Uniqueness / deduplication rule]
- [User scoping requirement]

---

## Data Processing & Logic

**Ingestion Logic**

[Define source input, normalization steps, and processing behavior]

**Classification Logic**

[Define how records are classified or categorized]

**Mapping Logic**

[Define how records/entities are linked]

**Aggregation Logic**

[Define how balances, totals, trends, projections, or grouped outputs are computed]

**Recalculation / Update Behavior**

[Define when the system reprocesses or recomputes values]

**Deterministic Guarantees**

- Same input → same output
- [Guarantee 2]
- [What must never be approximate]

---

## API Surface

### Base URL

```
/api/v1
```

### Authentication

Bearer token in `Authorization` header. All endpoints must enforce user scoping.

### [Resource] Endpoints

#### List [Resources]

`GET /resources`

Query Parameters:

| Param    | Type   | Description                  |
| -------- | ------ | ---------------------------- |
| `state`  | string | Filter by state              |
| `limit`  | int    | Max results (default: 50)    |
| `offset` | int    | Pagination offset            |

Response:

```json
{
  "resources": [],
  "total": 0,
  "limit": 50,
  "offset": 0
}
```

#### Get [Resource]

`GET /resources/:id`

Response:

```json
{
  "id": "uuid",
  "field": "value"
}
```

#### Create [Resource]

`POST /resources`

Request:

```json
{
  "field": "value"
}
```

Response: Created resource (201)

#### Update [Resource]

`PATCH /resources/:id`

Request:

```json
{
  "field": "new_value"
}
```

Response: Updated resource

#### [Action Name]

`POST /resources/:id/action`

Request:

```json
{
  "option": "value"
}
```

Response:

```json
{
  "result": "description"
}
```

### Error Responses

```json
{
  "error": "error_code",
  "message": "Human readable description",
  "details": {}
}
```

| Code               | HTTP Status | Description                     |
| ------------------ | ----------- | ------------------------------- |
| `not_found`        | 404         | Resource does not exist         |
| `validation_error` | 400         | Invalid request payload         |
| `unauthorized`     | 401         | Missing or invalid auth         |
| `forbidden`        | 403         | Authenticated but not permitted |

---

## Testing Strategy

### 1. [Feature Area] Tests

#### 1.1 [Test Name]

```
TEST: test_name
GIVEN:
  - Preconditions
WHEN:
  - Action
THEN:
  - Expected result
  - Expected invariant holds
```

### 2. State Transition Tests

#### 2.1 [Transition Name]

```
TEST: transition_name
GIVEN:
  - Entity in starting state
WHEN:
  - Transition action occurs
THEN:
  - New state is correct
  - Invalid transitions are rejected if applicable
```

### 3. Data Integrity Tests

#### 3.1 [Integrity Rule]

```
TEST: integrity_rule_name
GIVEN:
  - Data setup
WHEN:
  - Processing occurs
THEN:
  - Correctness guarantee holds
```

### 4. User Isolation Tests

#### 4.1 [Isolation Scenario]

```
TEST: user_isolation_name
GIVEN:
  - Two users with separate data
WHEN:
  - One user requests data
THEN:
  - Only that user's data is returned
```

### 5. Integration Scenarios

#### 5.1 [Scenario Name]

```
TEST: lifecycle_scenario_name
SCENARIO: Description

STEP 1: Action
VERIFY:
  - Expected state

STEP 2: Action
VERIFY:
  - Expected state
```

### Test Data Factories

```typescript
function createTestEntity(overrides?: Partial<Entity>): Entity {
  return {
    id: uuid(),
    userId: "test-user",
    field: "default",
    state: "INITIAL",
    createdAt: new Date(),
    ...overrides,
  };
}
```

---

## Acceptance Criteria

**[Feature Area]**

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Financial correctness is preserved

**[Feature Area]**

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] User-scoped behavior is enforced

---

## Explicit Non-Goals (v1)

- ❌ Not building this
- ❌ Deferring this integration
- ❌ Not adding flexibility beyond current feature needs
- ❌ Not introducing predictive or AI-driven financial behavior unless explicitly in scope

Manual correction is acceptable in v1 where appropriate.

---

## Open Questions

- [Topic] — Description of unresolved decision
- [Topic] — Description of tradeoff

---

## Future Considerations

- [Future Feature] will build on this capability
- This spec may expand to include additional states
- This system may later support [future extension]

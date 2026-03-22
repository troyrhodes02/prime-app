# Testing Patterns

Standard test patterns for P.R.I.M.E. feature specs.

P.R.I.M.E. handles financial data, balances, transactions, goals, purchase scenarios, and decision outputs. Testing must prove not just that the system works, but that it works **correctly, deterministically, and safely**.

---

## Test Case Format

Use `GIVEN / WHEN / THEN` structure:

```text
TEST: descriptive_snake_case_name
GIVEN:
  - Preconditions describing initial state
  - Specific entity states
  - User ownership
  - Relevant configuration or prior data
WHEN:
  - API call with specific payload, OR
  - System event that triggers behavior, OR
  - Background processing operation
THEN:
  - Expected state changes
  - Expected response format
  - Expected derived values
  - Side effects
  - Invariants preserved
```

Every test should make it obvious:

- What data exists
- What action occurs
- What must be true afterward

---

## Required Test Categories

Every spec must include tests in these categories:

### 1. Happy Path Tests

Basic operations that should succeed:

```text
TEST: create_resource_basic
GIVEN:
  - Valid user context
  - Valid input data
WHEN:
  - POST /resources with valid payload
THEN:
  - Resource created with all required fields
  - 201 response returned
  - userId assigned correctly
  - Timestamps set correctly
```

Use this category for: creation, retrieval, updates, normal processing flows.

---

### 2. State Transition Tests

Valid and invalid lifecycle changes:

```text
TEST: valid_state_transition
GIVEN:
  - Resource in state A
WHEN:
  - Action transitions resource to state B
THEN:
  - State changes to B
  - Transition side effects occur
  - Derived values recalculate if required

TEST: invalid_state_transition
GIVEN:
  - Resource in state A
WHEN:
  - Action requires state B
THEN:
  - 400 response with invalid_state_transition
  - State remains unchanged
  - No side effects occur
```

Use for: sync states, categorization states, goal lifecycle, purchase evaluation lifecycle, archival transitions.

---

### 3. Validation Tests

Input validation and business rule enforcement:

```text
TEST: validation_required_field
GIVEN:
  - Request missing required field
WHEN:
  - POST /resources
THEN:
  - 400 response with validation_error
  - details.field identifies missing field
  - No partial data is created

TEST: validation_business_rule
GIVEN:
  - Request violates business rule
WHEN:
  - Action attempted
THEN:
  - Appropriate error returned
  - No partial changes committed
```

Use for: required fields, invalid enum values, invalid financial inputs, inconsistent scenario inputs, unsupported operations.

---

### 4. Edge Case Tests

Boundary conditions and unusual scenarios:

```text
TEST: empty_collection
GIVEN:
  - No resources match filter
WHEN:
  - GET /resources?filter=nonexistent
THEN:
  - 200 response
  - Empty array returned
  - total = 0

TEST: pagination_boundary
GIVEN:
  - 75 resources exist
WHEN:
  - GET /resources?limit=50&offset=50
THEN:
  - 25 items returned
  - total = 75

TEST: concurrent_modification
GIVEN:
  - Two requests target same resource
WHEN:
  - Both attempt conflicting updates
THEN:
  - Exactly one succeeds or conflict behavior is deterministic
  - Data integrity remains intact
```

Use for: empty states, partial sync, duplicate imports, stale updates, irregular financial activity, incomplete datasets.

---

### 5. Data Integrity Tests

System properties that must remain true:

```text
TEST: integrity_no_orphaned_children
GIVEN:
  - Any system state
THEN:
  - Every child record has a valid parent
QUERY:
  - Verification query
EXPECT:
  - 0 invalid rows

TEST: integrity_exact_aggregation
GIVEN:
  - Known set of financial records
WHEN:
  - Aggregation runs
THEN:
  - Total equals exact expected value
  - No rounding error is introduced
```

Use for: exact financial totals, deduplication, categorization consistency, recurring detection correctness, goal projection accuracy.

---

### 6. User Isolation Tests

P.R.I.M.E. must strictly isolate data by user:

```text
TEST: user_cannot_access_other_user_resource
GIVEN:
  - User A resource exists
  - Authenticated user is User B
WHEN:
  - User B requests User A resource
THEN:
  - 403 or 404 returned per system convention
  - No data from User A is exposed

TEST: user_scoped_list_only_returns_owned_data
GIVEN:
  - User A and User B each have resources
WHEN:
  - User A requests list endpoint
THEN:
  - Only User A resources are returned
```

This category is mandatory for:

- All resource endpoints
- All list queries
- All mutation endpoints
- All derived views and aggregates

---

### 7. Determinism Tests

Derived outputs must be stable and explainable:

```text
TEST: deterministic_same_input_same_output
GIVEN:
  - Fixed input dataset
WHEN:
  - Processing logic runs twice
THEN:
  - Output is identical both times

TEST: deterministic_decision_output
GIVEN:
  - Fixed financial dataset
WHEN:
  - Decision logic runs
THEN:
  - Same safe-to-spend value is returned
  - Same readiness classification is returned
  - Same projection output is returned
```

Use for: safe-to-spend calculations, goal projections, purchase readiness, alert triggers, insight generation.

---

### 8. Integration Scenarios

Full lifecycle tests mirroring real user workflows:

```text
TEST: lifecycle_complete_workflow
SCENARIO: User connects account → data sync → categorization → dashboard output

STEP 1: Connect account
VERIFY:
  - Account created
  - Sync initiated

STEP 2: Sync completes
VERIFY:
  - Transactions stored
  - Categorization applied

STEP 3: Decision output generated
VERIFY:
  - Safe-to-spend value exists
  - Output matches expected calculation
```

Use for: onboarding flows, account connection → sync → processing → dashboard, goal setup → projection → monitoring, purchase scenario → evaluation → impact display.

---

## P.R.I.M.E.-Specific Test Requirements

These must be tested whenever relevant.

### Financial Correctness (CRITICAL)

If a feature touches balances, transactions, totals, or projections, verify:

- Exact amounts
- Exact aggregation
- Correct categorization impact
- No floating point drift

### Projection & Scenario Accuracy

If a feature includes projections:

- Verify timeline calculations are correct
- Verify assumptions are applied consistently
- Verify outputs match deterministic formulas
- Verify no hidden variability

### Decision Output Validity

If a feature answers "Can I afford this?", "When can I afford this?", or "What happens if I do this?", verify:

- Output matches input data exactly
- Classification thresholds are correct
- Edge conditions are handled (near-boundary cases)

### Insight Validity

If a feature generates insights, verify:

- Trigger conditions are correct
- No insight appears when conditions are not met
- Explanation matches underlying data
- Suggested action aligns with actual condition

### Manual Correction Boundaries

If manual correction exists, verify:

- Correction fixes the issue
- System does not repeatedly require the same correction
- Downstream outputs update correctly

---

## Test Data Factories

Include TypeScript factory functions:

```typescript
function createTestResource(overrides?: Partial<Resource>): Resource {
  return {
    id: uuid(),
    userId: "test-user",
    name: "Test Resource",
    state: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

Factory guidelines:

- Provide sensible defaults for all required fields
- Always include `userId`
- Accept partial overrides
- Use `uuid()` for IDs
- Use `new Date()` for timestamps
- Name clearly: `createTest{EntityName}`

---

## Derived Value Verification

For computed outputs, verify exact derivation:

```text
THEN:
  - safeToSpend = 1250
  - projectedGoalDate = "2025-06-01"
  - affordabilityStatus = "SAFE"
  - result matches expected formula
```

Do not stop at checking presence. Verify correctness.

---

## Error Response Verification

Be specific:

```text
THEN:
  - Response: 409 Conflict
  - Response body:
    - error: "duplicate_resource"
    - message: contains "already exists"
    - existing_resource includes summary fields
    - resolution_options includes supported choices
```

---

## Database State Verification

For non-trivial operations, verify persistence state:

```text
THEN:
  - Resource A updated as expected
  - Resource B archived if required
  - Join records created correctly
  - No orphaned records remain
  - No records created for wrong user
```

---

## Negative Tests

Always test what must not happen:

```text
TEST: archived_resource_immutable
GIVEN:
  - Resource is archived
WHEN:
  - Mutation attempted
THEN:
  - Request rejected
  - State unchanged
  - No downstream recalculation occurs
```

Examples:

- No cross-user access
- No invalid scenario calculation
- No insight from insufficient data
- No mutation without permission
- No duplicate processing when dedupe should catch it

---

## Performance Considerations

For operations at scale:

```text
TEST: bulk_operation_performance
GIVEN:
  - 1000 records to process
WHEN:
  - Bulk processing runs
THEN:
  - Completes within acceptable time
  - Memory remains bounded
  - No N+1 query pattern appears
```

In v1, correctness is more important than optimization, but obvious scaling risks should still be tested when relevant.

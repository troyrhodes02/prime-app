# API Conventions

Standard patterns for P.R.I.M.E. API endpoints.

P.R.I.M.E. APIs are designed to:

- Safely handle financial account data, balances, transactions, goals, and purchase scenarios
- Enforce strict user isolation
- Provide deterministic, reliable financial outputs
- Support decision logic and insights without ambiguity

---

## Base Configuration

```text
Base URL: /api/v1
Authentication: Bearer token in Authorization header
Content-Type: application/json

All requests must be authenticated and scoped to a user.
```

---

## User Scoping (CRITICAL)

Every request must be scoped to the authenticated user.

**Requirements**

- All queries must filter by `userId`
- No cross-user data access is allowed
- Resource IDs must be validated against user ownership
- Unauthorized access must return `403 forbidden`

**Example**

```typescript
// Always enforce user scoping
where: {
  id: resourceId,
  userId: currentUserId
}
```

> Failure to enforce user scoping is a critical violation.

---

## Endpoint Naming

Use plural nouns for collections:

```
/transactions
/goals
/purchase-scenarios
/insights
/accounts
```

Use nested resources when ownership is explicit:

```
/goals/:id/projections
/purchase-scenarios/:id/impact
/accounts/:id/transactions
```

Use verbs for non-CRUD actions:

```
/transactions/:id/reclassify
/goals/:id/recalculate
/purchase-scenarios/:id/evaluate
```

Prefer clarity over brevity in naming.

---

## Request Patterns

### List (GET collection)

```
GET /resources?limit=50&offset=0&sort=created_at&order=desc
```

Standard query params:

| Param    | Type   | Default      | Description                    |
| -------- | ------ | ------------ | ------------------------------ |
| `limit`  | int    | 50           | Max results (max: 200)         |
| `offset` | int    | 0            | Pagination offset              |
| `sort`   | string | `created_at` | Sort field                     |
| `order`  | string | `desc`       | Sort order: `asc` or `desc`    |

**Filtering**

- Exact match: `?field=value`
- Partial match: `?field_search=partial`
- Multiple values: `?field=value1,value2`
- Date range: `?created_after=ISO8601` / `?created_before=ISO8601`

**Response Envelope**

```json
{
  "resources": [],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

### Get (GET single)

```
GET /resources/:id
```

- Returns full resource object
- Must validate user ownership
- Returns `404` if not found or not accessible

### Create (POST)

```
POST /resources
```

- Request body contains resource fields
- Server assigns `id`, timestamps, and `userId`
- Returns created resource

### Update (PATCH)

```
PATCH /resources/:id
```

- Partial updates only
- Must validate user ownership
- Returns updated resource

### Soft Delete (Preferred)

```
POST /resources/:id/archive
```

- Avoid hard deletes when historical financial context matters
- Mark resource as inactive/archived
- Preserve historical data for projections, insights, and auditability

### Actions

```
POST /resources/:id/action-name
```

Used for:

- Recalculations
- Classification changes
- Recurring confirmation
- Readiness evaluation
- Scenario comparison
- Merge/split operations where applicable

Response depends on action.

---

## Response Patterns

### Success (2xx)

```json
{
  "id": "uuid",
  "field": "value",
  "created_at": "2025-01-15T09:14:00Z",
  "updated_at": "2025-01-15T09:22:00Z"
}
```

- Timestamps must use ISO8601 format
- Always include timezone

### Created (201)

- Return created resource
- Include `Location` header

### No Content (204)

Used for:

- Actions with no response body
- Archive operations (optional)

### Error (4xx, 5xx)

```json
{
  "error": "error_code",
  "message": "Human readable description",
  "details": {
    "field": "specific field error"
  }
}
```

**Standard Error Codes**

| Code                      | HTTP Status | When to Use                              |
| ------------------------- | ----------- | ---------------------------------------- |
| `not_found`               | 404         | Resource doesn't exist                   |
| `validation_error`        | 400         | Invalid request payload                  |
| `invalid_state_transition`| 400         | Action not allowed in current state      |
| `duplicate_resource`      | 409         | Unique constraint violation              |
| `conflict`                | 409         | State or data conflict                   |
| `unauthorized`            | 401         | Missing or invalid auth token            |
| `forbidden`               | 403         | Authenticated but not permitted          |
| `rate_limited`            | 429         | Too many requests                        |
| `internal_error`          | 500         | Unexpected server error                  |

---

## Conflict Resolution Pattern

Used when:

- Duplicate records are detected
- Recurring obligation detection conflicts
- Categorization conflicts exist
- Merge/split decisions are required

**Response**

```json
{
  "error": "duplicate_resource",
  "message": "Resource already exists",
  "existing_resource": {
    "id": "uuid",
    "...": "summary fields"
  },
  "resolution_options": ["merge", "replace", "keep_both"]
}
```

**Resolution Endpoint**

```
POST /resources/:id/resolve-conflict
```

```json
{
  "resolution": "merge",
  "target_id": "uuid"
}
```

---

## Pagination

Use offset-based pagination for v1:

```
GET /resources?limit=50&offset=100
```

Response must include: `total`, `limit`, `offset`

---

## Sorting

Single field:

```
?sort=field&order=asc
```

Default: `order=desc` (newest first)

---

## Idempotency

For POST operations that may be retried:

- Accept `Idempotency-Key` header
- Store request hash + response
- Return cached response for duplicate key within 24h

This is especially important for:

- Account-link callbacks
- Scenario creation
- Manual recalculation triggers
- Conflict resolution actions

---

## Data Sensitivity & Logging Rules

P.R.I.M.E. handles sensitive financial data. Logging must be controlled.

**Do NOT log:**

- Full transaction payloads
- Account numbers or routing details
- Unmasked personal financial metadata
- Access tokens or secrets
- Full external provider payloads

**Allowed:**

- Internal IDs
- Aggregated values
- Masked identifiers
- Safe summaries
- Event types and counts

---

## Integration Safety Rules

For external integrations (Plaid, bank aggregators, other financial providers):

- Treat all external data as untrusted input
- Validate and normalize before storage
- Never assume schema stability
- Enforce read-only behavior where applicable
- Verify webhook authenticity when webhooks are used
- Handle sync lag and stale data explicitly

---

## Determinism Requirement

APIs that return computed values must be:

- **Deterministic** — same input → same output
- **Explainable** — derivation can be traced
- **Consistent** across requests

No randomization or hidden variability is allowed.

This is especially required for:

- Safe-to-spend outputs
- Goal projections
- Purchase readiness classifications
- Post-purchase impact calculations
- Monitoring alerts

---

## Time & Financial Data Standards

- All timestamps stored in UTC
- Currency values must be stored in smallest unit (e.g., cents)
- Avoid floating point arithmetic for financial calculations
- Aggregations must be exact
- Projected values must clearly distinguish exact inputs from modeled assumptions

---

## Performance Guidelines (v1)

- Optimize for correctness over speed
- Avoid premature optimization
- Ensure queries are indexed on: `userId` and commonly filtered fields
- Do not cache decision-critical outputs without clear invalidation rules

---

## Future Considerations

- Cursor-based pagination for large datasets
- Event-driven recalculation for near-real-time monitoring
- Rate limiting by user
- Household/workspace scoping if multi-user support is introduced later

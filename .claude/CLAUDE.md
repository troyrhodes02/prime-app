# P.R.I.M.E. Coding Guidelines

Project conventions and patterns for AI-assisted development.

P.R.I.M.E. handles financial accounts, transactions, goals, purchase scenarios, and decision outputs. The codebase must prioritize:

- Correctness
- Trust
- User data isolation
- Deterministic behavior
- Minimal unnecessary complexity

---

## Core Engineering Principles

### 1. Correctness Before Convenience
If a shortcut risks incorrect balances, projections, decisions, or user data leakage, do not take it.

### 2. Small, Clear Systems Beat Flexible Systems
Prefer a direct implementation that solves the current feature well over a generalized abstraction built for imagined future requirements.

### 3. Deterministic Outputs
The same input data must always produce the same outputs unless the underlying data changes.

### 4. Trust-Sensitive Engineering

Because P.R.I.M.E. works with financial data:

- Balances and totals must be exact
- Projections must be consistent and explainable
- Access boundaries must be strict
- Logs must avoid sensitive payload leakage
- "Read-only" expectations must be preserved

---

## Database Operations

### Transaction Safety

Always wrap multi-step database operations in transactions when they must succeed or fail together.

Use Prisma transactions for:

- Multi-step updates
- Goal recalculations
- Purchase scenario evaluations
- Normalization pipelines
- Any workflow where partial success creates incorrect financial state

```typescript
export async function updateEntity(
  id: string,
  input: UpdateInput,
  tx?: PrismaClient,
): Promise<Entity> {
  if (!tx) {
    return prisma.$transaction(async (txClient) => {
      return updateEntityInternal(id, input, txClient as PrismaClient);
    });
  }

  return updateEntityInternal(id, input, tx);
}
```

### User Scoping

Every persisted record must be scoped to a user.

**Requirements:**

- All queries must include `userId`
- Never trust IDs without ownership validation
- Cross-user access must be impossible by default

```typescript
const entity = await prisma.entity.findFirst({
  where: {
    id: entityId,
    userId,
  },
});
```

### Financial Data Storage

- Store values in smallest unit (cents)
- Use integers only
- Never use floating point arithmetic

### Time Data Storage

- Store timestamps in UTC
- Preserve raw timestamps when needed
- Normalize durations
- Avoid timezone ambiguity

---

## Service Layer Patterns

### Deterministic Business Logic

All financial and decision logic must be deterministic.

**Avoid:**

- Randomness
- Unstable ordering
- Implicit assumptions
- Reliance on DB ordering

**Be explicit about:**

- Thresholds
- Fallback behavior
- Edge cases
- Missing data handling

### Classification & Detection Rules

- Use simple, traceable rules
- Keep logic explainable
- Avoid AI-based classification unless explicitly required
- Preserve auditability

### Decision Logic Boundaries (CRITICAL)

If logic answers "Can I afford this?", "When can I afford this?", or "What happens if I do this?", then it must be:

- Deterministic
- Explainable
- Based only on verified financial inputs

**Never:**

- Approximate financial decisions
- Hide assumptions
- Mix inferred and exact values without clarity

### Derived Data Boundaries

For all computed values, define:

- Where it is computed (API / service)
- When it updates
- What inputs it depends on

Never implement core financial logic in the UI.

---

## Client-Side Data Fetching

### SWR for Reads and Mutations

Use SWR consistently.

```typescript
import useSWRMutation from "swr/mutation";

async function createEntity(url: string, { arg }: { arg: Body }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error");
  }

  return res.json();
}
```

### UI Rules for P.R.I.M.E.

UI must:

- Display already-computed values
- Not reimplement financial logic
- Distinguish:
  - Exact values
  - Projected values
  - Uncertain values

Never imply false precision.

---

## API Routes

### Error Handling

```typescript
function handleServiceError(error: unknown): NextResponse {
  if (error instanceof NotFoundError) {
    return errorResponse(404, error.code, error.message);
  }

  if (error instanceof ZodError) {
    return errorResponse(400, "validation_error", formatZodError(error));
  }

  throw error;
}
```

### API Requirements

All routes must:

- Authenticate user
- Enforce user scoping
- Validate inputs
- Return consistent error shapes
- Avoid leaking internals

### Sensitive Logging Rules

**Do NOT log:**

- Transaction payloads
- Account details
- Personal financial data
- Tokens or secrets

**Log only:**

- IDs
- Counts
- Summaries
- State transitions

---

## Testing

### Test-Driven Development (TDD)

1. Write failing tests
2. Implement minimal code
3. Refactor safely

### Required Test Priorities

- Happy path
- Validation
- Edge cases
- State transitions
- Data integrity
- User isolation
- Determinism
- Integration scenarios

### Financial Correctness Tests (CRITICAL)

Verify:

- Exact balances
- Exact totals
- Exact projections
- No rounding errors

### Decision Logic Tests

Verify:

- Correct classification (safe / unsafe / borderline)
- Thresholds behave correctly
- Edge cases near boundaries
- Same input → same output

### Factory Pattern

```typescript
const entity = await createEntity(prisma, {
  userId: user.id,
});
```

### Test Isolation

```typescript
beforeEach(async () => {
  await prisma.$transaction([
    prisma.entity.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
```

---

## Frontend Implementation

### Component Library: Material UI (MUI)

All UI must be built with Material UI (`@mui/material`).

- Use MUI components for all UI elements: Button, TextField, Typography, Box, Card, etc.
- Use MUI's `sx` prop or theme system for component styling
- Do not use raw HTML elements with Tailwind classes for UI components
- Tailwind may be used for page-level layout utilities when needed

### Design Fidelity

- Match design doc exactly
- Include loading, empty, and error states

### Product Tone

UI should feel:

- Clear
- Operational
- Calm
- High-trust
- Not decorative

### Decision Visibility

If a feature provides an answer:

- Make it immediately visible
- Do not bury it
- Supporting UI must not overpower the answer

---

## Workflow

1. Commit with Linear ID
2. Push and create PR (`gh pr create`)
3. Include:
   - Ticket link
   - Summary
   - Files changed
   - Schema changes
   - Test status
4. Move ticket to review

### Scope Discipline

**Do NOT:**

- Expand scope
- Add future-proof abstractions
- Introduce unnecessary systems
- Add AI behavior unless specified

If something is needed but out of scope → note it.

---

## Done Means

A feature is done when:

- [ ] Acceptance criteria met
- [ ] Spec followed
- [ ] Financial correctness preserved
- [ ] User isolation enforced
- [ ] Tests pass
- [ ] Checks pass
- [ ] No trust violations introduced

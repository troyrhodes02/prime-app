---
name: prime-ticket-worker
description: >
  End-to-end engineering agent that takes a P.R.I.M.E. Linear ticket from
  assignment through PR creation. Reads the ticket, finds the referenced spec,
  follows CLAUDE.md conventions, plans the work, implements the feature,
  verifies behavior, then prepares the branch and PR for review.

  Use this skill whenever the user says things like "work on PRIME-123",
  "pick up this ticket", "implement this Linear issue", "finish this ticket",
  "start on [ticket ID]", or provides a Linear issue and wants it built.
---

# Linear Ticket Worker

Takes a P.R.I.M.E. ticket end-to-end: ticket → spec → plan → implementation → verification → PR.

P.R.I.M.E. is a financial decision engine built on:

- Account + transaction data
- Categorization and recurring detection
- Goals and projections
- Purchase evaluation
- Deterministic financial outputs

Implementation work must preserve:

- Financial correctness
- User data isolation
- Deterministic outputs
- Automation-first behavior
- Strict scope discipline

This worker exists to execute a well-scoped ticket cleanly — not to redesign the system mid-build.

---

## Prerequisites

- **CLAUDE.md** at repo root
- **Spec directory** with technical specs
- **Design docs or UI previews** for frontend work when available
- **Linear CLI or MCP**
- **GitHub CLI (`gh`)**
- Any repo-specific tooling required by CLAUDE.md

---

## Phase 1: Gather Context

1. **Fetch the ticket**
   - Extract the ticket ID from user input
   - Pull:
     - Title
     - Description
     - Acceptance criteria
     - Linked issues
     - Parent / blocked-by relationships
     - Milestone context if available

2. **Find the spec**
   - Check ticket description for referenced spec path
   - If not found, fuzzy-match against spec filenames
   - If still ambiguous, ask the user (do not guess)

3. **Read CLAUDE.md and the spec**
   - CLAUDE.md defines repo rules
   - Spec defines what must be built
   - Acceptance criteria define minimum outcome

4. **Read supporting artifacts when relevant**
   - Design doc
   - UI preview
   - Pitch
   - Related notes

5. **If frontend work is included**
   - Use design doc as source of truth
   - Match hierarchy, content, and behavior exactly
   - Do not approximate UX decisions

6. **Determine base branch**
   - Check related tickets for stacked work
   - Prefer parent branch if applicable
   - Otherwise default to `main`
   - If unclear, present options to user

7. **Create feature branch**
   - Format: `feat/{LINEAR_ID}-short-description`

---

## Phase 2: Plan

Break the work into a concrete execution plan.

Must include:

- Files to create/modify
- Dependency order
- Schema/migration work (if any)
- Data processing logic
- API changes
- UI work
- Tests
- Risk areas

Group by concern:

- Schema / types
- Ingestion & processing logic
- Decision logic
- API layer
- UI components
- Testing

**Present plan before coding.**
This is the scope checkpoint.

---

## Phase 3: Execute

Implement in the correct order.

### 1. Prerequisites First

- Migrations
- Schema updates
- Enums / types
- Shared utilities

### 2. Core Logic Next

Build feature according to spec.

Priority order:

1. **Financial correctness (CRITICAL)**
2. **User-scoped data safety**
3. **Deterministic outputs**
4. **Decision logic correctness**
5. **UI behavior**
6. **Polish last**

### 3. Decision Logic Rules (P.R.I.M.E.-Specific)

Any logic that answers:

- "Can I afford this?"
- "When can I afford this?"
- "What happens if I do this?"

must be:

- Deterministic
- Testable
- Explainable
- Based on exact financial inputs

**Do NOT:**

- Use AI to generate decisions
- Approximate financial outputs
- Introduce hidden assumptions

### 4. Frontend Implementation Rules

- Follow design doc exactly
- Match:
  - Layout
  - Spacing
  - Hierarchy
  - States (loading, empty, error)
- Keep UI:
  - Clear
  - Calm
  - Trustworthy
  - Not decorative

### 5. Product Discipline Rules

**Do NOT:**

- Expand scope "while you're here"
- Introduce flexible systems not needed yet
- Build future-proof abstractions prematurely
- Add manual-heavy flows unless required
- Introduce probabilistic or AI-based financial outputs

If spec gaps appear:

→ Flag them clearly instead of guessing

---

## Phase 4: Verify

Run full verification suite.

At minimum:

- Tests
- Linter
- Type-check
- Repo-specific checks (from CLAUDE.md)
- Formatting

### Financial Verification (CRITICAL)

If feature touches balances, transactions, projections, or decisions, verify:

- Exact values
- No floating point errors
- Deterministic outputs
- Consistent results across runs

### Frontend Verification

If UI involved:

- Layout matches design
- Correct states (empty/loading/error)
- Responsive behavior works
- No mismatch with design intent

### Failure Handling

If something fails:

- Fix if straightforward
- Otherwise isolate and report clearly

Do not proceed with broken behavior.

---

## Phase 5: Ship

### 1. Commit

- Descriptive message
- Include Linear ID
- Follow CLAUDE.md conventions

### 2. Create PR

```bash
gh pr create
```

Include:

- Linear ticket link
- Summary of changes
- Testing notes
- Migration notes (if any)
- Base branch

### 3. PR Summary Must Include

- What was built
- Key modules/files changed
- Schema changes
- Test results
- Anything reviewers should focus on

### 4. Move Ticket

Move Linear ticket to **In Review** if supported.

---

## When Things Go Wrong

**Spec not found**
→ Ask user. Do not guess.

**Design missing**
→ Ask for correct artifact.

**Spec vs acceptance criteria conflict**
→ Pause and surface clearly.

**Tests failing inconsistently**
→ Identify whether it's a spec issue, test issue, or logic issue.

**Tooling missing**
→ Tell user what's missing + manual fallback.

**Ticket too large**
→ Recommend splitting before implementation.

---

## P.R.I.M.E.-Specific Build Priorities

Use these filters at all times:

**1. Financial correctness first**
No incorrect numbers. Ever.

**2. User isolation always**
Every query must enforce `userId`.

**3. Determinism is mandatory**
Same input → same output.

**4. Decision logic must be explainable**
No black-box outputs.

**5. Simplicity over architecture**
Build only what the ticket needs.

---

## Output Standard

A strong ticket execution should result in:

- Acceptance criteria satisfied
- Spec implemented faithfully
- Financial outputs correct
- Code matches repo patterns
- Tests passing
- PR clean and reviewable

> If correctness or determinism is uncertain, the ticket is not complete.

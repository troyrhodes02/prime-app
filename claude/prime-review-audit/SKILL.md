---
name: prime-review-audit
description: >
  Audit PR review feedback for technical validity, product alignment, and
  scope fit against the current P.R.I.M.E. ticket, spec, and roadmap. Use this
  skill whenever the user asks to evaluate, audit, triage, or assess review
  comments on a pull request — including phrases like "check this review",
  "audit the feedback", "is this review valid", "should I implement this
  feedback", or "scope check this review". Requires Linear MCP to be configured.
---

# Review Audit

Evaluate PR review feedback across three dimensions before recommending action:

1. **Technical validity**
2. **Scope alignment**
3. **P.R.I.M.E. product fit**

P.R.I.M.E. is a financial decision engine, not a feature-volume product. A review comment is not automatically good just because it is technically possible. It must also fit the current ticket, the current product stage, and the system's financial trust, automation, and simplicity constraints.

## Prerequisites

- Linear MCP server must be connected
- You must be in a git repo with a branch that contains a Linear ticket ID
- The relevant PR comments must be available through:
  - User-pasted feedback
  - GitHub CLI
  - Current branch PR context

---

## Workflow

### Step 1: Gather Context

1. **Get the ticket ID** from the current branch name

   ```bash
   git branch --show-current
   ```

2. Extract the ticket ID from the branch name.
3. Fetch the ticket from Linear and read:
   - Title
   - Description
   - Acceptance criteria
   - Linked issues
   - Milestone or parent project
   - Any notes that define boundaries
4. Review related implementation artifacts when available:
   - Pitch
   - Design doc
   - Spec
   - Roadmap entry
5. Search Linear for related tickets in the same project to determine whether the feedback belongs to:
   - Current scope
   - Future planned work
   - A missing follow-up ticket

6. Get the review comments from one of:
   - User-pasted feedback
   - PR number via GitHub CLI
   - Current checked-out PR

   Example:

   ```bash
   gh pr view --json reviews,reviewRequests,comments
   ```

7. Read the actual code being commented on. Never evaluate review feedback abstractly without checking the implementation.

---

### Step 2: Evaluate Each Comment

For every review comment, assess these dimensions independently.

#### A. Technical Validity

Ask:

- Is the reviewer's understanding of the code correct?
- Does the issue actually exist in the implementation?
- Would the suggestion improve correctness, reliability, maintainability, or clarity?
- Does the suggestion create new regressions or unnecessary complexity?
- Does it align with the current codebase patterns?
- Does it protect deterministic financial behavior where trust depends on correctness?

Rate as: **VALID / INVALID / UNCERTAIN**

#### B. Scope Alignment

Using the current ticket, acceptance criteria, and related artifacts:

- **IN_SCOPE** — Directly supports the ticket, or fixes a regression introduced by the PR
- **ALREADY_PLANNED** — Valid concern, but covered by another existing ticket
- **NEW_TICKET** — Valid concern, not currently tracked, worth follow-up
- **OUT_OF_SCOPE** — Conflicts with the accepted scope, spec boundaries, or current milestone intent

Scope assessment must reference:

- Acceptance criteria
- Spec boundaries
- Roadmap sequencing
- Related ticket IDs when applicable

When auditing scope, explicitly check:

- Does this strengthen a current P.R.I.M.E. engine or surface?
- Does this create infrastructure "for later"?
- Does this expand the feature beyond the current decision value?
- Does this turn a vertical slice into a broader system refactor?

#### C. P.R.I.M.E. Product Fit

Evaluate whether the feedback supports or harms P.R.I.M.E.'s product principles.

Ask:

- Does this improve financial clarity?
- Does this protect trust with balances, transactions, goals, readiness logic, or alerts?
- Does this preserve automation-first behavior?
- Does this avoid unnecessary manual workflow?
- Does this keep the implementation simple enough for the current product stage?
- Does this preserve fast time-to-value?
- Does this introduce speculative complexity that should be deferred?
- Does this strengthen a real user decision outcome?

Rate as: **ALIGNS / MISALIGNS / UNCERTAIN**

Examples of misalignment:

- Adding manual-heavy flows where automatic logic or light confirmation is enough
- Introducing flexible infrastructure not needed now
- Expanding budgeting or planning depth beyond current MVP decision value
- Suggesting UI/data complexity that does not increase user clarity
- Adding AI dependence where deterministic financial logic should remain primary
- Broadening a small vertical slice into a larger platform system

---

### Step 3: Recommend Action

Combine technical validity, scope alignment, and product fit into a final recommendation.

| Validity  | Scope            | Product Fit | → Recommendation             |
| --------- | ---------------- | ----------- | ---------------------------- |
| VALID     | IN_SCOPE         | ALIGNS      | IMPLEMENT                    |
| VALID     | ALREADY_PLANNED  | ALIGNS      | DEFER                        |
| VALID     | NEW_TICKET       | ALIGNS      | DEFER                        |
| VALID     | OUT_OF_SCOPE     | ALIGNS      | DEFER                        |
| VALID     | any              | MISALIGNS   | SKIP or DEFER depending on impact |
| INVALID   | any              | any         | SKIP                         |
| UNCERTAIN | any              | any         | DISCUSS                      |

Guidance:

- **IMPLEMENT** when the suggestion is real, relevant, and helpful now
- **DEFER** when valid but belongs elsewhere or later
- **SKIP** when the comment is wrong, unhelpful, or harmful to the product
- **DISCUSS** when the tradeoff depends on product or architecture judgment not fully resolved in context

---

### Step 4: Present the Audit

Format the output as a clear, scannable report.

For each comment:

```
## [RECOMMENDATION] — one-line summary
📎 path/to/file.ts:L42

**Reviewer said:** "brief quote or paraphrase"

**Technical assessment:** [VALID / INVALID / UNCERTAIN]
[1–2 sentences of technical analysis]

**Scope assessment:** [IN_SCOPE / ALREADY_PLANNED / NEW_TICKET / OUT_OF_SCOPE]
[1–2 sentences with references to ticket acceptance criteria, spec, or roadmap]

**Product fit:** [ALIGNS / MISALIGNS / UNCERTAIN]
[1–2 sentences explaining whether this supports P.R.I.M.E.'s financial clarity, trust, simplicity, automation, and decision-engine goals]

**Recommendation:** [What to do and why]
```

End with a summary count:

- X to implement
- X to defer
- X to skip
- X to discuss

---

## Important Guidelines

- Always read the actual code
- Always compare against the current ticket
- Use the spec and design doc when available
- Cite specific acceptance criteria when classifying scope
- Cite specific ticket IDs when something is already planned
- Be honest when uncertain
- Do not implement anything
- Default stylistic-only feedback to SKIP unless it materially improves maintainability or clarity
- Default speculative architecture expansion to SKIP or DEFER
- Protect P.R.I.M.E. from scope creep disguised as code quality
- Treat anything affecting financial calculations, categorization, readiness outputs, or trust-sensitive messaging as higher scrutiny
- Prefer the smallest correct implementation that preserves user-visible decision value

---

## P.R.I.M.E.-Specific Review Heuristics

Use these as additional filters when auditing feedback.

**1. Clarity Filter**

If the suggestion does not improve financial clarity, trust, or implementation quality, be skeptical.

**2. Decision Filter**

If the suggestion does not help the product better answer:

- Can I afford this?
- When can I afford this?
- What happens if I do this?

It may be lower value than it appears.

**3. Automation Filter**

If the suggestion introduces unnecessary manual workflow, it likely does not fit.

**4. Trust Filter**

If the comment identifies a real calculation bug, data integrity issue, auth risk, tenant isolation problem, sync issue, or misleading financial output, prioritize it highly.

**5. Scope Discipline Filter**

If the suggestion sounds like:

- *"While we're here…"*
- *"This will help later…"*
- *"We might as well…"*
- *"Let's make this flexible…"*

Treat it as a likely scope expansion and audit aggressively.

**6. MVP Filter**

Prefer the smallest correct implementation that supports current product value. Do not recommend complexity simply because it is architecturally cleaner in the abstract.

**7. Deterministic Math Filter**

If the comment pushes AI, heuristics, or approximation into a place where deterministic financial math should remain exact, treat it as likely misaligned unless clearly justified.

**8. Vertical Slice Filter**

If the review feedback expands beyond the current user-visible slice into unrelated systems, shared abstractions, or future-facing infrastructure, default toward DEFER or SKIP unless the current PR truly requires it.

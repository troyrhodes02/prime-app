# EdgeSight — Claude Code Workflow

This document outlines the standard end-to-end workflow for turning a Pitch into implemented, reviewed, and merged production code using Claude Code.

---

## 0. When To Use This Workflow

**Use this workflow when:**

- A new Pitch exists in Linear
- You are building a new feature for EdgeSight
- You want structured design → UI → spec → implementation → review
- You want milestone-based PR development tied to Linear
- The feature affects modeling, analytics, dashboards, or slip logic

**Do not use this for:**

- Hotfixes
- Small bug fixes
- Minor refactors
- Tiny UI tweaks
- Minor stat display changes

> This workflow is for structured feature and system development.

---

## 1. Pull the Pitch

**Claude — Step 1**

Pull the Pitch from Linear:

```
Pull the Pitch: {Pitch Name} from Linear project EdgeSight V1
```

---

## 2. Generate Design Doc

**Claude — Step 2**

Add the pitch to the pitch folder and generate a design doc:

```
/edgesight-design-doc add this pitch to the @@pitch/ folder and generate a design doc
```

**Human — Step 3**

Review the generated design doc. Verify:

- Decision workflows are clear
- Analytical views match user needs
- Modeling outputs are represented correctly
- Edge cases and empty states are covered
- Responsive behavior intent is confirmed

> Do not proceed until approved.

---

## 3. Generate UI Design

**Claude — Step 4**

Generate a pixel-perfect UI preview from the design doc:

```
/edgesight-ui-design generate a pixel perfect design from this design doc
@@design-docs/{pitch-design-doc-name}.md
Store it in @@ui-previews/
```

**Human — Step 5**

Review the UI preview. Verify:

- Analytical layout is correct
- Tables are readable and dense
- Projection vs line comparisons are clear
- Confidence and edge signals are clear
- States are included
- Errors are covered
- Mobile/responsive behavior is considered

Prompt changes if needed.

> Do not proceed until approved.

---

## 4. Generate Technical Spec

**Claude — Step 6**

Generate full implementation spec:

```
/edgesight-spec
Based off:
@@design-docs/{pitch-name-design-doc}.md
@@ui-previews/{pitch-name-preview}.html

Generate a detailed deterministic implementation spec.
```

**Human — Step 7**

Review and verify the technical spec. Verify:

- Data models are correct
- Projection / edge / confidence logic is clear
- Deterministic responsibilities are defined
- Versioning and snapshotting are covered
- Analytics instrumentation is included
- APIs are correctly defined
- Validation logic is sufficient

Adjust if needed.

---

## 5. Break Into PR-Sized Work

**Claude — Step 8**

Create PR-sized Linear issues in vertical order:

- Foundation → Logic → UI → Refine
- Prioritize fastest testable workflows
- Ship vertical slices (not backend batches)
- Strict scope only — defer extras
- Add to EdgeSight → Order chronologically → Milestone {Pitch Name}

**Human — Step 9**

Verify Linear tickets. Confirm:

- Scope is correct
- Issues are not too large
- Dependencies are clear
- Modeling tasks are separated properly
- Naming is clean

> Adjust before coding starts.

---

## 6. Implement Tickets

**Claude — Step 10**

Work on ticket:

```
/edgesight-ticket-worker work on EDGE-*
```

When done:

- Open PR in GitHub
- Use `{base-branch}` as base branch
- Post PR to `#pr-review`

**Human — Step 11**

Verify changes in GitHub. Check:

- Code quality
- Tests present
- Deterministic outputs reproducible
- Matches spec
- UI correct
- Analytics tracking present
- Version tagging present

---

## 7. Codex CLI Review

**Claude (Codex CLI) — Step 12**

Switch to Codex CLI:

```
/review
Review changes on EDGE-{current-branch} against {base-branch}
Leave feedback as GitHub PR comments.
```

**Claude — Step 13**

```
/edgesight-review-audit
Audit the comments left by Codex on the PR.
```

**Human — Step 14**

Decide:

- What feedback must be implemented?
- What feedback conflicts with modeling philosophy?
- What can be skipped?
- Is it small enough to fix in the current branch?
- Or large enough to create a new Linear ticket?

If large:

1. Create new ticket
2. Add to same milestone
3. Repeat implementation process

---

## 8. Final Verification Loop

**Human — Step 15**

Final verification in GitHub.

If PR needs changes, loop: **Step 10 → 14** until PR is approved and ready to merge.

Confirm:

- Deterministic guarantees preserved
- Snapshot integrity maintained
- Analytics metrics correct
- UI fidelity correct
- No scope creep introduced

---

## Summary Flow

```
Pitch → Design Doc → UI → Tech Spec → Linear Issues → PR → Codex Review → Audit → Fix → Merge
```

---

> This is the official Claude Code structured workflow for EdgeSight feature development.
>
> Keep it disciplined. Follow it in order. Do not skip human verification gates.

# P.R.I.M.E. — Claude Code Workflow

This document outlines the structured workflow for turning a Pitch into implemented, reviewed, and merged production code for P.R.I.M.E.

The goal is not just to build features — it is to build high-trust, decision-driven functionality that users rely on for real financial choices.

---

## 0. When To Use This Workflow

**Use this workflow when:**
- A new Pitch exists in Linear
- You are building a new P.R.I.M.E. feature
- The work requires structured planning (design → spec → implementation)
- The feature impacts: financial data, decision logic, projections, UI/UX, onboarding, or system behavior

**Do not use this workflow for:**
- hotfixes
- small bug fixes
- minor UI tweaks
- refactors without behavior changes

> This workflow is for intentional feature development.

---

## Core Principle: Conditional Skill Usage

Not every step uses every skill.

Each skill should only be used when it meaningfully improves:
- clarity
- correctness
- decision reliability
- product value

**Skill Usage Philosophy**
- Use fewer skills, more intentionally
- Avoid unnecessary artifacts
- Only introduce complexity when needed

---

## When to Use Each Skill

| Skill | Use When |
| --- | --- |
| `/design-doc` | Feature has UI/UX complexity or multiple states |
| `/ui-design` | Visual fidelity and layout clarity matter |
| `/prime-spec` | Backend, financial logic, APIs, or data models are involved |
| `/aria-insight-design` → *(optional future `/prime-decision-design`)* | Feature creates or depends on decision outputs |
| `/aria-onboarding-flow` | Feature affects onboarding or time-to-value |
| `/aria-landing-design` | Feature should be reflected on landing page |
| `/aria-security-review` | Feature touches financial data or integrations |
| `/ticket-worker` | Always used for implementation |
| `/review-audit` | Always used after PR review |

---

## 1. Pull the Pitch

**Claude**

```
Pull the Pitch: {Pitch Name} from Linear project P.R.I.M.E.
```

---

## 2. Design Phase *(Conditional)*

Defines what the user sees and how decisions are presented.

**Claude — Step 2 *(Optional)***

```
/design-doc generate a design doc from this pitch
```

Use when: multiple screens exist, decision clarity depends on layout, or interaction complexity exists.

**Claude — Step 3 *(Optional)***

```
/ui-design generate a pixel-perfect UI from:
@@design-docs/{design-doc}.md
Store in @@ui-previews/
```

Use when: UI clarity directly affects understanding, layout precision matters, or complex states exist.

**Human — Step 4**

Review design:
- Is the decision clear immediately?
- Are states complete?
- Are edge cases handled?
- Does this reduce thinking?

> Do not proceed until approved.

---

## 3. Decision / Onboarding / Product Layer *(Conditional)*

Ensures the feature delivers real value — not just functionality.

**Claude — Step 5 *(Optional)* — Decision Design**

```
/aria-insight-design
```

Use when the feature produces outputs like: safe-to-spend, projections, affordability decisions, or alerts.

*(Future: replace with `/prime-decision-design`)*

**Claude — Step 6 *(Optional)* — Onboarding**

```
/aria-onboarding-flow
```

Use when: feature impacts first-time experience, affects time-to-value, or requires data connection.

**Claude — Step 7 *(Optional)* — Landing Page**

```
/aria-landing-design
```

Use when: feature is user-visible, improves perceived value, or should be marketed.

---

## 4. Technical Specification

**Claude — Step 8**

```
/prime-spec
Based on:
@@design-docs/{design-doc}
@@ui-previews/{ui-preview}
pitch context
```

**Human — Step 9**

Review spec:
- Financial logic correct?
- Decision outputs deterministic?
- User isolation enforced?
- Edge cases covered?
- Matches product intent?

> Do not proceed until approved.

**Claude — Step 10 *(Optional)* — Security Review**

```
/aria-security-review
```

Use when: financial data involved, integrations exist, auth boundaries exist, or projections/decisions could mislead.

---

## 5. Break Into PR-Sized Work

**Claude — Step 11**

Break into Linear issues:
- Create milestone: `"{Pitch Name}"`
- Associate all tickets
- Keep tickets small and scoped

**Human — Step 12**

Review tickets:
- Proper scope?
- Clear dependencies?
- Small enough?
- Naming clear?

---

## 6. Implementation

**Claude — Step 13**

```
/ticket-worker work on PRIME-*
```

**Human — Step 14**

Review PR:
- Matches spec?
- Financial outputs correct?
- Decision logic correct?
- UI matches design?
- No scope creep?

---

## 7. Review & Audit

**Claude — Step 15**

```
/review
```

**Claude — Step 16**

```
/review-audit
```

Evaluate: technical validity, scope alignment, product fit.

**Human — Step 17**

Decide: implement, defer, or ignore. If large → create new ticket.

---

## 8. Final Verification Loop

**Human — Step 18**

Repeat until PR is:
- correct
- deterministic
- clean
- aligned with product intent

---

## 9. Merge

Merge only when:
- spec satisfied
- financial correctness verified
- decision outputs trustworthy
- no security issues
- no scope creep

---

## Summary Flow

```
Pitch
→ (Optional) Design
→ (Optional) UI
→ (Optional) Decision / Onboarding / Landing
→ Spec
→ (Optional) Security Review
→ Linear Issues
→ Implementation
→ Review
→ Audit
→ Fix
→ Merge
```

---

## Final Principles

### 1. Build for Decision Clarity
Every feature must help the user make a better financial decision.

### 2. Protect Trust
Incorrect numbers or misleading outputs break the product.

### 3. Determinism First
Same input → same output. Always.

### 4. Minimize User Effort
Automation first. Input second.

### 5. Avoid Scope Creep
If it's not in the pitch/spec, question it.

### 6. Sequence Matters
Build the right things in the right order.

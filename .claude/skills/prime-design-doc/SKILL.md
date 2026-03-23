---
name: prime-design-doc
description: Generate design documents for P.R.I.M.E. features. Use when creating UI/UX specifications, screen-by-screen designs, or when the user mentions "design doc", "design document", "PRD", or needs to document how a feature should look and behave. Design docs define the visual and interaction layer — what users see, how they interact, how screens connect, and how the feature delivers financial clarity and decision confidence. Requires a pitch document as input for scope, value, monetization impact, and decision context.
---

# P.R.I.M.E. Design Document Generator

Generate design documents that specify the UI/UX experience for P.R.I.M.E. features. Design docs sit between pitch documents (problem, value, scope, monetization, decision impact) and technical specs (data models, calculations, APIs, jobs, system behavior). They define what the user sees, how they interact, and how the product delivers visible financial clarity.

P.R.I.M.E. is not a generic personal finance dashboard and not a budgeting tracker. It is a financial decision engine that helps users understand their financial state, evaluate future outcomes, and act with confidence using automated data, deterministic financial logic, and intelligent guidance. Every design decision must reinforce clarity, trust, simplicity, automation, and visible decision support.

## Where Design Docs Fit

```text
Pitch Document → Design Document → Technical Spec
(why + scope)    (what users see)   (how it's built)
```

- **Pitch answers:** Why are we building this? What financial uncertainty does it remove? Why would someone pay for it? What is in scope?
- **Design Doc answers:** What does the user see? How do they move through it? What states exist? Where is the financial value surfaced?
- **Spec answers:** How is it implemented? What is the data model? What deterministic logic powers it? How do we test it?

## Prerequisites

Before writing a design doc, ensure you have:

- **Pitch document** — Required. Defines the financial problem, clarity impact, monetization impact, time-to-value impact, scope boundaries, trust risks, and no-gos.
- **Project design context / style guide** — If a P.R.I.M.E. style guide exists, reference it. If not, preserve consistency with the current product visual language and document only what this feature specifically uses or introduces.
- **P.R.I.M.E. product context** — The feature must align with the product's core principles:
  - Automation first
  - Minimal user input
  - Deterministic financial trust
  - Insights over raw data
  - Decision support over passive tracking
  - Clarity over complexity
  - Guidance without judgment
- **Related artifacts when applicable** — Existing pitches, roadmap entries, feature breakdowns, current UI references, or system docs

## File Conventions

- **Filename:** `feature-name-design-doc.md` (kebab-case)
- **Location:** Project docs directory or as specified by user
- **Format:** Markdown with JSX/Tailwind code blocks for component specifications and ASCII wireframes for layout

## Core Design Standard for P.R.I.M.E.

Every design doc must optimize for these questions:

- What becomes financially clearer for the user because this exists?
- What decision becomes easier because this exists?
- Where is the value surfaced visually?
- How quickly does the user feel the benefit?
- Does this reduce thinking, or add thinking?
- Does this increase trust in the product?

A screen is not complete just because it looks correct. It is complete when:

- The financial hierarchy is obvious
- The most important conclusion is noticeable
- The user knows what the system is telling them
- The next action is clear
- Unnecessary interpretation is removed
- Trust-sensitive states are explained clearly

## Required Sections

Every design doc must include these sections in order:

### 1. Title & Metadata

```
# Feature Name — Design Document

**Version:** X.Y
**Focus:** One-line description of what this design doc covers
```

### 2. Vision

2–4 sentences maximum. Frame the feature from the user's perspective — what financial question does this page, flow, or module answer? What becomes easier to understand? What decision becomes safer or faster? End with a design north star that captures the interaction and visual philosophy for this feature.

Example:

> Users should not have to piece together balances, transactions, and recurring obligations to decide whether they can safely spend. This feature makes financial capacity visible by translating account activity into a clear answer about what is safe, what is risky, and what action to take next.
>
> **Design north star:** Calm financial decision clarity. High-signal hierarchy, low-friction interaction, visible guidance, and trust-first explanation.

Guidelines:

- Lead with user understanding, not system behavior
- Frame around decision clarity, not just workflow
- Make the north star specific and opinionated
- Reinforce P.R.I.M.E.'s product identity: intelligent, simple, trustworthy, proactive, low-effort

### 3. Design Principles

3–5 numbered principles, each with a short name and 1–2 sentence explanation. These must be specific to this feature, not generic design advice.

Format:

```
### 1. [Principle Name]

[What it means and how it affects design decisions for this feature.]
```

Examples of strong P.R.I.M.E.-style principles:

- Surface the decision first
- Financial truth before decoration
- Show impact, not just status
- Guidance must feel actionable
- Trust-sensitive states need explanation
- Automation should feel visible, not mysterious

Guidelines:

- Each principle should resolve a real design tension
- Principles should help implementation tradeoffs
- Ground them in the pitch's problem, clarity impact, monetization impact, and trust requirements
- Keep to 3–5 total

### 4. Visual Language

Reference the P.R.I.M.E. product visual language and specify any feature-specific tokens or interaction decisions.

Include:

**Color Palette**

Table of design tokens used in this feature with hex values and usage descriptions.

**Severity / Status Colors**

If the feature includes risk states, affordability states, confidence levels, sync states, goal health, or alert priority levels, define the color mapping clearly.

Examples:

- Safe / healthy financial state
- Warning / partial or incomplete data
- Risk / affordability concern
- High-priority insight
- Read-only trust messaging
- Needs user confirmation
- Goal off-track state

**Typography**

Primary font: IBM Plex Sans (body, labels, UI text). Header font: Lexend (headings, display text).

Table of text elements with size, weight, line-height, and Tailwind class examples.

**Spacing**

Reference the spacing system in use. Document any feature-specific spacing rules that improve scan-ability, hierarchy, and decision visibility.

**Border Radius / Surface Language**

Document panel/card/button treatment used by this feature. If following an existing style guide, state that directly and only note deviations.

Important: Always include:
> All styling inherits from the P.R.I.M.E. design system or current product visual language. This design doc documents only the subset of tokens, hierarchy rules, and interaction patterns actively used by this feature.

Guidelines:

- Do not invent unnecessary new tokens
- Prefer consistency over novelty
- Financial decision surfaces should feel calm, structured, and trustworthy
- High-value information should be visually prominent without becoming noisy
- Risk should be noticeable without feeling alarmist or judgmental

### 5. Information Architecture

ASCII diagram showing the page hierarchy and navigation relationships. This gives a top-level view of how the feature fits into the product.

Example:

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar                                                         │
│ ├─ Dashboard                                                    │
│ ├─ Goals                                                        │
│ ├─ Budget                                                       │
│ ├─ Purchase Readiness                                           │
│ ├─ Insights                                                     │
│ └─ Settings                                                     │
│                                                                 │
│ Main Content                                                    │
│ ┌─ Primary Decision Module ───────────────────────────────────┐ │
│ │ Main financial answer / decision status                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Supporting Insight Section ────────────────────────────────┐ │
│ │ Drivers, tradeoffs, confidence, contributing categories     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Secondary Action / Drill-Down Area ────────────────────────┐ │
│ │ Scenario review, goal link, recommendation, detail          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Guidelines:

- Show where the feature lives in P.R.I.M.E. navigation
- Show primary vs secondary content clearly
- Show how insight surfaces connect to detail views when relevant
- Keep it simple and structural, not pixel-perfect

### 6. Screen Specifications

This is the core of the design doc. Each screen gets its own section using the same structure.

Per-Screen Structure:

```
## Screen N: [Screen Name]

### Purpose
One sentence: what does this screen help the user understand or decide?

### URL Pattern (if applicable)
`/feature/[id]`

### Trigger (for panels/modals/drawers)
What user action opens this screen/panel?

### Primary User Question
What question should this screen answer immediately?

### Layout
ASCII wireframe showing the spatial arrangement of elements.

### [Component / Section Name]

| Element          | Styling & Behavior                                      |
| ---------------- | ------------------------------------------------------- |
| **Element name** | Tailwind classes, hierarchy notes, interaction behavior |

### Code Reference
[jsx code block]

### Fields (for forms/review flows)

| Field      | Type       | Required | Notes                |
| ---------- | ---------- | -------- | -------------------- |
| Field Name | Input type | Yes/No   | Validation, defaults |

### Validation
- Validation rules
- Disabled states
- Confirmation states
- Error message patterns

### Empty State
ASCII wireframe + JSX for when there is no data.

### Behavior
- What happens on success
- What happens on error
- Toast messages
- Focus management
- Transition behavior
- What changes visually after key actions
```

Screen Specification Guidelines:

- Every screen needs a Purpose
- Every screen needs a Primary User Question
- ASCII wireframes before code
- Every meaningful section needs a styling/behavior table
- Empty states are required
- Interactions must be explicit
- Review flows and confirmation flows must be lightweight
- If the screen shows insights, define exactly where the conclusion appears and why it is noticeable
- If the screen includes affordability, timeline, or projection outputs, distinguish exact vs estimated values clearly
- If the screen includes financial calculations, trust language must support the output
- Avoid adding modules that increase data density without improving decisions

### 7. Navigation Flows

Document how screens connect to each other and to other parts of P.R.I.M.E. Use ASCII flow diagrams showing the user journey.

Example:

```
┌─ Dashboard ─────────────────────────────┐
│  [Safe to Spend] card                   │
│  click "Why?" ──────────────────────────│──→ Safe-to-Spend Detail
└─────────────────────────────────────────┘

┌─ Goal Dashboard ────────────────────────┐
│  [Goal timeline risk] banner            │
│  click "Adjust plan" ───────────────────│──→ Scenario Planner
└─────────────────────────────────────────┘
```

Include:

- What triggers navigation
- Whether it is click, keyboard, step progression, or automated transition
- What state carries between screens
- Deep-link patterns where applicable
- Whether the flow is first-session only, recurring, or both

### 8. Interaction Specifications

**Keyboard Navigation**

| Context     | Key | Action       |
| ----------- | --- | ------------ |
| Screen Name | Key | What it does |

**Loading States**

- Skeleton patterns
- Staged loading behavior
- Sync / ingestion progress states where relevant
- How anticipation and trust are maintained during loading
- How the system communicates "analyzing your finances" without implying fake precision

**Error States**

Provide JSX for error display and retry patterns.

**Empty States**

For every empty state, define:

- What it means
- Whether it is expected or problematic
- What action or explanation follows

**Toast Notifications**

| Action         | Message                  | Duration |
| -------------- | ------------------------ | -------- |
| Success action | "Confirmation text"      | 3s       |
| Error          | "Error text. Try again." | 5s       |

**Trust Messaging**

If the feature touches balances, transactions, goals, affordability, simulations, permissions, sync behavior, or inferred classifications, explicitly define trust-supporting microcopy such as:

- Read-only reassurance
- Sync explanation
- Why data is being shown
- What is exact vs inferred
- What assumptions are included
- What requires user confirmation

This is required when trust influences user willingness to continue.

### 9. Responsive Behavior

**Breakpoints**

| Breakpoint | Width      | Behavior                 |
| ---------- | ---------- | ------------------------ |
| Desktop    | ≥1024px    | Full layout as specified |
| Tablet     | 768–1023px | Adaptations              |
| Mobile     | <768px     | Mobile-specific behavior |

**Mobile Adaptations**

Document:

- Stacking behavior
- Panel/drawer conversions
- Interaction changes
- Touch target rules
- Priority of information on small screens

Guidelines:

- Preserve hierarchy, not exact layout
- Do not let mobile hide the most valuable financial answer
- Keep the primary decision, risk state, and next action visible quickly

### 10. Component Inventory

| Component     | Location        | Notes                         |
| ------------- | --------------- | ----------------------------- |
| ComponentName | Which screen(s) | New vs reusable, key variants |

Guidelines:

- Note whether the component is P.R.I.M.E.-specific or reusable system UI
- Flag components that surface financial conclusions, trust states, projections, or corrective guidance
- Keep component count lean to avoid overbuilding

### 11. Out of Scope (v1)

Bullet list of features explicitly not designed in this version. Reference the pitch document's no-gos and feature boundaries.

Examples:

- No manual budgeting workflows
- No advanced financial planning complexity
- No investment management views
- No speculative AI-generated financial math
- No extra admin controls unless required
- No alternate dashboards that do not improve decisions

This section is mandatory. It protects MVP clarity and prevents scope creep.

## Style Guidelines

**ASCII Wireframes**

- Use box-drawing characters (`┌ ─ ┐ │ └ ┘ ├ ┤`) for wireframes
- Focus on layout hierarchy and relationships
- Label interactive elements with `[brackets]`
- Use `→` for links or directional flow
- Include populated and empty states when relevant

**Code Blocks**

- Use JSX + Tailwind
- Match the codebase conventions in use
- Include interaction states where relevant
- Use conditional class handling when needed
- Prefer practical implementation-ready snippets over decorative mock markup

**Tables**

- Use markdown tables for element styling, fields, keyboard shortcuts, and state definitions
- Bold the first-column names
- Keep entries implementation-relevant

**Tone**

- Write descriptions in plain English
- Focus on what the user understands, sees, and can do
- Be explicit about success, failure, ambiguity, and trust-sensitive moments
- Prioritize clarity over design jargon

## P.R.I.M.E.-Specific Design Rules

These rules apply to every P.R.I.M.E. design doc:

**1. Decision Comes Before Data**
Do not surface balances, transactions, charts, or metrics unless they support a clearer financial conclusion.

**2. Financial Clarity Comes Before Density**
More information is not better. The interface must make the user's financial state easier to understand within seconds.

**3. Insight Must Be Visible**
If the feature creates value through guidance, the conclusion must be visually noticeable, easy to interpret, and tied to an action.

**4. Trust Must Be Designed**
If the user could hesitate because of data sensitivity, affordability logic, sync behavior, uncertainty, or inferred classification, the interface must explain enough to maintain confidence.

**5. Automation Must Feel Real**
The system should feel proactive and intelligent, but never magical. Users should understand what the system analyzed and why it produced a conclusion.

**6. Manual Work Must Stay Minimal**
Avoid workflows that require repeated correction, heavy configuration, or ongoing maintenance. Confirmation is acceptable. Maintenance-heavy UX is not.

**7. No Fake Sophistication**
Do not design interfaces that imply financial precision, forecasting reliability, or AI reasoning depth the system does not actually have.

**8. The Feature Must Support a Core Decision**
Every surface should support at least one of:

- Can I afford this?
- When can I afford this?
- What happens if I do this?

If it does not, it should not exist.

## Workflow

1. Receive pitch document
2. Read the problem, financial clarity impact, monetization impact, time-to-value impact, trust boundaries, no-gos, and scope boundaries
3. Identify user-visible surfaces — screens, panels, modules, onboarding steps, states
4. Identify the primary user questions — what should become obvious on each screen?
5. Clarify only when needed — ask questions only when ambiguity materially affects layout, hierarchy, trust, or scope
6. Draft information architecture
7. Design screen-by-screen
8. Add interaction specs — loading, empty, error, responsive, trust states
9. Document component inventory
10. Checkpoint with user when appropriate — confirm hierarchy, clarity, and scope
11. Finalize — confirm this design aligns with the pitch and does not overreach

## Interview Guidelines

When clarifying with the user:

- Use existing P.R.I.M.E. project context first before asking questions
- Ask only when the answer materially changes the design
- Prioritize questions about:
  - What must be most visible
  - What the user should understand immediately
  - What financial decision this supports
  - Whether this belongs in onboarding, dashboard, goal detail, purchase readiness, monitoring, or AI advisor flow
  - What trust/risk states need explanation
  - What should remain out of scope
- Avoid asking questions already answered by the pitch or product docs
- Keep questions minimal and high leverage
- Prefer 2–5 strong questions over long interviews

## Output Quality Standard

A strong P.R.I.M.E. design doc should make it obvious:

- What the feature looks like
- What the user sees first
- What becomes financially clearer because of it
- What decision becomes easier because of it
- Where the value appears
- What states exist
- What is intentionally left out

If the design doc only describes layout but does not describe how the feature improves financial clarity or decision confidence, it is incomplete.

---
name: prime-onboarding-flow
description: Design the onboarding experience for P.R.I.M.E. features. Use when creating or updating onboarding flows, first-time user experiences, account connection flows, or any feature that affects how quickly a user reaches their first meaningful financial answer. Focus on minimizing input, maximizing clarity, and delivering immediate perceived value.
---

# P.R.I.M.E. Onboarding Flow Design

Design onboarding flows that get users to meaningful financial clarity as fast as possible with minimal effort.

P.R.I.M.E.’s onboarding is not about setup — it is about **time-to-value**.

The goal is:
- connect financial data
- structure it automatically
- show something meaningful
- make the user understand “this is useful” within minutes

## Core Principle

**Onboarding is successful when the user sees a real, believable financial answer or insight with minimal effort.**

Not when:
- they complete steps
- they fill forms
- they configure settings
- they “finish onboarding”

## Purpose

This skill defines:
- the onboarding steps
- what the user does vs what the system does
- what data is required at each stage
- how friction is minimized
- how value is surfaced early
- how trust is established

The output should inform:
- pitch decisions
- UI design
- system behavior
- sequencing of integrations
- activation metrics

---

## Onboarding Philosophy

### 1. Reduce Input, Increase Output

- The user should do as little as possible
- The system should do as much as possible
- Every step must feel necessary

### 2. Show Value Early

Do not wait until onboarding is “complete” to show value.

Surface:
- partial data
- early financial structure
- simple financial answers
- early insights

as soon as possible

### 3. Trust Before Depth

Before asking for more data:
- show what the system does
- explain what it sees
- prove it is safe and useful

### 4. Progressive Understanding

The user does not need to understand the full system immediately.

Reveal:
- first: what this shows
- then: why it matters
- later: how it works

### 5. Avoid Configuration Overload

Do not front-load:
- manual categorization
- rules setup
- recurring obligation correction
- settings
- goal tuning
- scenario customization

Only introduce these when necessary.

---

## Output Structure

---

## 1. Onboarding Goal

Define in 1–2 sentences:
- what success looks like
- what the user should understand by the end

Example:
> The user connects at least one financial source and sees a structured view of their financial position, along with at least one meaningful answer or insight about what is safe to spend, what is affecting progress, or what needs attention.

---

## 2. First Value Moment

Define the exact moment where the user experiences value.

Examples:
- seeing a safe-to-spend number
- seeing a purchase readiness result
- seeing a goal timeline estimate
- seeing a spending-risk insight
- seeing recurring obligations automatically identified

This is the most important part of onboarding.

---

## 3. User Journey Overview

High-level step sequence.

Example:

1. Account creation
2. Connect financial source
3. Data sync and structuring
4. Initial system output
5. First financial answer or insight
6. Optional refinement step

Keep this concise.

---

## 4. Step-by-Step Flow

For each step:

---

### Step X: [Step Name]

#### Purpose
What this step achieves.

#### User Action
What the user must do.

#### System Behavior
What P.R.I.M.E. does automatically.

#### Data Requirements
What data is required at this step.

#### Friction Level
Low / Medium / High (should almost always be Low)

#### Failure States
What can go wrong and how it is handled.

#### Exit Condition
What must be true to move forward.

---

Repeat for each step.

---

## 5. Data Connection Strategy

Define:
- which integrations are asked first
- why that order is chosen
- what minimum data unlocks value

Example:
- Start with bank or primary financial account connection
- Goal setup optional or lightweight after initial value
- Purchase scenario input optional or delayed
- Only one connected source required for initial value when possible

Include:
- fallback paths if connection fails
- demo or sample data strategy (if applicable)

---

## 6. Time-to-Value Strategy

Define:
- how quickly value appears
- what is shown before full data sync completes

Examples:
- partial transaction categorization
- early spending pattern detection
- simple safe-to-spend estimate
- early recurring obligation detection
- first-pass goal or affordability output

Avoid waiting for perfect data.

---

## 7. Trust & Permission Messaging

Define how the system communicates:

- secure account connection
- read-only access where applicable
- no movement of money
- no automatic financial changes
- what data is used for
- what outputs are exact vs estimated

Trust must be:
- visible
- simple
- believable

---

## 8. Empty & Low-Data Handling

Define behavior when:
- very little data exists
- data is incomplete
- the integration is new
- the sync is partial

Examples:
- show partial financial answers
- explain limitations clearly
- avoid blank screens
- show what additional data will improve

---

## 9. Progressive Refinement

Define what happens after initial onboarding:

- category corrections
- recurring obligation confirmation
- goal setup or adjustment
- purchase scenario input
- deeper monitoring and insights

These should:
- not block initial value
- be introduced only when needed

---

## 10. Insight Integration

Define:
- which insights or financial answers appear during onboarding
- when they appear
- how they are introduced

Rules:
- start simple
- avoid overwhelming
- show 1–2 strong outputs instead of many weak ones

---

## 11. Drop-Off Risk Analysis

Identify:
- where users might abandon
- why they would abandon
- how to reduce that risk

Examples:
- connection friction
- slow sync
- unclear trust messaging
- outputs that feel vague
- too much setup before value
- unclear difference from a budgeting app

---

## 12. UX Notes

Define:
- how steps should feel
- pacing
- transitions
- loading states
- feedback messaging

Focus on:
- clarity
- responsiveness
- momentum

---

## 13. Edge Cases

Examples:
- user connects the wrong account
- no transactions are available
- duplicate financial sources
- partial sync failure
- unsupported provider
- irregular income makes initial projections weaker
- pending transactions make early results incomplete

---

## 14. Activation Criteria

Define what qualifies as an “activated user.”

Examples:
- connected at least one financial source
- has a structured financial baseline
- has seen at least one meaningful financial answer or insight
- has reached the dashboard
- has interacted with a purchase, goal, or monitoring surface

---

## 15. Acceptance Criteria

Checklist:

- [ ] User reaches first value moment with minimal steps
- [ ] Onboarding does not require heavy manual data entry
- [ ] At least one meaningful financial answer or insight is shown early
- [ ] System behavior is explained clearly
- [ ] Trust messaging is visible and understandable
- [ ] Empty states are handled gracefully
- [ ] No unnecessary configuration is required upfront

---

## 16. Explicit Non-Goals

- ❌ Full data accuracy before showing value
- ❌ Complex setup flows
- ❌ Forcing all integrations upfront
- ❌ Manual-heavy onboarding
- ❌ Explaining the entire system before showing output

---

## P.R.I.M.E.-Specific Rules

### Financial Data First
Primary onboarding value should come from connected financial data.

### Goal and Purchase Inputs Optional Early
Goal planning and purchase simulation should not block onboarding unless the feature specifically depends on them.

### Automation First
The system should structure, categorize, and interpret data automatically before asking the user to help.

### Decision Clarity Over Completeness
It is better to show one simple, trustworthy financial answer early than a more complex answer much later.

### Trust Must Appear Early
Because the product touches financial decisions, read-only handling, data use, and confidence boundaries should be explained before users feel uncertainty.

### Core Product Questions Should Be Introduced Quickly
Early onboarding should move the user toward at least one of these:
- Can I afford this?
- When can I afford this?
- What happens if I do this?

---

## Workflow

1. Identify the core value of the feature
2. Define the first value moment
3. Minimize required user actions
4. Define system automation at each step
5. Ensure trust messaging is clear
6. Ensure value appears before full completion
7. Add refinement steps after value, not before
8. Identify drop-off risks
9. Validate against activation criteria

---

## Quality Standard

A strong onboarding flow should make a new user think:

- I didn’t have to do much
- This already shows me something useful
- I understand what this does
- I trust it enough to continue

If onboarding feels like setup work instead of value delivery, it is not good enough.
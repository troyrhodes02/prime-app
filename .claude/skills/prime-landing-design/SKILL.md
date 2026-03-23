---
name: prime-landing-design
description: Design and update the P.R.I.M.E. landing page in a way that reflects the real state of the product. Use when creating the initial marketing site, refining messaging, adding new product sections, or updating the landing page to reflect newly completed features. The landing page must position P.R.I.M.E. clearly, build trust, and only make claims supported by what exists in the product.
---

# P.R.I.M.E. Landing Design

Design and update the P.R.I.M.E. landing page as a product-positioning asset, not just a marketing page.

The landing page exists to do four things well:

1. Explain what P.R.I.M.E. does in direct, credible language
2. Make the value of the product understandable within seconds
3. Build trust around connecting financial data and using deterministic financial logic
4. Evolve as the product evolves, without overclaiming

P.R.I.M.E. is not a vague “AI finance assistant.” It is a financial decision engine for individuals who want to understand where they stand financially, what they can afford, and how their current behavior affects future goals — without manual budgeting.

The landing page must always feel:
- sharp
- trustworthy
- financially literate
- operationally useful
- grounded in real functionality

## Core Rule

The landing page must only describe:
- what already exists
- what can be demonstrated
- what can be explained honestly

Do not market unfinished capabilities as if they are working.
Do not imply financial intelligence the product does not yet have.
Do not use vague aspirational copy when specific financial wording would be clearer.

## Purpose of the Landing Page

The landing page should help a visitor quickly answer:

- What is this?
- Who is it for?
- What problem does it solve?
- Why is it different from budgeting apps, spreadsheets, or bank dashboards?
- Why should I trust it with my financial data?
- Why should I care now?

## Output Requirements

When generating or updating the landing page, provide:

1. **Page strategy summary**
   - What stage of product maturity this page reflects
   - What the page is trying to achieve
   - What visitor questions it prioritizes

2. **Section-by-section structure**
   - Hero
   - Supporting proof blocks
   - Product explanation
   - Feature/value sections
   - Trust/security messaging
   - CTA structure
   - FAQ if needed

3. **Copy recommendations**
   - Headlines
   - Subheads
   - CTA labels
   - Body copy
   - Trust messaging

4. **Visual direction**
   - Layout hierarchy
   - Product preview usage
   - Screenshot or interface placement
   - Editorial pacing between sections

5. **HTML implementation**
   - Single-file HTML
   - Full document with `html`, `head`, and `body`
   - Responsive layout
   - Functional and detailed enough to use as a working landing page draft

## Implementation Rules

When producing the landing page implementation:

- Output only one code block for the page code
- Use a single-file HTML document
- Always include:
  - `html`
  - `head`
  - `body`
- Use IBM Plex Sans (Google Fonts) as the primary font for body and UI text
- Use Lexend (Google Fonts) for headings and display text
- Use lucide icons via JavaScript when icons are needed
- Use stroke width `1.5`
- Keep the implementation responsive
- Use direct, production-lean structure rather than throwaway mock markup
- Use hover, divider, outline, and spacing treatments intentionally
- Prefer typographic/data-driven visual sections over generic marketing illustration

## Brand System

Use the current P.R.I.M.E. brand language reflected in the product and screenshots.

### Typography
- Primary font: IBM Plex Sans (body, labels, UI text)
- Header font: Lexend (headings, display text)

### Color Palette

#### Core Colors (Brand Identity)
- Primary (Deep Navy): `#0B1F3A`
- Primary Action Blue: `#3A7DFF`
- Secondary Blue (Hover / Active): `#2563EB`

#### Intelligence Accent (AI / System)
- Teal Accent: `#14B8A6`

#### Background & Surfaces
- Background (App Base): `#F7F9FC`
- Surface (Cards / Panels): `#FFFFFF`
- Subtle Surface (Alt Sections): `#EEF2F7`

#### Text Colors
- Primary Text: `#111827`
- Secondary Text: `#6B7280`
- Muted Text: `#9CA3AF`

#### Financial Status Colors
- Success (Safe / On Track): `#22C55E`
- Warning (Risk / Attention): `#F59E0B`
- Danger (Not Safe): `#EF4444`

#### Borders & UI Details
- Border Light: `#E5E7EB`
- Border Subtle: `#D1D5DB`

### Usage Guidance
- Off-White for page background
- Concrete Grey for cards, surfaces, dividers, and subtle panels
- Charcoal for primary headings and core text
- Blue for primary CTAs, links, and active emphasis
- Mint Green for positive states, healthy financial signals, and subtle supporting indicators
- Deep Accent for darker emphasis and higher-contrast hover states
- Purple Accent may be used where it matches the actual P.R.I.M.E. UI and identity shown in product references

Do not introduce unrelated colors.
Avoid warm palettes, hype gradients, or consumer-fintech softness.

## Aesthetic Direction

The page should feel like:
- a serious financial decision product
- a modern planning and intelligence system
- a software company with editorial restraint

The tone should be:
- direct
- practical
- confident
- specific

Not:
- fluffy
- inspirational for its own sake
- over-designed
- template-like

## Layout Rules

- Use strong visual hierarchy
- Left-align headlines by default
- Centered hero text is allowed only when brief and visually controlled
- Avoid repetitive three-card feature grids as the default structure
- Use asymmetry, staggered sections, or editorial stacking
- Use whitespace aggressively
- Let screenshots and copy breathe
- Use section transitions that feel deliberate, not blocky
- Avoid giant colored hero backgrounds
- Avoid fake dashboard placeholders
- If screenshots are available, use them
- If screenshots are not available, use typographic or data-driven visual structures

## Product Truthfulness Rules

The landing page must reflect the current reality of P.R.I.M.E.

### Early Stage / Pre-MVP
Emphasize:
- the core promise
- what the product is being built to do
- demo / waitlist / early access CTA
- trust and positioning

Do not imply:
- broad feature completeness
- advanced financial automation that does not exist yet
- polished live workflows if they are not implemented

### Mid-Build
Add:
- real product sections
- feature blocks tied to shipped work
- screenshots or UI previews from actual interfaces
- copy that reflects what users can now meaningfully experience

### MVP-Ready
Expand into:
- feature detail
- product proof
- stronger feature-led CTA structure
- clearer comparison against budgeting apps, spreadsheets, and passive trackers

## Content Priorities

The landing page should communicate these ideas with precision:

### 1. Core Value Proposition
P.R.I.M.E. helps users understand their financial position and make better decisions without manual budgeting.

### 2. Decision Clarity
Explain that the product is built to answer:
- Can I afford this?
- When can I afford it safely?
- What happens if I do?

### 3. Goal and Purchase Readiness
Explain that the system helps users connect present behavior to future goals and major purchases.

### 4. Minimal Effort
Position the system as low-input and automation-first.

### 5. Trust
Be clear about:
- secure account connection
- read-only financial analysis where applicable
- no movement of money
- deterministic financial logic
- practical, serious data handling language

### 6. Guidance, Not Judgment
Reinforce that P.R.I.M.E. is a practical financial advisor layer, not a shame-based budgeting tool.

## Required Landing Sections

Every landing page draft should evaluate and usually include the following sections, unless there is a clear reason not to.

### 1. Hero
Must communicate:
- what P.R.I.M.E. is
- who it is for
- what decision clarity it provides
- a specific CTA

### 2. Product Framing
Explain what problem P.R.I.M.E. solves better than:
- spreadsheets
- budgeting apps
- banking dashboards
- passive expense trackers

### 3. Visual Product Proof
Use:
- actual product screenshots
- cropped interface proof
- real UI callouts
- focused previews of the dashboard, goal planning, purchase readiness, or alert surfaces

### 4. How It Works
Keep this simple and operational:
- connect accounts
- P.R.I.M.E. structures financial activity
- P.R.I.M.E. surfaces what matters
- user gets a clear financial answer

### 5. Value Blocks
Show specific user outcomes such as:
- see how much is actually safe to spend
- understand what is delaying a goal
- evaluate a purchase before committing
- get alerted when behavior starts drifting off track

Only include blocks supported by the actual product stage.

### 6. Trust / Security
Explicitly reinforce:
- secure financial data handling
- sensitivity to money decisions
- practical trust messaging
- deterministic calculations where trust matters

### 7. CTA Section
CTA language should be specific:
- Join Early Access
- Book Demo
- See the Product
- Start Free Trial

Choose the CTA that matches the product stage.

## Copy Rules

### Headlines
- short
- direct
- specific
- high signal

### Subheads
- explain the product in financial and operational terms
- avoid inflated promises

### Body Copy
- explain outcomes clearly
- reduce abstraction
- avoid “transform your finances with AI” style fluff

### CTA Copy
Use specific action language.

Preferred examples:
- Join Early Access
- Book Demo
- See the Product
- Start Free Trial

Avoid vague CTA language when a more concrete option exists.

## Screenshot Usage Rules

If screenshots are provided:
- use them as primary proof
- preserve their credibility
- crop or frame them cleanly
- do not distort them into decorative filler

If multiple screenshots are provided:
- assign each to a clear purpose
- hero preview
- product proof
- feature section support

Do not overload the page with too many UI images at once.

## Section Writing Rules

For each section, define:
- what the visitor should understand
- what proof supports it
- what action or trust signal follows

Every section must earn its place.
Do not add filler sections simply because a landing page “usually has them.”

## FAQ Rules

Add FAQ only when it improves trust or reduces friction.

Good FAQ topics:
- What data does P.R.I.M.E. access?
- Does it move money?
- Is this a budgeting app?
- Who is this for?
- How does purchase readiness work?
- How does goal planning work?
- What does the AI layer actually do?

## Tone Rules

Write like a product that understands money, planning, and real-life decisions.

Good tone:
- “See how much you can safely spend before it affects your goals.”
- “Understand what is delaying your timeline.”
- “Evaluate a purchase before it becomes a setback.”
- “Connect your accounts and get a clearer answer than a spreadsheet can give you.”

Bad tone:
- “Unlock your financial future with AI-powered transformation.”
- “Supercharge your money mindset with intelligent automation.”
- “Reimagine the future of personal finance.”

## Code Generation Rules

When generating the page code:
- produce a complete single-file HTML page
- keep all implementation inside one code block
- use only the approved visual language
- avoid unnecessary JavaScript
- use JavaScript only where needed, including lucide icon initialization and chart behavior if charts exist
- if charts are included, use Chart.js
- keep structure clean and implementation-ready

## Product Integrity Rules

Do not:
- invent supported integrations that do not exist
- imply live sync if only partial or staged sync exists
- imply financial precision beyond actual deterministic logic
- market future roadmap items as current product capability
- use testimonials, logos, or trust marks without real basis
- imply regulated financial advice if the product is not positioned that way

## Workflow

1. Review the current state of the product or pitch
2. Identify what is real, what is demoable, and what should remain unclaimed
3. Decide the landing page’s primary goal for this stage
4. Structure the page around that goal
5. Write direct, product-truthful messaging
6. Use screenshots or UI proof where available
7. Add trust language where hesitation is likely
8. Generate the implementation in a single HTML file

## Quality Standard

A strong P.R.I.M.E. landing page should make a qualified visitor think:

- I understand what this does
- This seems useful
- This feels credible
- I trust how it handles financial data
- I want to see more

If the page feels generic, overclaims the product, or could describe ten other fintech tools, it is not good enough.
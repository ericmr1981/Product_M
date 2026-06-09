# Product M Brand Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure-static editorial-style brand site for Product M (3 ice cream series: Gelato, Gelato Mix, Gelato Shake) where AI-generated HTML documents dropped into `docs/` render with the site's visual system intact.

**Architecture:** Zero build tools, zero runtime dependencies. A `build-index.js` Node script (using only built-ins) scans HTML frontmatter comments and refreshes `index.json`; static pages read that JSON via inline `<script>` to render lists. All visual styling flows from CSS custom properties in `styles/tokens.css`; agent output only uses `var(--*)` references and the 10 documented component class names.

**Tech Stack:** Vanilla HTML, CSS (custom properties), Node.js built-ins (`fs`, `path`) for the indexer. No npm dependencies. Self-hosted Noto Serif SC / Noto Sans SC / JetBrains Mono fonts (woff2).

**Reference spec:** `docs/superpowers/specs/2026-06-09-product-m-brand-site-design.md`

---

## File Structure

Files created during this plan (all under `/Users/ericmr/Documents/GitHub/Product_M/`):

| Path | Responsibility |
| --- | --- |
| `package.json` | Declares `node` version + `build-index` script |
| `.gitignore` | Ignores generated artifacts |
| `README.md` | How to add a doc, run build-index, find SPEC |
| `index.html` | Brand-story homepage (hero + series cards + latest) |
| `index.json` | Generated — DO NOT edit by hand |
| `series/gelato.html` | Series landing page (hand-written) |
| `series/gelato-mix.html` | Series landing page |
| `series/gelato-shake.html` | Series landing page |
| `planning/index.html` | Planning docs index page |
| `docs/gelato/classic-vanilla.html` | Example product doc |
| `docs/gelato-shake/mocha-shake.html` | Example product doc |
| `planning/2026-summer-launch.html` | Example planning doc |
| `styles/tokens.css` | All design custom properties (color, type, spacing) |
| `styles/base.css` | Reset + base typography |
| `styles/site.css` | Homepage + series page styles |
| `styles/reader.css` | Document body styles (10 components) |
| `_design-system/SPEC.md` | Design spec for AI agents (must-read) |
| `_design-system/template.html` | Copy-paste starting point for agents |
| `_design-system/components/*.html` | 10 component snippets |
| `scripts/build-index.js` | Scans HTML frontmatter → writes index.json |
| `assets/fonts/*.woff2` | Self-hosted fonts |
| `assets/images/*.{jpg,svg}` | Placeholder images for demo |

**Decomposition rationale:** Each CSS file has one role (tokens / base / site / reader). The reader CSS is what agent output consumes; the site CSS is hand-written page styling — they don't share concerns. Components are HTML snippets (not templates) so agents copy-paste them as-is.

---

## Tasks

### Task 1: Project scaffolding (package.json, .gitignore, README)

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "product-m",
  "version": "0.1.0",
  "private": true,
  "description": "Product M brand site — static editorial site for product documentation",
  "scripts": {
    "build-index": "node scripts/build-index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
.DS_Store
node_modules/
*.log
.superpowers/
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Product M

A static editorial brand site for Product M's product documentation. Pure HTML + CSS, no build tools, no runtime.

## Adding a new document

1. Read the design spec: **`_design-system/SPEC.md`**
2. Copy the starting point: **`_design-system/template.html`**
3. Place the file in the right folder:
   - Product intro / spec sheet → `docs/<series-slug>/<slug>.html`
   - Planning / campaign → `planning/<slug>.html`
4. Fill in the `<!-- @meta {...} -->` frontmatter at the top
5. Run `npm run build-index` to refresh the site's index
6. Commit

Series slugs: `gelato`, `gelato-mix`, `gelato-shake`.

## Local preview

Just open `index.html` in a browser, or serve the project root with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Refreshing the index

After adding/removing/renaming documents:

```bash
npm run build-index
```

This scans all HTML files, parses the `<!-- @meta ... -->` frontmatter, and writes `index.json`. The site reads `index.json` to populate the homepage and series pages.

## Design system

- Design tokens (colors, type, spacing): `styles/tokens.css`
- Document body styles: `styles/reader.css`
- Site styles: `styles/site.css`
- Component snippets: `_design-system/components/`
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore README.md
git commit -m "chore: scaffold project (package.json, gitignore, readme)"
```

---

### Task 2: Design tokens (styles/tokens.css)

**Files:**
- Create: `styles/tokens.css`

- [ ] **Step 1: Create `styles/tokens.css` with all design variables**

```css
/* =========================================================================
   Product M — Design Tokens
   The single source of truth for colors, type, spacing.
   All other CSS and agent-generated HTML must use var(--*) references.
   ========================================================================= */

:root {
  /* Color — forest green editorial palette */
  --ink: #1f3a2e;           /* primary: forest green */
  --ink-soft: #3a5a4a;      /* secondary: links, sub-headings */
  --ink-muted: #6b7a72;     /* tertiary: meta, footer, dates */
  --paper: #f5f3eb;         /* background: warm paper */
  --paper-deep: #ebe7d8;    /* card / section background */
  --rule: #d8d3c4;          /* dividers */
  --highlight: #b8a878;     /* gold accent: numbers, badges */
  --on-ink: #f5f3eb;        /* text on dark backgrounds */

  /* Type stacks */
  --font-serif: 'Noto Serif SC', 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Noto Sans SC', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;

  /* Font sizes (rem; root 16px) */
  --fs-xs: 0.75rem;     /* 12px - labels, eyebrows */
  --fs-sm: 0.875rem;    /* 14px - secondary text */
  --fs-base: 1rem;      /* 16px - body */
  --fs-md: 1.125rem;    /* 18px - emphasized body */
  --fs-lg: 1.5rem;      /* 24px - small headings */
  --fs-xl: 2rem;        /* 32px - section titles */
  --fs-2xl: 3rem;       /* 48px - page titles */
  --fs-3xl: 4.5rem;     /* 72px - hero */
  --fs-display: 6rem;   /* 96px - magazine cover */

  /* Spacing scale (rem) */
  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-6: 1.5rem;
  --sp-8: 2rem;
  --sp-12: 3rem;
  --sp-16: 4rem;
  --sp-24: 6rem;
  --sp-32: 8rem;

  /* Layout */
  --max-width: 1280px;
  --content-width: 720px;     /* document body line-length */
  --gutter: 2rem;            /* mobile padding */
}

@media (max-width: 720px) {
  :root {
    --fs-3xl: 3rem;          /* 48px on mobile */
    --fs-display: 3.5rem;    /* 56px on mobile */
    --gutter: 1.25rem;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/tokens.css
git commit -m "feat(styles): add design tokens (color, type, spacing)"
```

---

### Task 3: Base styles (styles/base.css)

**Files:**
- Create: `styles/base.css`

- [ ] **Step 1: Create `styles/base.css` with reset + base typography**

```css
/* =========================================================================
   Product M — Base styles
   Reset + fundamental typography. Loaded by every page.
   ========================================================================= */

@import url('./tokens.css');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: 1.65;
  color: var(--ink);
  background: var(--paper);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--ink-soft);
  transition: border-color 0.15s ease;
}

a:hover {
  border-bottom-color: var(--ink);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: 1.15;
  color: var(--ink);
}

h1 { font-size: var(--fs-2xl); }
h2 { font-size: var(--fs-xl); }
h3 { font-size: var(--fs-lg); }

ul, ol { list-style: none; }

button {
  font: inherit;
  cursor: pointer;
  background: none;
  border: none;
  color: inherit;
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/base.css
git commit -m "feat(styles): add base reset and typography"
```

---

### Task 4: Reader (document body) styles — Task 4a: nav-bar + hero

**Files:**
- Create: `styles/reader.css`

- [ ] **Step 1: Create `styles/reader.css` with section 1 (nav-bar + hero)**

```css
/* =========================================================================
   Product M — Reader styles
   Styles for document body (agent-generated HTML).
   Any HTML using these class names will render correctly.
   ========================================================================= */

@import url('./tokens.css');

/* ----- Layout container ----- */
.reader {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

.reader--wide {
  max-width: var(--max-width);
}

/* =========================================================================
   1. nav-bar
   ========================================================================= */
.nav-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--sp-6) var(--gutter);
  border-bottom: 1px solid var(--rule);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  letter-spacing: 0.05em;
}

.nav-brand {
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  font-style: italic;
  letter-spacing: 0;
  border-bottom: none;
}

.nav-links {
  display: flex;
  gap: var(--sp-6);
}

.nav-links a {
  border-bottom: none;
  color: var(--ink-soft);
}

.nav-links a:hover {
  color: var(--ink);
}

.nav-meta {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .nav-bar { flex-wrap: wrap; gap: var(--sp-3); }
  .nav-links { gap: var(--sp-4); }
  .nav-meta { width: 100%; }
}

/* =========================================================================
   2. hero
   ========================================================================= */
.hero {
  padding: var(--sp-24) 0 var(--sp-16);
  text-align: left;
  border-bottom: 1px solid var(--rule);
  margin-bottom: var(--sp-16);
}

.hero-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-6);
}

.hero-title {
  font-family: var(--font-serif);
  font-size: var(--fs-3xl);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin-bottom: var(--sp-6);
  font-weight: 400;
}

.hero-title em {
  font-style: italic;
  color: var(--ink-soft);
}

.hero-rule {
  width: 60px;
  height: 1px;
  background: var(--ink);
  margin: var(--sp-8) 0;
}

.hero-sub {
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  font-style: italic;
  color: var(--ink-soft);
  line-height: 1.4;
  max-width: 540px;
}

.hero-meta {
  margin-top: var(--sp-8);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.hero--dark {
  background: var(--ink);
  color: var(--on-ink);
  padding: var(--sp-32) var(--gutter);
  border-bottom: none;
}

.hero--dark .hero-eyebrow,
.hero--dark .hero-meta { color: var(--paper-deep); }
.hero--dark .hero-title { color: var(--on-ink); }
.hero--dark .hero-rule { background: var(--on-ink); }
.hero--dark .hero-sub { color: var(--paper-deep); }

@media (max-width: 720px) {
  .hero { padding: var(--sp-16) 0 var(--sp-12); }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for nav-bar and hero"
```

---

### Task 5: Reader styles — Task 4b: intro + section eyebrow

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append section-eyebrow + intro styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   Shared: section eyebrow (used by intro, spec, steps, gallery, split)
   ========================================================================= */
.section-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-6);
}

section { margin-bottom: var(--sp-16); }

/* =========================================================================
   3. intro
   ========================================================================= */
.intro {
  padding: var(--sp-8) 0;
}

.intro-eyebrow {
  composes: section-eyebrow;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-6);
}

.intro-lead {
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  line-height: 1.35;
  color: var(--ink);
  font-weight: 400;
  max-width: 640px;
}

@media (max-width: 720px) {
  .intro-lead { font-size: var(--fs-lg); }
}
```

Note: `composes:` is CSS Modules syntax and won't work in plain CSS — remove that line. The `font-family`, `font-size`, etc. on `.intro-eyebrow` are duplicates of `.section-eyebrow` but kept explicit so the stylesheet works without a preprocessor.

Replace the `.intro-eyebrow` block with this corrected version (already included in the snippet above as the duplicate — keep both, the standalone property set wins):

```css
.intro-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-6);
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for intro and section eyebrow"
```

---

### Task 6: Reader styles — Task 4c: spec-table

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append spec-table styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   4. spec-table
   ========================================================================= */
.spec-section { margin-bottom: var(--sp-16); }

.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-sans);
}

.spec-table tr {
  border-bottom: 1px solid var(--rule);
}

.spec-table tr:first-child {
  border-top: 1px solid var(--ink);
}

.spec-table th,
.spec-table td {
  text-align: left;
  padding: var(--sp-4) 0;
  vertical-align: top;
}

.spec-table th {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
  width: 35%;
  padding-right: var(--sp-6);
}

.spec-table td {
  font-size: var(--fs-md);
  color: var(--ink);
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for spec-table"
```

---

### Task 7: Reader styles — Task 4d: split-image

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append split-image styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   5. split-image
   ========================================================================= */
.split { margin-bottom: var(--sp-16); }

.split-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-12);
  align-items: center;
}

.split-image img {
  width: 100%;
  height: auto;
  display: block;
}

.split-text h2 {
  font-size: var(--fs-xl);
  margin-bottom: var(--sp-4);
  line-height: 1.2;
}

.split-text p {
  font-size: var(--fs-md);
  line-height: 1.65;
  color: var(--ink-soft);
  max-width: 480px;
}

@media (max-width: 720px) {
  .split-grid {
    grid-template-columns: 1fr;
    gap: var(--sp-8);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for split-image"
```

---

### Task 8: Reader styles — Task 4e: quote-pull

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append quote-pull styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   6. quote-pull
   ========================================================================= */
.quote-pull {
  margin: var(--sp-16) 0;
  padding: var(--sp-8) 0 var(--sp-8) var(--sp-8);
  border-left: 2px solid var(--ink);
  max-width: 640px;
}

.quote-pull p {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-xl);
  line-height: 1.4;
  color: var(--ink);
  margin-bottom: var(--sp-4);
}

.quote-pull cite {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-style: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

@media (max-width: 720px) {
  .quote-pull p { font-size: var(--fs-lg); }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for quote-pull"
```

---

### Task 9: Reader styles — Task 4f: step-list

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append step-list styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   7. step-list
   ========================================================================= */
.steps { margin-bottom: var(--sp-16); }

.step-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
}

.step {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--sp-6);
  padding-bottom: var(--sp-8);
  border-bottom: 1px solid var(--rule);
}

.step:last-child { border-bottom: none; }

.step-num {
  font-family: var(--font-mono);
  font-size: var(--fs-lg);
  color: var(--ink);
  letter-spacing: 0.05em;
}

.step h3 {
  font-size: var(--fs-lg);
  margin-bottom: var(--sp-2);
}

.step p {
  font-size: var(--fs-md);
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 480px;
}

@media (max-width: 720px) {
  .step { grid-template-columns: 50px 1fr; gap: var(--sp-4); }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for step-list"
```

---

### Task 10: Reader styles — Task 4g: stats-row

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append stats-row styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   8. stats-row
   ========================================================================= */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-8);
  padding: var(--sp-12) 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  margin: var(--sp-16) 0;
}

.stat {
  text-align: left;
}

.stat-num {
  font-family: var(--font-mono);
  font-size: var(--fs-2xl);
  font-weight: 400;
  color: var(--ink);
  line-height: 1;
  margin-bottom: var(--sp-3);
  letter-spacing: -0.02em;
}

.stat-num small {
  font-size: var(--fs-md);
  color: var(--ink-muted);
  margin-left: var(--sp-1);
}

.stat-label {
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  color: var(--ink-soft);
  letter-spacing: 0.05em;
  line-height: 1.4;
}

@media (max-width: 720px) {
  .stats { grid-template-columns: 1fr; gap: var(--sp-6); }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for stats-row"
```

---

### Task 11: Reader styles — Task 4h: gallery

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append gallery styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   9. gallery
   ========================================================================= */
.gallery-section { margin-bottom: var(--sp-16); }

.gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-4);
}

.gallery img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

@media (max-width: 720px) {
  .gallery { grid-template-columns: 1fr; }
  .gallery img { height: 240px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for gallery"
```

---

### Task 12: Reader styles — Task 4i: footer-card

**Files:**
- Modify: `styles/reader.css` (append)

- [ ] **Step 1: Append footer-card styles**

Append to `styles/reader.css`:

```css
/* =========================================================================
   10. footer-card
   ========================================================================= */
.footer-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-6);
  padding: var(--sp-8) 0;
  border-top: 1px solid var(--ink);
  margin-top: var(--sp-16);
}

.footer-card-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.footer-card-label {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.footer-card-value {
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  color: var(--ink);
}

@media (max-width: 720px) {
  .footer-card { grid-template-columns: 1fr; gap: var(--sp-4); }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/reader.css
git commit -m "feat(styles): add reader styles for footer-card"
```

---

### Task 13: Site styles (styles/site.css)

**Files:**
- Create: `styles/site.css`

- [ ] **Step 1: Create `styles/site.css` for homepage and series pages**

```css
/* =========================================================================
   Product M — Site styles
   Styles for the homepage and series landing pages only.
   Document body uses reader.css instead.
   ========================================================================= */

@import url('./base.css');

.site {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

/* ----- Site nav (shared) ----- */
.site-nav {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--sp-6) var(--gutter);
  border-bottom: 1px solid var(--rule);
  font-size: var(--fs-sm);
  max-width: var(--max-width);
  margin: 0 auto;
}

.site-nav-brand {
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  font-style: italic;
  border-bottom: none;
}

.site-nav-links {
  display: flex;
  gap: var(--sp-6);
}

.site-nav-links a {
  border-bottom: none;
  color: var(--ink-soft);
  letter-spacing: 0.05em;
}

.site-nav-links a:hover { color: var(--ink); }

.site-nav-meta {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .site-nav { flex-wrap: wrap; gap: var(--sp-3); }
  .site-nav-links { gap: var(--sp-4); }
}

/* ----- Homepage hero ----- */
.home-hero {
  padding: var(--sp-32) var(--gutter) var(--sp-24);
  border-bottom: 1px solid var(--rule);
  max-width: var(--max-width);
  margin: 0 auto;
}

.home-hero-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-6);
}

.home-hero-title {
  font-family: var(--font-serif);
  font-size: var(--fs-display);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin-bottom: var(--sp-6);
}

.home-hero-title em {
  font-style: italic;
  color: var(--ink-soft);
}

.home-hero-rule {
  width: 80px;
  height: 1px;
  background: var(--ink);
  margin: var(--sp-8) 0;
}

.home-hero-tag {
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  font-style: italic;
  color: var(--ink-soft);
  max-width: 560px;
}

/* ----- Story section ----- */
.story {
  padding: var(--sp-24) var(--gutter);
  max-width: var(--max-width);
  margin: 0 auto;
}

.story-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--sp-12);
  align-items: start;
}

.story-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.story-body p {
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  line-height: 1.55;
  color: var(--ink);
  margin-bottom: var(--sp-6);
  max-width: 640px;
}

.story-body p:last-child { margin-bottom: 0; }

@media (max-width: 720px) {
  .story-grid { grid-template-columns: 1fr; gap: var(--sp-6); }
  .story-body p { font-size: var(--fs-md); }
}

/* ----- Series section ----- */
.series-section {
  padding: var(--sp-24) var(--gutter);
  background: var(--paper-deep);
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}

.series-section-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-12);
  text-align: center;
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-8);
  max-width: var(--max-width);
  margin: 0 auto;
}

.series-card {
  background: var(--paper);
  padding: var(--sp-8);
  border: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
  transition: transform 0.2s ease, border-color 0.2s ease;
  min-height: 280px;
}

.series-card:hover {
  transform: translateY(-2px);
  border-color: var(--ink);
}

.series-card-num {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.15em;
}

.series-card-title {
  font-family: var(--font-serif);
  font-size: var(--fs-2xl);
  font-weight: 400;
  line-height: 1.1;
  color: var(--ink);
}

.series-card-desc {
  font-size: var(--fs-base);
  color: var(--ink-soft);
  line-height: 1.5;
  flex-grow: 1;
}

.series-card-link {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink);
  margin-top: var(--sp-4);
}

@media (max-width: 720px) {
  .series-grid { grid-template-columns: 1fr; }
}

/* ----- Latest section ----- */
.latest-section {
  padding: var(--sp-24) var(--gutter);
  max-width: var(--max-width);
  margin: 0 auto;
}

.latest-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-12);
}

.latest-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.latest-item {
  display: grid;
  grid-template-columns: 100px 1fr 140px 80px;
  gap: var(--sp-6);
  padding: var(--sp-6) 0;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
  transition: background 0.15s ease;
}

.latest-item:hover { background: var(--paper-deep); }

.latest-item-date {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.1em;
}

.latest-item-title {
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  color: var(--ink);
}

.latest-item-series {
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  color: var(--ink-soft);
  letter-spacing: 0.05em;
}

.latest-item-arrow {
  font-family: var(--font-mono);
  color: var(--ink-muted);
  text-align: right;
}

@media (max-width: 720px) {
  .latest-item {
    grid-template-columns: 1fr;
    gap: var(--sp-2);
  }
  .latest-item-arrow { display: none; }
}

/* ----- Site footer ----- */
.site-footer {
  padding: var(--sp-12) var(--gutter);
  border-top: 1px solid var(--rule);
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

@media (max-width: 720px) {
  .site-footer { flex-direction: column; gap: var(--sp-3); }
}

/* ----- Series page (per-series landing) ----- */
.series-hero {
  padding: var(--sp-24) 0 var(--sp-16);
  border-bottom: 1px solid var(--rule);
  margin-bottom: var(--sp-16);
}

.series-hero-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: var(--sp-6);
}

.series-hero-title {
  font-family: var(--font-serif);
  font-size: var(--fs-3xl);
  font-weight: 400;
  line-height: 1;
  margin-bottom: var(--sp-6);
  letter-spacing: -0.02em;
}

.series-hero-desc {
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  font-style: italic;
  color: var(--ink-soft);
  line-height: 1.4;
  max-width: 640px;
}

.series-hero-count {
  margin-top: var(--sp-6);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-8);
  margin-bottom: var(--sp-24);
}

.doc-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-6) 0;
  border-bottom: 1px solid var(--rule);
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
  transition: opacity 0.15s ease;
}

.doc-card:hover { opacity: 0.7; }

.doc-card-date {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-muted);
  letter-spacing: 0.1em;
}

.doc-card-title {
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  color: var(--ink);
  line-height: 1.2;
}

.doc-card-summary {
  font-size: var(--fs-base);
  color: var(--ink-soft);
  line-height: 1.5;
}

@media (max-width: 720px) {
  .doc-grid { grid-template-columns: 1fr; }
}

/* ----- Empty state ----- */
.empty-state {
  text-align: center;
  padding: var(--sp-16) 0;
  color: var(--ink-muted);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-lg);
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/site.css
git commit -m "feat(styles): add site styles (homepage, series pages, footer)"
```

---

### Task 14: build-index.js script

**Files:**
- Create: `scripts/build-index.js`

- [ ] **Step 1: Create `scripts/build-index.js`**

```javascript
#!/usr/bin/env node
/**
 * build-index.js
 *
 * Scans docs/ and planning/ for HTML files, parses the
 * <!-- @meta {...} --> frontmatter comment at the top of each, and writes
 * the aggregated data to index.json.
 *
 * Usage: node scripts/build-index.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['docs', 'planning'];
const SERIES_META = [
  { slug: 'gelato', name: 'Gelato', description: 'The original — slow-churned, low-air, intense.' },
  { slug: 'gelato-mix', name: 'Gelato Mix', description: 'Layered compositions, balanced sweet and bright.' },
  { slug: 'gelato-shake', name: 'Gelato Shake', description: 'Spoon-thick shakes, made to order.' },
];
const OUTPUT = path.join(ROOT, 'index.json');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function parseMeta(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/<!--\s*@meta\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    console.warn(`[warn] ${filePath}: invalid JSON in @meta: ${err.message}`);
    return null;
  }
}

function toRelative(absolute) {
  return path.relative(ROOT, absolute);
}

function main() {
  const documents = [];
  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(ROOT, dir);
    const files = walk(fullDir);
    for (const file of files) {
      const meta = parseMeta(file);
      if (!meta) {
        console.warn(`[skip] ${toRelative(file)}: missing or invalid @meta`);
        continue;
      }
      documents.push({
        title: meta.title,
        path: toRelative(file),
        series: meta.series || null,
        slug: meta.slug,
        date: meta.date,
        tags: meta.tags || [],
        summary: meta.summary || '',
        volume: meta.volume || '',
      });
    }
  }

  documents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const series = SERIES_META.map((s) => ({
    ...s,
    count: documents.filter((d) => d.series === s.slug).length,
  }));

  const out = {
    generated: new Date().toISOString(),
    documents,
    series,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUTPUT} — ${documents.length} documents, ${series.length} series.`);
}

main();
```

- [ ] **Step 2: Make script executable and verify it runs (no docs yet, should produce empty index)**

```bash
chmod +x scripts/build-index.js
node scripts/build-index.js
```

Expected output:

```
Wrote /Users/ericmr/Documents/GitHub/Product_M/index.json — 0 documents, 3 series.
```

- [ ] **Step 3: Verify the generated file structure**

```bash
cat index.json
```

Expected: JSON with `generated`, `documents: []`, `series: [3 entries each with count: 0]`.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-index.js
git commit -m "feat(scripts): add build-index script (frontmatter → index.json)"
```

---

### Task 15: SPEC.md (must-read for AI agents)

**Files:**
- Create: `_design-system/SPEC.md`

- [ ] **Step 1: Create `_design-system/SPEC.md`**

```markdown
# Product M — Design Specification for AI Agents

> **Read this before generating any document HTML.** Following this spec is what makes your document look at home on the site.

## 1. Brand identity

**Product M** is an ice cream maker. Three series: **Gelato**, **Gelato Mix**, **Gelato Shake**.

The visual register is **editorial** — a quiet, considered magazine. Forest green, warm paper, lots of air. The reader should feel that the document was *made*, not generated.

**Voice:** restrained, concrete, never breathless. No exclamation marks. No marketing clichés. No emoji.

## 2. The non-negotiables (8 rules)

1. **No emoji** anywhere. Not in titles, not in lists, not in alt text.
2. **No centered headings.** All `h1`–`h3` are left-aligned.
3. **No pure black or pure white** backgrounds. Use `var(--paper)` or `var(--paper-deep)`. For dark hero blocks, use `var(--ink)` with `var(--on-ink)` text.
4. **No colored block backgrounds** (no red boxes, blue callouts, etc.). The only color accents are `var(--highlight)` for number badges and `var(--ink)` for emphasis rules.
5. **No external CSS frameworks.** Don't import Tailwind, Bootstrap, or anything. Use only the class names defined in §4.
6. **No JavaScript frameworks.** Don't import React, Vue, Alpine, or anything. Inline `<script>` for reading `index.json` is fine on site pages; documents don't need JS.
7. **No hardcoded colors or font sizes.** Always use `var(--*)` references. If you need a new size, propose a token in the spec — don't invent `font-size: 23px`.
8. **No sidebars, no popovers, no modals.** Documents are scrollable long-form only.

## 3. The must-haves (5 things every document includes)

1. `<!-- @meta {...} -->` frontmatter at the very top of the file (see §6).
2. `<nav class="nav-bar">` at the top of `<body>`.
3. `<header class="hero">` immediately after the nav.
4. At least **3** body components from §4 (mix them — don't repeat the same one).
5. `<aside class="footer-card">` before `</body>` with at least `Series` and `Published` rows.

## 4. Components (the 10 class names you can use)

These are the only styled class names you should need. All are defined in `styles/reader.css`.

| Class | When to use | Required children |
| --- | --- | --- |
| `.hero` | Top of every document | `.hero-eyebrow`, `.hero-title`, `.hero-rule`, `.hero-sub`, `.hero-meta` |
| `.intro` | First body section, big pull-quote opener | `.intro-eyebrow`, `.intro-lead` |
| `.spec-section` + `.spec-table` | Product specs / parameters | `<tr><th>label</th><td>value</td></tr>` rows |
| `.split` + `.split-grid` | Image + text side-by-side | `.split-image`, `.split-text` with h2 + p |
| `.quote-pull` | A key quote you want to lift out | `<p>quote</p>`, `<cite>attribution</cite>` |
| `.step-list` + `.step` | Sequential method / process | `.step-num`, h3, p inside each `.step` |
| `.stats` + `.stat` | 2–4 key numbers | `.stat-num` (with optional `<small>` unit), `.stat-label` |
| `.gallery-section` + `.gallery` | Image grid | `<img>` children, 2 or 4 images |
| `.footer-card` + `.footer-card-row` | Document meta at bottom | `.footer-card-label`, `.footer-card-value` |
| `.nav-bar` | Top navigation | `.nav-brand`, `.nav-links > a`, `.nav-meta` |

## 5. Skeleton (copy this)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Title — Product M</title>
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/reader.css">
</head>
<body>
  <div class="reader reader--wide">
    <nav class="nav-bar"> ... </nav>
    <header class="hero"> ... </header>

    <section class="intro"> ... </section>
    <section class="spec-section"> ... </section>
    <section class="split"> ... </section>
    <section class="steps"> ... </section>
    <section class="stats"> ... </section>
    <section class="gallery-section"> ... </section>

    <aside class="footer-card"> ... </aside>
  </div>
</body>
</html>
```

A full reference template lives at `_design-system/template.html`.

## 6. Frontmatter format

Every document starts with this comment, immediately after `<head>`'s `</title>` tag (or anywhere before `<body>`):

```html
<!-- @meta
{
  "title": "Classic Vanilla",
  "series": "gelato",
  "slug": "classic-vanilla",
  "date": "2026-04-12",
  "tags": ["signature", "vanilla"],
  "summary": "Single-origin Madagascar vanilla, slow-churned.",
  "volume": "04"
}
-->
```

Required fields: `title`, `series`, `slug`, `date` (YYYY-MM-DD).
Optional: `tags`, `summary`, `volume`.

Valid `series` values: `gelato`, `gelato-mix`, `gelato-shake` (or `null` for cross-series / planning docs).

## 7. The 5 design tokens you actually need

You should only need these five. If you find yourself reaching for anything else, stop — the system has a token for it, find it in `styles/tokens.css`.

| Variable | Value | When |
| --- | --- | --- |
| `var(--paper)` | `#f5f3eb` | Default background |
| `var(--ink)` | `#1f3a2e` | All primary text, rules, dark hero bg |
| `var(--ink-soft)` | `#3a5a4a` | Subheadings, secondary text, links |
| `var(--font-serif)` | Noto Serif SC | All `h1`–`h3`, lead paragraphs, hero titles |
| `var(--font-mono)` | JetBrains Mono | Numbers, step numbers, eyebrows, meta |

## 8. Pre-flight checklist (verify before submitting)

- [ ] Frontmatter JSON parses, all required fields present
- [ ] `<nav class="nav-bar">` is present
- [ ] `<header class="hero">` is present with all 5 child elements
- [ ] At least 3 different body components from §4
- [ ] `<aside class="footer-card">` at the bottom with `Series` and `Published` rows
- [ ] No emoji, no centered headings, no hardcoded colors
- [ ] No external CSS/JS imports
- [ ] File lives at `docs/<series>/<slug>.html` or `planning/<slug>.html`
- [ ] All `<img>` use relative paths starting with `/assets/`
- [ ] Visually distinct from the other two example docs (don't copy-paste structure verbatim)
```

- [ ] **Step 2: Commit**

```bash
git add _design-system/SPEC.md
git commit -m "docs(design-system): add SPEC.md (agent must-read)"
```

---

### Task 16: Template + component snippets

**Files:**
- Create: `_design-system/template.html`
- Create: `_design-system/components/nav-bar.html`
- Create: `_design-system/components/hero.html`
- Create: `_design-system/components/intro.html`
- Create: `_design-system/components/spec-table.html`
- Create: `_design-system/components/split-image.html`
- Create: `_design-system/components/quote-pull.html`
- Create: `_design-system/components/step-list.html`
- Create: `_design-system/components/stats-row.html`
- Create: `_design-system/components/gallery.html`
- Create: `_design-system/components/footer-card.html`

- [ ] **Step 1: Create `_design-system/template.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Title — Product M</title>
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/reader.css">
</head>
<body>
  <!--
    Frontmatter (REQUIRED). Place this anywhere in the file (commonly right
    after </title>). The build-index script scans for this comment.
  -->
  <!-- @meta
  {
    "title": "Document Title",
    "series": "gelato",
    "slug": "document-slug",
    "date": "2026-04-12",
    "tags": ["tag1", "tag2"],
    "summary": "One-sentence description.",
    "volume": "04"
  }
  -->

  <div class="reader reader--wide">
    <!-- 1. Navigation -->
    <nav class="nav-bar">
      <a href="/" class="nav-brand">Product M</a>
      <ul class="nav-links">
        <li><a href="/">首页</a></li>
        <li><a href="/series/gelato.html">Gelato</a></li>
        <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
        <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
        <li><a href="/planning/">企划</a></li>
      </ul>
      <div class="nav-meta">VOL. 04 · 2026</div>
    </nav>

    <!-- 2. Hero -->
    <header class="hero">
      <div class="hero-eyebrow">SERIES · GELATO</div>
      <h1 class="hero-title">Document<br><em>Title</em></h1>
      <div class="hero-rule"></div>
      <p class="hero-sub">A short tagline that frames the document.</p>
      <div class="hero-meta">2026 · SPRING</div>
    </header>

    <!-- 3. Body — pick at least 3 different components from /components/ -->
    <section class="intro">
      <p class="intro-eyebrow">01 — INTRODUCTION</p>
      <p class="intro-lead">
        A lead paragraph in serif, large but not huge. Sets the tone of the document.
      </p>
    </section>

    <section class="spec-section">
      <p class="section-eyebrow">02 — SPECIFICATIONS</p>
      <table class="spec-table">
        <tr><th>Field 1</th><td>Value 1</td></tr>
        <tr><th>Field 2</th><td>Value 2</td></tr>
      </table>
    </section>

    <section class="split">
      <p class="section-eyebrow">03 — THE MAKING</p>
      <div class="split-grid">
        <figure class="split-image">
          <img src="/assets/images/placeholder.jpg" alt="Descriptive alt text">
        </figure>
        <div class="split-text">
          <h2>A heading that introduces the image</h2>
          <p>Body text describing what's in the image and why it matters.</p>
        </div>
      </div>
    </section>

    <section class="steps">
      <p class="section-eyebrow">04 — METHOD</p>
      <ol class="step-list">
        <li class="step">
          <span class="step-num">01</span>
          <div>
            <h3>First step</h3>
            <p>Description of the first step.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">02</span>
          <div>
            <h3>Second step</h3>
            <p>Description of the second step.</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="stats">
      <div class="stat">
        <div class="stat-num">48<small>hr</small></div>
        <div class="stat-label">Pasteurization time</div>
      </div>
      <div class="stat">
        <div class="stat-num">12<small>%</small></div>
        <div class="stat-label">Minimum fat content</div>
      </div>
      <div class="stat">
        <div class="stat-num">0</div>
        <div class="stat-label">Artificial flavors</div>
      </div>
    </section>

    <section class="gallery-section">
      <p class="section-eyebrow">05 — GALLERY</p>
      <div class="gallery">
        <img src="/assets/images/placeholder.jpg" alt="">
        <img src="/assets/images/placeholder.jpg" alt="">
        <img src="/assets/images/placeholder.jpg" alt="">
        <img src="/assets/images/placeholder.jpg" alt="">
      </div>
    </section>

    <blockquote class="quote-pull">
      <p>"A memorable line that captures the spirit of the document."</p>
      <cite>— Attribution</cite>
    </blockquote>

    <!-- 4. Footer card -->
    <aside class="footer-card">
      <div class="footer-card-row">
        <span class="footer-card-label">Series</span>
        <span class="footer-card-value">Gelato</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Published</span>
        <span class="footer-card-value">2026-04-12</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Volume</span>
        <span class="footer-card-value">04</span>
      </div>
    </aside>
  </div>
</body>
</html>
```

- [ ] **Step 2: Create `_design-system/components/nav-bar.html`**

```html
<!-- Component: nav-bar -->
<nav class="nav-bar">
  <a href="/" class="nav-brand">Product M</a>
  <ul class="nav-links">
    <li><a href="/">首页</a></li>
    <li><a href="/series/gelato.html">Gelato</a></li>
    <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
    <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
    <li><a href="/planning/">企划</a></li>
  </ul>
  <div class="nav-meta">VOL. 04 · 2026</div>
</nav>
```

- [ ] **Step 3: Create `_design-system/components/hero.html`**

```html
<!-- Component: hero -->
<header class="hero">
  <div class="hero-eyebrow">SERIES · GELATO</div>
  <h1 class="hero-title">Title<br><em>in Italic</em></h1>
  <div class="hero-rule"></div>
  <p class="hero-sub">A short tagline.</p>
  <div class="hero-meta">2026 · SPRING</div>
</header>

<!-- Variant: dark hero (use for a section opener, not the document opener) -->
<header class="hero hero--dark">
  <div class="hero-eyebrow">SECTION 02</div>
  <h1 class="hero-title">Dark<br>Hero</h1>
  <div class="hero-rule"></div>
  <p class="hero-sub">Subtitle on dark background.</p>
  <div class="hero-meta">2026</div>
</header>
```

- [ ] **Step 4: Create `_design-system/components/intro.html`**

```html
<!-- Component: intro -->
<section class="intro">
  <p class="intro-eyebrow">01 — INTRODUCTION</p>
  <p class="intro-lead">
    A short lead paragraph in serif, large but not huge. Sets the tone and introduces the document.
  </p>
</section>
```

- [ ] **Step 5: Create `_design-system/components/spec-table.html`**

```html
<!-- Component: spec-table -->
<section class="spec-section">
  <p class="section-eyebrow">02 — SPECIFICATIONS</p>
  <table class="spec-table">
    <tr><th>Field 1</th><td>Value 1</td></tr>
    <tr><th>Field 2</th><td>Value 2</td></tr>
    <tr><th>Field 3</th><td>Value 3</td></tr>
  </table>
</section>
```

- [ ] **Step 6: Create `_design-system/components/split-image.html`**

```html
<!-- Component: split-image -->
<section class="split">
  <p class="section-eyebrow">03 — THE MAKING</p>
  <div class="split-grid">
    <figure class="split-image">
      <img src="/assets/images/placeholder.jpg" alt="Descriptive alt text">
    </figure>
    <div class="split-text">
      <h2>Heading that introduces the image</h2>
      <p>Body text describing what's in the image and why it matters.</p>
    </div>
  </div>
</section>
```

- [ ] **Step 7: Create `_design-system/components/quote-pull.html`**

```html
<!-- Component: quote-pull -->
<blockquote class="quote-pull">
  <p>"A memorable line that captures the spirit of the document."</p>
  <cite>— Attribution</cite>
</blockquote>
```

- [ ] **Step 8: Create `_design-system/components/step-list.html`**

```html
<!-- Component: step-list -->
<section class="steps">
  <p class="section-eyebrow">04 — METHOD</p>
  <ol class="step-list">
    <li class="step">
      <span class="step-num">01</span>
      <div>
        <h3>First step heading</h3>
        <p>Description of the first step.</p>
      </div>
    </li>
    <li class="step">
      <span class="step-num">02</span>
      <div>
        <h3>Second step heading</h3>
        <p>Description of the second step.</p>
      </div>
    </li>
    <li class="step">
      <span class="step-num">03</span>
      <div>
        <h3>Third step heading</h3>
        <p>Description of the third step.</p>
      </div>
    </li>
  </ol>
</section>
```

- [ ] **Step 9: Create `_design-system/components/stats-row.html`**

```html
<!-- Component: stats-row (2-4 stats) -->
<section class="stats">
  <div class="stat">
    <div class="stat-num">48<small>hr</small></div>
    <div class="stat-label">Pasteurization time</div>
  </div>
  <div class="stat">
    <div class="stat-num">12<small>%</small></div>
    <div class="stat-label">Minimum fat content</div>
  </div>
  <div class="stat">
    <div class="stat-num">0</div>
    <div class="stat-label">Artificial flavors</div>
  </div>
</section>
```

- [ ] **Step 10: Create `_design-system/components/gallery.html`**

```html
<!-- Component: gallery (2 or 4 images) -->
<section class="gallery-section">
  <p class="section-eyebrow">05 — GALLERY</p>
  <div class="gallery">
    <img src="/assets/images/placeholder.jpg" alt="">
    <img src="/assets/images/placeholder.jpg" alt="">
    <img src="/assets/images/placeholder.jpg" alt="">
    <img src="/assets/images/placeholder.jpg" alt="">
  </div>
</section>
```

- [ ] **Step 11: Create `_design-system/components/footer-card.html`**

```html
<!-- Component: footer-card -->
<aside class="footer-card">
  <div class="footer-card-row">
    <span class="footer-card-label">Series</span>
    <span class="footer-card-value">Gelato</span>
  </div>
  <div class="footer-card-row">
    <span class="footer-card-label">Published</span>
    <span class="footer-card-value">2026-04-12</span>
  </div>
  <div class="footer-card-row">
    <span class="footer-card-label">Volume</span>
    <span class="footer-card-value">04</span>
  </div>
</aside>
```

- [ ] **Step 12: Commit**

```bash
git add _design-system/
git commit -m "feat(design-system): add template and 10 component snippets"
```

---

### Task 17: Placeholder images

**Files:**
- Create: `assets/images/placeholder.svg`
- Create: `assets/images/placeholder-2.svg`
- Create: `assets/images/placeholder-3.svg`
- Create: `assets/images/placeholder-4.svg`

- [ ] **Step 1: Create a 1x1 SVG placeholder generator (one file, used as 4 different files via filename)**

```bash
mkdir -p assets/images
```

- [ ] **Step 2: Create `assets/images/placeholder.svg`**

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="600" fill="#ebe7d8"/>
  <g fill="#1f3a2e" font-family="Georgia, serif" text-anchor="middle">
    <text x="400" y="300" font-size="32" font-style="italic">placeholder</text>
    <text x="400" y="340" font-size="14" font-family="monospace" letter-spacing="2">800 × 600</text>
  </g>
</svg>
```

- [ ] **Step 3: Create `assets/images/placeholder-2.svg`**

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="600" fill="#d8d3c4"/>
  <g fill="#1f3a2e" font-family="Georgia, serif" text-anchor="middle">
    <text x="400" y="300" font-size="32" font-style="italic">placeholder 02</text>
    <text x="400" y="340" font-size="14" font-family="monospace" letter-spacing="2">800 × 600</text>
  </g>
</svg>
```

- [ ] **Step 4: Create `assets/images/placeholder-3.svg`**

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="600" fill="#3a5a4a"/>
  <g fill="#f5f3eb" font-family="Georgia, serif" text-anchor="middle">
    <text x="400" y="300" font-size="32" font-style="italic">placeholder 03</text>
    <text x="400" y="340" font-size="14" font-family="monospace" letter-spacing="2">800 × 600</text>
  </g>
</svg>
```

- [ ] **Step 5: Create `assets/images/placeholder-4.svg`**

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="600" fill="#1f3a2e"/>
  <g fill="#f5f3eb" font-family="Georgia, serif" text-anchor="middle">
    <text x="400" y="300" font-size="32" font-style="italic">placeholder 04</text>
    <text x="400" y="340" font-size="14" font-family="monospace" letter-spacing="2">800 × 600</text>
  </g>
</svg>
```

- [ ] **Step 6: Commit**

```bash
git add assets/images/
git commit -m "feat(assets): add 4 SVG placeholder images"
```

---

### Task 18: Example document #1 — Classic Vanilla (Gelato)

**Files:**
- Create: `docs/gelato/classic-vanilla.html`

- [ ] **Step 1: Create the document following SPEC.md and template.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Classic Vanilla — Product M</title>
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/reader.css">
</head>
<body>
  <!-- @meta
  {
    "title": "Classic Vanilla",
    "series": "gelato",
    "slug": "classic-vanilla",
    "date": "2026-04-12",
    "tags": ["signature", "vanilla"],
    "summary": "Single-origin Madagascar Bourbon vanilla, slow-churned for 48 hours.",
    "volume": "04"
  }
  -->

  <div class="reader reader--wide">
    <nav class="nav-bar">
      <a href="/" class="nav-brand">Product M</a>
      <ul class="nav-links">
        <li><a href="/">首页</a></li>
        <li><a href="/series/gelato.html">Gelato</a></li>
        <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
        <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
        <li><a href="/planning/">企划</a></li>
      </ul>
      <div class="nav-meta">VOL. 04 · 2026</div>
    </nav>

    <header class="hero">
      <div class="hero-eyebrow">SERIES · GELATO · NO. 01</div>
      <h1 class="hero-title">Classic<br><em>Vanilla</em></h1>
      <div class="hero-rule"></div>
      <p class="hero-sub">A study in restraint, in a single pod.</p>
      <div class="hero-meta">2026 · SPRING</div>
    </header>

    <section class="intro">
      <p class="intro-eyebrow">01 — INTRODUCTION</p>
      <p class="intro-lead">
        There is no quieter test of an ice cream maker than vanilla. No color to hide behind, no texture to lean on. Just dairy, sugar, and the pod.
      </p>
    </section>

    <section class="spec-section">
      <p class="section-eyebrow">02 — SPECIFICATIONS</p>
      <table class="spec-table">
        <tr><th>Base</th><td>Madagascar Bourbon</td></tr>
        <tr><th>Pods per litre</th><td>4</td></tr>
        <tr><th>Steep time</th><td>72 hr at 4°C</td></tr>
        <tr><th>Churn</th><td>Slow, -2°C, 25 min</td></tr>
        <tr><th>Fat content</th><td>12% min.</td></tr>
        <tr><th>Net weight</th><td>120g / cup</td></tr>
        <tr><th>Shelf life</th><td>18 months frozen</td></tr>
      </table>
    </section>

    <section class="split">
      <p class="section-eyebrow">03 — THE POD</p>
      <div class="split-grid">
        <figure class="split-image">
          <img src="/assets/images/placeholder.svg" alt="Madagascar vanilla pods laid on a stone surface">
        </figure>
        <div class="split-text">
          <h2>From Sava, by hand</h2>
          <p>
            We source only from the Sava region of northeastern Madagascar, where the
            Bourbon variety was first cultivated. Pods are hand-picked at peak
            ripeness, sun-cured for three months, and graded by weight before
            shipping. We reject roughly a third on arrival.
          </p>
        </div>
      </div>
    </section>

    <section class="steps">
      <p class="section-eyebrow">04 — METHOD</p>
      <ol class="step-list">
        <li class="step">
          <span class="step-num">01</span>
          <div>
            <h3>Split and scrape</h3>
            <p>Each pod is split lengthwise; the seeds are scraped and reserved. The empty pods go into cold cream.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">02</span>
          <div>
            <h3>Steep</h3>
            <p>Cream and pods steep together for 72 hours at 4°C. The seeds are added in the final 12 hours.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">03</span>
          <div>
            <h3>Strain and churn</h3>
            <p>The cream is strained through fine mesh. The base is churned slowly at -2°C for 25 minutes — half the speed of a standard batch.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">04</span>
          <div>
            <h3>Rest</h3>
            <p>The finished gelato rests in the hardening cabinet for at least 6 hours before service.</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="stats">
      <div class="stat">
        <div class="stat-num">72<small>hr</small></div>
        <div class="stat-label">Steep time</div>
      </div>
      <div class="stat">
        <div class="stat-num">4</div>
        <div class="stat-label">Pods per litre</div>
      </div>
      <div class="stat">
        <div class="stat-num">0</div>
        <div class="stat-label">Artificial anything</div>
      </div>
    </section>

    <blockquote class="quote-pull">
      <p>"The vanilla should taste like the place it came from — green, warm, faintly smoky."</p>
      <cite>— Head of production, 2022</cite>
    </blockquote>

    <section class="gallery-section">
      <p class="section-eyebrow">05 — GALLERY</p>
      <div class="gallery">
        <img src="/assets/images/placeholder-2.svg" alt="">
        <img src="/assets/images/placeholder-3.svg" alt="">
        <img src="/assets/images/placeholder-4.svg" alt="">
        <img src="/assets/images/placeholder.svg" alt="">
      </div>
    </section>

    <aside class="footer-card">
      <div class="footer-card-row">
        <span class="footer-card-label">Series</span>
        <span class="footer-card-value">Gelato</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Published</span>
        <span class="footer-card-value">2026-04-12</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Volume</span>
        <span class="footer-card-value">04</span>
      </div>
    </aside>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add docs/gelato/classic-vanilla.html
git commit -m "feat(docs): add example Gelato document (Classic Vanilla)"
```

---

### Task 19: Example document #2 — Mocha Shake (Gelato Shake)

**Files:**
- Create: `docs/gelato-shake/mocha-shake.html`

- [ ] **Step 1: Create the document — note this is a different series, different structure**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mocha Shake — Product M</title>
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/reader.css">
</head>
<body>
  <!-- @meta
  {
    "title": "Mocha Shake",
    "series": "gelato-shake",
    "slug": "mocha-shake",
    "date": "2026-05-03",
    "tags": ["coffee", "signature"],
    "summary": "Double-shot Yirgacheffe shaken with a vanilla bean base.",
    "volume": "04"
  }
  -->

  <div class="reader reader--wide">
    <nav class="nav-bar">
      <a href="/" class="nav-brand">Product M</a>
      <ul class="nav-links">
        <li><a href="/">首页</a></li>
        <li><a href="/series/gelato.html">Gelato</a></li>
        <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
        <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
        <li><a href="/planning/">企划</a></li>
      </ul>
      <div class="nav-meta">VOL. 04 · 2026</div>
    </nav>

    <header class="hero hero--dark">
      <div class="hero-eyebrow">SERIES · GELATO SHAKE · NO. 01</div>
      <h1 class="hero-title">Mocha<br><em>Shake</em></h1>
      <div class="hero-rule"></div>
      <p class="hero-sub">A shake that tastes like the espresso it was made from.</p>
      <div class="hero-meta">2026 · SPRING</div>
    </header>

    <section class="intro">
      <p class="intro-eyebrow">01 — INTRODUCTION</p>
      <p class="intro-lead">
        Most chocolate shakes are sweet. Most coffee shakes are bitter. This one is neither — it is a meeting point.
      </p>
    </section>

    <section class="stats">
      <div class="stat">
        <div class="stat-num">2<small>×</small></div>
        <div class="stat-label">Espresso shots</div>
      </div>
      <div class="stat">
        <div class="stat-num">180<small>ml</small></div>
        <div class="stat-label">Cold milk</div>
      </div>
      <div class="stat">
        <div class="stat-num">15<small>s</small></div>
        <div class="stat-label">Shake time</div>
      </div>
    </section>

    <section class="spec-section">
      <p class="section-eyebrow">02 — SPECIFICATIONS</p>
      <table class="spec-table">
        <tr><th>Espresso</th><td>Yirgacheffe, double shot, 36g</td></tr>
        <tr><th>Cocoa</th><td>70% single-origin, Venezuela</td></tr>
        <tr><th>Base</th><td>Madagascar vanilla gelato</td></tr>
        <tr><th>Milk</th><td>Whole, cold, 4°C</td></tr>
        <tr><th>Shake</th><td>15 sec, hand-shaken</td></tr>
        <tr><th>Glass</th><td>Pre-chilled, 12 oz</td></tr>
      </table>
    </section>

    <blockquote class="quote-pull">
      <p>"The shake should be pourable, not spoonable. If you can stand a straw in it, you've over-churned."</p>
      <cite>— Bar lead, 2024</cite>
    </blockquote>

    <section class="split">
      <p class="section-eyebrow">03 — THE POUR</p>
      <div class="split-grid">
        <figure class="split-image">
          <img src="/assets/images/placeholder-3.svg" alt="Mocha shake being poured into a chilled glass">
        </figure>
        <div class="split-text">
          <h2>Thick enough to lean</h2>
          <p>
            We shake by hand for fifteen seconds — long enough to emulsify the
            espresso oils into the cream, short enough to keep the body pourable.
            A proper mocha shake leans in the glass rather than running flat.
          </p>
        </div>
      </div>
    </section>

    <section class="gallery-section">
      <p class="section-eyebrow">04 — VARIATIONS</p>
      <div class="gallery">
        <img src="/assets/images/placeholder-4.svg" alt="">
        <img src="/assets/images/placeholder.svg" alt="">
      </div>
    </section>

    <aside class="footer-card">
      <div class="footer-card-row">
        <span class="footer-card-label">Series</span>
        <span class="footer-card-value">Gelato Shake</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Published</span>
        <span class="footer-card-value">2026-05-03</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Volume</span>
        <span class="footer-card-value">04</span>
      </div>
    </aside>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add docs/gelato-shake/mocha-shake.html
git commit -m "feat(docs): add example Gelato Shake document (Mocha Shake)"
```

---

### Task 20: Example document #3 — 2026 Summer Launch (planning)

**Files:**
- Create: `planning/2026-summer-launch.html`

- [ ] **Step 1: Create the planning document — distinct layout from product intros**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2026 Summer Launch — Product M</title>
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/reader.css">
</head>
<body>
  <!-- @meta
  {
    "title": "2026 Summer Launch",
    "series": null,
    "slug": "2026-summer-launch",
    "date": "2026-05-20",
    "tags": ["planning", "campaign", "summer-2026"],
    "summary": "Three new SKU launches across all series, June through August.",
    "volume": "04"
  }
  -->

  <div class="reader reader--wide">
    <nav class="nav-bar">
      <a href="/" class="nav-brand">Product M</a>
      <ul class="nav-links">
        <li><a href="/">首页</a></li>
        <li><a href="/series/gelato.html">Gelato</a></li>
        <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
        <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
        <li><a href="/planning/">企划</a></li>
      </ul>
      <div class="nav-meta">VOL. 04 · 2026</div>
    </nav>

    <header class="hero">
      <div class="hero-eyebrow">PLANNING · 2026 · Q2/Q3</div>
      <h1 class="hero-title">Summer<br><em>Launch</em></h1>
      <div class="hero-rule"></div>
      <p class="hero-sub">Three new SKUs, ten weeks, three series.</p>
      <div class="hero-meta">Issued 2026-05-20</div>
    </header>

    <section class="intro">
      <p class="intro-eyebrow">01 — BRIEF</p>
      <p class="intro-lead">
        The 2026 summer window is a ten-week stretch from mid-June through August. We will introduce one new SKU per series on staggered release dates, with marketing concentrated in the first two weeks of each launch.
      </p>
    </section>

    <section class="spec-section">
      <p class="section-eyebrow">02 — TIMELINE</p>
      <table class="spec-table">
        <tr><th>Window</th><td>2026-06-15 → 2026-08-31</td></tr>
        <tr><th>Launch 1</th><td>Gelato · Salted Honey — 2026-06-15</td></tr>
        <tr><th>Launch 2</th><td>Gelato Mix · Stone Fruit — 2026-07-13</td></tr>
        <tr><th>Launch 3</th><td>Gelato Shake · Espresso Tonic — 2026-08-10</td></tr>
        <tr><th>Marketing burst</th><td>First 14 days of each launch</td></tr>
        <tr><th>Internal review</th><td>2026-09-15</td></tr>
      </table>
    </section>

    <section class="steps">
      <p class="section-eyebrow">03 — DELIVERABLES</p>
      <ol class="step-list">
        <li class="step">
          <span class="step-num">01</span>
          <div>
            <h3>Product sheets (3)</h3>
            <p>One new product doc per SKU, following the standard component set. Each must include `.spec-table`, `.split`, and `.footer-card`.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">02</span>
          <div>
            <h3>Photography (12 shots)</h3>
            <p>Four per SKU: hero, ingredient, in-context, detail. All consistent with the existing brand palette.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">03</span>
          <div>
            <h3>In-store cards (3)</h3>
            <p>Counter-card format. Reuse the hero typography; reduce to a single rule and one key stat.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">04</span>
          <div>
            <h3>Press kit</h3>
            <p>Single landing page linking the three new product docs. Built as a fourth planning doc on launch day.</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="split">
      <p class="section-eyebrow">04 — APPROVAL FLOW</p>
      <div class="split-grid">
        <figure class="split-image">
          <img src="/assets/images/placeholder-2.svg" alt="A printed planning document with handwritten annotations">
        </figure>
        <div class="split-text">
          <h2>Three signatures, then publish</h2>
          <p>
            Each product doc moves through three gates: copy review, design
            review, and the founder's final read. Once all three are signed,
            the doc is committed and the index rebuilt. No publishing without
            all three.
          </p>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="stat">
        <div class="stat-num">3</div>
        <div class="stat-label">New SKUs</div>
      </div>
      <div class="stat">
        <div class="stat-num">10<small>wk</small></div>
        <div class="stat-label">Window length</div>
      </div>
      <div class="stat">
        <div class="stat-num">14<small>d</small></div>
        <div class="stat-label">Marketing burst</div>
      </div>
    </section>

    <aside class="footer-card">
      <div class="footer-card-row">
        <span class="footer-card-label">Series</span>
        <span class="footer-card-value">All series</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Published</span>
        <span class="footer-card-value">2026-05-20</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Volume</span>
        <span class="footer-card-value">04</span>
      </div>
    </aside>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add planning/2026-summer-launch.html
git commit -m "feat(planning): add example planning doc (2026 Summer Launch)"
```

---

### Task 21: Series landing pages

**Files:**
- Create: `series/gelato.html`
- Create: `series/gelato-mix.html`
- Create: `series/gelato-shake.html`
- Create: `planning/index.html`

- [ ] **Step 1: Create `series/gelato.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gelato — Product M</title>
  <link rel="stylesheet" href="/styles/site.css">
</head>
<body>
  <nav class="site-nav">
    <a href="/" class="site-nav-brand">Product M</a>
    <ul class="site-nav-links">
      <li><a href="/">首页</a></li>
      <li><a href="/series/gelato.html">Gelato</a></li>
      <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
      <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
      <li><a href="/planning/">企划</a></li>
    </ul>
    <div class="site-nav-meta">VOL. 04 · 2026</div>
  </nav>

  <div class="site">
    <header class="series-hero">
      <p class="series-hero-eyebrow">SERIES · 01</p>
      <h1 class="series-hero-title">Gelato</h1>
      <p class="series-hero-desc">The original — slow-churned, low-air, intense.</p>
      <p class="series-hero-count" id="gelato-count">— documents</p>
    </header>

    <div class="doc-grid" id="gelato-docs">
      <p class="empty-state">Loading…</p>
    </div>
  </div>

  <footer class="site-footer">
    <span>Product M</span>
    <span>© 2026 — All rights reserved</span>
  </footer>

  <script>
    fetch('/index.json')
      .then((r) => r.json())
      .then((data) => {
        const docs = data.documents.filter((d) => d.series === 'gelato');
        document.getElementById('gelato-count').textContent = `${docs.length} document${docs.length === 1 ? '' : 's'}`;
        const grid = document.getElementById('gelato-docs');
        if (docs.length === 0) {
          grid.innerHTML = '<p class="empty-state">No documents yet for this series.</p>';
          return;
        }
        grid.innerHTML = docs
          .map(
            (d) => `
            <a class="doc-card" href="/${d.path}">
              <span class="doc-card-date">${d.date}</span>
              <h2 class="doc-card-title">${d.title}</h2>
              <p class="doc-card-summary">${d.summary || ''}</p>
            </a>
          `
          )
          .join('');
      });
  </script>
</body>
</html>
```

- [ ] **Step 2: Create `series/gelato-mix.html`** — same structure, change slug and eyebrow

```bash
cp series/gelato.html series/gelato-mix.html
```

Then edit the new file with these specific replacements:

- `<title>Gelato — Product M</title>` → `<title>Gelato Mix — Product M</title>`
- `<p class="series-hero-eyebrow">SERIES · 01</p>` → `<p class="series-hero-eyebrow">SERIES · 02</p>`
- `<h1 class="series-hero-title">Gelato</h1>` → `<h1 class="series-hero-title">Gelato Mix</h1>`
- `<p class="series-hero-desc">The original — slow-churned, low-air, intense.</p>` → `<p class="series-hero-desc">Layered compositions, balanced sweet and bright.</p>`
- In the `<script>`: `d.series === 'gelato'` → `d.series === 'gelato-mix'`
- In the `<script>`: `id="gelato-count"` → `id="gelato-mix-count"`
- In the `<script>`: `id="gelato-docs"` → `id="gelato-mix-docs"`

- [ ] **Step 3: Create `series/gelato-shake.html`** — same structure, change slug and eyebrow

```bash
cp series/gelato.html series/gelato-shake.html
```

Then edit the new file with these specific replacements:

- `<title>Gelato — Product M</title>` → `<title>Gelato Shake — Product M</title>`
- `<p class="series-hero-eyebrow">SERIES · 01</p>` → `<p class="series-hero-eyebrow">SERIES · 03</p>`
- `<h1 class="series-hero-title">Gelato</h1>` → `<h1 class="series-hero-title">Gelato Shake</h1>`
- `<p class="series-hero-desc">The original — slow-churned, low-air, intense.</p>` → `<p class="series-hero-desc">Spoon-thick shakes, made to order.</p>`
- In the `<script>`: `d.series === 'gelato'` → `d.series === 'gelato-shake'`
- In the `<script>`: `id="gelato-count"` → `id="gelato-shake-count"`
- In the `<script>`: `id="gelato-docs"` → `id="gelato-shake-docs"`

- [ ] **Step 4: Create `planning/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>企划 — Product M</title>
  <link rel="stylesheet" href="/styles/site.css">
</head>
<body>
  <nav class="site-nav">
    <a href="/" class="site-nav-brand">Product M</a>
    <ul class="site-nav-links">
      <li><a href="/">首页</a></li>
      <li><a href="/series/gelato.html">Gelato</a></li>
      <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
      <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
      <li><a href="/planning/">企划</a></li>
    </ul>
    <div class="site-nav-meta">VOL. 04 · 2026</div>
  </nav>

  <div class="site">
    <header class="series-hero">
      <p class="series-hero-eyebrow">PLANNING</p>
      <h1 class="series-hero-title">企划</h1>
      <p class="series-hero-desc">Internal plans, campaigns, and product launches.</p>
      <p class="series-hero-count" id="planning-count">— documents</p>
    </header>

    <div class="doc-grid" id="planning-docs">
      <p class="empty-state">Loading…</p>
    </div>
  </div>

  <footer class="site-footer">
    <span>Product M</span>
    <span>© 2026 — All rights reserved</span>
  </footer>

  <script>
    fetch('/index.json')
      .then((r) => r.json())
      .then((data) => {
        const docs = data.documents.filter((d) => d.series === null);
        document.getElementById('planning-count').textContent = `${docs.length} document${docs.length === 1 ? '' : 's'}`;
        const grid = document.getElementById('planning-docs');
        if (docs.length === 0) {
          grid.innerHTML = '<p class="empty-state">No planning documents yet.</p>';
          return;
        }
        grid.innerHTML = docs
          .map(
            (d) => `
            <a class="doc-card" href="/${d.path}">
              <span class="doc-card-date">${d.date}</span>
              <h2 class="doc-card-title">${d.title}</h2>
              <p class="doc-card-summary">${d.summary || ''}</p>
            </a>
          `
          )
          .join('');
      });
  </script>
</body>
</html>
```

- [ ] **Step 5: Commit**

```bash
git add series/ planning/
git commit -m "feat(pages): add series landing pages and planning index"
```

---

### Task 22: Homepage (index.html)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product M</title>
  <link rel="stylesheet" href="/styles/site.css">
</head>
<body>
  <nav class="site-nav">
    <a href="/" class="site-nav-brand">Product M</a>
    <ul class="site-nav-links">
      <li><a href="/">首页</a></li>
      <li><a href="/series/gelato.html">Gelato</a></li>
      <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
      <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
      <li><a href="/planning/">企划</a></li>
    </ul>
    <div class="site-nav-meta">VOL. 04 · 2026</div>
  </nav>

  <header class="home-hero">
    <p class="home-hero-eyebrow">VOL. 04 · SPRING 2026</p>
    <h1 class="home-hero-title">The Quiet<br><em>Authority</em></h1>
    <div class="home-hero-rule"></div>
    <p class="home-hero-tag">A study in restraint, in three flavors.</p>
  </header>

  <section class="story">
    <div class="story-grid">
      <p class="story-eyebrow">— THE BRAND</p>
      <div class="story-body">
        <p>
          Product M makes ice cream the way it used to be made — slowly, in small batches, with ingredients you can pronounce. Three series: the original Gelato, the layered Mix, and the spoon-thick Shake.
        </p>
        <p>
          This site is the archive. Every flavor, every method, every campaign — documented with the same care that goes into making the product.
        </p>
      </div>
    </div>
  </section>

  <section class="series-section">
    <p class="series-section-eyebrow">— THE SERIES</p>
    <div class="series-grid" id="series-grid">
      <p class="empty-state">Loading series…</p>
    </div>
  </section>

  <section class="latest-section">
    <p class="latest-eyebrow">— LATEST</p>
    <div class="latest-list" id="latest-list">
      <p class="empty-state">Loading…</p>
    </div>
  </section>

  <footer class="site-footer">
    <span>Product M</span>
    <span>© 2026 — All rights reserved</span>
  </footer>

  <script>
    fetch('/index.json')
      .then((r) => r.json())
      .then((data) => {
        // Series grid
        const seriesGrid = document.getElementById('series-grid');
        const seriesHtml = data.series
          .map(
            (s, i) => `
            <a class="series-card" href="/series/${s.slug}.html">
              <span class="series-card-num">SERIES · 0${i + 1}</span>
              <h2 class="series-card-title">${s.name}</h2>
              <p class="series-card-desc">${s.description}</p>
              <span class="series-card-link">${s.count} document${s.count === 1 ? '' : 's'} →</span>
            </a>
          `
          )
          .join('');
        seriesGrid.innerHTML = seriesHtml;

        // Latest list (top 4)
        const latest = data.documents.slice(0, 4);
        const latestList = document.getElementById('latest-list');
        if (latest.length === 0) {
          latestList.innerHTML = '<p class="empty-state">No documents yet.</p>';
          return;
        }
        latestList.innerHTML = latest
          .map((d) => {
            const seriesName = d.series
              ? d.series.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : 'Planning';
            return `
            <a class="latest-item" href="/${d.path}">
              <span class="latest-item-date">${d.date}</span>
              <span class="latest-item-title">${d.title}</span>
              <span class="latest-item-series">${seriesName}</span>
              <span class="latest-item-arrow">→</span>
            </a>
          `;
          })
          .join('');
      });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(pages): add homepage with hero, story, series, latest sections"
```

---

### Task 23: Build the index and verify everything renders

**Files:**
- Modify: `index.json` (generated by script)

- [ ] **Step 1: Run the build script**

```bash
npm run build-index
```

Expected output:

```
Wrote /Users/ericmr/Documents/GitHub/Product_M/index.json — 4 documents, 3 series.
```

(Note: 4 documents = 2 product intros + 1 planning + whatever was already there. The 3 example docs from Tasks 18–20 produce 3 entries; the count is whatever exists at runtime.)

Verify the count: 3 documents are expected (Classic Vanilla, Mocha Shake, 2026 Summer Launch).

- [ ] **Step 2: Inspect the generated index**

```bash
cat index.json | head -40
```

Expected: a JSON object with `generated`, `documents` (3 entries), and `series` (3 entries each with `count: 1` for gelato and gelato-shake, `count: 0` for gelato-mix).

- [ ] **Step 3: Start a local server and verify the homepage loads**

```bash
python3 -m http.server 8000 &
SERVER_PID=$!
sleep 1
curl -s -o /dev/null -w "index.html: %{http_code}\n" http://localhost:8000/
curl -s -o /dev/null -w "index.json: %{http_code}\n" http://localhost:8000/index.json
curl -s -o /dev/null -w "gelato.html: %{http_code}\n" http://localhost:8000/series/gelato.html
curl -s -o /dev/null -w "classic-vanilla.html: %{http_code}\n" http://localhost:8000/docs/gelato/classic-vanilla.html
kill $SERVER_PID
```

Expected output: all four lines show `200`.

- [ ] **Step 4: Commit the generated index.json**

```bash
git add index.json
git commit -m "chore: generate index.json from example docs"
```

---

### Task 24: Final verification (browser walkthrough)

- [ ] **Step 1: Start the local server**

```bash
python3 -m http.server 8000 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
```

Keep this server running while you verify in the browser.

- [ ] **Step 2: Open each page in a browser and verify visually**

Visit each URL and check:

1. `http://localhost:8000/` — homepage shows hero, story, 3 series cards, latest 3 docs, footer
2. `http://localhost:8000/series/gelato.html` — shows gelato hero, lists 1 doc
3. `http://localhost:8000/series/gelato-mix.html` — shows gelato mix hero, empty state
4. `http://localhost:8000/series/gelato-shake.html` — shows gelato shake hero, lists 1 doc
5. `http://localhost:8000/planning/` — shows planning hero, lists 1 doc
6. `http://localhost:8000/docs/gelato/classic-vanilla.html` — full document with all components
7. `http://localhost:8000/docs/gelato-shake/mocha-shake.html` — full document with dark hero
8. `http://localhost:8000/planning/2026-summer-launch.html` — full planning document

For each, check:
- [ ] Forest green color is consistent
- [ ] No emoji anywhere
- [ ] All headings are left-aligned
- [ ] No centered text
- [ ] Body type reads as Inter / sans-serif
- [ ] Headings read as serif
- [ ] Numbers and dates read as monospace
- [ ] Mobile width (resize browser to 360px): no horizontal scroll, nav wraps cleanly

- [ ] **Step 3: Stop the server**

```bash
kill $SERVER_PID
```

---

## Self-Review

**Spec coverage** (sections from `2026-06-09-product-m-brand-site-design.md`):
- §1 Goal/Scope — covered by Tasks 1, 22, 23
- §2 Tech decisions — pure static, no build tools → confirmed by Task 1 (no deps) and absence of build steps
- §3 Project structure — every file/dir from the spec has a corresponding task
- §4 Visual system — Tokens in Task 2, fonts referenced (loaded as system fallback until Task 26+)
- §5 Component library (10 components) — Tasks 4–12 (reader styles) cover all 10; Task 16 ships HTML snippets
- §6 SPEC.md — Task 15
- §7 Page planning — Tasks 21 (series), 22 (home), 18–20 (doc examples), 21 (planning index)
- §8 Contracts — index.json shape defined in Task 14; matched in Task 22/21 JS
- §9 Deliverables — all present in the task list
- §10 Acceptance — Task 24 walks through each item
- §11 YAGNI — no i18n, search, RSS, PDF, A/B, analytics in any task
- §12 Risks — addressed by SPEC.md's strict rules (Task 15), font subsetting (out of scope per token-only design, uses system fallbacks)

**Placeholder scan:** No "TBD", "TODO", "fill in later" in any code block. All variables, class names, slugs, dates are concrete. The only "fill in" was Task 21 Step 2/3 which has explicit `cp` and replacement instructions — that is real content, not a placeholder.

**Type/name consistency:**
- `series` slug values: `gelato`, `gelato-mix`, `gelato-shake` — used identically in build-index.js (Task 14), all series pages (Task 21), planning index filter, homepage filter
- Element IDs: `gelato-count` / `gelato-docs` (Task 21) used identically in the matching page's JS; same pattern for mix and shake
- Frontmatter field names: `title`, `path`, `series`, `slug`, `date`, `tags`, `summary`, `volume` — consistent in build-index.js (Task 14), SPEC.md (Task 15), and all example docs (Tasks 18–20)
- CSS class names: `.hero`, `.nav-bar`, `.intro`, `.spec-table`, `.split`, `.quote-pull`, `.step-list`, `.stats`, `.gallery`, `.footer-card` — identical between reader.css (Tasks 4–12) and example docs (Tasks 18–20)
- Color tokens: `--ink`, `--paper`, `--ink-soft`, `--ink-muted`, `--rule`, `--highlight`, `--on-ink`, `--paper-deep` — used identically in tokens.css (Task 2), site.css (Task 13), reader.css (Tasks 4–12)

**One spec item deferred:** Self-hosted Noto fonts. The spec §2.3 calls for self-hosted woff2, and the README mentions "self-hosted". For this plan, I use system font fallbacks (`-apple-system`, `SF Mono`, `Georgia`) which ship with every OS — this means the site renders correctly with zero font setup but the typography is not pixel-identical across machines. Adding font files (downloading woff2 subsets) is reasonable as a follow-up task but adds non-trivial decisions (which weights, subset scope, where to host). This is acceptable: the design system works today, and adding the fonts later is a single-task addition. **Mention this to the user before starting execution.**

---

Plan complete. Saved to `docs/superpowers/plans/2026-06-09-product-m-brand-site.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with full context per task
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

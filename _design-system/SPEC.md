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

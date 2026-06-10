---
name: product-m-doc-generator
description: Generate, validate, and import HTML documents into the Product M brand site. Use when the user asks to add a product intro, spec sheet, planning doc, or campaign material to the Product M site. Triggers: "create a product doc", "add to product-m site", "generate 海盐荔枝芒芒 doc", "import this HTML into Product M", or any task involving writing HTML that follows the Product M design system.
---

# Product M 文档生成

You are generating HTML documents for the **Product M** brand site — a static editorial site for an ice cream maker with three series (Gelato / Gelato Mix / Gelato Shake). All visual rules live in the design spec; this skill teaches you the **mechanics** of using the MCP toolchain.

## When to use this skill

Use when:
- The user asks to add a new product intro, spec sheet, planning doc, or campaign material to the Product M site
- You're given content (markdown, briefing, PPT export) and need to convert it to Product M-style HTML
- The user asks to import an existing HTML file into the site
- The user wants to validate whether an HTML draft meets the design rules

Do NOT use when:
- The task is editing an existing document's content (use Edit/Read directly)
- The task is changing the design system itself (use the design system files)
- The project is not the Product M site (the tools will be absent or wrong)

## Content Contract — the MD frontmatter every source file needs

Before you generate HTML, produce (or ask the user for) a **markdown file** following this schema. This is the common format that both humans and the `md-to-html.js` converter understand.

### Required YAML frontmatter

```yaml
---
title: "Classic Vanilla"
series: "gelato"           # gelato | gelato-mix | gelato-shake | null (planning)
slug: "classic-vanilla"    # lowercase + hyphens; pinyin for Chinese titles
date: "2026-04-12"
tags: [signature, vanilla]
summary: "Single-origin Madagascar vanilla, slow-churned."
volume: "04"
hero:
  eyebrow: "SERIES · GELATO · NO. 01"
  title: "Classic<br><em>Vanilla</em>"
  sub: "A study in restraint, in a single pod."
  meta: "2026 · SPRING"
---
```

### Required headings — each H2 maps to one body component

After the frontmatter, the markdown body MUST use **level-2 headings** (`##`) only. Each `##` heading is paired with a component type by a rule keyword in parentheses:

```
## 01 — INTRODUCTION (intro)
Lead paragraph text here...

## 02 — SPECIFICATIONS (spec-table)
| Field | Value |
|-------|-------|
| Base  | Madagascar Bourbon |
| Fat   | 12% min.            |

## 03 — THE POD (split-image)
![Alt text](/assets/images/hai-yan-li-zhi/img-01.jpg)
### A heading that introduces the image
Body text describing what's in the image and why it matters.

## 04 — KEY QUOTE (quote-pull)
"A memorable line that captures the spirit of the document."
— Attribution

## 05 — METHOD (steps)
1. **Split and scrape** — Each pod is split lengthwise...
2. **Steep** — Cream and pods steep together for 72 hours...
3. **Churn** — Slow-churned at -2°C...

## 06 — KEY METRICS (stats)
| number | unit | label |
|--------|------|-------|
| 72     | hr   | Steep time |
| 4      |      | Pods per litre |
| 0      |      | Artificial anything |

## 07 — GALLERY (gallery)
![](/assets/images/hai-yan-li-zhi/img-03.jpg)
![](/assets/images/hai-yan-li-zhi/img-04.jpg)
```

### Component keyword reference

| Keyword in `( )` | Component | Expected MD content after the heading |
| --- | --- | --- |
| `(intro)` | `.intro` | Plain paragraph text |
| `(spec-table)` | `.spec-section` > `.spec-table` | GFM table (2 columns: key / value) |
| `(split-image)` | `.split` > `.split-grid` | An image line `![alt](src)` followed by an H3 + paragraph |
| `(quote-pull)` | `.quote-pull` | A single blockquote `"> ..."` with optional `"— ..."` citation |
| `(steps)` | `.steps` > `.step-list` | A numbered list (1. 2. 3. …) — each item = one `.step` |
| `(stats)` | `.stats` | A GFM table with columns `number / unit / label` |
| `(gallery)` | `.gallery-section` > `.gallery` | 2 or 4 image lines `![](src)` — no text |

The keyword **must** appear in parentheses in the H2. No keyword → `md-to-html.js` skips the section. Other H2 formats (no parens, wrong keyword) are silently ignored.

### Source file placement

Save the markdown file before converting:

```
sources/<series>/<slug>.md   — product intros
sources/planning/<slug>.md   — planning docs
```

Both the MD source and the generated HTML stay in git. The MD is the **content source of truth**; the HTML is the **render artifact**.

## MD → HTML conversion workflow

The recommended path: **LLM writes MD frontmatter → `md-to-html.js` converts to HTML → LLM validates + imports**.  This gives you consistent HTML output without requiring the LLM to memorize 10 component templates.

### Step A: LLM writes the MD file

1. Gather the product details from the user (brief, PPT, specs, photos).
2. Write the YAML frontmatter (fill in all required fields).
3. Write the body as H2 sections, each tagged with a component keyword.
4. Save to `sources/<series>/<slug>.md` (or `sources/planning/<slug>.md`).

### Step B: Convert to HTML

```bash
node scripts/md-to-html.js --input sources/gelato/classic-vanilla.md --output /tmp/classic-vanilla.html
```

`md-to-html.js` reads the MD, parses the YAML frontmatter and tagged H2 sections, and produces a complete HTML document by wrapping each section in the correct component template (from `_design-system/components/`). The output is a complete `<!DOCTYPE html>` page ready for validation.

### Step C: Validate + import

Same as the original 5-step workflow: call `validate_doc(html=...)` → fix errors (max 5 retries) → `import_doc(html=..., path=...)` → show diff to user.

### Fallback: LLM writes full HTML

If `md-to-html.js` is unavailable or the content doesn't fit the component-keyword model (e.g. you need a dark hero, a 5-stat row, or a nested layout), fall back to the **manual 5-step workflow** below. Call `get_template(series=...)`, then fill the HTML skeleton by hand using the component snippets from `_design-system/components/`.

## Asset Pipeline — how images get into the site

### Naming rule

All document images live under `assets/images/<slug>/` and follow this naming convention:

```
assets/images/<slug>/<slug>-01.jpg
assets/images/<slug>/<slug>-02.jpg
assets/images/<slug>/<slug>-03.jpg
assets/images/<slug>/<slug>-04.jpg
```

Example for slug `hai-yan-li-zhi-mang-mang`:
```
assets/images/hai-yan-li-zhi-mang-mang/hai-yan-li-zhi-mang-mang-01.jpg
assets/images/hai-yan-li-zhi-mang-mang/hai-yan-li-zhi-mang-mang-02.jpg
...
```

Use `-01`, `-02` etc. (zero-padded, 2 digits). The `gallery` component expects 2 or 4 images from this directory.

### Who does what

| Step | Who | Tool |
| --- | --- | --- |
| Take/select product photos | Human | (camera / design tool) |
| Rename images to `<slug>-NN.jpg` | Human or LLM | `mv` / Finder |
| Copy images into the project | Human or LLM | `scripts/upload-images.js` (see below) |
| Reference images in MD/HTML | LLM | `[](/assets/images/<slug>/<slug>-01.jpg)` |
| Validate file exists | LLM | `validate_doc` (image path check) |

### Batch upload script

```bash
# Upload a single image
node scripts/upload-images.js --source ~/Desktop/shot1.jpg --target assets/images/hai-yan-li-zhi-mang-mang/hai-yan-li-zhi-mang-mang-01.jpg

# Batch rename + upload a directory
node scripts/upload-images.js --batch ~/Desktop/product-shots/ --target assets/images/hai-yan-li-zhi-mang-mang/ --slug hai-yan-li-zhi-mang-mang
```

The batch mode renames all `.jpg`/`.png` files in the source directory to `<slug>-01.jpg`, `<slug>-02.jpg`, etc. (sorted by filename) and copies them to the target directory. It skips non-image files and returns:

```json
{
  "uploaded": [
    {"source": "/Users/.../shot1.jpg", "target": "assets/images/hai-yan-li-zhi-mang-mang/hai-yan-li-zhi-mang-mang-01.jpg"},
    ...
  ],
  "skipped": ["image.docx"],
  "errors": []
}
```

### After uploading

Re-run `validate_doc` — the `no-external-resources` rule checks image paths start with `/assets/`, and the verification step checks the files actually exist on disk. If images are missing, the validate step will warn.

## The 4 MCP tools + HTTP API

Product M exposes both MCP JSON-RPC tools and a public HTTP API. Remote agents (like Ella) use the HTTP API; local agents use MCP.

### HTTP API (remote agents)

```
Base URL: http://112.124.18.246:8085
```

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/import/health` | GET | None | Health check |
| `/api/import` | POST | `api_key` field | Import a document (MD + HTML + assets) |

**POST /api/import** — the main entry point for Ella to publish documents.

Request body:
```json
{
  "api_key": "<from env PRODUCT_M_IMPORT_KEY>",
  "md_source": "<full MD with YAML frontmatter>",
  "html": "<full rendered HTML>",
  "slug": "mini-bing-gao",
  "series": "gelato | gelato-mix | gelato-shake | null",
  "target_path": "docs/gelato-shake/mini-bing-gao.html",
  "source_path": "sources/gelato-shake/mini-bing-gao.md",
  "assets": [
    {"local_path": "assets/images/<slug>/<slug>-01.jpg", "base64_content": "..."}
  ]
}
```

Response (200 OK):
```json
{
  "ok": true,
  "written_to": "docs/gelato-shake/mini-bing-gao.html",
  "source_written_to": "sources/gelato-shake/mini-bing-gao.md",
  "validation": {"passed": true, "errors": [], "warnings": []},
  "index_rebuilt": true,
  "git_diff_summary": " docs/gelato-shake/mini-bing-gao.html | 200 +++..."
}
```

Error codes: 401 (bad api_key), 400 (bad path), 413 (size limit), 422 (emoji / validation failed).

What the endpoint does: auth → writes MD → writes HTML → decodes base64 assets → runs `validate.js` → runs `build-index.js` → runs `git add . && git diff --cached --stat` → returns result. Does NOT auto-commit.

### Remote workflow (Ella agent)

```
1. Write MD source with YAML frontmatter + tagged H2 sections
2. Run: node scripts/md-to-html.js --input <source.md> --output <output.html>
3. POST /api/import with { md_source, html, slug, series, target_path, source_path, assets, api_key }
4. Check response: ok:true → done; ok:false → fix errors in validation.errors, retry
```

If `md-to-html.js` is not available on Ella's machine, Ella can download it from: `http://112.124.18.246:8085/scripts/md-to-html.js`

### MCP tools (local agents)

| Tool | What it does |
| --- | --- |
| `list_components` | List 10 design components with class names + descriptions |
| `get_template` | Return HTML skeleton + frontmatter template (optional `series` arg) |
| `validate_doc` | Run 7 SPEC rules against an HTML string |
| `import_doc` | Validate + write + rebuild index + return git diff (does NOT auto-commit) |

## 5-step workflow (manual HTML mode — use when md-to-html.js is unavailable)

### Step 1: Read the design spec

Before generating anything, read the rules:

```
_design-system/SPEC.md
```

Pay attention to:
- §2 the 8 hard rules (no emoji, no centered headings, no hardcoded tokens, etc.)
- §3 the 5 must-haves (nav-bar → hero → 3+ body components → footer-card)
- §4 the 10 component class names

If the user is impatient, you can defer the deep read — `validate_doc` will catch violations.

### Step 2: Get the skeleton

Call `get_template(series=<the right value>)`:
- `"gelato"` for Gelato series
- `"gelato-mix"` for Gelato Mix series
- `"gelato-shake"` for Gelato Shake series
- `"null"` (the string) for planning docs

You'll get back `{ html, frontmatter }`. The `html` is the full skeleton with placeholders.

### Step 3: Fill the content

Replace placeholders in the skeleton with the user's content. Layout the body using 3+ of these 7 body components (mix them — don't repeat the same one):

- `.intro` — opening lead paragraph
- `.spec-section` + `.spec-table` — parameters, dates, definitions
- `.split` + `.split-grid` — image + text side-by-side
- `.quote-pull` — key quotes you want to lift out
- `.steps` + `.step-list` — sequential process / method
- `.stats` — 2-4 key numbers
- `.gallery-section` + `.gallery` — image grid (2 or 4 images)

Every section eyebrow uses `.section-eyebrow` and reads like `01 — POSITIONING` (uppercase mono, em-dash).

**Hard rules** (enforced by validate_doc, but better to follow from the start):
- ❌ No emoji — replace with monospace numbers (01, 02, 03)
- ❌ No centered headings
- ❌ No hardcoded colors or px font-sizes (use `var(--*)` if you must inline)
- ❌ No external CSS/JS
- ❌ No Tailwind / Bootstrap / any framework class names

**Path convention** (you'll need this for the next step):
- Product intro: `docs/<series>/<slug>.html`
- Planning / campaign: `planning/<slug>.html`
- `<slug>` = lowercase English + hyphens, pinyin for Chinese titles (e.g. `hai-yan-li-zhi-mang-mang`)

### Step 4: Validate, iterate

Call `validate_doc(html=<your full HTML>)`. The response is:

```json
{ "passed": true|false, "errors": [...], "warnings": [...] }
```

- If `passed: true` → proceed to step 5
- If `passed: false` → fix the errors one at a time, re-validate. **Maximum 5 retries.** If still failing after 5, stop and surface the remaining errors to the user.

Common errors and fixes:
- `no-emoji` → find the emoji in the line, replace with `01` / `02` / etc. or remove
- `required-components` → missing `nav-bar` / `hero` / `footer-card` / 3 body components
- `no-external-resources` → image path doesn't start with `/assets/`
- `no-hardcoded-tokens` → inline `style="color: #xxx"` or `font-size: NNpx`

### Step 5: Import (no auto-commit)

Call `import_doc(html=<your HTML>, path=<target relative path>)`. The response is:

```json
{
  "ok": true,
  "written_to": "docs/gelato-shake/foo.html",
  "validation": { "passed": true, "errors": [], "warnings": [] },
  "index_rebuilt": true,
  "git_diff_summary": " docs/gelato-shake/foo.html | 142 +++++... index.json | 12 +-..."
}
```

**Critical: do NOT auto-commit.** Show the user the `git_diff_summary` and let them decide whether to commit. The import only writes the file and rebuilds `index.json`.

If `ok: false`, the file was NOT written — show the user the `validation.errors`.

## CLI fallback (no MCP)

If the MCP server isn't running or the tools aren't available, use the CLI directly. Same scripts, same validation logic.

```bash
# Validate a draft
npm run validate -- --file <path>
cat draft.html | npm run validate -- --stdin

# Convert MD to HTML
node scripts/md-to-html.js --input <source.md> --output <output.html>

# Upload images
node scripts/upload-images.js --source <local-file> --target <repo-relative-path>
node scripts/upload-images.js --batch <local-dir> --target <repo-relative-dir> --slug <slug>

# Import a draft
npm run import -- <source-html> <target-relative-path>
# Example:
node scripts/import.js /tmp/draft.html docs/gelato-shake/foo.html

# Start the MCP server
npm run mcp
# → listens on http://127.0.0.1:7331
```

## Output to user

When you finish, report:
1. **File written** (or "not written — validation failed")
2. **Components used** (a short list of which body components appeared)
3. **The `git_diff_summary`** (so they see what changed)
4. **A single sentence** asking them to review and commit

If you took the MD → HTML path, also report the source MD path.

Do NOT:
- Commit anything yourself
- Modify the design system
- Edit other documents in the project

## Quick reference

| Path | Purpose |
| --- | --- |
| `_design-system/SPEC.md` | Design rules (read first) |
| `_design-system/template.html` | Skeleton to copy from |
| `_design-system/components/*.html` | 10 component snippets |
| `_design-system/PROMPTS.md` | Same workflow, longer form |
| `mcp/README.md` | How to wire MCP into Claude |
| `scripts/validate.js` | 7-rule validator |
| `scripts/import.js` | Validate + write + rebuild index |
| `scripts/md-to-html.js` | MD (with tagged H2 sections) → HTML |
| `scripts/upload-images.js` | Copy + rename images into `assets/images/` |
| `scripts/mcp-server.js` | JSON-RPC server (4 tools) |
| `package.json` | `validate` / `import` / `mcp` / `build-index` scripts |

## Example: turn a brief into a doc (MD → HTML path)

User says: "Make a product doc for 海盐荔枝芒芒 based on the launch brief."

1. Collect info from the user (price, specs, photos, copy).
2. Write the MD source file:
   - YAML frontmatter with title/series/slug/date/hero
   - H2 sections tagged with component keywords
   - Image references use the `<slug>-NN.jpg` naming convention
   - Save to `sources/gelato-shake/hai-yan-li-zhi-mang-mang.md`
3. (If images are on the user's desktop) Run `upload-images.js --batch ~/Desktop/shots/ --target assets/images/hai-yan-li-zhi-mang-mang/ --slug hai-yan-li-zhi-mang-mang`
4. `node scripts/md-to-html.js --input <md> --output /tmp/draft.html`
5. `validate_doc(html=...)` → if errors, fix (max 5 retries)
6. `import_doc(html=..., path="docs/gelato-shake/hai-yan-li-zhi-mang-mang.html")` → returns git diff
7. Report to user: "MD saved to `sources/...`, HTML imported. Diff: <summary>. Images uploaded: 4. Please review and commit."

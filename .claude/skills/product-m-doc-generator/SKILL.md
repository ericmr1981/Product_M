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

## The 4 MCP tools

The Product M MCP server exposes 4 tools. Assume they are available; if a tool call returns "tool not found" or a connection error, fall back to the CLI equivalents at the bottom of this skill.

| Tool | What it does |
| --- | --- |
| `list_components` | List 10 design components with class names + descriptions |
| `get_template` | Return HTML skeleton + frontmatter template (optional `series` arg) |
| `validate_doc` | Run 7 SPEC rules against an HTML string |
| `import_doc` | Validate + write + rebuild index + return git diff (does NOT auto-commit) |

## 5-step workflow

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
| `scripts/mcp-server.js` | JSON-RPC server (4 tools) |
| `package.json` | `validate` / `import` / `mcp` / `build-index` scripts |

## Example: turn a brief into a doc

User says: "Make a product doc for 海盐荔枝芒芒 based on the launch brief."

1. `get_template(series="gelato-shake")` → skeleton
2. Fill in:
   - `title`: 海盐荔枝芒芒
   - `summary`: 蓝黄撞色双层夏日特调...
   - hero: eyebrow "SERIES · GELATO SHAKE · SUMMER 2026", title "海盐荔枝芒芒", sub "蓝黄撞色 · gelato 工艺打制"
   - stats: ¥28 / ¥6.70 / 76.1% / 3000
   - spec-section: positioning table
   - split: real-layer image + text
   - quote-pull: "吸管插到底..."
   - steps: 5-step SOP
   - spec-section: visual system comparison
   - quote-pull: master slogan
   - gallery: 4 product images from `/assets/images/hai-yan-li-zhi/`
   - footer-card
3. `validate_doc(html=<>)` → if errors, fix
4. `import_doc(html=<>, path="docs/gelato-shake/海盐荔枝芒芒.html")` → returns git diff
5. Report to user: "File written. Diff: <summary>. Please review and commit."

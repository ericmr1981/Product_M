# Product M Agent Toolchain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node-based toolchain (`validate.js` + `import.js` + `mcp-server.js`) that lets external AI agents generate, validate, and import HTML documents into the Product M site, with the same script logic accessible to humans via CLI.

**Architecture:** Three Node scripts using only built-ins (`fs`, `path`, `http`, `child_process`, `url`). `validate.js` runs 7 design-rule checks via regex; `import.js` calls validate + writes file + rebuilds index + reports git diff; `mcp-server.js` is a tiny JSON-RPC 2.0 server that exposes 4 tools (list_components / get_template / validate_doc / import_doc) backed by the two scripts. Zero npm dependencies.

**Tech Stack:** Node.js ≥18 built-ins. No new packages.

**Reference spec:** `docs/superpowers/specs/2026-06-09-mcp-toolchain-design.md`

---

## File Structure

Files created or modified during this plan:

| Path | Responsibility |
| --- | --- |
| `scripts/validate.js` | Validates HTML against 7 SPEC rules. CLI: `--file <path>` or `--stdin`. |
| `scripts/import.js` | Imports one HTML file: validates, writes, rebuilds index, prints git diff. |
| `scripts/mcp-server.js` | JSON-RPC 2.0 HTTP server. 4 tools backed by the two scripts. |
| `_design-system/PROMPTS.md` | Workflow doc for AI agents. |
| `mcp/README.md` | How to wire the MCP server into Claude. |
| `package.json` | Add 3 npm scripts: validate, import, mcp. |
| `README.md` | Add "How to use as an AI agent" section. |

**Decomposition rationale:** validate.js is pure (no IO except reading input + writing stdout JSON), import.js is the side-effecting wrapper, mcp-server.js is just a protocol layer. Each has one job and is independently testable.

---

## Tasks

### Task 1: scripts/validate.js (the core validator)

**Files:**
- Create: `scripts/validate.js`

- [ ] **Step 1: Create the file with the scaffold (no rules yet — they are added in subsequent steps)**

```javascript
#!/usr/bin/env node
/**
 * validate.js
 *
 * Validates a Product M HTML document against the 7 SPEC design rules.
 * Output is a JSON object on stdout: { passed, errors, warnings }
 * Exit code 0 if passed: true, 1 otherwise.
 *
 * Usage:
 *   node scripts/validate.js --file <path>
 *   node scripts/validate.js --stdin
 *   cat foo.html | node scripts/validate.js --stdin
 */

const fs = require('fs');
const path = require('path');

const RULES = [];

function rule(name, check) {
  RULES.push({ name, check });
}

// Rules registered in later tasks:
//   frontmatter-presence, series-slug, required-components,
//   no-emoji, no-centered-headings, no-external-resources,
//   no-hardcoded-tokens

function runAll(html) {
  const errors = [];
  const warnings = [];
  for (const r of RULES) {
    const result = r.check(html);
    if (!result) continue;
    for (const e of result.errors || []) errors.push({ rule: r.name, ...e });
    for (const w of result.warnings || []) warnings.push({ rule: r.name, ...w });
  }
  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

async function readInput() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1) {
    return fs.readFileSync(args[fileIdx + 1], 'utf8');
  }
  if (args.includes('--stdin')) {
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }
  process.stderr.write('Usage: validate.js --file <path> | --stdin\n');
  process.exit(2);
}

async function main() {
  const html = await readInput();
  const result = runAll(html);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`validate.js crashed: ${err.message}\n`);
  process.exit(2);
});
```

- [ ] **Step 2: Make it executable and verify it runs (with no rules registered yet, every input passes)**

```bash
chmod +x scripts/validate.js
echo '<!DOCTYPE html><html><body>test</body></html>' | node scripts/validate.js --stdin
```

Expected output:

```json
{
  "passed": true,
  "errors": [],
  "warnings": []
}
```

Exit code: 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(scripts): add validate.js scaffold (no rules yet)"
```

---

### Task 2: Rule 1 — frontmatter-presence

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Add the rule definition immediately after the `RULES = [];` line**

Add this block right after `const RULES = [];`:

```javascript
// ----- Rule: frontmatter-presence -----
rule('frontmatter-presence', (html) => {
  const errors = [];
  const match = html.match(/<!--\s*@meta\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) {
    errors.push({ message: 'Missing <!-- @meta ... --> frontmatter comment' });
    return { errors };
  }
  let meta;
  try {
    meta = JSON.parse(match[1]);
  } catch (e) {
    errors.push({ message: `Invalid JSON in @meta: ${e.message}` });
    return { errors };
  }
  for (const field of ['title', 'series', 'slug', 'date']) {
    if (meta[field] === undefined) {
      errors.push({ message: `Field '${field}' missing` });
    }
  }
  return { errors };
});
```

- [ ] **Step 2: Test against a valid doc and an invalid one**

```bash
# Should pass (real valid doc)
node scripts/validate.js --file docs/gelato/classic-vanilla.html
echo "exit: $?"
```

Expected: `"passed": true`, exit 0.

```bash
# Should fail (no frontmatter)
echo '<!DOCTYPE html><html><body>no meta</body></html>' | node scripts/validate.js --stdin
echo "exit: $?"
```

Expected: `"passed": false`, with an error containing "Missing <!-- @meta", exit 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add frontmatter-presence rule"
```

---

### Task 3: Rule 2 — series-slug

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Append the rule after the previous rule's closing `});`**

```javascript
// ----- Rule: series-slug -----
rule('series-slug', (html) => {
  const match = html.match(/<!--\s*@meta\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) return null;
  let meta;
  try { meta = JSON.parse(match[1]); } catch { return null; }
  if (meta.series === undefined) return null;
  const valid = ['gelato', 'gelato-mix', 'gelato-shake', null];
  if (!valid.includes(meta.series)) {
    return {
      errors: [{
        value: meta.series,
        message: `Must be one of: gelato, gelato-mix, gelato-shake, null (got ${JSON.stringify(meta.series)})`,
      }],
    };
  }
  return null;
});
```

- [ ] **Step 2: Test — build a test doc with a bad series value**

```bash
cat > /tmp/bad-series.html << 'HTMLEOF'
<!-- @meta {"title":"x","series":"Gelato","slug":"x","date":"2026-01-01"} -->
<html><body>test</body></html>
HTMLEOF
node scripts/validate.js --file /tmp/bad-series.html
echo "exit: $?"
```

Expected: `"passed": false`, error with rule `series-slug` and message containing "Must be one of".

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add series-slug rule"
```

---

### Task 4: Rule 3 — required-components

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Append the rule**

```javascript
// ----- Rule: required-components -----
rule('required-components', (html) => {
  const required = ['nav-bar', 'hero', 'footer-card'];
  const optional = ['intro', 'spec-section', 'split', 'quote-pull', 'steps', 'stats', 'gallery-section'];
  const missing = [];
  for (const cls of required) {
    if (!html.includes(`class="${cls}"`) && !html.includes(`class="${cls} `) && !html.includes(` ${cls}"`) && !html.includes(` ${cls} `)) {
      missing.push(cls);
    }
  }
  const presentOptional = optional.filter((c) =>
    html.includes(`class="${c}"`) || html.includes(`class="${c} `) || html.includes(` ${c}"`) || html.includes(` ${c} `)
  );
  if (presentOptional.length < 3) {
    missing.push(`at least 3 body components from [${optional.join(', ')}], found ${presentOptional.length}`);
  }
  if (missing.length) {
    return { errors: [{ missing, message: 'Required components missing' }] };
  }
  return null;
});
```

- [ ] **Step 2: Test against a doc missing footer-card**

```bash
# Copy a real doc and strip its footer-card
cp docs/gelato/classic-vanilla.html /tmp/no-footer.html
# Remove the footer-card section
python3 -c "
import re
html = open('/tmp/no-footer.html').read()
html = re.sub(r'<aside class=\"footer-card\">.*?</aside>', '', html, flags=re.S)
open('/tmp/no-footer.html','w').write(html)
"
node scripts/validate.js --file /tmp/no-footer.html
echo "exit: $?"
```

Expected: `"passed": false`, error with rule `required-components`, missing includes `footer-card`.

- [ ] **Step 3: Verify a real doc still passes**

```bash
node scripts/validate.js --file docs/gelato/classic-vanilla.html
echo "exit: $?"
```

Expected: `"passed": true`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add required-components rule"
```

---

### Task 5: Rule 4 — no-emoji

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Append the rule**

```javascript
// ----- Rule: no-emoji -----
rule('no-emoji', (html) => {
  // Strip <style> and <script> blocks first (those may contain CSS/JS text, not visible content)
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
  // Emoji ranges:
  //   U+1F300–1FAFF: main emoji block (pictographs, symbols, emoticons, transport)
  //   U+2600–27BF:   misc symbols + dingbats
  //   U+1F000–1F1FF: mahjong, playing cards, regional indicators
  //   U+FE0F:        variation selector (forces emoji presentation)
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F1FF}\u{FE0F}]/gu;
  const errors = [];
  const lines = stripped.split('\n');
  lines.forEach((line, i) => {
    let m;
    const re = new RegExp(emojiRe.source, 'gu');
    while ((m = re.exec(line)) !== null) {
      errors.push({
        line: i + 1,
        match: m[0],
        message: `Emoji found in content`,
      });
    }
  });
  return errors.length ? { errors } : null;
});
```

- [ ] **Step 2: Test against a doc with an emoji**

```bash
# Make a copy of a real doc and add an emoji
cp docs/gelato/classic-vanilla.html /tmp/with-emoji.html
sed -i '' 's/01 — INTRODUCTION/01 — INTRODUCTION 🎯/' /tmp/with-emoji.html
node scripts/validate.js --file /tmp/with-emoji.html
echo "exit: $?"
```

Expected: `"passed": false`, error with rule `no-emoji`, line number, match `🎯`, exit 1.

- [ ] **Step 3: Verify all 4 real docs still pass**

```bash
for f in docs/gelato/classic-vanilla.html docs/gelato-shake/mocha-shake.html docs/gelato-shake/海盐荔枝芒芒.html planning/2026-summer-launch.html "planning/海盐荔枝芒芒-上市企划.html"; do
  node scripts/validate.js --file "$f" > /dev/null 2>&1
  echo "$?  $f"
done
```

Expected: all 4 show `0` (passed).

- [ ] **Step 4: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add no-emoji rule"
```

---

### Task 6: Rule 5 — no-centered-headings

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Append the rule**

```javascript
// ----- Rule: no-centered-headings -----
rule('no-centered-headings', (html) => {
  const stripped = html.replace(/<style[\s\S]*?<\/style>/g, '');
  const errors = [];
  const lines = stripped.split('\n');
  lines.forEach((line, i) => {
    // Match any <h1|h2|h3 ...> opening tag with text-align:center or align=center
    const m = line.match(/<h[1-3][^>]*?(?:style="[^"]*text-align\s*:\s*center[^"]*"|align="center")/i);
    if (m) {
      errors.push({
        line: i + 1,
        match: m[0],
        message: 'Headings must be left-aligned; remove text-align:center or align=center',
      });
    }
  });
  return errors.length ? { errors } : null;
});
```

- [ ] **Step 2: Test against a doc with a centered h1**

```bash
cp docs/gelato/classic-vanilla.html /tmp/centered.html
sed -i '' 's/<h1 class="hero-title">/<h1 class="hero-title" style="text-align: center">/' /tmp/centered.html
node scripts/validate.js --file /tmp/centered.html
echo "exit: $?"
```

Expected: `"passed": false`, error with rule `no-centered-headings`, exit 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add no-centered-headings rule"
```

---

### Task 7: Rule 6 — no-external-resources

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Append the rule**

```javascript
// ----- Rule: no-external-resources -----
rule('no-external-resources', (html) => {
  const errors = [];
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    // <link rel="stylesheet" href="...">
    const linkM = line.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/i);
    if (linkM) {
      const href = linkM[1];
      if (!href.startsWith('/styles/') && !href.startsWith('./styles/') && !href.startsWith('../styles/')) {
        errors.push({ line: i + 1, match: href, message: 'External CSS not allowed; use /styles/ paths' });
      }
    }
    // <script src="...">
    const scriptM = line.match(/<script[^>]+src=["']([^"']+)["']/i);
    if (scriptM) {
      const src = scriptM[1];
      if (!src.startsWith('/') && !src.startsWith('./')) {
        errors.push({ line: i + 1, match: src, message: 'External <script> not allowed' });
      }
    }
    // <img src="..."> — must start with /assets/
    const imgM = line.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgM) {
      const src = imgM[1];
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
        errors.push({ line: i + 1, match: src, message: 'External <img> not allowed; copy images to /assets/' });
      } else if (!src.startsWith('/assets/') && !src.startsWith('./assets/') && !src.startsWith('../assets/')) {
        errors.push({ line: i + 1, match: src, message: 'Image path must start with /assets/' });
      }
    }
  });
  return errors.length ? { errors } : null;
});
```

- [ ] **Step 2: Test against a doc with an external script**

```bash
cp docs/gelato/classic-vanilla.html /tmp/external.html
sed -i '' 's|</body>|<script src="https://evil.example.com/x.js"></script></body>|' /tmp/external.html
node scripts/validate.js --file /tmp/external.html
echo "exit: $?"
```

Expected: error with rule `no-external-resources`, match the https URL, exit 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add no-external-resources rule"
```

---

### Task 8: Rule 7 — no-hardcoded-tokens

**Files:**
- Modify: `scripts/validate.js`

- [ ] **Step 1: Append the rule**

```javascript
// ----- Rule: no-hardcoded-tokens -----
rule('no-hardcoded-tokens', (html) => {
  const errors = [];
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    // Only inspect inline style="..." attributes on elements
    const styleMatch = line.match(/style=["']([^"']+)["']/i);
    if (!styleMatch) return;
    const style = styleMatch[1];
    // Hex colors: #fff, #ffffff
    if (/#[0-9a-fA-F]{3,8}\b/.test(style)) {
      errors.push({ line: i + 1, match: styleMatch[0], message: 'Inline hex color; use var(--*)' });
    }
    // rgb/rgba/hsl
    if (/\b(rgb|rgba|hsl|hsla)\s*\(/.test(style)) {
      errors.push({ line: i + 1, match: styleMatch[0], message: 'Inline color function; use var(--*)' });
    }
    // font-size: NNpx (px is forbidden; rem is OK)
    const fsMatch = style.match(/font-size\s*:\s*([0-9.]+)px\b/i);
    if (fsMatch) {
      errors.push({ line: i + 1, match: fsMatch[0], message: 'font-size in px; use var(--fs-*)' });
    }
    // padding/margin with px
    const padMatch = style.match(/(?:padding|margin)(?:-(?:top|right|bottom|left))?\s*:\s*[^;]*\b[0-9.]+px\b/i);
    if (padMatch) {
      errors.push({ line: i + 1, match: padMatch[0], message: 'padding/margin in px; use var(--sp-*) or rem' });
    }
  });
  return errors.length ? { errors } : null;
});
```

- [ ] **Step 2: Test against a doc with a hardcoded color**

```bash
cp docs/gelato/classic-vanilla.html /tmp/hardcoded.html
sed -i '' 's|<h1 class="hero-title">|<h1 class="hero-title" style="color: #ff0000">|' /tmp/hardcoded.html
node scripts/validate.js --file /tmp/hardcoded.html
echo "exit: $?"
```

Expected: error with rule `no-hardcoded-tokens`, match `style="color: #ff0000"`, exit 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "feat(validate): add no-hardcoded-tokens rule"
```

---

### Task 9: Full validation pass on all 4 real docs

- [ ] **Step 1: Run validate against every existing doc**

```bash
for f in $(find docs planning -name '*.html' | sort); do
  node scripts/validate.js --file "$f" > /dev/null 2>&1
  echo "$?  $f"
done
```

Expected: all exit codes are `0` (every existing doc passes all 7 rules).

- [ ] **Step 2: If any fail, fix the underlying doc and re-run until all pass**

If validation finds a violation, fix the doc (or the validator if the rule is too strict), commit the fix, and re-run. Do NOT skip validation by deleting the rule.

---

### Task 10: scripts/import.js

**Files:**
- Create: `scripts/import.js`

- [ ] **Step 1: Create the import script**

```javascript
#!/usr/bin/env node
/**
 * import.js
 *
 * Imports one HTML document into the Product M site.
 * Pipeline: validate → copy to target → rebuild index → git diff summary.
 * Does NOT auto-commit (commit is a conscious human decision).
 *
 * Usage:
 *   node scripts/import.js <source-html> <target-relative-path>
 *
 * Example:
 *   node scripts/import.js /tmp/draft.html docs/gelato-shake/foo.html
 *
 * Output (stdout): JSON { ok, written_to, validation, index_rebuilt, git_diff_summary }
 * Exit 0 on success, 1 on validation failure, 2 on operational error.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function readSource(arg) {
  return fs.readFileSync(arg, 'utf8');
}

function validate(content) {
  const tmp = path.join(ROOT, '.import-tmp-validate.html');
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/validate.js'), '--file', tmp], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (err) {
    // Non-zero exit — try to parse the JSON output anyway
    if (err.stdout) {
      try { return JSON.parse(err.stdout); } catch { /* fall through */ }
    }
    return { passed: false, errors: [{ rule: 'validate-crash', message: err.message }] };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function buildIndex() {
  try {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/build-index.js')], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: out.trim() };
  } catch (err) {
    return { ok: false, output: (err.stderr || err.stdout || err.message).trim() };
  }
}

function gitDiffStat() {
  try {
    const out = execFileSync('git', ['diff', '--stat'], { cwd: ROOT, encoding: 'utf8' });
    return out.trim();
  } catch (err) {
    return `(git diff failed: ${err.message})`;
  }
}

function gitStatusPorcelain() {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch (err) {
    return [`(git status failed: ${err.message})`];
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    process.stderr.write('Usage: import.js <source-html> <target-relative-path>\n');
    process.exit(2);
  }
  const [sourcePath, targetRel] = args;
  const targetAbs = path.resolve(ROOT, targetRel);

  // Security check: target must be inside ROOT
  if (!targetAbs.startsWith(ROOT + path.sep) && targetAbs !== ROOT) {
    process.stderr.write(`Refusing to write outside project root: ${targetRel}\n`);
    process.exit(2);
  }

  // 1. Read source
  let content;
  try {
    content = readSource(sourcePath);
  } catch (err) {
    process.stderr.write(`Cannot read source: ${err.message}\n`);
    process.exit(2);
  }

  // 2. Validate
  const validation = validate(content);
  if (!validation.passed) {
    process.stdout.write(JSON.stringify({
      ok: false,
      validation,
    }, null, 2) + '\n');
    process.exit(1);
  }

  // 3. Write target (only after validation passes)
  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.writeFileSync(targetAbs, content, 'utf8');

  // 4. Build index
  const build = buildIndex();

  // 5. Git diff summary
  const diff = gitDiffStat();
  const porcelain = gitStatusPorcelain();

  process.stdout.write(JSON.stringify({
    ok: true,
    written_to: targetRel,
    validation,
    index_rebuilt: build.ok,
    index_output: build.output,
    git_diff_summary: diff,
    git_status: porcelain,
  }, null, 2) + '\n');
  process.exit(0);
}

main();
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/import.js
```

- [ ] **Step 3: Test importing a real doc to a new path**

```bash
node scripts/import.js docs/gelato/classic-vanilla.html /tmp/test-import.html
echo "exit: $?"
```

Expected: `"ok": true`, exit 0. (The target is `/tmp/test-import.html` which is outside the project root, so the safety check will reject it.)

Wait — the safety check will block this. Use a path inside the project:

```bash
node scripts/import.js docs/gelato/classic-vanilla.html docs/gelato/_test-import.html
echo "exit: $?"
```

Expected: `"ok": true`, `written_to: "docs/gelato/_test-import.html"`, exit 0. The file is now in the project but it's a duplicate of classic-vanilla.html.

Verify the file was created and is identical to source:

```bash
diff -q docs/gelato/classic-vanilla.html docs/gelato/_test-import.html
```

Expected: no output (files are identical).

- [ ] **Step 4: Clean up the test file (it was added to the project)**

```bash
rm docs/gelato/_test-import.html
npm run build-index
git status
```

Expected: working tree clean after the rebuild (the removed file is tracked, so the diff is back to no changes).

- [ ] **Step 5: Test importing a bad file (validation failure path)**

```bash
# Create a file with an emoji
cp docs/gelato/classic-vanilla.html /tmp/bad.html
sed -i '' 's/01 — INTRODUCTION/01 — INTRODUCTION 🎯/' /tmp/bad.html
node scripts/import.js /tmp/bad.html docs/gelato/_bad-test.html
echo "exit: $?"
```

Expected: `"ok": false`, exit 1, with `validation.errors` containing the emoji violation. The file `docs/gelato/_bad-test.html` should NOT exist (validate runs before write).

```bash
ls docs/gelato/_bad-test.html 2>&1
```

Expected: `No such file or directory`.

- [ ] **Step 6: Clean up the bad test file from /tmp and the docs dir (if it somehow got created)**

```bash
rm -f /tmp/bad.html docs/gelato/_bad-test.html
npm run build-index
git status
```

Expected: working tree clean.

- [ ] **Step 7: Commit**

```bash
git add scripts/import.js
git commit -m "feat(scripts): add import.js (validate + write + rebuild index)"
```

---

### Task 11: scripts/mcp-server.js

**Files:**
- Create: `scripts/mcp-server.js`

- [ ] **Step 1: Create the MCP server file**

```javascript
#!/usr/bin/env node
/**
 * mcp-server.js
 *
 * JSON-RPC 2.0 HTTP server exposing 4 tools for AI agents:
 *   - list_components: list the 10 design components
 *   - get_template:    return the HTML skeleton + frontmatter template
 *   - validate_doc:    validate an HTML string
 *   - import_doc:      validate + write + rebuild index
 *
 * Listens on http://127.0.0.1:7331 by default.
 * Override with PRODUCT_M_MCP_PORT env var.
 *
 * Endpoints:
 *   POST /mcp     — JSON-RPC 2.0
 *   GET  /health  — { status: "ok", version: "0.1.0" }
 *   GET  /        — HTML page listing the 4 tools (human-readable)
 *
 * No external dependencies. Uses only Node built-ins.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.env.PRODUCT_M_MCP_PORT || '7331', 10);
const HOST = '127.0.0.1';
const VERSION = '0.1.0';

const TOOLS = [
  {
    name: 'list_components',
    description: 'List the 10 available design components with class names and descriptions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_template',
    description: 'Return the HTML skeleton + frontmatter template. Optional series argument pre-fills the frontmatter.',
    inputSchema: {
      type: 'object',
      properties: {
        series: { type: 'string', enum: ['gelato', 'gelato-mix', 'gelato-shake', 'null'], description: 'Pre-fill the series slug in frontmatter' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'validate_doc',
    description: 'Validate an HTML document against the 7 SPEC rules. Returns { passed, errors, warnings }.',
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'The full HTML document to validate' },
      },
      required: ['html'],
      additionalProperties: false,
    },
  },
  {
    name: 'import_doc',
    description: 'Validate + write + rebuild index. Does NOT auto-commit. Returns { ok, written_to, validation, git_diff_summary }.',
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'The full HTML document' },
        path: { type: 'string', description: 'Relative path inside the project, e.g. docs/gelato-shake/foo.html' },
      },
      required: ['html', 'path'],
      additionalProperties: false,
    },
  },
];

// ----- Tool implementations -----

function listComponents() {
  const dir = path.join(ROOT, '_design-system', 'components');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  const components = files.map((file) => {
    const full = path.join(dir, file);
    const content = fs.readFileSync(full, 'utf8');
    // First HTML tag with a class
    const classMatch = content.match(/<[a-z][^>]*\sclass=["']([^"']+)["']/i);
    const klass = classMatch ? classMatch[1].split(/\s+/)[0] : '';
    // Description: the first <p class="section-eyebrow"> ... </p> if present, else first line of comment
    const eyebrowMatch = content.match(/<p[^>]*class=["']section-eyebrow["'][^>]*>([^<]+)</);
    const commentMatch = content.match(/<!--\s*([^-]+?)\s*-->/);
    const description = (eyebrowMatch ? eyebrowMatch[1] : commentMatch ? commentMatch[1] : '').trim();
    return { name: file.replace(/\.html$/, ''), class: '.' + klass, file: `_design-system/components/${file}`, description };
  });
  return { components };
}

function getTemplate(args) {
  const templatePath = path.join(ROOT, '_design-system', 'template.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  // Pre-fill the series in the frontmatter if provided
  if (args.series !== undefined) {
    const seriesValue = args.series === 'null' ? null : args.series;
    const seriesJson = seriesValue === null ? 'null' : JSON.stringify(seriesValue);
    html = html.replace(/("series"\s*:\s*")[^"]*(")/, `$1${seriesValue || ''}$2`);
    // The template may not have a string series; if it's null, we leave the literal as-is.
    // The above regex assumes "series": "<value>". If the template has null, no change needed.
  }
  const frontmatter = {
    title: 'Document Title',
    series: args.series === undefined ? 'gelato' : (args.series === 'null' ? null : args.series),
    slug: 'document-slug',
    date: '2026-04-12',
    tags: [],
    summary: 'One-sentence description.',
    volume: '04',
  };
  return { html, frontmatter };
}

function runValidate(args) {
  const tmp = path.join(ROOT, '.mcp-tmp-validate.html');
  fs.writeFileSync(tmp, args.html, 'utf8');
  try {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/validate.js'), '--file', tmp], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout); } catch {}
    }
    return { passed: false, errors: [{ rule: 'validate-crash', message: err.message }] };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function runImport(args) {
  const tmpSrc = path.join(ROOT, '.mcp-tmp-import.html');
  fs.writeFileSync(tmpSrc, args.html, 'utf8');
  try {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/import.js'), tmpSrc, args.path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout); } catch {}
    }
    return { ok: false, error: err.message };
  } finally {
    try { fs.unlinkSync(tmpSrc); } catch {}
  }
}

// ----- JSON-RPC dispatch -----

function dispatch(method, params, id) {
  let result;
  if (method === 'tools/list') {
    result = { tools: TOOLS };
  } else if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    switch (name) {
      case 'list_components': result = listComponents(); break;
      case 'get_template':    result = getTemplate(args); break;
      case 'validate_doc':     result = runValidate(args); break;
      case 'import_doc':       result = runImport(args); break;
      default:
        return rpcError(id, -32601, `Unknown tool: ${name}`);
    }
  } else if (method === 'initialize') {
    result = { protocolVersion: '2024-11-05', serverInfo: { name: 'product-m', version: VERSION } };
  } else {
    return rpcError(id, -32601, `Method not found: ${method}`);
  }
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ----- HTTP server -----

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: VERSION, tools: TOOLS.map((t) => t.name) }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/') {
      const body = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Product M MCP</title></head>
<body style="font-family: -apple-system, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1f3a2e;">
<h1>Product M MCP server</h1>
<p>Version: ${VERSION}</p>
<p>Endpoint: <code>POST /mcp</code> (JSON-RPC 2.0)</p>
<p>Health: <code>GET /health</code></p>
<h2>Tools</h2>
<ul>
${TOOLS.map((t) => `<li><strong>${t.name}</strong> — ${t.description}</li>`).join('\n')}
</ul>
</body>
</html>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/mcp') {
      const body = await readBody(req);
      let reqJson;
      try {
        reqJson = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify(rpcError(null, -32700, 'Parse error')));
        return;
      }
      const response = dispatch(reqJson.method, reqJson.params, reqJson.id);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response));
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`Product M MCP server v${VERSION}\n`);
  process.stdout.write(`Listening on http://${HOST}:${PORT}\n`);
  process.stdout.write(`Tools: ${TOOLS.map((t) => t.name).join(', ')}\n`);
  process.stdout.write(`Try: curl http://${HOST}:${PORT}/health\n`);
});

process.on('SIGINT', () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/mcp-server.js
```

- [ ] **Step 3: Start the server in the background and verify health**

```bash
npm run mcp &> /tmp/mcp-server.log &
MCP_PID=$!
sleep 1
curl -s http://127.0.0.1:7331/health
echo
echo "PID: $MCP_PID"
```

Expected response: `{"status":"ok","version":"0.1.0","tools":["list_components","get_template","validate_doc","import_doc"]}`

- [ ] **Step 4: Test the list_components tool**

```bash
curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_components","arguments":{}}}'
```

Expected: JSON with `result.components` array of 10 entries (nav-bar, hero, intro, spec-table, split-image, quote-pull, step-list, stats-row, gallery, footer-card).

- [ ] **Step 5: Test the get_template tool**

```bash
curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_template","arguments":{"series":"gelato-shake"}}}'
```

Expected: JSON with `result.html` containing the full template and `result.frontmatter.series` = `"gelato-shake"`.

- [ ] **Step 6: Test the validate_doc tool with a valid doc**

```bash
HTML_CONTENT=$(cat docs/gelato/classic-vanilla.html | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"validate_doc\",\"arguments\":{\"html\":$HTML_CONTENT}}}"
```

Expected: `result.passed` is `true`.

- [ ] **Step 7: Test the validate_doc tool with an invalid doc (with emoji)**

```bash
HTML_CONTENT=$(cat docs/gelato/classic-vanilla.html | sed 's/01 — INTRODUCTION/01 — INTRODUCTION 🎯/' | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"validate_doc\",\"arguments\":{\"html\":$HTML_CONTENT}}}"
```

Expected: `result.passed` is `false`, with a `no-emoji` error.

- [ ] **Step 8: Test the import_doc tool (using a real doc copy as new path)**

```bash
HTML_CONTENT=$(cat docs/gelato/classic-vanilla.html | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",\"params\":{\"name\":\"import_doc\",\"arguments\":{\"html\":$HTML_CONTENT,\"path\":\"docs/gelato/_mcp-test.html\"}}}"
```

Expected: `result.ok` is `true`, `result.written_to` is `"docs/gelato/_mcp-test.html"`. Verify the file exists:

```bash
ls docs/gelato/_mcp-test.html
```

- [ ] **Step 9: Clean up and stop the server**

```bash
# Remove the test file
rm docs/gelato/_mcp-test.html
npm run build-index
# Stop the MCP server
kill $MCP_PID
sleep 1
# Verify it's stopped
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:7331/health
```

Expected: `000` (connection refused — server is down).

```bash
git status
```

Expected: working tree clean (after the index rebuild).

- [ ] **Step 10: Commit**

```bash
git add scripts/mcp-server.js
git commit -m "feat(scripts): add MCP server (4 tools, JSON-RPC 2.0)"
```

---

### Task 12: _design-system/PROMPTS.md

**Files:**
- Create: `_design-system/PROMPTS.md`

- [ ] **Step 1: Create the agent workflow doc**

```markdown
# Product M 文档生成工作流

你正在为一个品牌刊物站点（Product M）生成 HTML 文档。设计规则在同目录的 `SPEC.md` — 读它。

## 4 步流程

### 1. 获取骨架

调用 `get_template(series="gelato" | "gelato-mix" | "gelato-shake" | null)`，拿到 HTML 骨架和 frontmatter 默认值。

- 选 `null` 用于企划书（路径 `planning/<slug>.html`）
- 选具体系列用于产品介绍（路径 `docs/<series>/<slug>.html`）

### 2. 填内容

按 SPEC §3-§5 拼装正文：

```
nav-bar → hero → 至少 3 个正文组件 → footer-card
```

正文组件的 7 种选择：`intro` / `spec-section`(spec-table) / `split`(split-grid) / `quote-pull` / `steps`(step-list) / `stats` / `gallery-section`(gallery)。

**禁止**：

- emoji（用等宽编号 01/02/03 代替）
- 居中标题
- 外部 CSS/JS 引用
- 硬编码颜色（`#hex`、`rgb()`）或 px 字号
- 用 Tailwind / Bootstrap 等类名
- 任何 JavaScript 框架

### 3. 校验

调用 `validate_doc(html=<你的完整 HTML>)`。

- `passed: true` → 进 step 4
- `passed: false` → 按 `errors` 列表逐条修正后重试

最多重试 5 次。5 次仍失败 → 停下，把错误报告给用户，**不**导入。

### 4. 导入

调用 `import_doc(html=<>, path="docs/<series>/<slug>.html" | "planning/<slug>.html")`。

- `ok: true` → 把返回的 `git_diff_summary` 转给用户，让人决定是否 commit（**不**自动 commit）
- `ok: false` → 把 `validation.errors` 给人看，**不**写文件

## 路径约定

| 类型 | 路径 |
| --- | --- |
| 产品介绍 | `docs/<series>/<slug>.html` |
| 企划书 / 品牌物料 | `planning/<slug>.html` |

`<slug>` 小写英文 + 连字符（用 pinyin，不用中文）。

## 失败兜底

如果 `get_template` 不可用（agent 突然掉线 / MCP 服务挂了），可以直接读 `_design-system/template.html` 本地副本手动开始。

如果 `validate_doc` 不可用但 `import_doc` 可用，import_doc 会做校验，错误也会在结果里返回。

如果都不可用，回退到：把 HTML 写到 `docs/<series>/<slug>.html`，然后跑 `npm run validate -- --file <path>`，再跑 `npm run build-index`。详见 `mcp/README.md`。
```

- [ ] **Step 2: Commit**

```bash
git add _design-system/PROMPTS.md
git commit -m "docs(design-system): add PROMPTS.md (agent workflow)"
```

---

### Task 13: mcp/README.md

**Files:**
- Create: `mcp/README.md`

- [ ] **Step 1: Create the integration guide**

```markdown
# MCP server integration

This directory explains how to wire the Product M MCP server into an AI agent (Claude or any other MCP-compatible client).

## Start the server

```bash
cd /path/to/Product_M
npm run mcp
# Listens on http://127.0.0.1:7331 by default
# Override port: PRODUCT_M_MCP_PORT=8000 npm run mcp
```

The server runs until you kill it (`Ctrl+C` or `kill <pid>`).

## Test it

```bash
curl http://127.0.0.1:7331/health
# {"status":"ok","version":"0.1.0","tools":["list_components","get_template","validate_doc","import_doc"]}
```

## Wire into Claude (macOS / Linux)

Edit `~/.config/claude/mcp.json` (or the equivalent on your OS):

```json
{
  "mcpServers": {
    "product-m": {
      "command": "node",
      "args": ["/absolute/path/to/Product_M/scripts/mcp-server.js"],
      "cwd": "/absolute/path/to/Product_M"
    }
  }
}
```

Restart Claude. The 4 Product M tools appear in its tool list.

## Wire into Claude (Windows)

Same as above, but use Windows-style paths with backslashes or forward slashes:

```json
{
  "mcpServers": {
    "product-m": {
      "command": "node",
      "args": ["C:/Users/you/Documents/Product_M/scripts/mcp-server.js"],
      "cwd": "C:/Users/you/Documents/Product_M"
    }
  }
}
```

## Available tools

| Tool | What it does |
| --- | --- |
| `list_components` | Returns the 10 design components with their class names and a one-line description each. |
| `get_template` | Returns the HTML skeleton + a frontmatter template. Optional `series` argument pre-fills the series field. |
| `validate_doc` | Runs the 7 SPEC rules against an HTML string. Returns `{ passed, errors, warnings }`. |
| `import_doc` | Validates, writes the file, rebuilds `index.json`, returns a `git diff` summary. Does NOT auto-commit. |

## Recommended agent workflow

See `_design-system/PROMPTS.md` for the full 4-step workflow. Short version: get template → fill content → validate (fix until pass) → import (show diff to user).

## Alternative: CLI only

If you don't want to wire MCP, you can use the CLI directly:

```bash
# Validate
node scripts/validate.js --file <path-to-html>

# Import (validates, writes, rebuilds index)
node scripts/import.js <source-html> <target-relative-path>

# Rebuild index manually
npm run build-index
```

Both the MCP tools and the CLI go through the same `validate.js` code, so results are identical.
```

- [ ] **Step 2: Commit**

```bash
git add mcp/README.md
git commit -m "docs(mcp): add integration README"
```

---

### Task 14: package.json — add 3 new scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json**

```bash
cat package.json
```

- [ ] **Step 2: Update scripts**

Edit `package.json` and change the `scripts` block to:

```json
  "scripts": {
    "build-index": "node scripts/build-index.js",
    "validate": "node scripts/validate.js",
    "import": "node scripts/import.js",
    "mcp": "node scripts/mcp-server.js"
  },
```

(The existing `build-index` line stays, three new lines added.)

- [ ] **Step 3: Verify each script is callable**

```bash
npm run validate -- --file docs/gelato/classic-vanilla.html > /dev/null 2>&1
echo "validate: $?"

node scripts/import.js docs/gelato/classic-vanilla.html /tmp/pkg-test.html > /dev/null 2>&1
echo "import (outside-root): $?"  # should be 2 (refused)

rm -f /tmp/pkg-test.html
```

Expected: `validate: 0`, `import (outside-root): 2`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add validate, import, mcp npm scripts"
```

---

### Task 15: README.md — add "How to use as an AI agent" section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

```bash
cat README.md
```

- [ ] **Step 2: Append the new section to the end of the README**

Append to `README.md`:

```markdown

## How to use as an AI agent

Two ways to use this project as an AI agent:

### 1. With MCP (recommended)

Start the MCP server:

```bash
npm run mcp
```

Add to your Claude MCP config (`~/.config/claude/mcp.json` on macOS/Linux):

```json
{
  "mcpServers": {
    "product-m": {
      "command": "node",
      "args": ["/abs/path/to/Product_M/scripts/mcp-server.js"]
    }
  }
}
```

You'll get 4 tools: `list_components`, `get_template`, `validate_doc`, `import_doc`. See `mcp/README.md` for the full integration guide and `_design-system/PROMPTS.md` for the recommended workflow.

### 2. With CLI

```bash
# Validate an HTML file
npm run validate -- --file <path>

# Validate from stdin
cat foo.html | npm run validate -- --stdin

# Import an HTML file (validates, writes, rebuilds index)
npm run import -- <source-html> <target-relative-path>
```

Example:

```bash
node scripts/import.js /tmp/draft.html docs/gelato-shake/foo.html
```

Both paths go through the same `validate.js` code, so results are identical whether you call via MCP or CLI.
```

- [ ] **Step 3: Verify the README is still readable**

```bash
wc -l README.md
head -3 README.md
```

Expected: file size grew by ~40 lines, first 3 lines still show the project description.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add 'How to use as an AI agent' section to README"
```

---

### Task 16: End-to-end smoke test

- [ ] **Step 1: Start the MCP server**

```bash
npm run mcp &> /tmp/mcp-final.log &
MCP_PID=$!
sleep 1
echo "Server PID: $MCP_PID"
```

- [ ] **Step 2: Run a full agent workflow via curl, ending with an import**

```bash
# Get template
TEMPLATE=$(curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_template","arguments":{"series":"gelato-mix"}}}')

# Extract the HTML field and import it (use a temporary file)
echo "$TEMPLATE" | python3 -c "
import json, sys
resp = json.load(sys.stdin)
html = resp['result']['html']
open('/tmp/agent-test.html', 'w').write(html)
print('Wrote /tmp/agent-test.html, length:', len(html))
"

# Validate it
VALIDATE_RESULT=$(curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d @<(python3 -c "
import json
print(json.dumps({
  'jsonrpc': '2.0',
  'id': 2,
  'method': 'tools/call',
  'params': {
    'name': 'validate_doc',
    'arguments': {
      'html': open('/tmp/agent-test.html').read()
    }
  }
}))
"))
echo "$VALIDATE_RESULT" | python3 -c "import json,sys; r=json.load(sys.stdin); print('Validate passed:', r['result']['passed'])"

# Import it
IMPORT_RESULT=$(curl -s -X POST http://127.0.0.1:7331/mcp \
  -H 'content-type: application/json' \
  -d @<(python3 -c "
import json
print(json.dumps({
  'jsonrpc': '2.0',
  'id': 3,
  'method': 'tools/call',
  'params': {
    'name': 'import_doc',
    'arguments': {
      'html': open('/tmp/agent-test.html').read(),
      'path': 'docs/gelato-mix/_smoke-test.html'
    }
  }
}))
"))
echo "$IMPORT_RESULT" | python3 -c "import json,sys; r=json.load(sys.stdin); print('Import ok:', r['result']['ok']); print('Written to:', r['result'].get('written_to')); print('Diff:', r['result'].get('git_diff_summary', '')[:200])"
```

Expected:
- Validate passed: True
- Import ok: True
- Written to: docs/gelato-mix/_smoke-test.html
- Diff shows the file added

- [ ] **Step 3: Verify the file is in the project and index was updated**

```bash
ls docs/gelato-mix/_smoke-test.html
cat index.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('docs in index:', len(d['documents']))"
```

Expected: file exists, index has 6 documents (5 existing + 1 new).

- [ ] **Step 4: Clean up the test file and stop the server**

```bash
rm docs/gelato-mix/_smoke-test.html
npm run build-index
kill $MCP_PID
sleep 1
git status
```

Expected: working tree clean (after rebuild), no MCP server process.

- [ ] **Step 5: Final commit if there are leftover changes**

```bash
git status
# If anything changed, commit:
# git add -A && git commit -m "chore: post-smoke-test cleanup"
```

---

## Self-Review

**Spec coverage** (sections from `2026-06-09-mcp-toolchain-design.md`):
- §1 Goal — covered by Tasks 1-16
- §2 Form decision (CLI + MCP) — Task 1-11 build both
- §3 File structure — all 7 new/modified files have tasks
- §4 4 MCP tools — Task 11 implements all 4
- §5 7 validation rules — Tasks 2-8 implement each, Task 9 verifies all real docs pass
- §6 import.js — Task 10
- §7 mcp-server.js — Task 11
- §8 PROMPTS.md — Task 12
- §9 mcp/README.md — Task 13
- §10 package.json — Task 14
- §11 README — Task 15
- §12 Acceptance — Task 16 is the end-to-end smoke test
- §13 YAGNI — none of the deferred items appear in any task
- §14 Risks — regex parsing limitation acknowledged in spec; tmp file paths inside ROOT so no cross-contamination; security check in import.js (`targetAbs.startsWith(ROOT + path.sep)`) prevents writing outside project

**Placeholder scan:** No "TBD" or "implement later" in any code block. All CLI commands have expected output. All shell substitution patterns are concrete (e.g., `$(cat docs/gelato/classic-vanilla.html | python3 -c "...")`).

**Type/name consistency:**
- Tool names: `list_components`, `get_template`, `validate_doc`, `import_doc` — used identically in Task 11 (server), Task 12 (PROMPTS), Task 13 (mcp/README), Task 15 (README)
- Rule names: `frontmatter-presence`, `series-slug`, `required-components`, `no-emoji`, `no-centered-headings`, `no-external-resources`, `no-hardcoded-tokens` — used identically in Tasks 2-8
- Component class names (checked against validate's required/optional lists): match SPEC.md exactly
- Port number `7331`: consistent in Tasks 11 and 16
- npm script names: `validate`, `import`, `mcp`, `build-index` — consistent in Task 14 and used in subsequent tasks

**No scope creep:** Tasks do exactly what the spec describes. No new features added beyond the 4 tools, 7 rules, and the 4 documentation/script files.

---

Plan complete. Saved to `docs/superpowers/plans/2026-06-09-mcp-toolchain.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

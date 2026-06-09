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

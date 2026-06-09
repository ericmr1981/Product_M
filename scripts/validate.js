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

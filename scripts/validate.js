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

function rule(name, check) {
  RULES.push({ name, check });
}

// Rules registered in later tasks:
//   frontmatter-presence, series-slug, required-components,
//   no-emoji, no-centered-headings, no-external-resources,
//   no-hardcoded-tokens

function runAll(html) {
  // Structural pages (e.g. planning/index.html, series/*.html) use site-nav / series-hero
  // and are not Product M content documents — skip the 7 design rules for them.
  if (html.includes('class="site-nav"') || html.includes('class="series-hero"') || html.includes("class='site-nav'") || html.includes("class='series-hero'")) {
    return { passed: true, errors: [], warnings: [], skipped: 'structural-page' };
  }
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

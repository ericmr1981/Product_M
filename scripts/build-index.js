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

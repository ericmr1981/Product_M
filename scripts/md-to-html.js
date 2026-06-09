#!/usr/bin/env node
/**
 * md-to-html.js
 *
 * Converts a Product M markdown file (with frontmatter + tagged H2 sections)
 * into a complete, valid Product M HTML document.
 *
 * Usage:
 *   node scripts/md-to-html.js --input <path.md> --output <path.html>
 *   node scripts/md-to-html.js --stdin < <path.md > <path.html>
 *
 * The input markdown follows the Content Contract:
 *   - YAML frontmatter with title/series/slug/date + optional hero/volume/tags
 *   - H2 sections tagged with component keywords: (intro), (spec-table),
 *     (split-image), (quote-pull), (steps), (stats), (gallery)
 *
 * The output is a <!DOCTYPE html> page with nav-bar, hero, body sections,
 * and footer-card, ready for validate_doc / import_doc.
 *
 * No external dependencies. Uses only Node built-ins.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---- template parts ----

function loadTemplate() {
  return fs.readFileSync(path.join(ROOT, '_design-system', 'template.html'), 'utf8');
}

// ---- YAML frontmatter parser (inline, handles nested objects) ----

function parseFrontmatter(text) {
  // Match ---\n...\n--- at the start
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return { fm: {}, body: text };
  const raw = match[1];
  const fm = parseSimpleYaml(raw);
  return { fm, body: text.slice(match[0].length) };
}

function parseSimpleYaml(raw) {
  // Handles: scalars, lists, nested objects one level deep.
  // Enough for the Product M frontmatter schema.
  const result = {};
  let currentKey = null;
  let currentObj = null;

  for (const line of raw.split('\n')) {
    // Skip blank lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Top-level key: value
    const topMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*?)\s*$/);
    if (topMatch && !line.startsWith('  ')) {
      const key = topMatch[1];
      let val = topMatch[2];
      // Bare string
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      } else if (val === '' || val === 'null') {
        currentKey = key;
        currentObj = {};
        result[key] = currentObj;
        continue;
      }
      // Inline list: [a, b, c] — parse as JSON array
      if (val.startsWith('[') && val.endsWith(']')) {
        try { result[key] = JSON.parse(val); } catch { result[key] = val.replace(/[\[\]"']/g, '').split(',').map((s) => s.trim()).filter(Boolean); }
      } else {
        result[key] = val;
      }
      currentKey = null;
      currentObj = null;
      continue;
    }

    // Indented key inside current object
    const subMatch = line.match(/^\s{2}(\w[\w-]*)\s*:\s*"(.*?)"\s*$/);
    if (subMatch && currentObj !== null) {
      currentObj[subMatch[1]] = subMatch[2];
      continue;
    }
    const subMatch2 = line.match(/^\s{2}(\w[\w-]*)\s*:\s*(.*?)\s*$/);
    if (subMatch2 && currentObj !== null) {
      let sv = subMatch2[2];
      if (sv.startsWith('"') && sv.endsWith('"')) sv = sv.slice(1, -1);
      currentObj[subMatch2[1]] = sv;
    }
  }
  return result;
}

// ---- Markdown body parser ----

function parseSections(body) {
  // Split by ## heading lines
  const sections = [];
  const lines = body.split('\n');
  let currentHeading = null;
  let currentLines = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
      }
      currentHeading = h2Match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
  }
  return sections;
}

// ---- Component renderers ----

function renderIntro(sectionNum, content) {
  const eyebrow = `${String(sectionNum).padStart(2, '0')} — INTRODUCTION`;
  return `<section class="intro">
      <p class="intro-eyebrow">${escapeHtml(eyebrow)}</p>
      <p class="intro-lead">${escapeHtml(content.replace(/\n/g, ' '))}</p>
    </section>`;
}

function renderSpecTable(sectionNum, title, content) {
  const eyebrow = `${String(sectionNum).padStart(2, '0')} — ${title.toUpperCase()}`;
  let rows = '';
  const lines = content.split('\n');
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
      if (cells.length >= 2 && cells[0] && cells[1] && !cells[0].startsWith('-')) {
        rows += `        <tr><th>${escapeHtml(cells[0])}</th><td>${escapeHtml(cells[1])}</td></tr>\n`;
        inTable = true;
      }
    }
  }
  if (!inTable) {
    // Fallback: treat each non-empty line as key: value
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const kv = trimmed.split(/:\s*/);
      const key = kv[0] || '';
      const val = kv.slice(1).join(': ') || '';
      if (key) rows += `        <tr><th>${escapeHtml(key)}</th><td>${escapeHtml(val)}</td></tr>\n`;
    }
  }
  return `<section class="spec-section">
      <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
      <table class="spec-table">
${rows}      </table>
    </section>`;
}

function renderSplitImage(sectionNum, title, content) {
  const eyebrow = `${String(sectionNum).padStart(2, '0')} — ${title.toUpperCase()}`;
  // Extract image line, H3 heading, body paragraph
  const imgMatch = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  const imgAlt = imgMatch ? imgMatch[1] : '';
  const imgSrc = imgMatch ? imgMatch[2] : '/assets/images/placeholder.svg';
  // Remainder after image
  let rest = content.replace(/!\[[^\]]*\]\([^)]+\)/, '').trim();
  // Extract optional H3
  let heading = '';
  const h3Match = rest.match(/^###\s+(.+)/m);
  if (h3Match) {
    heading = h3Match[1];
    rest = rest.replace(h3Match[0], '').trim();
  }
  // Rest is paragraph text
  const bodyText = rest.replace(/^#+\s+.*$/gm, '').trim();

  return `<section class="split">
      <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
      <div class="split-grid">
        <figure class="split-image">
          <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(imgAlt)}">
        </figure>
        <div class="split-text">
          <h2>${escapeHtml(heading || title)}</h2>
          <p>${escapeHtml(bodyText.replace(/\n/g, ' '))}</p>
        </div>
      </div>
    </section>`;
}

function renderQuotePull(content) {
  const lines = content.trim().split('\n');
  let quote = '';
  let cite = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('"') || trimmed.startsWith('>')) {
      const clean = trimmed.replace(/^[">\s]+/, '').replace(/["\s]+$/, '');
      if (!quote) quote = clean;
    } else if (trimmed.startsWith('—')) {
      cite = trimmed.slice(1).trim();
    }
  }
  return `<blockquote class="quote-pull">
      <p>"${escapeHtml(quote || content.trim())}"</p>
      <cite>${cite ? '— ' + escapeHtml(cite) : ''}</cite>
    </blockquote>`;
}

function renderSteps(sectionNum, title, content) {
  const eyebrow = `${String(sectionNum).padStart(2, '0')} — ${title.toUpperCase()}`;
  // Parse numbered list items: 1. **heading** — description
  const items = [];
  const lines = content.split('\n');
  let currentItem = null;
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+)$/);
    if (match) {
      if (currentItem) items.push(currentItem);
      const itemText = match[1];
      // Try to split bold heading from description
      const boldMatch = itemText.match(/^\*\*(.+?)\*\*\s*(?:—\s*)?(.*)$/);
      if (boldMatch) {
        currentItem = { heading: boldMatch[1], body: boldMatch[2] || '' };
      } else {
        // First sentence is heading
        const parts = itemText.split(/[.—]\s*/);
        currentItem = { heading: parts[0], body: parts.slice(1).join('. ') || '' };
      }
    } else if (currentItem && line.trim()) {
      currentItem.body += (currentItem.body ? ' ' : '') + line.trim();
    }
  }
  if (currentItem) items.push(currentItem);

  let stepsHtml = '';
  items.forEach((item, i) => {
    const num = String(i + 1).padStart(2, '0');
    stepsHtml += `        <li class="step">
          <span class="step-num">${num}</span>
          <div>
            <h3>${escapeHtml(item.heading)}</h3>
            <p>${escapeHtml(item.body)}</p>
          </div>
        </li>
`;
  });

  return `<section class="steps">
      <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
      <ol class="step-list">
${stepsHtml}      </ol>
    </section>`;
}

function renderStats(sectionNum, content) {
  const eyebrow = `${String(sectionNum).padStart(2, '0')} — KEY METRICS`;
  // Parse GFM table: number | unit | label
  const lines = content.split('\n');
  const stats = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
      if (cells.length >= 3 && cells[0] && cells[2] && !cells[0].startsWith('-')) {
        stats.push({ num: cells[0], unit: cells[1] || '', label: cells[2] });
      }
    }
  }
  if (stats.length === 0) return '';

  let statsHtml = '';
  stats.forEach((s) => {
    const unitHtml = s.unit ? `<small>${escapeHtml(s.unit)}</small>` : '';
    statsHtml += `      <div class="stat">
        <div class="stat-num">${escapeHtml(s.num)}${unitHtml}</div>
        <div class="stat-label">${escapeHtml(s.label)}</div>
      </div>
`;
  });

  return `<section class="stats">
${statsHtml}    </section>`;
}

function renderGallery(sectionNum, content) {
  const eyebrow = `${String(sectionNum).padStart(2, '0')} — GALLERY`;
  const imgs = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    imgs.push({ alt: m[1], src: m[2] });
  }
  if (imgs.length === 0) return '';
  let imgsHtml = '';
  imgs.forEach((img) => {
    imgsHtml += `        <img src="${escapeAttr(img.src)}" alt="${escapeAttr(img.alt)}">\n`;
  });
  return `<section class="gallery-section">
      <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
      <div class="gallery">
${imgsHtml}      </div>
    </section>`;
}

// ---- HTML helpers ----

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Main ----

function extractKeyword(heading) {
  const m = heading.match(/\((\w[\w-]*)\)\s*$/);
  return m ? m[1] : null;
}

function extractTitle(heading) {
  return heading.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

async function readInput() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  if (inputIdx !== -1) {
    return fs.readFileSync(args[inputIdx + 1], 'utf8');
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
  process.stderr.write('Usage: md-to-html.js --input <path.md> --output <path.html> | --stdin\n');
  process.exit(2);
}

function main() {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;

  readInput().then((raw) => {
    const { fm, body } = parseFrontmatter(raw);

    // Extract hero data from frontmatter (use hero.xxx sub-fields)
    const hero = fm.hero || {};
    const heroEyebrow = hero.eyebrow || `${String(fm.series || 'PRODUCT').toUpperCase()} · ${fm.volume || '04'}`;
    const heroTitle = hero.title || fm.title || 'Document Title';
    const heroSub = hero.sub || fm.summary || '';
    const heroMeta = hero.meta || `${fm.date || '2026'} · ${getSeason(fm.date)}`;

    // Build the HTML
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fm.title || 'Document')} — Product M</title>
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/reader.css">
</head>
<body>
  <!-- @meta
${JSON.stringify({
      title: fm.title || 'Document Title',
      series: fm.series || null,
      slug: fm.slug || 'document-slug',
      date: fm.date || '2026-01-01',
      tags: Array.isArray(fm.tags) ? fm.tags : (typeof fm.tags === 'string' ? [fm.tags] : []),
      summary: fm.summary || '',
      volume: fm.volume || '04',
    }, null, 4)}
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
      <div class="nav-meta">VOL. ${escapeHtml(String(fm.volume || '04'))} · ${escapeHtml(String(fm.date || '2026').slice(0, 4))}</div>
    </nav>

    <!-- 2. Hero -->
    <header class="hero">
      <div class="hero-eyebrow">${escapeHtml(heroEyebrow)}</div>
      <h1 class="hero-title">${heroTitle}</h1>
      <div class="hero-rule"></div>
      <p class="hero-sub">${escapeHtml(heroSub)}</p>
      <div class="hero-meta">${escapeHtml(heroMeta)}</div>
    </header>
${buildBody(body, fm)}
    <!-- 4. Footer card -->
    <aside class="footer-card">
      <div class="footer-card-row">
        <span class="footer-card-label">Series</span>
        <span class="footer-card-value">${escapeHtml(fm.series ? fm.series : 'All series')}</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Published</span>
        <span class="footer-card-value">${escapeHtml(String(fm.date || '2026-01-01'))}</span>
      </div>
      <div class="footer-card-row">
        <span class="footer-card-label">Volume</span>
        <span class="footer-card-value">${escapeHtml(String(fm.volume || '04'))}</span>
      </div>
    </aside>
  </div>
</body>
</html>
`;

    if (outputPath) {
      fs.mkdirSync(path.dirname(path.resolve(ROOT, outputPath)), { recursive: true });
      fs.writeFileSync(path.resolve(ROOT, outputPath), html, 'utf8');
      process.stdout.write(`Wrote ${outputPath}\n`);
    } else {
      process.stdout.write(html);
    }
  }).catch((err) => {
    process.stderr.write(`md-to-html.js crashed: ${err.message}\n`);
    process.exit(2);
  });
}

function buildBody(body, fm) {
  const sections = parseSections(body);
  if (sections.length === 0) return '';

  let html = '';
  let sectionNum = 1;

  for (const sec of sections) {
    const keyword = extractKeyword(sec.heading);
    const title = extractTitle(sec.heading);
    if (!keyword) continue; // skip untagged sections

    let rendered = '';
    switch (keyword) {
      case 'intro':
        rendered = renderIntro(sectionNum, sec.content);
        break;
      case 'spec-table':
        rendered = renderSpecTable(sectionNum, title, sec.content);
        break;
      case 'split-image':
        rendered = renderSplitImage(sectionNum, title, sec.content);
        break;
      case 'quote-pull':
        rendered = renderQuotePull(sec.content);
        break;
      case 'steps':
        rendered = renderSteps(sectionNum, title, sec.content);
        break;
      case 'stats':
        rendered = renderStats(sectionNum, sec.content);
        break;
      case 'gallery':
        rendered = renderGallery(sectionNum, sec.content);
        break;
    }
    if (rendered) {
      html += '\n    ' + rendered.replace(/\n/g, '\n    ') + '\n';
      sectionNum++;
    }
  }

  return html;
}

function getSeason(date) {
  if (!date) return '';
  const month = new Date(date + 'T00:00:00').getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'SPRING';
  if (month >= 6 && month <= 8) return 'SUMMER';
  if (month >= 9 && month <= 11) return 'AUTUMN';
  return 'WINTER';
}

main();

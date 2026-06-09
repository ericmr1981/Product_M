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
 *   POST /mcp        — JSON-RPC 2.0
 *   GET  /health     — { status: "ok", version: "0.1.0" }
 *   GET  /           — HTML page listing the tools (human-readable)
 *   POST /api/import — Remote document import (Ella agent)
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
const HOST = '0.0.0.0';
const VERSION = '0.1.0';
const IMPORT_KEY = process.env.PRODUCT_M_IMPORT_KEY || '';

// API request size limits
const MAX_HTML_SIZE = 500 * 1024;      // 500 KB
const MAX_ASSETS_TOTAL = 10 * 1024 * 1024; // 10 MB

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
    if (req.method === 'GET' && url.pathname === '/api/import/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', import_endpoint: true, version: VERSION }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/import') {
      await handleApiImport(req, res);
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

// =========================================================================
// POST /api/import — remote document import (Ella agent)
// =========================================================================

function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function safePath(targetPath, allowedPrefixes) {
  const prefixes = allowedPrefixes || ['docs/', 'planning/'];
  const ok = prefixes.some(p => targetPath.startsWith(p));
  if (!ok) {
    return { ok: false, reason: `path must start with ${prefixes.join(' or ')} (got ${targetPath})` };
  }
  if (targetPath.includes('..')) {
    return { ok: false, reason: `path traversal rejected: ${targetPath}` };
  }
  return { ok: true, abs: path.resolve(ROOT, targetPath) };
}

async function handleApiImport(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return jsonResponse(res, 400, { ok: false, error: 'failed to read request body' });
  }

  // Parse JSON
  let payload;
  try { payload = JSON.parse(body); } catch {
    return jsonResponse(res, 400, { ok: false, error: 'invalid JSON' });
  }

  // Auth
  if (!IMPORT_KEY) {
    return jsonResponse(res, 500, { ok: false, error: 'PRODUCT_M_IMPORT_KEY not configured on server' });
  }
  if (payload.api_key !== IMPORT_KEY) {
    return jsonResponse(res, 401, { ok: false, error: 'unauthorized: invalid api_key' });
  }

  // Validate required fields
  for (const field of ['md_source', 'html', 'slug', 'series', 'target_path', 'source_path']) {
    if (!payload[field]) {
      return jsonResponse(res, 400, { ok: false, error: `missing required field: ${field}` });
    }
  }

  // Validate series
  const validSeries = ['gelato', 'gelato-mix', 'gelato-shake', null];
  if (!validSeries.includes(payload.series)) {
    return jsonResponse(res, 400, { ok: false, error: `invalid series: ${payload.series}. Must be gelato, gelato-mix, gelato-shake, or null` });
  }

  // Path safety
  const target = safePath(payload.target_path);
  if (!target.ok) return jsonResponse(res, 400, { ok: false, error: target.reason });
  const source = safePath(payload.source_path, ['sources/', 'docs/', 'planning/']);
  if (!source.ok) return jsonResponse(res, 400, { ok: false, error: `source_path: ${source.reason}` });

  // Size limits
  if (Buffer.byteLength(payload.html, 'utf8') > MAX_HTML_SIZE) {
    return jsonResponse(res, 413, { ok: false, error: `HTML exceeds ${MAX_HTML_SIZE / 1024} KB limit` });
  }

  // Validate assets
  const assets = payload.assets || [];
  let assetsTotalSize = 0;
  for (const a of assets) {
    if (a.base64_content) {
      const decoded = Buffer.from(a.base64_content, 'base64');
      assetsTotalSize += decoded.length;
      // Extra safety: reject large decoded files
      if (decoded.length > 5 * 1024 * 1024) {
        return jsonResponse(res, 413, { ok: false, error: `asset ${a.local_path} exceeds 5 MB limit` });
      }
    }
  }
  if (assetsTotalSize > MAX_ASSETS_TOTAL) {
    return jsonResponse(res, 413, { ok: false, error: `assets total size exceeds ${MAX_ASSETS_TOTAL / 1024 / 1024} MB limit` });
  }

  // ---- Step 1: Validate HTML (before writing anything) ----
  const validateResult = runValidate({ html: payload.html });
  if (!validateResult.passed) {
    return jsonResponse(res, 422, { ok: false, validation: validateResult });
  }

  // ---- Step 2: Write MD source ----
  try {
    fs.mkdirSync(path.dirname(source.abs), { recursive: true });
    fs.writeFileSync(source.abs, payload.md_source, 'utf8');
  } catch (err) {
    return jsonResponse(res, 500, { ok: false, error: `failed to write MD source: ${err.message}` });
  }

  // ---- Step 3: Write HTML ----
  try {
    fs.mkdirSync(path.dirname(target.abs), { recursive: true });
    fs.writeFileSync(target.abs, payload.html, 'utf8');
  } catch (err) {
    // Rollback: remove MD if HTML write fails
    try { fs.unlinkSync(source.abs); } catch {}
    return jsonResponse(res, 500, { ok: false, error: `failed to write HTML: ${err.message}` });
  }

  // ---- Step 4: Decode and write assets ----
  const writtenAssets = [];
  const assetErrors = [];
  for (const a of assets) {
    if (!a.local_path || !a.base64_content) continue;
    // local_path must be relative to project and start with assets/
    if (a.local_path.includes('..')) {
      assetErrors.push(`rejected: ${a.local_path}`);
      continue;
    }
    const assetAbs = path.resolve(ROOT, a.local_path);
    if (!assetAbs.startsWith(path.resolve(ROOT, 'assets/')) && assetAbs !== path.resolve(ROOT, 'assets/')) {
      assetErrors.push(`not under assets/: ${a.local_path}`);
      continue;
    }
    try {
      const buf = Buffer.from(a.base64_content, 'base64');
      fs.mkdirSync(path.dirname(assetAbs), { recursive: true });
      fs.writeFileSync(assetAbs, buf);
      writtenAssets.push(a.local_path);
    } catch (err) {
      assetErrors.push(`${a.local_path}: ${err.message}`);
    }
  }

  // ---- Step 5: Rebuild index ----
  let indexOutput = '';
  let indexRebuilt = false;
  try {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/build-index.js')], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    indexOutput = out.trim();
    indexRebuilt = true;
  } catch (err) {
    indexOutput = (err.stderr || err.stdout || err.message).trim();
  }

  // ---- Step 6: Git diff summary ----
  let gitDiff = '';
  try {
    execFileSync('git', ['add', '-A', '.'], { cwd: ROOT, stdio: 'ignore' });
    const diffOut = execFileSync('git', ['diff', '--cached', '--stat'], { cwd: ROOT, encoding: 'utf8' });
    gitDiff = diffOut.trim();
  } catch {
    gitDiff = '(git diff not available)';
  }

  return jsonResponse(res, 200, {
    ok: true,
    written_to: payload.target_path,
    source_written_to: payload.source_path,
    validation: validateResult,
    index_rebuilt: indexRebuilt,
    index_output: indexOutput,
    git_diff_summary: gitDiff,
    assets_uploaded: writtenAssets,
    asset_errors: assetErrors.length ? assetErrors : undefined,
  });
}

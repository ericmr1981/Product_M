# Product M

A static editorial brand site for Product M's product documentation. Pure HTML + CSS, no build tools, no runtime.

## Adding a new document

1. Read the design spec: **`_design-system/SPEC.md`**
2. Copy the starting point: **`_design-system/template.html`**
3. Place the file in the right folder:
   - Product intro / spec sheet → `docs/<series-slug>/<slug>.html`
   - Planning / campaign → `planning/<slug>.html`
4. Fill in the `<!-- @meta {...} -->` frontmatter at the top
5. Run `npm run build-index` to refresh the site's index
6. Commit

Series slugs: `gelato`, `gelato-mix`, `gelato-shake`.

## Local preview

Just open `index.html` in a browser, or serve the project root with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Refreshing the index

After adding/removing/renaming documents:

```bash
npm run build-index
```

This scans all HTML files, parses the `<!-- @meta ... -->` frontmatter, and writes `index.json`. The site reads `index.json` to populate the homepage and series pages.

## Design system

- Design tokens (colors, type, spacing): `styles/tokens.css`
- Document body styles: `styles/reader.css`
- Site styles: `styles/site.css`
- Component snippets: `_design-system/components/`

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

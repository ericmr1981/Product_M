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

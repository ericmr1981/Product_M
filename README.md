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

# Product M — Agent Toolchain Design

**日期**: 2026-06-09
**状态**: 已批准
**目标读者**: 项目维护者 + 接入 MCP 的 AI agent

---

## 1. 目标

让另一个 AI agent 能**自助**地生成符合设计规范的 HTML 产品/企划文档并导入项目，同时**人**（项目维护者）也能直接用 CLI 完成同样工作。两类用户走同一套校验逻辑，不会出现"agent 通过但人看到出错"的不一致。

---

## 2. 形态决策

### 2.1 校验脚本 + MCP server 并存

**结论**：写两个 Node 脚本（`validate.js` + `import.js`），再写一个 MCP server（`mcp-server.js`）作为这两个脚本的协议层封装。

| 使用者 | 入口 | 行为 |
| --- | --- | --- |
| 接 MCP 的 AI agent | MCP 工具 | 调 `list_components` / `get_template` / `validate_doc` / `import_doc` |
| 没接 MCP 的 agent | CLI 命令 | 跑 `npm run validate` / `npm run import` |
| 人 | CLI 命令 | 同上 |

校验逻辑只在 `validate.js` 实现一次。`mcp-server.js` 通过 spawn 子进程调用 CLI — **不**重复实现。这样：
- CLI 失败 = MCP 失败，不可能两边结果不同
- CLI 可独立单测
- 不引第三方包（保持现有 `package.json` 的零依赖状态）

### 2.2 不做的事（YAGNI）

- ❌ 不引第三方包（MCP SDK / ajv / cheerio / jsdom）— 全部用 Node 内置 `fs` / `path` / `http` / `child_process`
- ❌ `import_doc` 不自动 commit（commit 是有意识决定）
- ❌ 不做 `delete_doc` / `update_doc`（删除和修改走 `git rm` + 重新 import 即可）
- ❌ 不做实时预览服务（CLI 跑完即可 `python3 -m http.server` 看）
- ❌ 不做图片上传/处理（agent 自己准备图片并放到 `assets/images/`）

---

## 3. 文件结构

新增/修改文件：

```
Product_M/
├── scripts/
│   ├── build-index.js           # 已存在，不改
│   ├── validate.js              # 新增
│   ├── import.js                # 新增
│   └── mcp-server.js            # 新增
├── _design-system/
│   ├── SPEC.md                  # 已存在
│   ├── template.html            # 已存在
│   ├── components/              # 已存在
│   └── PROMPTS.md               # 新增：给 agent 的工作流说明
├── mcp/
│   └── README.md                # 新增：如何接入 Claude / 其他 agent
├── package.json                 # 改：加 3 个 npm script
├── README.md                    # 改：加"How to use as an AI agent"一节
└── docs/superpowers/specs/
    └── 2026-06-09-mcp-toolchain-design.md   # 本文件
```

---

## 4. 4 个 MCP 工具

### 4.1 `list_components`

**输入**：无
**输出**：

```json
{
  "components": [
    { "name": "hero", "class": ".hero", "file": "_design-system/components/hero.html", "description": "Hero block with eyebrow, title, rule, sub, meta" },
    { "name": "intro", "class": ".intro", "file": "_design-system/components/intro.html", "description": "Opening lead paragraph" },
    ...
  ]
}
```

**实现**：读 `_design-system/components/*.html` 目录，提取每个文件的：
- 第一行注释里的 `Component: <name>`
- 第一个 `<* class="<class>">` 的 class 名
- 文件名（去掉 `.html`）

### 4.2 `get_template`

**输入**：
- `series` (string, optional): `gelato` / `gelato-mix` / `gelato-shake` / `null`

**输出**：

```json
{
  "html": "<!DOCTYPE html>... (template content) ...",
  "frontmatter_template": {
    "title": "...",
    "series": "<echoed series>",
    ...
  }
}
```

**实现**：直接读 `_design-system/template.html` 输出。如果 `series` 给出，在 frontmatter 模板里预填（让 agent 看到默认值后改）。

### 4.3 `validate_doc`

**输入**：
- `html` (string): 完整的 HTML 文档

**输出**：

```json
{
  "passed": true,
  "errors": [],
  "warnings": []
}
```

或失败时：

```json
{
  "passed": false,
  "errors": [
    { "rule": "no-emoji", "line": 12, "match": "🎯", "message": "Emoji found" }
  ],
  "warnings": []
}
```

**实现**：把 html 写到 `/tmp/validate-input.html`，spawn `node scripts/validate.js --file <tmpfile>`，读 stdout 解析 JSON。

### 4.4 `import_doc`

**输入**：
- `html` (string): 完整的 HTML 文档
- `path` (string): 相对项目根的写入路径，例如 `docs/gelato-shake/foo.html`

**输出**：

```json
{
  "ok": true,
  "written_to": "docs/gelato-shake/foo.html",
  "validation": { "passed": true, "errors": [], "warnings": [] },
  "index_rebuilt": true,
  "git_diff_summary": " 1 file changed, 142 insertions(+), 1 deletion(-)"
}
```

失败时（校验不过）：

```json
{
  "ok": false,
  "validation": { "passed": false, "errors": [...] }
}
```

**实现**：
1. 写入临时文件 `/tmp/import-source.html`
2. spawn `node scripts/import.js /tmp/import-source.html <path>` — import.js 会做校验+写入+build-index+git diff
3. 读 import.js 的 JSON 输出转发

---

## 5. 校验规则（`scripts/validate.js`）

7 类规则。每条规则一个函数，统一通过 `runRule(html, ctx)` 形式注册。

### Rule 1: frontmatter-presence

**检查**：`<!-- @meta { ... } -->` 存在；能 parse 成 JSON；含 `title/series/slug/date` 4 个字段。

**错误示例**：
```json
{ "rule": "frontmatter-presence", "message": "Missing <!-- @meta --> comment" }
{ "rule": "frontmatter-presence", "message": "Field 'slug' missing" }
```

### Rule 2: series-slug

**检查**：`series` 字段是 `gelato` / `gelato-mix` / `gelato-shake` / `null` 之一。

**错误**：
```json
{ "rule": "series-slug", "value": "Gelato Shake", "message": "Must be one of: gelato, gelato-mix, gelato-shake, null" }
```

### Rule 3: required-components

**检查**：文档包含 `nav-bar`、`hero`、至少 3 个正文组件（`intro` / `spec-section` / `split` / `quote-pull` / `steps` / `stats` / `gallery-section`）、`footer-card`。

**错误**：
```json
{ "rule": "required-components", "missing": ["footer-card"] }
```

### Rule 4: no-emoji

**检查**：HTML 内容中不含 emoji。检测范围：
- `U+1F300` – `U+1FAFF`（主 emoji 区）
- `U+2600` – `U+27BF`（符号，含 ☀ ★ 等）
- `U+1F000` – `U+1F1FF`（麻将 / 扑克 / 旗帜）

**错误**：
```json
{ "rule": "no-emoji", "line": 12, "match": "🎯", "message": "Emoji found in eyebrow text" }
```

### Rule 5: no-centered-headings

**检查**：任何 `h1` / `h2` / `h3` 没有 `style="text-align: center"` 或 `align="center"` 属性。

**错误**：
```json
{ "rule": "no-centered-headings", "line": 8, "match": "<h1 style=\"text-align: center\">" }
```

### Rule 6: no-external-resources

**检查**：
- `<link rel="stylesheet" href="...">` 的 href 必须以 `/styles/` 开头（允许 `/styles/base.css` 和 `/styles/reader.css`）
- `<script src="...">` 不允许（agent 不应引外部 JS）
- `<img src="...">` 必须以 `/assets/` 开头

**错误**：
```json
{ "rule": "no-external-resources", "line": 5, "match": "https://cdn.example.com/style.css", "message": "External CSS not allowed" }
{ "rule": "no-external-resources", "line": 14, "match": "src=\"https://...\"", "message": "External <script> not allowed" }
```

### Rule 7: no-hardcoded-tokens

**检查**：内联 `style` 属性里不能有：
- `#hex` 颜色（`#ff0000` / `#333`）
- `rgb(` / `rgba(` / `hsl(`
- `font-size: 数字px`（必须用 `var(--fs-*)`）
- `padding:` / `margin:` 用 px 数字（必须用 `var(--sp-*)` 或 rem）

允许：写 `style="display: grid"` 之类的非视觉属性。检查范围限于内联 `style=""`，不查 `<style>` 块（CSS 文件已经按规则写好）。

**错误**：
```json
{ "rule": "no-hardcoded-tokens", "line": 9, "match": "color: #ff0000", "message": "Use var(--*) instead of hex" }
```

### 警告（不阻塞，但建议修复）

- `<img>` 没有 `alt` 属性 → 警告 `missing-alt`
- frontmatter 里有未识别字段 → 警告 `unknown-field`
- 文件名含大写或下划线 → 警告 `filename-style`（应在文件名检查里，但这里也覆盖）

---

## 6. 导入脚本（`scripts/import.js`）

行为顺序：

1. **读源文件**（从 CLI 参数拿）
2. **复制到目标路径**（第二个 CLI 参数，相对项目根）
3. **就地跑 validate**（用文件路径，节省一次 IO）
4. **失败 → 删目标文件**（避免留下半成品），退出码 1
5. **成功 → spawn build-index.js** 刷新 `index.json`
6. **输出 git diff 摘要**（`git diff --stat`）
7. **退出码 0**

CLI：

```bash
node scripts/import.js <source-html> <target-relative-path>
```

输出（stdout）：

```json
{
  "ok": true,
  "written_to": "docs/gelato-shake/foo.html",
  "validation": { "passed": true, "errors": [], "warnings": [] },
  "index_rebuilt": true,
  "git_diff_summary": " docs/gelato-shake/foo.html | 142 +++++... index.json | 12 +-..."
}
```

---

## 7. MCP server（`scripts/mcp-server.js`）

### 7.1 协议

手写 JSON-RPC 2.0 over HTTP。监听 `127.0.0.1:7331`（端口可配置）。

3 个 endpoint：
- `POST /mcp` — JSON-RPC 请求
- `GET /health` — `{"status": "ok", "version": "0.1.0"}`
- `GET /` — 简单 HTML 页面，列出 4 个工具的描述（人类可读）

请求格式（JSON-RPC 2.0）：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "validate_doc",
    "arguments": { "html": "<!DOCTYPE html>..." }
  }
}
```

响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "passed": false, "errors": [...] }
}
```

### 7.2 启动

```bash
npm run mcp
# 输出: MCP server listening on http://127.0.0.1:7331
#        Tools: list_components, get_template, validate_doc, import_doc
```

### 7.3 工具到 CLI 的映射

| 工具 | 内部实现 |
| --- | --- |
| `list_components` | `fs.readdir` 列出 components 目录，正则提取注释和 class |
| `get_template` | `fs.readFile` 读 template.html |
| `validate_doc` | 写 `/tmp/v.html` → spawn `node scripts/validate.js --file <tmp>` |
| `import_doc` | 写 `/tmp/i.html` → spawn `node scripts/import.js <tmp> <path>` |

每个 tool 调用都有 `try/catch`，错误转 JSON-RPC error 响应（code -32603 internal error）。

---

## 8. 给 agent 的工作流文档（`_design-system/PROMPTS.md`）

直接可复制进 agent system prompt 的工作流说明。结构：

```markdown
# Product M 文档生成工作流

你正在为一个品牌刊物站点（Product M）生成 HTML 文档。
所有视觉规则在 `_design-system/SPEC.md` — 读它。
本工作流假设你能调用 Product M MCP 提供的 4 个工具。

## 4 步流程

### 1. 获取骨架
调用 get_template(series="gelato" | "gelato-mix" | "gelato-shake" | null)，
拿到 HTML 骨架和 frontmatter 默认值。

### 2. 填内容
按 SPEC §3-§5 拼装正文：nav-bar → hero → 至少 3 个正文组件 → footer-card。
**禁止**：emoji、居中标题、外部 CSS/JS、硬编码颜色或 px 字号。

### 3. 校验
调用 validate_doc(html=<你的完整 HTML>)。
- passed: true → 进 step 4
- passed: false → 按 errors 列表逐条修正后重试
  最多重试 5 次，5 次仍失败 → 停下并把错误报告给用户

### 4. 导入
调用 import_doc(html=<>, path="docs/<series>/<slug>.html")。
- ok: true → 把返回的 git_diff_summary 转给用户，让人决定 commit
- ok: false → 校验失败的 errors 给人看，**不**写文件
```

---

## 9. mcp/README.md

简短说明如何把 server 接入 Claude（macOS / Linux / Windows 各一段）。

示例配置（macOS）：

```json
// ~/.config/claude/mcp.json
{
  "mcpServers": {
    "product-m": {
      "command": "node",
      "args": ["/Users/ericmr/Documents/GitHub/Product_M/scripts/mcp-server.js"],
      "cwd": "/Users/ericmr/Documents/GitHub/Product_M"
    }
  }
}
```

接入后 Claude 就能在工具列表里看到 4 个 Product M 工具。

---

## 10. package.json 改动

新增 scripts：

```json
{
  "scripts": {
    "build-index": "node scripts/build-index.js",
    "validate": "node scripts/validate.js",
    "import": "node scripts/import.js",
    "mcp": "node scripts/mcp-server.js"
  }
}
```

`engines.node >= 18` 不变（用了 `fs` / `path` / `http` 即可）。

---

## 11. README.md 改动

加一节"How to use as an AI agent"在现有 README 末尾：

```markdown
## How to use as an AI agent

Two ways to use this project as an AI agent:

### 1. With MCP (recommended)
Start the MCP server:
\`\`\`bash
npm run mcp
\`\`\`
Add to your Claude MCP config:
\`\`\`json
{
  "mcpServers": {
    "product-m": {
      "command": "node",
      "args": ["/abs/path/to/Product_M/scripts/mcp-server.js"]
    }
  }
}
\`\`\`
You'll get 4 tools: list_components, get_template, validate_doc, import_doc.

### 2. With CLI
\`\`\`bash
npm run validate -- --file <your-html>
npm run import -- <source-html> <target-path>
\`\`\`
Example:
\`\`\`bash
node scripts/import.js /tmp/draft.html docs/gelato-shake/foo.html
\`\`\`

See `_design-system/PROMPTS.md` for the recommended workflow.
```

---

## 12. 验收标准

完成时满足：

- [ ] `npm run validate -- --file docs/gelato/classic-vanilla.html` 退出码 0
- [ ] `npm run validate -- --file planning/2026-summer-launch.html` 退出码 0
- [ ] 把 docs/gelato/classic-vanilla.html 复制一份故意加个 🎯 emoji，`validate --file <新文件>` 退出码 1，errors 里能看到 no-emoji
- [ ] 把海盐荔枝芒芒产品 doc 复制一份故意删 footer-card，validate 报错 required-components
- [ ] `node scripts/import.js /tmp/clean.html docs/gelato/foo.html` 成功，文件存在，index.json 已更新，git diff 摘要正确
- [ ] `node scripts/import.js /tmp/dirty.html docs/gelato/foo.html`（脏文件）退出码 1，foo.html 不存在
- [ ] `npm run mcp` 启动后 `curl http://127.0.0.1:7331/health` 返回 `{"status": "ok"}`
- [ ] `curl -X POST http://127.0.0.1:7331/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"validate_doc","arguments":{"html":"<!DOCTYPE html>..."}}}'` 返回有效 JSON 响应
- [ ] 整个项目（不含 fonts）du -sh < 1MB

---

## 13. 未来扩展（不做但记下）

- 多个 MCP 端口并行（让多个 agent 同时跑）
- watcher 模式：`npm run watch` 检测 `docs/` 变化自动跑 build-index
- LSP-style 的"实时校验"，agent 编辑时流式返回错误
- 支持更多 frontmatter 字段（author / version / 等）
- 文档版本对比（diff two versions）
- Web UI（用本地服务开个可视化编辑器）

---

## 14. 关键风险

1. **HTML 解析用 regex 够不够？**
   - 我们的 SPEC 极严（限定 10 个 class、限定 3 个 link、限定路径前缀）— 适合 regex
   - 真遇到嵌套 `<style>` / `<script>` 含 HTML 文本会出错 → 解决：先剥 `<style>` 和 `<script>` 内容再做匹配
2. **JSON-RPC 手写稳定性**
   - 标准消息小且固定，30 行内能写完
   - 边界：JSON encode error、长字符串截断 — 通过 `JSON.stringify` 的天然错误抛出处理
3. **MCP server 端口冲突**
   - 用 7331（少见端口）；启动失败时打印明确错误
4. **agent 调 import_doc 后** `git diff` 出现意外文件
   - 风险：临时文件路径用 `/tmp/` 不会被误提交
   - 二次保险：import.js 在最后跑 `git status --porcelain` 确认只动了预期文件

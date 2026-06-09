# Product M 文档生成工作流

你正在为一个品牌刊物站点（Product M）生成 HTML 文档。设计规则在同目录的 `SPEC.md` — 读它。

## 4 步流程

### 1. 获取骨架

调用 `get_template(series="gelato" | "gelato-mix" | "gelato-shake" | null)`，拿到 HTML 骨架和 frontmatter 默认值。

- 选 `null` 用于企划书（路径 `planning/<slug>.html`）
- 选具体系列用于产品介绍（路径 `docs/<series>/<slug>.html`）

### 2. 填内容

按 SPEC §3-§5 拼装正文：

```
nav-bar → hero → 至少 3 个正文组件 → footer-card
```

正文组件的 7 种选择：`intro` / `spec-section`(spec-table) / `split`(split-grid) / `quote-pull` / `steps`(step-list) / `stats` / `gallery-section`(gallery)。

**禁止**：

- emoji（用等宽编号 01/02/03 代替）
- 居中标题
- 外部 CSS/JS 引用
- 硬编码颜色（`#hex`、`rgb()`）或 px 字号
- 用 Tailwind / Bootstrap 等类名
- 任何 JavaScript 框架

### 3. 校验

调用 `validate_doc(html=<你的完整 HTML>)`。

- `passed: true` → 进 step 4
- `passed: false` → 按 `errors` 列表逐条修正后重试

最多重试 5 次。5 次仍失败 → 停下，把错误报告给用户，**不**导入。

### 4. 导入

调用 `import_doc(html=<>, path="docs/<series>/<slug>.html" | "planning/<slug>.html")`。

- `ok: true` → 把返回的 `git_diff_summary` 转给用户，让人决定是否 commit（**不**自动 commit）
- `ok: false` → 把 `validation.errors` 给人看，**不**写文件

## 路径约定

| 类型 | 路径 |
| --- | --- |
| 产品介绍 | `docs/<series>/<slug>.html` |
| 企划书 / 品牌物料 | `planning/<slug>.html` |

`<slug>` 小写英文 + 连字符（用 pinyin，不用中文）。

## 失败兜底

如果 `get_template` 不可用（agent 突然掉线 / MCP 服务挂了），可以直接读 `_design-system/template.html` 本地副本手动开始。

如果 `validate_doc` 不可用但 `import_doc` 可用，import_doc 会做校验，错误也会在结果里返回。

如果都不可用，回退到：把 HTML 写到 `docs/<series>/<slug>.html`，然后跑 `npm run validate -- --file <path>`，再跑 `npm run build-index`。详见 `mcp/README.md`。

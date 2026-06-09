# Product M — 品牌宣传文档展示站

**日期**: 2026-06-09
**状态**: 已批准
**目标读者**: AI agent（生成产品说明书 HTML）+ 项目维护者

---

## 1. 目标与范围

### 1.1 一句话

Product M 是一个**纯静态**品牌刊物站点，承载三个产品系列（**Gelato / Gelato Mix / Gelato Shake**）的企划书、产品介绍与品牌宣传物料。AI agent 按照 `SPEC.md` 写出的 HTML 拖进 `docs/` 即可被站点原样呈现，视觉与首页一致。

### 1.2 设计定位

- **风格**：编辑式（Editorial）— 杂志感、克制、宽留白
- **主色**：森林绿 `#1f3a2e`
- **目标受众**：客户、经销商、内部销售 — 需要"被认真对待"的品牌印象

### 1.3 内容类型

| 类型 | 存放目录 | 用途 |
| --- | --- | --- |
| 产品介绍 / 规格书 | `docs/<系列>/` | 客户、经销商使用 |
| 企划书 / 营销方案 | `planning/` | 内部使用 |
| 品牌宣传物料 | `docs/<系列>/` 或 `planning/` | 通用 |

类型不强制区分路径；路径只按"产品系列"组织。所有元信息写在每个 HTML 的 `<head>` 注释里。

---

## 2. 技术决策

### 2.1 为什么是纯静态

- **零构建**：agent 输出 HTML → 放进 `docs/` → 浏览器直接访问，无中间步骤
- **零运行时**：不用 React/Vue/任何框架；站点读取一个 JSON 索引做展示
- **零依赖部署**：Vercel / Netlify / GitHub Pages / 任何静态服务器都能跑

### 2.2 索引方案

- `index.json` 是全站文档清单（首页、系列页、相关推荐都从这里取数）
- `scripts/build-index.js` 扫描 `docs/` 和 `planning/` 目录，提取每个 HTML 的 frontmatter（写在 `<!-- @meta {...} -->` 注释里），覆盖 `index.json`
- 新增/修改文档后运行：`node scripts/build-index.js`
- 提交到 git

### 2.3 字体加载

- 全部自托管（避免外部依赖）
- 字体文件位于 `assets/fonts/`，CSS 在 `styles/tokens.css` 中通过 `@font-face` 引入
- 选 Noto Serif SC（标题）+ Noto Sans SC（正文）+ JetBrains Mono（数字/编号）— 三套都是 Google 开源字体，免费商用

### 2.4 不做的事

- ❌ 任何前端框架（React / Vue / Svelte）
- ❌ 任何构建工具（Vite / Webpack / 11ty / Astro）
- ❌ 任何 CSS 框架（Tailwind / Bootstrap）
- ❌ 任何运行时（Node / Deno 服务端渲染）
- ❌ 数据库、用户系统、评论

---

## 3. 项目结构

```
Product_M/
├── index.html                  # 品牌故事式首页
├── index.json                  # 全站文档索引（脚本生成）
├── docs/                       # 按产品系列组织的产品介绍
│   ├── gelato/
│   │   ├── classic-vanilla.html
│   │   ├── dark-chocolate.html
│   │   └── pistachio.html
│   ├── gelato-mix/
│   │   └── berry-medley.html
│   └── gelato-shake/
│       └── mocha-shake.html
├── planning/                   # 企划书与品牌物料
│   └── 2026-summer-launch.html
├── series/                     # 三个系列页（自动生成？不，手写）
│   ├── gelato.html
│   ├── gelato-mix.html
│   └── gelato-shake.html
├── _design-system/             # agent 必读
│   ├── SPEC.md                 # 设计规范主文档
│   ├── template.html           # 通用 HTML 骨架（agent 复制起点）
│   └── components/             # 组件 HTML 片段
│       ├── hero.html
│       ├── intro.html
│       ├── spec-table.html
│       ├── split-image.html
│       ├── quote-pull.html
│       ├── step-list.html
│       ├── stats-row.html
│       ├── gallery.html
│       ├── footer-card.html
│       └── nav-bar.html
├── assets/
│   ├── fonts/
│   │   ├── NotoSerifSC-*.woff2
│   │   ├── NotoSansSC-*.woff2
│   │   └── JetBrainsMono-*.woff2
│   └── images/                 # 通用图片素材
├── styles/
│   ├── tokens.css              # 设计变量（颜色/字体/间距）
│   ├── base.css                # 重置 + 基础排版
│   ├── site.css                # 站点级（首页/系列页）
│   └── reader.css              # 文档正文样式（agent 文档用）
├── scripts/
│   └── build-index.js          # 扫描 docs/ 刷新 index.json
├── .gitignore
└── README.md
```

### 3.1 命名约定

- 文件名一律英文小写 + 连字符（`classic-vanilla.html`，不用 `Classic_Vanilla.html` 或中文）
- 路径用系列 slug：`gelato` / `gelato-mix` / `gelato-shake`
- 文件夹名 slug 与系列页 `series/<slug>.html` 一一对应

---

## 4. 视觉设计系统

### 4.1 设计 Tokens（写在 `styles/tokens.css`）

```css
:root {
  /* 颜色 */
  --ink: #1f3a2e;           /* 主色：森林绿 */
  --ink-soft: #3a5a4a;      /* 次级绿：链接/副标题 */
  --ink-muted: #6b7a72;     /* 弱化：元信息/页脚 */
  --paper: #f5f3eb;         /* 背景：米色纸面 */
  --paper-deep: #ebe7d8;    /* 卡片/分组背景 */
  --rule: #d8d3c4;          /* 分隔线 */
  --highlight: #b8a878;     /* 点缀金：用于数字徽章/重点标注 */
  --on-ink: #f5f3eb;        /* 深底上的文字色 */

  /* 字体栈 */
  --font-serif: 'Noto Serif SC', 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Noto Sans SC', 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;

  /* 字号 (rem) */
  --fs-xs: 0.75rem;   /* 12px - 标签 */
  --fs-sm: 0.875rem;  /* 14px - 辅助 */
  --fs-base: 1rem;    /* 16px - 正文 */
  --fs-md: 1.125rem;  /* 18px - 强调正文 */
  --fs-lg: 1.5rem;    /* 24px - 小标题 */
  --fs-xl: 2rem;      /* 32px - 章节 */
  --fs-2xl: 3rem;     /* 48px - 页面标题 */
  --fs-3xl: 4.5rem;   /* 72px - Hero */
  --fs-display: 6rem; /* 96px - 杂志封面 */

  /* 间距 (rem) */
  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-6: 1.5rem;
  --sp-8: 2rem;
  --sp-12: 3rem;
  --sp-16: 4rem;
  --sp-24: 6rem;
  --sp-32: 8rem;

  /* 容器 */
  --max-width: 1280px;
  --content-width: 720px;     /* 文档正文行宽 */
  --gutter: 2rem;             /* 移动端内边距 */
}
```

### 4.2 排版规则（SPEC.md 中必须强调）

1. **正文行宽 ≤ 720px** — 阅读节奏；长行宽会疲劳
2. **段间距 ≥ 段内行高** — 段落之间有呼吸
3. **章节用大号编号** — `01` `02` `03`，等宽字体，森林绿色
4. **不首行缩进** — 编辑式排版不缩进
5. **标题永远左对齐** — 禁用 `text-align: center` 的标题
6. **关键引文用斜体 + 大字号** — 像杂志抽出语
7. **图片永远占满容器宽度** — 不缩进到文字侧
8. **不使用 emoji 作图标**

### 4.3 颜色使用规则

| 元素 | 颜色 |
| --- | --- |
| 页面背景 | `var(--paper)` |
| 正文 | `var(--ink)` |
| 副标题/小标题 | `var(--ink-soft)` |
| 元信息/页脚/日期 | `var(--ink-muted)` |
| 分隔线 | `var(--rule)` |
| 链接/按钮（hover） | `var(--ink)`，下划线为 `var(--ink-soft)` |
| 重点数字徽章 | `var(--highlight)` |
| Hero 块反白（深底浅字） | `background: var(--ink); color: var(--on-ink);` |

**禁止**：纯黑、纯白背景、饱和的彩色块（红/蓝/绿/紫等）、彩虹渐变。

### 4.4 字体使用规则

| 场景 | 字体 |
| --- | --- |
| 页面大标题 / Hero | `var(--font-serif)`，可 italic |
| 章节标题 (h2/h3) | `var(--font-serif)`，常规 weight |
| 正文 / 段落 / 列表 | `var(--font-sans)` |
| 按钮 / 导航 / 标签 | `var(--font-sans)`，letter-spacing: 0.05em |
| 编号 / 数字 / 元数据 | `var(--font-mono)` |

---

## 5. 组件库（10 个组件）

所有组件的 HTML 片段放在 `_design-system/components/` 下，agent 直接复制并修改内容。组件 CSS 写在 `styles/reader.css`（文档页用）+ `styles/site.css`（首页/系列页用）。

### 5.1 `nav-bar` — 顶部导航

```html
<nav class="nav-bar">
  <a href="/" class="nav-brand">Product M</a>
  <ul class="nav-links">
    <li><a href="/">首页</a></li>
    <li><a href="/series/gelato.html">Gelato</a></li>
    <li><a href="/series/gelato-mix.html">Gelato Mix</a></li>
    <li><a href="/series/gelato-shake.html">Gelato Shake</a></li>
    <li><a href="/planning/">企划</a></li>
  </ul>
  <div class="nav-meta">VOL. 04 · 2026</div>
</nav>
```

### 5.2 `hero` — 杂志封面

```html
<header class="hero">
  <div class="hero-eyebrow">VOL. 04 · GELATO SERIES</div>
  <h1 class="hero-title">The Quiet<br><em>Authority</em></h1>
  <div class="hero-rule"></div>
  <p class="hero-sub">A study in restraint, in three flavors.</p>
  <div class="hero-meta">2026 · SPRING</div>
</header>
```

### 5.3 `intro` — 大引文开场

```html
<section class="intro">
  <p class="intro-eyebrow">01 — INTRODUCTION</p>
  <p class="intro-lead">
    We make ice cream the way it used to be made — slowly, in small batches,
    with ingredients you can pronounce.
  </p>
</section>
```

### 5.4 `spec-table` — 产品参数表

```html
<section class="spec-section">
  <p class="section-eyebrow">02 — SPECIFICATIONS</p>
  <table class="spec-table">
    <tr><th>Flavor</th><td>Classic Vanilla</td></tr>
    <tr><th>Base</th><td>Madagascar Bourbon</td></tr>
    <tr><th>Fat content</th><td>12% min.</td></tr>
    <tr><th>Net weight</th><td>120g / cup</td></tr>
    <tr><th>Shelf life</th><td>18 months frozen</td></tr>
  </table>
</section>
```

### 5.5 `split-image` — 图文对开

```html
<section class="split">
  <p class="section-eyebrow">03 — THE PROCESS</p>
  <div class="split-grid">
    <figure class="split-image">
      <img src="/assets/images/gelato-process.jpg" alt="Process">
    </figure>
    <div class="split-text">
      <h2>Slow-churned, never rushed</h2>
      <p>Each batch spends 48 hours in the pasteurizer...</p>
    </div>
  </div>
</section>
```

### 5.6 `quote-pull` — 抽出式引文

```html
<blockquote class="quote-pull">
  <p>"Ice cream should taste like the place it came from."</p>
  <cite>— Founder, 2019</cite>
</blockquote>
```

### 5.7 `step-list` — 制作流程

```html
<section class="steps">
  <p class="section-eyebrow">04 — METHOD</p>
  <ol class="step-list">
    <li class="step">
      <span class="step-num">01</span>
      <h3>Source</h3>
      <p>Vanilla pods from Sava region, hand-selected.</p>
    </li>
    <li class="step">
      <span class="step-num">02</span>
      <h3>Steep</h3>
      <p>Pods steep in cream for 72 hours at 4°C.</p>
    </li>
    <li class="step">
      <span class="step-num">03</span>
      <h3>Churn</h3>
      <p>Slow-churned at -2°C for 25 minutes.</p>
    </li>
  </ol>
</section>
```

### 5.8 `stats-row` — 数字带

```html
<section class="stats">
  <div class="stat">
    <div class="stat-num">48<small>hr</small></div>
    <div class="stat-label">Pasteurization time</div>
  </div>
  <div class="stat">
    <div class="stat-num">12<small>%</small></div>
    <div class="stat-label">Minimum fat content</div>
  </div>
  <div class="stat">
    <div class="stat-num">0</div>
    <div class="stat-label">Artificial flavors</div>
  </div>
</section>
```

### 5.9 `gallery` — 网格画廊

```html
<section class="gallery-section">
  <p class="section-eyebrow">05 — GALLERY</p>
  <div class="gallery">
    <img src="/assets/images/g-1.jpg" alt="">
    <img src="/assets/images/g-2.jpg" alt="">
    <img src="/assets/images/g-3.jpg" alt="">
    <img src="/assets/images/g-4.jpg" alt="">
  </div>
</section>
```

### 5.10 `footer-card` — 系列信息卡 / 文档元信息

```html
<aside class="footer-card">
  <div class="footer-card-row">
    <span class="footer-card-label">Series</span>
    <span class="footer-card-value">Gelato</span>
  </div>
  <div class="footer-card-row">
    <span class="footer-card-label">Published</span>
    <span class="footer-card-value">2026-04-12</span>
  </div>
  <div class="footer-card-row">
    <span class="footer-card-label">Volume</span>
    <span class="footer-card-value">04</span>
  </div>
</aside>
```

---

## 6. agent 必读：`SPEC.md` 内容大纲

`_design-system/SPEC.md` 是给生成产品说明书的 agent 看的"宪法"，包含：

1. **品牌身份** — Product M，做 Gelato 三系列的克制品牌；编辑式刊物
2. **设计 token 速查表** — 5 个最常用变量（背景色、主色、字体、间距、容器宽）
3. **必用组件** — 上述 10 个组件的"什么场景用什么"的指引
4. **必带结构** — 每个 HTML 必须有：`nav-bar` → `hero` → 至少 3 个正文组件 → `footer-card`
5. **必带 frontmatter** — `<!-- @meta { ... } -->` 注释，含 title / series / slug / date / tags / summary
6. **禁止清单** — 8 条：禁 emoji、禁渐变、禁居中标题、禁纯黑纯白、禁侧栏布局、禁 Tailwind 类名、禁外部 CSS 框架、禁 JS 框架
7. **复制起点** — `template.html` 是骨架，agent 复制后只改内容
8. **自检清单** — 上传前 agent 必须检查的 6 项

### 6.1 frontmatter 格式

每个文档 HTML 顶部 `<!-- @meta {...} -->`：

```html
<!-- @meta
{
  "title": "Classic Vanilla",
  "series": "gelato",
  "slug": "classic-vanilla",
  "date": "2026-04-12",
  "tags": ["signature", "vanilla"],
  "summary": "Single-origin Madagascar vanilla, slow-churned.",
  "volume": "04"
}
-->
```

`build-index.js` 解析这个注释写入 `index.json`。

---

## 7. 页面规划

### 7.1 首页 `index.html`

- **首屏**（`hero`）：品牌名 `Product M` + tagline + VOL/季度
- **品牌叙事**（`intro`）：3-4 段宽边距正文
- **系列入口**：3 个系列卡片
- **最新发布**：横向时间线 3-4 篇
- **页脚**：版权 + 联系方式

### 7.2 系列页 `series/<slug>.html`

- 系列封面（`hero`，eyebrow 写系列名）
- 系列简介（`intro`）
- 该系列下的文档网格（卡片）

### 7.3 文档页 `<系列>/<slug>.html`

- `nav-bar`
- `hero`（文档标题）
- 正文（`intro` / `split-image` / `spec-table` / `quote-pull` / `step-list` / `stats` / `gallery` 自由组合）
- `footer-card`（系列/日期/卷号）
- 相关推荐（同系列其他文档卡片 2-3 张）

### 7.4 企划索引页 `planning/index.html`

- 与系列页同结构
- 列出所有企划书

---

## 8. 关键文件契约

### 8.1 `styles/tokens.css`

唯一的设计变量定义文件。所有其他 CSS 文件都从这里 `var(--*)`。agent 生成 HTML 时也只能用这些变量（不能硬编码颜色/字号）。

### 8.2 `styles/reader.css`

文档正文专用样式。定义 10 个组件的视觉表现。任何 agent 生成的 HTML 只要 class 名对上（`.hero`、`.spec-table`、`.quote-pull`…），立即获得正确样式。

### 8.3 `index.json` 形状

```json
{
  "generated": "2026-06-09T12:00:00Z",
  "documents": [
    {
      "title": "Classic Vanilla",
      "path": "docs/gelato/classic-vanilla.html",
      "series": "gelato",
      "slug": "classic-vanilla",
      "date": "2026-04-12",
      "tags": ["signature", "vanilla"],
      "summary": "Single-origin Madagascar vanilla, slow-churned.",
      "volume": "04"
    }
  ],
  "series": [
    {
      "slug": "gelato",
      "name": "Gelato",
      "description": "The original — slow-churned, low-air, intense.",
      "count": 0
    }
  ]
}
```

### 8.4 `scripts/build-index.js` 行为

- 读 `docs/**.html` 和 `planning/**.html`（递归）
- 解析每个文件顶部 `<!-- @meta ... -->` 注释
- 聚合到 `index.json`
- 统计每个系列的文档数
- 不抛错：缺 meta 的文件打印警告并跳过

---

## 9. 交付物

实施时需要一次产出：

1. **项目脚手架**：所有目录、`package.json`（仅 dev dep 用来跑 build-index）、`.gitignore`、`README.md`
2. **设计系统**：
   - `styles/tokens.css` / `base.css` / `site.css` / `reader.css`
   - `_design-system/SPEC.md`
   - `_design-system/template.html`
   - `_design-system/components/*.html`（10 个片段）
3. **脚本**：`scripts/build-index.js`
4. **首页 + 系列页**：
   - `index.html`
   - `series/gelato.html` / `series/gelato-mix.html` / `series/gelato-shake.html`
5. **示范文档**（2 篇产品介绍 + 1 篇企划书）：
   - `docs/gelato/classic-vanilla.html`
   - `docs/gelato-shake/mocha-shake.html`
   - `planning/2026-summer-launch.html`
6. **示例资源**：`assets/images/` 下放置 3-5 张占位图（Unsplash 链接或本地 placeholder），证明图片组件能工作

---

## 10. 验收标准

完成时满足：

- [ ] 浏览器打开 `index.html` 看到品牌故事式首页，森林绿基调，编辑式排版
- [ ] 三个系列页可访问，显示该系列下的所有文档
- [ ] 三篇示范文档（2 介绍 + 1 企划）打开后视觉与首页一致
- [ ] 把任意一篇新 HTML 放入 `docs/<系列>/`，运行 `node scripts/build-index.js` 后，新文档出现在首页"最新发布"和对应系列页
- [ ] 没有任何 emoji、纯黑/纯白、居中堆叠、彩色块
- [ ] 整个项目 `du -sh` < 5MB（不含字体文件本身）
- [ ] `package.json` 里 dev 依赖只有 `node` 本身（用内置 fs 即可，不需要第三方包）
- [ ] README 写明：如何新增一篇文档 / 如何运行 build-index / agent 必读 SPEC.md 在哪

---

## 11. 未来扩展（YAGNI 列表 — 不做但记下）

> 这些是有意不做、留给未来评估的。实施时**不**要主动加。

- 多语言（i18n）
- 全文搜索
- RSS 订阅
- PDF 导出
- 图片懒加载（手写 `loading="lazy"` 即可，不引库）
- 暗色主题（编辑式品牌与暗色主题有冲突，**不做**）
- 评论 / 点赞
- 文档版本历史
- A/B 测试
- 分析（GA / Plausible）

---

## 12. 关键风险

1. **agent 写 HTML 时偷工减料**（用居中标题、加 emoji、引入 Tailwind 类名）
   - 缓解：SPEC.md 的"禁止清单"和"自检清单"要硬
2. **字体文件大**（Noto SC 单字重 5-10MB）
   - 缓解：只引入需要的字重（serif 400/600、sans 400/500、mono 400），不引 italic
3. **静态站点没有路由**：系列页/企划页是手写 HTML
   - 接受：当前 3 系列规模下，手写是 YAGNI 胜利
4. **图片管理**：agent 生成的 HTML 引用的图片路径要对
   - 缓解：约定 `assets/images/<系列>/<slug>-1.jpg`，agent 用相对路径

---

## 附录 A：自检清单（写进 SPEC.md）

agent 提交前自检：

1. [ ] 顶部 `<!-- @meta {...} -->` 注释完整（5 个字段）
2. [ ] 使用了 `nav-bar` 组件
3. [ ] 使用了 `hero` 组件
4. [ ] 正文至少 3 个组件
5. [ ] 文末有 `footer-card`
6. [ ] 没有 emoji、居中标题、纯黑/纯白、彩色块、外部 CSS 框架
7. [ ] 所有颜色/字号都通过 `var(--*)` 引用，没硬编码
8. [ ] 图片用相对路径

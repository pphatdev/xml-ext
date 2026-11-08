# XML Pro Toolkit — Browser Extension & Web Studio

A fast, comprehensive, client-side **XML Extension & Workbench** built with modern ES Modules and Manifest V3. Features an advanced code editor, interactive DOM tree visualizer, real-time linter, statistical analyzer, minifier, sitemap generator, validator, and multi-format converters.

---

## 🚀 Features

- **Editor**:
  - Full code editor with dynamic line numbers, indent guides, and status bar (line, column, bytes).
  - Prettify / Format with 2-space indentation and tag alignment.
  - Find & Replace bar with match counter (`Ctrl+F` / `Cmd+F`).
  - Multi-line indentation with `Tab` / `Shift+Tab`.
  - Undo (`Ctrl+Z`) / Redo (`Ctrl+Y` / `Ctrl+Shift+Z`).
  - One-click copy, download, and sample loader (Catalog, Sitemap, RSS, SVG, Maven POM, SOAP).
- **Load from URL**:
  - Fetch XML directly from any online endpoint, sitemap, or RSS feed with automatic CORS proxy fallback.
- **Load from Files**:
  - Drag-and-drop any `.xml`, `.rss`, `.atom`, `.svg`, `.json`, or `.txt` file onto the app, or use the file picker.
- **Linter**:
  - Real-time static analysis and diagnostics.
  - Detects unclosed tags, duplicate attributes, unescaped ampersands (`&`), empty tags, and declaration placement.
  - Interactive issue list with **Jump to Line** integration.
- **Analyzer**:
  - Deep structural metrics: Element count, unique tags, attribute distribution, max nesting depth, and average depth.
  - Document metadata: Namespaces detected, leaf vs branch nodes ratio, comments count, CDATA sections.
  - Ranked element frequency table with share bars and depth ranges.
  - Complexity score (0–100) and minification savings estimation.
- **Minify**:
  - Strips superfluous whitespace and comments while preserving CDATA blocks.
  - Self-closes empty tags (`<tag></tag>` → `<tag/>`).
  - Displays instant byte savings and compression percentage.
- **Sitemap Generator**:
  - **From URL**: Generates standard Google/Bing sitemaps (`<urlset>`) from a single base URL with auto-route expansion (`/about`, `/products`, `/contact`, etc.) or custom URL lists. Configurable `changefreq`, `priority`, and `lastmod`.
  - **From JSON**: Converts JSON URL lists, object arrays, or Sitemap Index specifications (`<sitemapindex>`) into compliant sitemaps.
  - Instant live preview, one-click load into the editor, copy, or download.
- **Validate**:
  - Instant W3C well-formedness validation.
  - Dynamic status badge in the header displaying error count or root element details.
- **Convert**:
  - Bidirectional and multi-target conversions:
    - **XML ↔ JSON**: Clean/Standard object mapping or Detailed Badgerfish-style mode.
    - **XML → TXT**: Structured outline view or raw text extraction.
    - **XML → CSV / TSV**: Extracts repeating sibling records into tabular format.
    - **XML → YAML**: Clean human-readable YAML representation.
    - **JSON → XML**: Converts JSON objects back to XML with customizable root tag.

---

## 🎨 Supported Formats

| Format | Description |
|---|---|
| **XML** | Formatted syntax-aligned XML source with line numbers and editor tools |
| **Tree** | Interactive collapsible DOM hierarchy with search filter, attribute pills, and **XPath copying** |
| **JSON** | Clean or detailed JSON representation with copy and download options |
| **Chart** | Responsive SVG visualizations: **Tag Frequency Bar Chart**, **Hierarchy Node Diagram**, and **Depth Distribution Histogram** with SVG export |
| **Txt** | Indented text outline or extracted raw text values |

---

## 📦 Extension Modes

This project runs in 3 modes:
1. **Full Studio Tab** (`index.html`): Complete split-pane IDE and multi-format workbench.
2. **Extension Popup** (`popup.html`): Compact quick-action popup in the browser toolbar with Format, Minify, Validate, and quick tabs.
3. **Chrome Side Panel** (`sidepanel.html`): Dedicated browser side panel that stays open next to any web tab.

---

## 🛠️ Installation & Usage

### 1. Load as an Unpacked Extension (Chrome, Edge, Brave, Chromium)
1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select this directory: `/home/pphat/Projects/extensions/xml-ext`.
5. The **XML Pro Toolkit** icon will appear in your extensions toolbar! Click it to open the popup, or click **Full Studio ↗** to open the complete workbench.

### 2. Run Standalone in Browser
No build step or node_modules required! You can serve it with any static server:

```bash
# Using Python (built-in)
python3 -m http.server 3000

# Using Deno
deno task dev
```
Then visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The core parser, validator, linter, analyzer, minifier, formatter, sitemap generator, and converters include a full unit test suite:

```bash
deno test
```

All 29 tests run and pass in ~400ms without any external network dependencies.

---

## 📁 Project Architecture

```
xml-ext/
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── index.html                 # Full Workbench Web App & Extension Studio
├── popup.html                 # Action Popup UI
├── popup.js                   # Popup coordinator logic
├── sidepanel.html             # Chrome Side Panel UI
├── sidepanel.js               # Side Panel coordinator logic
├── background.js              # Background service worker & context menus
├── deno.json                  # Deno configuration & tasks
├── package.json               # Package metadata
├── README.md                  # Documentation
├── icons/                     # Vector SVG and multi-resolution PNG icons
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── css/
│   ├── app.css                # Workbench design system & theme variables
│   ├── editor.css             # Code editor, gutter & status bar
│   ├── tree-view.css          # Interactive Tree view styling
│   ├── chart.css              # SVG chart visualizer, linter & analyzer styling
│   └── popup.css              # Compact popup styling
├── src/
│   ├── app.js                 # Central application coordinator
│   ├── core/
│   │   ├── parser.js          # Universal XML AST parser & entity encoder/decoder
│   │   ├── validator.js       # Well-formedness & structure validation
│   │   ├── linter.js          # Static analysis rules & diagnostic engine
│   │   ├── analyzer.js        # Statistics, complexity scoring & frequency metrics
│   │   ├── minifier.js        # Whitespace compression & CDATA preservation
│   │   ├── formatter.js       # Prettifier with custom indentation
│   │   ├── sitemap.js         # Sitemap generator (URL list & JSON spec)
│   │   └── converter.js       # Converter engine (JSON, Tree, Chart, TXT, CSV, YAML)
│   ├── ui/
│   │   ├── editor.js          # Editor component (line numbers, search, undo/redo)
│   │   ├── tree-view.js       # Collapsible DOM Tree with search & XPath copy
│   │   ├── chart-view.js      # SVG Charts (Tag Frequency, Hierarchy Tree, Depth)
│   │   ├── linter-view.js     # Diagnostics list with jump-to-line integration
│   │   ├── analyzer-view.js   # Metric KPI cards & distribution tables
│   │   ├── sitemap-modal.js   # Sitemap modal generator
│   │   ├── converter-view.js  # Format converter pane
│   │   ├── theme.js           # Dark / Light theme switcher
│   │   └── toast.js           # Toast notification system
│   └── samples/
│       └── samples.js         # Built-in sample XML datasets
└── tests/                     # Comprehensive unit tests
    ├── assert.js              # Lightweight test assertions
    ├── parser.test.js
    ├── validator.test.js
    ├── linter.test.js
    ├── analyzer.test.js
    ├── minifier.test.js
    ├── formatter.test.js
    ├── sitemap.test.js
    └── converter.test.js
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + F` / `Cmd + F` | Toggle Search & Replace bar |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo |
| `Tab` | Indent line or selection (2 spaces) |
| `Shift + Tab` | Outdent line or selection |
| `Esc` | Close search bar or modals |

---

## 📄 License

MIT

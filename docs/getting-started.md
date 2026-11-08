# Getting Started with XML Pro Toolkit

Welcome to XML Pro Toolkit, an advanced client-side browser extension and standalone developer studio for XML analysis, editing, tree inspection, formatting, and multi-format conversion.

---

## Installation

### Load as a Chrome / Chromium Extension
1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions` in Microsoft Edge, `brave://extensions` in Brave).
2. Enable **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button in the header bar.
4. Select the project directory (`/home/pphat/Projects/extensions/xml-ext`).
5. The **XML Pro Toolkit** icon will appear in your browser extension toolbar.

### Standalone Web Application
XML Pro Toolkit runs completely client-side with zero external runtime build dependencies. You can run it locally with any lightweight static server:

```bash
# Using Python
python3 -m http.server 3000

# Using Deno
deno task dev
```

Visit `http://localhost:3000` to launch the studio.

---

## Workflow Overview

1. **Input Your XML**:
   - Type or paste directly into the **Source Editor**.
   - Use **Load URL** to fetch any online XML feed or sitemap.
   - Use **Upload File** or drag-and-drop `.xml`, `.rss`, `.atom`, `.svg`, or `.json` files directly into the window.
   - Select from built-in sample templates (Book Catalog, Google Sitemap, RSS Feed, SVG Graphic, Maven POM, SOAP).

2. **Explore and Visualize**:
   - **Tree View**: Browse an interactive, collapsible DOM tree with instant search and XPath copying.
   - **Chart View**: Inspect a horizontal node-link tree diagram with bezier connecting curves and colored node dots.
   - **Linter**: Review real-time warnings, duplicate attributes, and syntax errors with jump-to-line links.
   - **Analyzer**: Inspect element frequencies, attribute density, nesting depth, and document complexity rating.

3. **Convert and Export**:
   - Convert XML into JSON (Standard or Detailed), TXT outline, CSV/TSV tables, or YAML.
   - Generate Google & Bing compliant sitemaps from URL lists or JSON specs.
   - Download or copy your formatted, minified, or converted outputs with a single click.

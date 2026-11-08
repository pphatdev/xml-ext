/**
 * Built-in Documentation Manifest & Content
 */

export const BUILTIN_DOCS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'Overview',
    description: 'Installation in Chrome/Chromium, standalone setup, and workflow overview.',
    path: 'docs/getting-started.md',
    content: `# Getting Started with XML Pro Toolkit

Welcome to XML Pro Toolkit, an advanced client-side browser extension and standalone developer studio for XML analysis, editing, tree inspection, formatting, and multi-format conversion.

---

## Installation

### Load as a Chrome / Chromium Extension
1. Open your browser and navigate to \`chrome://extensions\` (or \`edge://extensions\` in Microsoft Edge, \`brave://extensions\` in Brave).
2. Enable **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button in the header bar.
4. Select the project directory (\`/home/pphat/Projects/extensions/xml-ext\`).
5. The **XML Pro Toolkit** icon will appear in your browser extension toolbar.

### Standalone Web Application
XML Pro Toolkit runs completely client-side with zero external runtime build dependencies. You can run it locally with any lightweight static server:

\`\`\`bash
# Using Python
python3 -m http.server 3000

# Using Deno
deno task dev
\`\`\`

Visit \`http://localhost:3000\` to launch the studio.

---

## Workflow Overview

1. **Input Your XML**:
   - Type or paste directly into the **Source Editor**.
   - Use **Load URL** to fetch any online XML feed or sitemap.
   - Use **Upload File** or drag-and-drop \`.xml\`, \`.rss\`, \`.atom\`, \`.svg\`, or \`.json\` files directly into the window.
   - Select from built-in sample templates (Book Catalog, Google Sitemap, RSS Feed, SVG Graphic, Maven POM, SOAP).

2. **Explore and Visualize**:
   - **Tree View**: Browse an interactive, collapsible DOM tree with instant search and XPath copying.
   - **Chart View**: Inspect a horizontal node-link tree diagram with bezier connecting curves and colored node dots.
   - **Linter**: Review real-time warnings, duplicate attributes, and syntax errors with jump-to-line links.
   - **Analyzer**: Inspect element frequencies, attribute density, nesting depth, and document complexity rating.

3. **Convert and Export**:
   - Convert XML into JSON (Standard or Detailed), TXT outline, CSV/TSV tables, or YAML.
   - Generate Google & Bing compliant sitemaps from URL lists or JSON specs.
   - Download or copy your formatted, minified, or converted outputs with a single click.`
  },

  {
    id: 'features',
    title: 'Features Guide',
    category: 'Guide',
    description: 'Comprehensive guide covering Editor, Tree Chart, Linter, and Analyzer.',
    path: 'docs/features.md',
    content: `# XML Pro Toolkit Features Guide

Explore the full suite of developer tools provided by XML Pro Toolkit.

---

## 1. Code Editor

The source editor provides a desktop-grade coding experience right in your browser:
- **Dynamic Line Numbers**: Gutter with synchronized line counts and cursor coordinates.
- **Find and Replace**: Built-in search bar with match count indicator, previous/next navigation, single replace, and replace-all (\`Ctrl+F\`).
- **Prettify / Format**: Formats messy, unindented, or minified XML into clean 2-space indented structures.
- **Format as Entities**: Dropdown menu offering Named (\`&amp;\`, \`&lt;\`), Numeric (\`&#160;\`), Hex (\`&#xA0;\`), and Entity Decoding to UTF-8 without double-escaping.
- **Minifier**: Strips superfluous whitespace and comments while preserving CDATA blocks, achieving significant size reductions.
- **Undo / Redo History**: History stack supporting multi-step undo (\`Ctrl+Z\`) and redo (\`Ctrl+Y\` / \`Ctrl+Shift+Z\`).

---

## 2. Horizontal Node-Link Tree Chart

The Chart visualizer renders XML documents as a horizontal tree diagram:
- **Smooth Bezier Curves**: Connects parent and child nodes with elegant curved lines.
- **Colored Node Dots**: Visual indicators distinguishing root containers, branch nodes, and leaf endpoints.
- **Attribute Annotations**: Highlights key attributes like namespaces and identifiers directly beneath tag names in amber monospace font.
- **Pan and Zoom**: Drag to pan across large documents; scroll to zoom in and out.
- **Collapsible Branches**: Click any circle dot to collapse or expand its subtree.
- **Export SVG**: Download the complete visual diagram as a vector SVG file.

---

## 3. Real-Time Linter

The static analysis engine checks XML against well-formedness rules and best practice guidelines:
- **XML Declaration**: Validates declaration presence, encoding attribute, and placement at line 1, column 1.
- **Unescaped Characters**: Flags bare \`&\` and \`<\` characters outside CDATA sections.
- **Duplicate Attributes**: Detects repeated attributes on the same element.
- **Empty Element Shorthand**: Recommends self-closing \`<tag/>\` for empty element pairs.
- **Jump to Line**: Click any diagnostic item to scroll the editor directly to the offending line and column.

---

## 4. Deep Structural Analyzer

The Analyzer computes statistics and quality ratings for your document:
- **KPI Metrics**: Total elements, unique tag names, total attributes, unique attribute names, max depth, and average depth.
- **Complexity Score**: 0 to 100 scoring based on structural nesting, attribute density, and element variety.
- **Minification Savings**: Exact byte reduction and percentage savings calculation.
- **Ranked Frequency Tables**: Sortable tables showing top element occurrences, percentage share, depth ranges, and attribute distribution.`
  },

  {
    id: 'sitemap-guide',
    title: 'Sitemap Generator',
    category: 'Guide',
    description: 'How to generate Google & Bing compliant sitemaps from URLs and JSON.',
    path: 'docs/sitemap-guide.md',
    content: `# XML Sitemap Generator Guide

XML Pro Toolkit includes a built-in generator for search engine compliant sitemaps conforming to the \`sitemaps.org\` protocol.

---

## Generating from URL(s)

You can generate a complete sitemap from a single domain or a list of URLs:
1. Click **Sitemap Generator** in the main toolbar.
2. Under the **From URL(s)** tab, enter your root website address (e.g. \`https://example.com\`) or paste a multi-line list of specific page URLs.
3. Check **Auto-generate standard routes** to automatically include common routes (\`/about\`, \`/products\`, \`/services\`, \`/contact\`, \`/blog\`, \`/pricing\`).
4. Select your desired **Change Frequency** (\`daily\`, \`weekly\`, \`monthly\`, etc.).
5. Choose the **Default Priority** (\`1.0\` for home, \`0.8\` for standard pages, \`0.5\` for secondary pages).
6. Select the **Last Modified Date** (defaults to today in \`YYYY-MM-DD\` format).
7. Click **Generate Sitemap XML**.

---

## Generating from JSON

If you maintain your route metadata in JSON format or generate routes from a backend CMS, you can generate sitemaps directly from JSON.

### Sample Input Format: Array of URL Objects
\`\`\`json
[
  {
    "loc": "https://example.com/",
    "priority": 1.0,
    "changefreq": "daily"
  },
  {
    "loc": "https://example.com/products",
    "priority": 0.9,
    "changefreq": "daily"
  },
  {
    "loc": "https://example.com/blog",
    "priority": 0.8,
    "changefreq": "weekly"
  }
]
\`\`\`

### Sample Input Format: Sitemap Index Specification
\`\`\`json
{
  "sitemaps": [
    { "loc": "https://example.com/sitemap-posts.xml", "lastmod": "2026-11-08" },
    { "loc": "https://example.com/sitemap-products.xml", "lastmod": "2026-11-08" }
  ]
}
\`\`\`

---

## Loading into the Editor

Once generated, you can:
- **Load Into Editor**: Immediately replaces the active editor content with the sitemap for further editing or validation.
- **Copy XML**: Copies the generated XML directly to your system clipboard.
- **Download**: Saves \`sitemap.xml\` directly to your local downloads folder.`
  },

  {
    id: 'converters',
    title: 'Multi-Format Converters',
    category: 'Reference',
    description: 'Transform XML into JSON, TXT, CSV, TSV, and YAML, and JSON back to XML.',
    path: 'docs/converters.md',
    content: `# Multi-Format Converters Guide

XML Pro Toolkit features a multi-target conversion engine capable of translating XML into JSON, TXT, CSV, TSV, and YAML, as well as converting JSON back into XML.

---

## 1. XML to JSON

XML Pro Toolkit provides two distinct JSON conversion modes:

### Standard JSON Mode
Transforms XML into natural JavaScript objects:
- Sibling elements with identical tags become an array.
- Attributes are prefixed with \`@\` (e.g. \`"@id": "101"\`).
- Simple leaf elements with only text become primitive values (numbers, booleans, strings).

\`\`\`xml
<catalog id="cat1">
  <book category="fiction">
    <title>The Great Gatsby</title>
    <price>12.99</price>
    <available>true</available>
  </book>
</catalog>
\`\`\`

Converted to Standard JSON:

\`\`\`json
{
  "catalog": {
    "@id": "cat1",
    "book": {
      "@category": "fiction",
      "title": "The Great Gatsby",
      "price": 12.99,
      "available": true
    }
  }
}
\`\`\`

### Detailed (Badgerfish) Mode
Preserves complete structural fidelity:
- All element attributes are grouped in \`@attributes\`.
- Text values are mapped to \`#text\`.
- CDATA sections are preserved in \`#cdata\`.

---

## 2. XML to TXT

- **Structured Outline**: Converts the hierarchy into an indented plain text tree showing element tags, attributes, and text values.
- **Raw Text Only**: Extracts all text node contents in sequence, stripped of all markup tags.

\`\`\`text
catalog [@id="cat1"]
  book [@category="fiction"]
    title: The Great Gatsby
    price: 12.99
    available: true
\`\`\`

---

## 3. XML to CSV / TSV

Detects repeating sibling structures (such as \`<book>\`, \`<item>\`, \`<user>\`, \`<record>\`) and automatically extracts their attributes and child values into clean tabular CSV or tab-separated TSV format.

\`\`\`csv
@category,title,price,available
fiction,The Great Gatsby,12.99,true
\`\`\`

---

## 4. XML to YAML

Converts the clean object model into human-readable YAML format with proper indentation, ideal for configuration files.

\`\`\`yaml
catalog:
  '@id': cat1
  book:
    '@category': fiction
    title: The Great Gatsby
    price: 12.99
    available: true
\`\`\`

---

## 5. JSON to XML (Reverse Conversion)

Paste any JSON object or array into the converter to generate valid XML with customizable root tag names.

\`\`\`json
{
  "project": {
    "name": "xml-ext",
    "version": "1.0.0",
    "private": true
  }
}
\`\`\`

Generated XML output:

\`\`\`xml
<project>
  <name>xml-ext</name>
  <version>1.0.0</version>
  <private>true</private>
</project>
\`\`\`

---

## 6. Format as XML Entities

Standardize XML entity encoding and compliance:
- **Numeric Entities (\`&#160;\`)**: Converts non-ASCII and special characters to decimal XML character references, guaranteeing 100% interoperability with all XML 1.0 parsers.
- **Hexadecimal Entities (\`&#xA0;\`)**: Formats characters into compact hexadecimal references.
- **Named XML Entities**: Restricts escaping to the 5 standard XML 1.0 predefined entities (\`&amp;\`, \`&lt;\`, \`&gt;\`, \`&quot;\`, \`&apos;\`) while mapping legacy HTML entities (like \`&copy;\`) to valid XML numeric references (\`&#169;\`).
- **Decode to UTF-8**: Safely decodes character references back to plain text while protecting XML syntax markup.\``
  },

  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'Reference',
    description: 'Complete shortcut key reference and productivity techniques.',
    path: 'docs/keyboard-shortcuts.md',
    content: `# Keyboard Shortcuts & Productivity Tips

Speed up your XML editing and analysis workflow with these built-in keyboard shortcuts.

---

## Editor Shortcuts

| Shortcut | Description |
|---|---|
| \`Ctrl + F\` / \`Cmd + F\` | Toggle Find and Replace search bar |
| \`Ctrl + Z\` / \`Cmd + Z\` | Undo last edit |
| \`Ctrl + Y\` / \`Cmd + Shift + Z\` | Redo previously undone edit |
| \`Tab\` | Indent current line or highlighted block by 2 spaces |
| \`Shift + Tab\` | Outdent current line or highlighted block |
| \`Esc\` | Close search bar or active modal dialogs |

---

## Navigation & Tools

| Action | How to Trigger |
|---|---|
| **Format / Prettify** | Click Format in the top action toolbar |
| **Minify XML** | Click Minify in the top action toolbar |
| **Validate Well-Formedness** | Click Validate in the top action toolbar |
| **Open Sitemap Generator** | Click Sitemap Generator in the top action toolbar |
| **Copy XPath** | Hover any node in Tree View and click XPath |
| **Pan Chart** | Click and drag anywhere on the chart canvas |
| **Zoom Chart** | Scroll mouse wheel over the chart canvas |
| **Collapse / Expand Branch** | Click any colored circle dot in the Chart View |
| **Toggle Dark / Light Theme** | Click the theme toggle icon in the top header |`
  }
];

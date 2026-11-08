# XML Pro Toolkit Features Guide

Explore the full suite of developer tools provided by XML Pro Toolkit.

---

## 1. Code Editor

The source editor provides a desktop-grade coding experience right in your browser:
- **Dynamic Line Numbers**: Gutter with synchronized line counts and cursor coordinates.
- **Find and Replace**: Built-in search bar with match count indicator, previous/next navigation, single replace, and replace-all (`Ctrl+F`).
- **Prettify / Format**: Formats messy, unindented, or minified XML into clean 2-space indented structures.
- **Minifier**: Strips superfluous whitespace and comments while preserving CDATA blocks, achieving significant size reductions.
- **Undo / Redo History**: History stack supporting multi-step undo (`Ctrl+Z`) and redo (`Ctrl+Y` / `Ctrl+Shift+Z`).

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
- **Unescaped Characters**: Flags bare `&` and `<` characters outside CDATA sections.
- **Duplicate Attributes**: Detects repeated attributes on the same element.
- **Empty Element Shorthand**: Recommends self-closing `<tag/>` for empty element pairs.
- **Jump to Line**: Click any diagnostic item to scroll the editor directly to the offending line and column.

---

## 4. Deep Structural Analyzer

The Analyzer computes statistics and quality ratings for your document:
- **KPI Metrics**: Total elements, unique tag names, total attributes, unique attribute names, max depth, and average depth.
- **Complexity Score**: 0 to 100 scoring based on structural nesting, attribute density, and element variety.
- **Minification Savings**: Exact byte reduction and percentage savings calculation.
- **Ranked Frequency Tables**: Sortable tables showing top element occurrences, percentage share, depth ranges, and attribute distribution.

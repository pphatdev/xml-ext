/**
 * XML Pro Reader - Direct In-Browser Reader Logic
 * Powers the interactive tree, live search, syntax highlighting,
 * and toolbar controls inside the in-page reader frame.
 */

import { initTheme, toggleTheme } from './src/ui/theme.js';
import { formatXml } from './src/core/formatter.js';
import { fetchXmlFromUrl } from './src/core/fetcher.js';
import { XmlChartView } from './src/ui/chart-view.js';
import { highlightCode } from './src/core/markdown.js';
import {
  detectFormat,
  jsonToXml,
  yamlToXml,
  csvToXml,
  markdownToXml,
  txtToXml
} from './src/core/converter.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // URL parameters
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get('url') || window.location.href;
  const initialFormat = params.get('format') || 'auto';

  // DOM Elements
  const brandLink = document.getElementById('reader-brand-link');
  const btnStudio = document.getElementById('reader-btn-studio');
  const statRoot = document.getElementById('reader-stat-root');
  const statElems = document.getElementById('reader-stat-elems');
  const statSize = document.getElementById('reader-stat-size');

  const paneTree = document.getElementById('reader-pane-tree');
  const paneChart = document.getElementById('reader-pane-chart');
  const paneRaw = document.getElementById('reader-pane-raw');
  const mainLayout = document.getElementById('reader-main') || document.querySelector('.reader-main');
  const readerResizer = document.getElementById('reader-resizer');
  const treeRoot = document.getElementById('reader-tree-root');
  const chartMount = document.getElementById('reader-chart-mount');
  const rawGutter = document.getElementById('reader-raw-gutter');
  const rawCode = document.getElementById('reader-raw-code');

  const btnViewTree = document.getElementById('reader-view-tree-btn');
  const btnViewChart = document.getElementById('reader-view-chart-btn');
  const btnViewRaw = document.getElementById('reader-view-raw-btn');
  const btnViewSplit = document.getElementById('reader-view-split-btn');
  const btnCollapse = document.getElementById('reader-btn-collapse');
  const btnExpand = document.getElementById('reader-btn-expand');
  const btnCopy = document.getElementById('reader-btn-copy');
  const btnDownload = document.getElementById('reader-btn-download');
  const btnTheme = document.getElementById('reader-btn-theme');

  // Initialize Interactive Chart View
  const chartView = new XmlChartView(chartMount);
  let currentView = 'tree';

  const searchInput = document.getElementById('reader-search-input');
  const searchCounter = document.getElementById('reader-search-counter');
  const btnPrev = document.getElementById('reader-btn-prev');
  const btnNext = document.getElementById('reader-btn-next');
  const btnClear = document.getElementById('reader-btn-clear');

  const statusXpath = document.getElementById('reader-status-xpath');
  const footerLines = document.getElementById('reader-footer-lines');
  const footerSize = document.getElementById('reader-footer-size');
  const toast = document.getElementById('reader-toast');

  // SVGs (Zero Emojis)
  const SVGS = {
    caret: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`,
    copy: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>`,
    check: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
  };

  let currentRawXml = '';
  let currentRawContent = '';
  let currentFormattedXml = '';
  let currentFormat = 'xml';
  let isXmlLoaded = false;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2200);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Update Studio Link with autoformat query
  const studioUrl = `index.html?url=${encodeURIComponent(targetUrl)}&autoformat=1`;
  if (brandLink) brandLink.href = studioUrl;
  if (btnStudio) btnStudio.href = studioUrl;

  // View Switching (Tree | Chart | Raw | Split)
  function setView(view) {
    currentView = view;
    btnViewTree.classList.toggle('active', view === 'tree');
    btnViewChart.classList.toggle('active', view === 'chart');
    btnViewRaw.classList.toggle('active', view === 'raw');
    if (btnViewSplit) btnViewSplit.classList.toggle('active', view === 'split');

    const isSplit = view === 'split';
    if (mainLayout) {
      mainLayout.classList.toggle('reader-split-mode', isSplit);
    }
    if (readerResizer) {
      readerResizer.classList.toggle('hidden', !isSplit);
    }

    paneTree.classList.toggle('hidden', view !== 'tree' && !isSplit);
    paneChart.classList.toggle('hidden', view !== 'chart');
    paneRaw.classList.toggle('hidden', view !== 'raw' && !isSplit);

    paneTree.style.setProperty('display', (view === 'tree' || isSplit) ? 'block' : 'none', 'important');
    paneChart.style.setProperty('display', view === 'chart' ? 'flex' : 'none', 'important');
    paneRaw.style.setProperty('display', (view === 'raw' || isSplit) ? 'block' : 'none', 'important');

    if (view === 'chart' && currentRawXml) {
      chartView.loadXml(currentRawXml);
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => chartView.fitToView(false));
      }
    }

    window.dispatchEvent(new Event('resize'));
  }

  // Ensure initial view is strictly applied
  setView('tree');

  btnViewTree.addEventListener('click', () => setView('tree'));
  btnViewChart.addEventListener('click', () => setView('chart'));
  btnViewRaw.addEventListener('click', () => setView('raw'));
  if (btnViewSplit) {
    btnViewSplit.addEventListener('click', () => setView('split'));
  }

  // Draggable Split Resizer (Drag left/right to resize Tree and Raw split panes)
  function initReaderResizer() {
    if (!mainLayout || !readerResizer) return;

    // Restore saved split ratio
    try {
      const savedRatio = localStorage.getItem('xml_reader_split_ratio');
      if (savedRatio) {
        const val = parseFloat(savedRatio);
        if (!isNaN(val) && val >= 15 && val <= 85) {
          mainLayout.style.setProperty('--reader-left-width', `${val}%`);
        }
      }
    } catch (_) {}

    let isDragging = false;

    const onMouseDown = (e) => {
      if (window.innerWidth <= 640) return;
      isDragging = true;
      readerResizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-reader');
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const layoutRect = mainLayout.getBoundingClientRect();
      const clientX = e.clientX;
      const newWidthPx = clientX - layoutRect.left;
      const newPct = (newWidthPx / layoutRect.width) * 100;
      const clampedPct = Math.max(15, Math.min(85, newPct));

      mainLayout.style.setProperty('--reader-left-width', `${clampedPct.toFixed(2)}%`);
      try {
        localStorage.setItem('xml_reader_split_ratio', clampedPct.toFixed(2));
      } catch (_) {}
      window.dispatchEvent(new Event('resize'));
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      readerResizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-reader');
      window.dispatchEvent(new Event('resize'));
    };

    // Touch support for touchscreens / tablets
    const onTouchStart = (e) => {
      if (window.innerWidth <= 640 || !e.touches || !e.touches[0]) return;
      isDragging = true;
      readerResizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-reader');
    };

    const onTouchMove = (e) => {
      if (!isDragging || !e.touches || !e.touches[0]) return;
      const layoutRect = mainLayout.getBoundingClientRect();
      const clientX = e.touches[0].clientX;
      const newWidthPx = clientX - layoutRect.left;
      const newPct = (newWidthPx / layoutRect.width) * 100;
      const clampedPct = Math.max(15, Math.min(85, newPct));

      mainLayout.style.setProperty('--reader-left-width', `${clampedPct.toFixed(2)}%`);
      try {
        localStorage.setItem('xml_reader_split_ratio', clampedPct.toFixed(2));
      } catch (_) {}
      window.dispatchEvent(new Event('resize'));
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      readerResizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-reader');
      window.dispatchEvent(new Event('resize'));
    };

    // Double-click to reset back to 50/50
    readerResizer.addEventListener('dblclick', () => {
      mainLayout.style.setProperty('--reader-left-width', '50%');
      try {
        localStorage.removeItem('xml_reader_split_ratio');
      } catch (_) {}
      window.dispatchEvent(new Event('resize'));
      showToast('Split layout reset to 50/50');
    });

    // Keyboard accessibility: Left / Right arrow keys when focused
    readerResizer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentStyle = getComputedStyle(mainLayout).getPropertyValue('--reader-left-width');
        let currentPct = parseFloat(currentStyle) || 50;
        const delta = e.key === 'ArrowLeft' ? -3 : 3;
        const newPct = Math.max(15, Math.min(85, currentPct + delta));
        mainLayout.style.setProperty('--reader-left-width', `${newPct.toFixed(2)}%`);
        try {
          localStorage.setItem('xml_reader_split_ratio', newPct.toFixed(2));
        } catch (_) {}
        window.dispatchEvent(new Event('resize'));
      }
    });

    readerResizer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    readerResizer.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  initReaderResizer();

  // Theme Toggle
  btnTheme.addEventListener('click', () => {
    toggleTheme();
  });

  // Disable Reader Power Button
  const btnPower = document.getElementById('reader-btn-power');
  if (btnPower) {
    btnPower.addEventListener('click', () => {
      window.parent.postMessage({ type: 'DISABLE_READER_AND_SHOW_RAW' }, '*');
    });
  }

  // Multi-Format Data Loader (XML, JSON, YAML, CSV, Markdown, TXT)
  function loadDataContent(rawContent, formatHint, url) {
    if (!rawContent || !rawContent.trim()) return;

    let format = formatHint || detectFormat(rawContent);
    if (!format || format === 'auto') {
      format = detectFormat(rawContent);
    }

    let xmlToRender = '';
    let formattedDisplay = '';
    let formatBadge = format.toUpperCase();

    switch (format) {
      case 'json':
        try {
          const jsonObj = JSON.parse(rawContent);
          xmlToRender = jsonToXml(jsonObj, { rootTag: 'root' });
          formattedDisplay = JSON.stringify(jsonObj, null, 2);
        } catch (_) {
          xmlToRender = `<root><raw>${escapeHtml(rawContent)}</raw></root>`;
          formattedDisplay = rawContent;
        }
        formatBadge = 'JSON';
        break;

      case 'yaml':
        try {
          xmlToRender = yamlToXml(rawContent, { rootTag: 'root' });
        } catch (_) {
          xmlToRender = `<root><raw>${escapeHtml(rawContent)}</raw></root>`;
        }
        formattedDisplay = rawContent;
        formatBadge = 'YAML';
        break;

      case 'csv':
        try {
          xmlToRender = csvToXml(rawContent, { rootTag: 'records', itemTag: 'row' });
        } catch (_) {
          xmlToRender = `<root><raw>${escapeHtml(rawContent)}</raw></root>`;
        }
        formattedDisplay = rawContent;
        formatBadge = 'CSV';
        break;

      case 'markdown':
        try {
          xmlToRender = markdownToXml(rawContent, { rootTag: 'document' });
        } catch (_) {
          xmlToRender = `<root><raw>${escapeHtml(rawContent)}</raw></root>`;
        }
        formattedDisplay = rawContent;
        formatBadge = 'MD';
        break;

      case 'txt':
        try {
          xmlToRender = txtToXml(rawContent, { rootTag: 'document' });
        } catch (_) {
          xmlToRender = `<root><raw>${escapeHtml(rawContent)}</raw></root>`;
        }
        formattedDisplay = rawContent;
        formatBadge = 'TXT';
        break;

      case 'xml':
      default:
        format = 'xml';
        xmlToRender = rawContent;
        try {
          formattedDisplay = formatXml(rawContent, { indent: '  ', preserveComments: true, entities: 'auto' });
        } catch (_) {
          formattedDisplay = rawContent;
        }
        formatBadge = 'XML';
        break;
    }

    currentRawXml = xmlToRender;
    currentRawContent = rawContent;
    currentFormattedXml = formattedDisplay;
    currentFormat = format;
    isXmlLoaded = true;

    // Parse Document DOM for Tree & Chart views
    let parsedDoc = null;
    try {
      parsedDoc = new DOMParser().parseFromString(xmlToRender, 'application/xml');
      if (parsedDoc.querySelector('parsererror')) {
        parsedDoc = new DOMParser().parseFromString(xmlToRender, 'text/xml');
      }
    } catch (_) {
      parsedDoc = null;
    }

    const totalBytes = new TextEncoder().encode(rawContent).length;
    let totalElements = 0;
    let maxDepth = 0;
    let rootTagName = formatBadge;

    if (parsedDoc && parsedDoc.documentElement) {
      rootTagName = parsedDoc.documentElement.nodeName;
      function walkStats(node, depth) {
        if (node.nodeType === 1) {
          totalElements++;
          if (depth > maxDepth) maxDepth = depth;
          for (let i = 0; i < node.childNodes.length; i++) {
            walkStats(node.childNodes[i], depth + 1);
          }
        }
      }
      walkStats(parsedDoc.documentElement, 1);
    } else {
      const match = xmlToRender.match(/<([a-zA-Z][\w:-]*)/g);
      totalElements = match ? match.length : 1;
    }

    // Update Header Pill
    statRoot.textContent = `<${formatBadge}>`;
    statElems.textContent = `${totalElements} elem`;
    statSize.textContent = formatBytes(totalBytes);

    // Update Studio Links with detected format
    const targetStudioUrl = `index.html?url=${encodeURIComponent(targetUrl)}&autoformat=1&format=${encodeURIComponent(format)}`;
    if (brandLink) brandLink.href = targetStudioUrl;
    if (btnStudio) btnStudio.href = targetStudioUrl;

    // Update Raw Button Tooltip and Icon based on format
    const rawBtn = document.getElementById('reader-view-raw-btn');
    if (rawBtn) {
      rawBtn.title = `Formatted Raw ${formatBadge} Source (Alt+3)`;
    }
    const rawIcon = document.getElementById('reader-view-raw-icon');
    if (rawIcon) {
      if (format === 'markdown') {
        rawIcon.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="view-btn-icon icon icon-tabler icons-tabler-outline icon-tabler-markdown" id="reader-view-raw-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" /><path d="M7 15v-6l2 2l2 -2v6" /><path d="M14 13l2 2l2 -2m-2 2v-6" /></svg>`;
      } else if (format === 'json') {
        rawIcon.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="view-btn-icon icon icon-tabler icons-tabler-outline icon-tabler-braces" id="reader-view-raw-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 4a2 2 0 0 0 -2 2v3a2 3 0 0 1 -2 3a2 3 0 0 1 2 3v3a2 2 0 0 0 2 2" /><path d="M17 4a2 2 0 0 1 2 2v3a2 3 0 0 0 2 3a2 3 0 0 0 -2 3v3a2 2 0 0 1 -2 2" /></svg>`;
      } else {
        rawIcon.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="view-btn-icon icon icon-tabler icons-tabler-outline icon-tabler-code-dots" id="reader-view-raw-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 12h.01" /><path d="M12 12h.01" /><path d="M9 12h.01" /><path d="M6 19a2 2 0 0 1 -2 -2v-4l-1 -1l1 -1v-4a2 2 0 0 1 2 -2" /><path d="M18 19a2 2 0 0 0 2 -2v-4l1 -1l-1 -1v-4a2 2 0 0 0 -2 -2" /></svg>`;
      }
    }

    const lines = formattedDisplay.split('\n');
    footerLines.textContent = `${lines.length} lines`;
    footerSize.textContent = formatBytes(totalBytes);
    statusXpath.textContent = `/${rootTagName}`;

    // Populate Raw Pane with Syntax Theme Highlighting
    rawGutter.textContent = lines.map((_, i) => i + 1).join('\n');
    rawCode.innerHTML = highlightCode(formattedDisplay, format);

    // Populate Tree Pane
    treeRoot.innerHTML = '';

    // Declaration line if XML
    if (format === 'xml') {
      const declMatch = rawContent.match(/^\s*(<\?xml[^>]*\?>)/i);
      if (declMatch) {
        const declLine = document.createElement('div');
        declLine.className = 'reader-line';
        declLine.innerHTML = `<span class="reader-caret-spacer"></span><span class="reader-decl">${escapeHtml(declMatch[1])}</span>`;
        treeRoot.appendChild(declLine);
      }
    }

    if (parsedDoc && parsedDoc.documentElement) {
      renderXmlNode(parsedDoc.documentElement, treeRoot, '/');
    } else {
      const pre = document.createElement('pre');
      pre.textContent = formattedDisplay;
      treeRoot.appendChild(pre);
    }

    if (currentView === 'chart') {
      chartView.loadXml(xmlToRender);
    }
  }

  function loadXmlContent(rawXml, url) {
    loadDataContent(rawXml, 'xml', url);
  }

  // Recursive Tree Node Renderer
  function renderXmlNode(node, parentElement, currentPath) {
    if (node.nodeType === 8) { // Comment
      const commentDiv = document.createElement('div');
      commentDiv.className = 'reader-line';
      commentDiv.innerHTML = `<span class="reader-caret-spacer"></span><span class="reader-comment">&lt;!--${escapeHtml(node.textContent)}--&gt;</span>`;
      parentElement.appendChild(commentDiv);
      return;
    }

    if (node.nodeType !== 1) return; // Only element nodes

    const tagName = node.nodeName;
    const nodePath = currentPath + (currentPath.endsWith('/') ? '' : '/') + tagName;

    const childElements = [];
    let textOnly = '';
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === 1) {
        childElements.push(child);
      } else if (child.nodeType === 3 || child.nodeType === 4) {
        textOnly += child.textContent;
      }
    }
    textOnly = textOnly.trim();

    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'reader-node';
    nodeContainer.dataset.path = nodePath;

    let attrHtml = '';
    if (node.attributes && node.attributes.length > 0) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        attrHtml += ` <span class="reader-attr-name">${escapeHtml(attr.name)}</span><span class="reader-attr-eq">=</span><span class="reader-attr-val">&quot;${escapeHtml(attr.value)}&quot;</span>`;
      }
    }

    // Branch Node (has child elements)
    if (childElements.length > 0) {
      nodeContainer.classList.add('reader-node-branch');

      const openLine = document.createElement('div');
      openLine.className = 'reader-line reader-line-open';
      openLine.innerHTML = `
        <button type="button" class="reader-caret-btn" aria-label="Toggle node">${SVGS.caret}</button><span class="reader-bracket">&lt;</span><span class="reader-tag-name">${escapeHtml(tagName)}</span>${attrHtml}<span class="reader-bracket">&gt;</span><span class="reader-collapsed-preview">... &lt;/${escapeHtml(tagName)}&gt; <span class="reader-collapsed-count">${childElements.length} item${childElements.length === 1 ? '' : 's'}</span></span>
      `;

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'reader-children';

      for (let i = 0; i < childElements.length; i++) {
        renderXmlNode(childElements[i], childrenContainer, `${nodePath}[${i + 1}]`);
      }

      const closeLine = document.createElement('div');
      closeLine.className = 'reader-line reader-line-close';
      closeLine.innerHTML = `<span class="reader-caret-spacer"></span><span class="reader-bracket">&lt;/</span><span class="reader-tag-name">${escapeHtml(tagName)}</span><span class="reader-bracket">&gt;</span>`;

      function toggle() {
        nodeContainer.classList.toggle('collapsed');
      }

      const caretBtn = openLine.querySelector('.reader-caret-btn');
      if (caretBtn) caretBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
      const preview = openLine.querySelector('.reader-collapsed-preview');
      if (preview) preview.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

      nodeContainer.appendChild(openLine);
      nodeContainer.appendChild(childrenContainer);
      nodeContainer.appendChild(closeLine);
    }
    // Leaf Node (only text or empty)
    else {
      nodeContainer.classList.add('reader-node-leaf');
      const leafLine = document.createElement('div');
      leafLine.className = 'reader-line reader-line-leaf';

      if (!textOnly) {
        leafLine.innerHTML = `<span class="reader-caret-spacer"></span><span class="reader-bracket">&lt;</span><span class="reader-tag-name">${escapeHtml(tagName)}</span>${attrHtml}<span class="reader-bracket">/&gt;</span>`;
      } else {
        let contentHtml = '';
        if (/^https?:\/\/[^\s<>"']+$/i.test(textOnly)) {
          contentHtml = `<a href="${escapeHtml(textOnly)}" target="_blank" rel="noopener noreferrer" class="reader-link">${escapeHtml(textOnly)}</a>`;
        } else {
          contentHtml = `<span class="reader-text-val">${escapeHtml(textOnly)}</span>`;
        }
        leafLine.innerHTML = `<span class="reader-caret-spacer"></span><span class="reader-bracket">&lt;</span><span class="reader-tag-name">${escapeHtml(tagName)}</span>${attrHtml}<span class="reader-bracket">&gt;</span>${contentHtml}<span class="reader-bracket">&lt;/</span><span class="reader-tag-name">${escapeHtml(tagName)}</span><span class="reader-bracket">&gt;</span>`;
      }
      nodeContainer.appendChild(leafLine);
    }

    parentElement.appendChild(nodeContainer);
  }

  // Collapse / Expand All
  btnCollapse.addEventListener('click', () => {
    btnCollapse.classList.add('active');
    btnExpand.classList.remove('active');
    const branches = treeRoot.querySelectorAll('.reader-node-branch');
    branches.forEach(b => b.classList.add('collapsed'));
    setTimeout(() => {
      btnCollapse.classList.remove('active');
    }, 400);
    showToast('Collapsed all nodes');
  });

  btnExpand.addEventListener('click', () => {
    btnExpand.classList.add('active');
    btnCollapse.classList.remove('active');
    const branches = treeRoot.querySelectorAll('.reader-node-branch');
    branches.forEach(b => b.classList.remove('collapsed'));
    setTimeout(() => {
      btnExpand.classList.remove('active');
    }, 400);
    showToast('Expanded all nodes');
  });

  // Copy Formatted Data
  btnCopy.addEventListener('click', async () => {
    if (!currentFormattedXml) return;
    try {
      await navigator.clipboard.writeText(currentFormattedXml);
      btnCopy.innerHTML = SVGS.check;
      const fmtName = (currentFormat || 'xml').toUpperCase();
      showToast(`Copied formatted ${fmtName} to clipboard`);
      setTimeout(() => {
        btnCopy.innerHTML = SVGS.copy;
      }, 1600);
    } catch (_) {
      showToast('Failed to copy');
    }
  });

  // Download Formatted Data File
  btnDownload.addEventListener('click', () => {
    if (!currentFormattedXml) return;
    const ext = currentFormat === 'markdown' ? 'md' : (currentFormat || 'xml');
    let filename = `document.${ext}`;
    try {
      const u = new URL(targetUrl);
      const base = u.pathname.substring(u.pathname.lastIndexOf('/') + 1);
      if (base && base.includes('.')) {
        filename = base;
      } else if (base) {
        filename = `${base}.${ext}`;
      }
    } catch (_) {}

    const mimeTypes = {
      xml: 'application/xml;charset=utf-8',
      json: 'application/json;charset=utf-8',
      yaml: 'text/yaml;charset=utf-8',
      csv: 'text/csv;charset=utf-8',
      markdown: 'text/markdown;charset=utf-8',
      txt: 'text/plain;charset=utf-8'
    };
    const mime = mimeTypes[currentFormat] || 'application/xml;charset=utf-8';

    const blob = new Blob([currentFormattedXml], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
    showToast(`Downloaded ${filename}`);
  });

  // Hover XPath tracking
  treeRoot.addEventListener('mouseover', (e) => {
    const targetNode = e.target.closest ? e.target.closest('.reader-node') : null;
    if (targetNode && targetNode.dataset.path) {
      statusXpath.textContent = targetNode.dataset.path;
    }
  });

  // Live Search & Filter
  let matchedElements = [];
  let currentMatchIndex = -1;
  let searchDebounceTimer = null;

  function clearSearchHighlights() {
    const highlights = treeRoot.querySelectorAll('mark.reader-match');
    highlights.forEach(mark => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
    matchedElements = [];
    currentMatchIndex = -1;
    searchCounter.textContent = '';
  }

  function highlightMatchesInTextNode(textNode, query) {
    const text = textNode.textContent;
    const lower = text.toLowerCase();
    const qLower = query.toLowerCase();
    const idx = lower.indexOf(qLower);
    if (idx === -1) return false;

    const after = textNode.splitText(idx);
    after.splitText(query.length);

    const mark = document.createElement('mark');
    mark.className = 'reader-match';
    mark.textContent = after.textContent;
    after.parentNode.replaceChild(mark, after);

    matchedElements.push(mark);
    return true;
  }

  function executeSearch(query) {
    clearSearchHighlights();
    query = (query || '').trim();
    if (!query) return;

    setView('tree');

    const candidateNodes = treeRoot.querySelectorAll(
      '.reader-tag-name, .reader-attr-name, .reader-attr-val, .reader-text-val, .reader-link, .reader-comment'
    );

    candidateNodes.forEach(node => {
      const textNodes = [];
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
      let n;
      while ((n = walk.nextNode())) textNodes.push(n);

      textNodes.forEach(tn => {
        highlightMatchesInTextNode(tn, query);
      });
    });

    if (matchedElements.length > 0) {
      matchedElements.forEach(m => {
        let curr = m.closest('.reader-node');
        while (curr && curr !== treeRoot) {
          if (curr.classList.contains('collapsed')) {
            curr.classList.remove('collapsed');
          }
          curr = curr.parentElement ? curr.parentElement.closest('.reader-node') : null;
        }
      });

      currentMatchIndex = 0;
      updateActiveMatch();
    } else {
      searchCounter.textContent = '0 / 0';
    }
  }

  function updateActiveMatch() {
    matchedElements.forEach((el, i) => {
      if (i === currentMatchIndex) {
        el.classList.add('reader-match-active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        el.classList.remove('reader-match-active');
      }
    });
    searchCounter.textContent = `${currentMatchIndex + 1} / ${matchedElements.length}`;
  }

  function gotoNextMatch() {
    if (matchedElements.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % matchedElements.length;
    updateActiveMatch();
  }

  function gotoPrevMatch() {
    if (matchedElements.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + matchedElements.length) % matchedElements.length;
    updateActiveMatch();
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      executeSearch(searchInput.value);
    }, 120);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) gotoPrevMatch();
      else gotoNextMatch();
    } else if (e.key === 'Escape') {
      clearSearchHighlights();
      searchInput.value = '';
      searchInput.blur();
    }
  });

  btnNext.addEventListener('click', gotoNextMatch);
  btnPrev.addEventListener('click', gotoPrevMatch);
  btnClear.addEventListener('click', () => {
    clearSearchHighlights();
    searchInput.value = '';
    searchInput.focus();
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.altKey && e.key === '1') {
      e.preventDefault();
      setView('tree');
    } else if (e.altKey && e.key === '2') {
      e.preventDefault();
      setView('chart');
    } else if (e.altKey && e.key === '3') {
      e.preventDefault();
      setView('raw');
    } else if (e.altKey && e.key === '4') {
      e.preventDefault();
      setView('split');
    } else if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      btnCollapse.click();
    } else if (e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      btnExpand.click();
    } else if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      if (currentView === 'tree') setView('chart');
      else if (currentView === 'chart') setView('raw');
      else if (currentView === 'raw') setView('split');
      else setView('tree');
    }
  });

  // 1. Listen for postMessage from parent content script
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'INIT_READER_DATA' && event.data.content) {
      loadDataContent(event.data.content, event.data.format || initialFormat, event.data.url || targetUrl);
    } else if (event.data.type === 'INIT_READER_XML' && event.data.xml) {
      loadXmlContent(event.data.xml, event.data.url || targetUrl);
    }
  });

  // Announce to parent content script that reader frame is mounted
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'READER_FRAME_READY' }, '*');
    }
  } catch (_) {}

  // 2. Fetch URL directly as fallback or primary
  if (targetUrl && !isXmlLoaded) {
    fetchXmlFromUrl(targetUrl)
      .then(res => {
        if (res && res.text) {
          loadDataContent(res.text, initialFormat !== 'auto' ? initialFormat : undefined, targetUrl);
        }
      })
      .catch(() => {
        // If fetch failed, wait for postMessage from parent
      });
  }

  // 3. Fallback timeout: if no XML loaded after 2.5s, provide user recovery UI
  setTimeout(() => {
    if (!isXmlLoaded) {
      const treeRoot = document.getElementById('reader-tree-root');
      if (treeRoot && (!treeRoot.innerHTML || treeRoot.innerHTML.includes('reader-loading-state'))) {
        treeRoot.innerHTML = `
          <div style="padding: 3rem 1.5rem; text-align: center; color: var(--text-muted); max-width: 480px; margin: 0 auto;">
            <svg style="width: 32px; height: 32px; margin-bottom: 0.75rem; color: #38bdf8; display: inline-block;" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-normal); margin-bottom: 0.5rem;">Connecting to XML Source...</h3>
            <p style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">Direct browser XML streams may take a moment to synchronize, or can be opened directly in XML Pro Studio.</p>
            <a href="${studioUrl}" target="_blank" class="reader-btn reader-btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
              <span>Open in XML Pro Studio</span>
            </a>
          </div>
        `;
      }
    }
  }, 2500);
});


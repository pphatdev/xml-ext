/**
 * Chrome Side Panel Coordinator (Modern Studio Architecture)
 */

import { initTheme, toggleTheme } from './src/ui/theme.js';
import { XmlEditor } from './src/ui/editor.js';
import { XmlTreeView } from './src/ui/tree-view.js';
import { XmlChartView } from './src/ui/chart-view.js';
import { XmlConverterView } from './src/ui/converter-view.js';
import { XmlLinterView } from './src/ui/linter-view.js';
import { XmlAnalyzerView } from './src/ui/analyzer-view.js';
import { SitemapModal } from './src/ui/sitemap-modal.js';
import { formatXml } from './src/core/formatter.js';
import { minifyXml, getMinifyStats } from './src/core/minifier.js';
import { validateXml } from './src/core/validator.js';
import { XML_SAMPLES } from './src/samples/samples.js';
import { showToast } from './src/ui/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const editorContainer = document.getElementById('sp-pane-editor');
  const treeContainer = document.getElementById('sp-pane-tree');
  const chartContainer = document.getElementById('sp-pane-chart');
  const converterContainer = document.getElementById('sp-pane-converter');
  const linterContainer = document.getElementById('sp-pane-linter');
  const analyzerContainer = document.getElementById('sp-pane-analyzer');
  const validationBadge = document.getElementById('sp-validation-badge');

  const editor = new XmlEditor(editorContainer, {
    onChange: (xml) => handleXmlChange(xml)
  });

  const treeView = new XmlTreeView(treeContainer);
  const chartView = new XmlChartView(chartContainer);
  const converterView = new XmlConverterView(converterContainer, {
    onLoadIntoEditor: (xml) => editor.setValue(xml, true)
  });
  const linterView = new XmlLinterView(linterContainer, {
    onJumpToLine: (line, col) => {
      // Switch back to editor and jump to position
      const editorTab = document.querySelector('.sidepanel-tabs .tab-btn[data-view="editor"]');
      if (editorTab) editorTab.click();
      editor.jumpToLine(line, col);
    }
  });
  const analyzerView = new XmlAnalyzerView(analyzerContainer);

  const sitemapModal = new SitemapModal({
    onLoadIntoEditor: (xml) => editor.setValue(xml, true)
  });

  let activeView = 'editor';

  function updateValidationBadge(xml) {
    if (!validationBadge) return;

    if (!xml.trim()) {
      validationBadge.className = 'val-badge val-badge-empty';
      validationBadge.innerHTML = '<span>Empty</span>';
      validationBadge.title = 'No XML content loaded';
      return;
    }

    const res = validateXml(xml);
    if (res.valid) {
      validationBadge.className = 'val-badge val-badge-valid';
      validationBadge.innerHTML = `
        <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        <span>Valid</span>
      `;
      validationBadge.title = `Valid XML: <${res.rootTag}> (${res.elementCount} elements)`;
    } else {
      validationBadge.className = 'val-badge val-badge-invalid';
      validationBadge.innerHTML = `
        <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>${res.errors.length} Err</span>
      `;
      const firstErr = res.errors[0];
      validationBadge.title = `Invalid XML: ${firstErr ? `Ln ${firstErr.line}:${firstErr.column} ${firstErr.message}` : 'Syntax error'}`;
    }
  }

  function handleXmlChange(xml) {
    updateValidationBadge(xml);

    if (activeView === 'tree') treeView.loadXml(xml);
    else if (activeView === 'chart') chartView.loadXml(xml);
    else if (activeView === 'converter') converterView.loadXml(xml);
    else if (activeView === 'linter') linterView.lint(xml);
    else if (activeView === 'analyzer') analyzerView.analyze(xml);
  }

  // Switch view tabs
  const tabs = document.querySelectorAll('.sidepanel-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeView = tab.dataset.view;

      editorContainer.classList.toggle('hidden', activeView !== 'editor');
      treeContainer.classList.toggle('hidden', activeView !== 'tree');
      chartContainer.classList.toggle('hidden', activeView !== 'chart');
      converterContainer.classList.toggle('hidden', activeView !== 'converter');
      linterContainer.classList.toggle('hidden', activeView !== 'linter');
      analyzerContainer.classList.toggle('hidden', activeView !== 'analyzer');

      handleXmlChange(editor.getValue());
    });
  });

  // Header Actions
  document.getElementById('btn-sidepanel-full').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'index.html' });
    } else {
      window.open('index.html', '_blank');
    }
  });

  document.getElementById('btn-sidepanel-theme').addEventListener('click', () => toggleTheme());

  // Format Helper
  function executeFormat(entityMode = 'auto') {
    const xml = editor.getValue();
    if (!xml.trim()) return;

    try {
      const formatted = formatXml(xml, { indent: '  ', preserveComments: true, entities: entityMode });
      editor.setValue(formatted, true);
      const labels = {
        auto: 'Formatted cleanly',
        named: 'Formatted with named entities',
        numeric: 'Formatted with numeric entities',
        hex: 'Formatted with hex entities',
        decode: 'Decoded entities to text'
      };
      showToast(labels[entityMode] || 'Formatted XML', 'success');
    } catch (e) {
      showToast(`Format error: ${e.message}`, 'error');
    }
  }

  // Format Main Button
  document.getElementById('btn-sp-format').addEventListener('click', () => {
    executeFormat('auto');
  });

  // Format Dropdown
  const btnFormatDropdown = document.getElementById('btn-sp-format-dropdown');
  const formatDropdownMenu = document.getElementById('sp-format-dropdown-menu');

  if (btnFormatDropdown && formatDropdownMenu) {
    btnFormatDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      formatDropdownMenu.classList.toggle('hidden');
    });

    formatDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = item.dataset.entityMode || 'auto';
        formatDropdownMenu.classList.add('hidden');
        executeFormat(mode);
      });
    });

    window.addEventListener('click', () => {
      formatDropdownMenu.classList.add('hidden');
    });
  }

  // Minify
  document.getElementById('btn-sp-minify').addEventListener('click', () => {
    const orig = editor.getValue();
    if (!orig.trim()) return;

    try {
      const min = minifyXml(orig, { removeComments: true, selfCloseEmpty: true });
      const stats = getMinifyStats(orig, min);
      editor.setValue(min, true);
      showToast(`Minified! Saved ${stats.savedBytes.toLocaleString()} B (${stats.savingsPercent}%)`, 'success');
    } catch (e) {
      showToast(`Minify error: ${e.message}`, 'error');
    }
  });

  // Validate
  document.getElementById('btn-sp-validate').addEventListener('click', () => {
    const res = validateXml(editor.getValue());
    if (res.valid) {
      showToast(`Valid XML: <${res.rootTag}> (${res.elementCount} elem)`, 'success');
    } else {
      showToast(`Invalid: ${res.errors[0]?.message}`, 'error');
    }
  });

  // Sitemap
  document.getElementById('btn-sp-sitemap').addEventListener('click', () => {
    sitemapModal.show();
  });

  // Sample Select
  const sampleSelect = document.getElementById('select-sp-sample');
  if (sampleSelect) {
    sampleSelect.addEventListener('change', (e) => {
      const sampleKey = e.target.value;
      if (sampleKey && XML_SAMPLES[sampleKey]) {
        editor.setValue(XML_SAMPLES[sampleKey].xml, true);
        showToast(`Loaded "${XML_SAMPLES[sampleKey].name}" sample`, 'info');
        sampleSelect.value = '';
      }
    });
  }

  // Copy
  document.getElementById('btn-sp-copy').addEventListener('click', () => {
    const text = editor.getValue();
    if (!text) {
      showToast('Nothing to copy', 'warning');
      return;
    }
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  });

  // Download
  document.getElementById('btn-sp-download').addEventListener('click', () => {
    const text = editor.getValue();
    if (!text.trim()) {
      showToast('No XML content to download', 'warning');
      return;
    }
    const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.xml';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded document.xml', 'success');
  });

  // Clear
  document.getElementById('btn-sp-clear').addEventListener('click', () => {
    if (!editor.getValue().trim()) return;
    if (confirm('Clear XML editor content?')) {
      editor.setValue('', true);
      showToast('Editor cleared', 'info');
    }
  });

  // Initial content
  const initialXml = XML_SAMPLES.ecommerce ? XML_SAMPLES.ecommerce.xml : `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <status>Side Panel Active</status>
  <info>Select text on web page or edit XML here</info>
</root>`;

  editor.setValue(initialXml, true);
  updateValidationBadge(editor.getValue());
});

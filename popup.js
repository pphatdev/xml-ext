/**
 * Extension Popup Logic (Modern Studio Coordinator)
 */

import { initTheme, toggleTheme } from './src/ui/theme.js';
import { formatXml } from './src/core/formatter.js';
import { minifyXml, getMinifyStats } from './src/core/minifier.js';
import { validateXml } from './src/core/validator.js';
import { xmlToJson } from './src/core/converter.js';
import { XmlEditor } from './src/ui/editor.js';
import { XmlTreeView } from './src/ui/tree-view.js';
import { XmlChartView } from './src/ui/chart-view.js';
import { XML_SAMPLES } from './src/samples/samples.js';
import { fetchXmlFromUrl } from './src/core/fetcher.js';
import { showToast } from './src/ui/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const editorMount = document.getElementById('popup-editor-mount');
  const treeContainer = document.getElementById('popup-tree-container');
  const chartContainer = document.getElementById('popup-chart-container');
  const jsonOutput = document.getElementById('popup-json-output');

  const statusBadge = document.getElementById('popup-status-badge');
  const sizeInfo = document.getElementById('popup-size-info');
  const linesInfo = document.getElementById('popup-lines-info');
  const elemCount = document.getElementById('popup-elem-count');

  // Initialize Editor
  const editor = new XmlEditor(editorMount, {
    onChange: () => updateStatus()
  });

  // Initialize Visualizers
  const treeView = new XmlTreeView(treeContainer);
  const chartView = new XmlChartView(chartContainer);

  let activeTab = 'editor';

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateStatus() {
    const val = editor.getValue();
    const bytes = new TextEncoder().encode(val).length;
    const lines = val ? val.split('\n').length : 0;

    sizeInfo.textContent = formatBytes(bytes);
    linesInfo.textContent = `${lines} line${lines === 1 ? '' : 's'}`;

    if (!val.trim()) {
      statusBadge.className = 'val-badge val-badge-empty';
      statusBadge.innerHTML = '<span>Empty</span>';
      statusBadge.title = 'No XML content loaded';
      elemCount.textContent = '0 elem';
      return;
    }

    const res = validateXml(val);
    if (res.valid) {
      statusBadge.className = 'val-badge val-badge-valid';
      statusBadge.innerHTML = `
        <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        <span>Valid</span>
      `;
      statusBadge.title = `Valid XML: <${res.rootTag}> (${res.elementCount} elements)`;
      elemCount.textContent = `${res.elementCount} elem`;
    } else {
      statusBadge.className = 'val-badge val-badge-invalid';
      statusBadge.innerHTML = `
        <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>${res.errors.length} Err</span>
      `;
      const firstErr = res.errors[0];
      statusBadge.title = `Invalid XML: ${firstErr ? `Ln ${firstErr.line}:${firstErr.column} ${firstErr.message}` : 'Syntax error'}`;
      elemCount.textContent = firstErr ? `Ln ${firstErr.line}` : 'Syntax Error';
    }
  }

  // Load sample on start
  const initialXml = XML_SAMPLES.ecommerce ? XML_SAMPLES.ecommerce.xml : `<?xml version="1.0" encoding="UTF-8"?>
<note to="User" from="XML Pro">
  <heading>Welcome</heading>
  <body>Try quick format, minify, tree, or chart view!</body>
</note>`;

  editor.setValue(initialXml, true);
  updateStatus();

  // If active tab is viewing an XML link, auto-format fields from active tab
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url && /\.(xml|rss|atom|xsd|wsdl)($|\?|#)/i.test(currentTab.url)) {
        try {
          const res = await fetchXmlFromUrl(currentTab.url);
          if (res && res.text) {
            const formatted = formatXml(res.text, { indent: '  ', preserveComments: true, entities: 'auto' });
            editor.setValue(formatted, true);
            updateStatus();
            showToast('Auto-formatted active tab XML', 'success');
          }
        } catch (_e) {}
      }
    });
  }

  // Header Actions
  document.getElementById('btn-popup-open-full').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'index.html' });
    } else {
      window.open('index.html', '_blank');
    }
  });

  document.getElementById('btn-popup-theme').addEventListener('click', () => {
    toggleTheme();
  });

  // Format Helper
  function executeFormat(entityMode = 'auto') {
    const xml = editor.getValue();
    if (!xml.trim()) return;

    try {
      const formatted = formatXml(xml, { indent: '  ', preserveComments: true, entities: entityMode });
      editor.setValue(formatted, true);
      updateStatus();
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
  document.getElementById('btn-popup-format').addEventListener('click', () => {
    executeFormat('auto');
  });

  // Format Dropdown
  const btnFormatDropdown = document.getElementById('btn-popup-format-dropdown');
  const formatDropdownMenu = document.getElementById('popup-format-dropdown-menu');

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
  document.getElementById('btn-popup-minify').addEventListener('click', () => {
    const original = editor.getValue();
    if (!original.trim()) return;

    try {
      const minified = minifyXml(original, { removeComments: true, selfCloseEmpty: true });
      const stats = getMinifyStats(original, minified);
      editor.setValue(minified, true);
      updateStatus();
      showToast(`Minified! Saved ${stats.savedBytes.toLocaleString()} B (${stats.savingsPercent}%)`, 'success');
    } catch (e) {
      showToast(`Minify error: ${e.message}`, 'error');
    }
  });

  // Validate
  document.getElementById('btn-popup-validate').addEventListener('click', () => {
    const xml = editor.getValue();
    const res = validateXml(xml);
    if (res.valid) {
      showToast(`Valid XML: <${res.rootTag}> (${res.elementCount} elem)`, 'success');
    } else {
      showToast(`Invalid: ${res.errors[0]?.message || 'Syntax error'}`, 'error');
    }
    updateStatus();
  });

  // Samples Select
  const sampleSelect = document.getElementById('select-popup-sample');
  if (sampleSelect) {
    sampleSelect.addEventListener('change', (e) => {
      const sampleKey = e.target.value;
      if (sampleKey && XML_SAMPLES[sampleKey]) {
        editor.setValue(XML_SAMPLES[sampleKey].xml, true);
        updateStatus();
        showToast(`Loaded ${XML_SAMPLES[sampleKey].name} sample`, 'info');
        sampleSelect.value = '';
      }
    });
  }

  // Copy XML
  document.getElementById('btn-popup-copy').addEventListener('click', () => {
    const text = editor.getValue();
    if (!text) {
      showToast('Nothing to copy', 'warning');
      return;
    }
    navigator.clipboard.writeText(text);
    showToast('Copied XML to clipboard', 'success');
  });

  // Download XML
  document.getElementById('btn-popup-download').addEventListener('click', () => {
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

  // Clear Editor
  document.getElementById('btn-popup-clear').addEventListener('click', () => {
    if (!editor.getValue().trim()) return;
    if (confirm('Clear XML editor content?')) {
      editor.setValue('', true);
      updateStatus();
      showToast('Editor cleared', 'info');
    }
  });

  // Copy JSON Output
  const btnCopyJson = document.getElementById('btn-popup-copy-json');
  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', () => {
      const jsonText = jsonOutput.value;
      if (!jsonText) return;
      navigator.clipboard.writeText(jsonText);
      showToast('Copied JSON to clipboard', 'success');
    });
  }

  // Refresh active view data
  function refreshView() {
    const xml = editor.getValue();
    if (activeTab === 'tree') {
      treeView.loadXml(xml);
    } else if (activeTab === 'chart') {
      chartView.loadXml(xml);
    } else if (activeTab === 'json') {
      if (!xml.trim()) {
        jsonOutput.value = '';
        return;
      }
      try {
        const json = xmlToJson(xml, { mode: 'clean', parsePrimitives: true });
        jsonOutput.value = JSON.stringify(json, null, 2);
      } catch (err) {
        jsonOutput.value = `// Error converting to JSON:\n// ${err.message}`;
      }
    }
  }

  // Tabs Switching
  const tabs = document.querySelectorAll('.popup-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;

      document.getElementById('popup-pane-editor').classList.toggle('hidden', activeTab !== 'editor');
      document.getElementById('popup-pane-tree').classList.toggle('hidden', activeTab !== 'tree');
      document.getElementById('popup-pane-chart').classList.toggle('hidden', activeTab !== 'chart');
      document.getElementById('popup-pane-json').classList.toggle('hidden', activeTab !== 'json');

      refreshView();
    });
  });
});

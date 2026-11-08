/**
 * Extension Popup Logic
 */

import { initTheme, toggleTheme } from './src/ui/theme.js';
import { formatXml } from './src/core/formatter.js';
import { minifyXml, getMinifyStats } from './src/core/minifier.js';
import { validateXml } from './src/core/validator.js';
import { xmlToJson } from './src/core/converter.js';
import { XmlTreeView } from './src/ui/tree-view.js';
import { showToast } from './src/ui/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const xmlInput = document.getElementById('popup-xml-input');
  const jsonOutput = document.getElementById('popup-json-output');
  const treeContainer = document.getElementById('popup-tree-container');
  const statusBadge = document.getElementById('popup-status-badge');
  const sizeInfo = document.getElementById('popup-size-info');

  const treeView = new XmlTreeView(treeContainer);

  let activeTab = 'editor';

  function updateStatus() {
    const val = xmlInput.value;
    const bytes = new TextEncoder().encode(val).length;
    sizeInfo.textContent = formatBytes(bytes);

    if (!val.trim()) {
      statusBadge.className = 'val-badge val-badge-empty';
      statusBadge.textContent = 'Empty';
      return;
    }

    const res = validateXml(val);
    if (res.valid) {
      statusBadge.className = 'val-badge val-badge-valid';
      statusBadge.textContent = `✓ Valid (${res.elementCount} elem)`;
    } else {
      statusBadge.className = 'val-badge val-badge-invalid';
      statusBadge.textContent = `✕ ${res.errors.length} Error`;
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Load from chrome.storage or sample
  const sample = `<?xml version="1.0" encoding="UTF-8"?>
<note to="User" from="XML Pro">
  <heading>Welcome</heading>
  <body>Try quick format, minify, or open Full Studio!</body>
</note>`;

  xmlInput.value = sample;
  updateStatus();

  // Open Full Studio
  document.getElementById('btn-popup-open-full').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'index.html' });
    } else {
      window.open('index.html', '_blank');
    }
  });

  // Toggle Theme
  document.getElementById('btn-popup-theme').addEventListener('click', () => {
    toggleTheme();
  });

  // Format
  document.getElementById('btn-popup-format').addEventListener('click', () => {
    try {
      const formatted = formatXml(xmlInput.value);
      xmlInput.value = formatted;
      updateStatus();
      showToast('Formatted cleanly', 'success');
    } catch (e) {
      showToast(`Format error: ${e.message}`, 'error');
    }
  });

  // Minify
  document.getElementById('btn-popup-minify').addEventListener('click', () => {
    try {
      const original = xmlInput.value;
      const minified = minifyXml(original);
      const stats = getMinifyStats(original, minified);
      xmlInput.value = minified;
      updateStatus();
      showToast(`Minified! Saved ${stats.savingsPercent}%`, 'success');
    } catch (e) {
      showToast(`Minify error: ${e.message}`, 'error');
    }
  });

  // Validate
  document.getElementById('btn-popup-validate').addEventListener('click', () => {
    const res = validateXml(xmlInput.value);
    if (res.valid) {
      showToast('XML is valid & well-formed', 'success');
    } else {
      showToast(`Invalid: ${res.errors[0]?.message || 'Syntax error'}`, 'error');
    }
    updateStatus();
  });

  // Copy
  document.getElementById('btn-popup-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(xmlInput.value);
    showToast('Copied to clipboard', 'success');
  });

  // Clear
  document.getElementById('btn-popup-clear').addEventListener('click', () => {
    xmlInput.value = '';
    updateStatus();
  });

  // Input change
  xmlInput.addEventListener('input', () => {
    updateStatus();
  });

  // Tabs
  const tabs = document.querySelectorAll('.popup-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;

      document.getElementById('popup-pane-editor').classList.toggle('active', activeTab === 'editor');
      document.getElementById('popup-pane-tree').classList.toggle('active', activeTab === 'tree');
      document.getElementById('popup-pane-json').classList.toggle('active', activeTab === 'json');

      if (activeTab === 'tree') {
        treeView.loadXml(xmlInput.value);
      } else if (activeTab === 'json') {
        try {
          const json = xmlToJson(xmlInput.value);
          jsonOutput.value = JSON.stringify(json, null, 2);
        } catch (err) {
          jsonOutput.value = `Error converting to JSON: ${err.message}`;
        }
      }
    });
  });
});

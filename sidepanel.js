/**
 * Chrome Side Panel Coordinator
 */

import { initTheme, toggleTheme } from './src/ui/theme.js';
import { XmlEditor } from './src/ui/editor.js';
import { XmlTreeView } from './src/ui/tree-view.js';
import { XmlConverterView } from './src/ui/converter-view.js';
import { XmlLinterView } from './src/ui/linter-view.js';
import { XmlAnalyzerView } from './src/ui/analyzer-view.js';
import { SitemapModal } from './src/ui/sitemap-modal.js';
import { formatXml } from './src/core/formatter.js';
import { minifyXml, getMinifyStats } from './src/core/minifier.js';
import { validateXml } from './src/core/validator.js';
import { showToast } from './src/ui/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const editorContainer = document.getElementById('sp-pane-editor');
  const treeContainer = document.getElementById('sp-pane-tree');
  const converterContainer = document.getElementById('sp-pane-converter');
  const linterContainer = document.getElementById('sp-pane-linter');
  const analyzerContainer = document.getElementById('sp-pane-analyzer');

  const editor = new XmlEditor(editorContainer, {
    onChange: (xml) => handleXmlChange(xml)
  });

  const treeView = new XmlTreeView(treeContainer);
  const converterView = new XmlConverterView(converterContainer, {
    onLoadIntoEditor: (xml) => editor.setValue(xml, true)
  });
  const linterView = new XmlLinterView(linterContainer, {
    onJumpToLine: (line, col) => editor.jumpToLine(line, col)
  });
  const analyzerView = new XmlAnalyzerView(analyzerContainer);

  const sitemapModal = new SitemapModal({
    onLoadIntoEditor: (xml) => editor.setValue(xml, true)
  });

  let activeView = 'editor';

  function handleXmlChange(xml) {
    if (activeView === 'tree') treeView.loadXml(xml);
    else if (activeView === 'converter') converterView.loadXml(xml);
    else if (activeView === 'linter') linterView.lint(xml);
    else if (activeView === 'analyzer') analyzerView.analyze(xml);
  }

  // Switch view
  const tabs = document.querySelectorAll('.sidepanel-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeView = tab.dataset.view;

      editorContainer.classList.toggle('hidden', activeView !== 'editor');
      treeContainer.classList.toggle('hidden', activeView !== 'tree');
      converterContainer.classList.toggle('hidden', activeView !== 'converter');
      linterContainer.classList.toggle('hidden', activeView !== 'linter');
      analyzerContainer.classList.toggle('hidden', activeView !== 'analyzer');

      handleXmlChange(editor.getValue());
    });
  });

  // Buttons
  document.getElementById('btn-sidepanel-full').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'index.html' });
    } else {
      window.open('index.html', '_blank');
    }
  });

  document.getElementById('btn-sidepanel-theme').addEventListener('click', () => toggleTheme());

  document.getElementById('btn-sp-format').addEventListener('click', () => {
    try {
      const formatted = formatXml(editor.getValue());
      editor.setValue(formatted, true);
      showToast('Formatted cleanly', 'success');
    } catch (e) {
      showToast(`Format error: ${e.message}`, 'error');
    }
  });

  document.getElementById('btn-sp-minify').addEventListener('click', () => {
    try {
      const orig = editor.getValue();
      const min = minifyXml(orig);
      const stats = getMinifyStats(orig, min);
      editor.setValue(min, true);
      showToast(`Minified! Saved ${stats.savingsPercent}%`, 'success');
    } catch (e) {
      showToast(`Minify error: ${e.message}`, 'error');
    }
  });

  document.getElementById('btn-sp-validate').addEventListener('click', () => {
    const res = validateXml(editor.getValue());
    if (res.valid) {
      showToast(`Valid XML: <${res.rootTag}> (${res.elementCount} elem)`, 'success');
    } else {
      showToast(`Invalid: ${res.errors[0]?.message}`, 'error');
    }
  });

  document.getElementById('btn-sp-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(editor.getValue());
    showToast('Copied to clipboard', 'success');
  });

  document.getElementById('btn-sp-sitemap').addEventListener('click', () => {
    sitemapModal.show();
  });

  // Initial content
  editor.setValue(`<?xml version="1.0" encoding="UTF-8"?>
<root>
  <status>Side Panel Active</status>
  <info>Select text on web page or edit XML here</info>
</root>`, true);
});

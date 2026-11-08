/**
 * XML Pro Workbench Main Application Coordinator
 */

import { initTheme, toggleTheme } from './ui/theme.js';
import { showToast } from './ui/toast.js';
import { XmlEditor } from './ui/editor.js';
import { XmlTreeView } from './ui/tree-view.js';
import { XmlChartView } from './ui/chart-view.js';
import { XmlLinterView } from './ui/linter-view.js';
import { XmlAnalyzerView } from './ui/analyzer-view.js';
import { XmlConverterView } from './ui/converter-view.js';
import { SitemapModal } from './ui/sitemap-modal.js';
import { UrlModal } from './ui/url-modal.js';
import { XML_SAMPLES } from './samples/samples.js';

import { formatXml } from './core/formatter.js';
import { minifyXml, getMinifyStats } from './core/minifier.js';
import { validateXml } from './core/validator.js';

export class App {
  constructor() {
    this.activeView = 'tree'; // 'tree' | 'chart' | 'json' | 'txt' | 'linter' | 'analyzer' | 'converter'
    this.activeSample = 'catalog';
  }

  init() {
    initTheme();
    this.initComponents();
    this.initEvents();
    this.initDragAndDrop();

    // Load initial sample
    this.loadSample('ecommerce');
  }

  initComponents() {
    // 1. Editor
    const editorContainer = document.getElementById('editor-container');
    this.editor = new XmlEditor(editorContainer, {
      onChange: (xml) => this.handleContentChange(xml)
    });

    // 2. Tree View
    const treeContainer = document.getElementById('tree-view-container');
    this.treeView = new XmlTreeView(treeContainer);

    // 3. Chart View
    const chartContainer = document.getElementById('chart-view-container');
    this.chartView = new XmlChartView(chartContainer);

    // 4. Linter View
    const linterContainer = document.getElementById('linter-view-container');
    this.linterView = new XmlLinterView(linterContainer, {
      onJumpToLine: (line, col) => {
        this.editor.jumpToLine(line, col);
      }
    });

    // 5. Analyzer View
    const analyzerContainer = document.getElementById('analyzer-view-container');
    this.analyzerView = new XmlAnalyzerView(analyzerContainer);

    // 6. Converter View
    const converterContainer = document.getElementById('converter-view-container');
    this.converterView = new XmlConverterView(converterContainer, {
      onLoadIntoEditor: (xml) => {
        this.editor.setValue(xml, true);
        this.switchView('tree');
      }
    });

    // 7. Sitemap Modal
    this.sitemapModal = new SitemapModal({
      onLoadIntoEditor: (xml) => {
        this.editor.setValue(xml, true);
        this.switchView('tree');
      }
    });

    // 8. Load from URL Modal
    this.urlModal = new UrlModal({
      onLoadXml: (xml) => {
        this.editor.setValue(xml, true);
      }
    });
  }

  initEvents() {
    // Theme toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      toggleTheme();
    });

    // Mobile pane switcher (Small Screens)
    const mobileSwitchBtns = document.querySelectorAll('#mobile-pane-switcher .mobile-switch-btn');
    const workbenchLayout = document.querySelector('.workbench-layout');
    mobileSwitchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        mobileSwitchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pane = btn.dataset.pane;
        if (workbenchLayout) {
          workbenchLayout.setAttribute('data-mobile-pane', pane);
        }
      });
    });

    // View format switchers (XML / Tree / JSON / Chart / TXT / Linter / Analyzer / Convert)
    const viewTabs = document.querySelectorAll('.workbench-tabs .workbench-tab');
    for (const tab of viewTabs) {
      tab.addEventListener('click', () => {
        viewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.switchView(tab.dataset.view);

        // Auto-switch mobile view to visualizer on small screens
        if (window.innerWidth <= 900 && workbenchLayout && workbenchLayout.getAttribute('data-mobile-pane') === 'editor') {
          workbenchLayout.setAttribute('data-mobile-pane', 'visualizer');
          mobileSwitchBtns.forEach(b => b.classList.toggle('active', b.dataset.pane === 'visualizer'));
        }
      });
    }

    // Samples dropdown
    const sampleSelect = document.getElementById('select-sample');
    sampleSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadSample(e.target.value);
      }
    });

    // Format (Prettify)
    document.getElementById('btn-format').addEventListener('click', () => {
      this.formatCurrentXml();
    });

    // Minify
    document.getElementById('btn-minify').addEventListener('click', () => {
      this.minifyCurrentXml();
    });

    // Validate
    document.getElementById('btn-validate').addEventListener('click', () => {
      this.validateCurrentXml();
    });

    // Sitemap Generator
    document.getElementById('btn-sitemap-gen').addEventListener('click', () => {
      this.sitemapModal.show();
    });

    // Load from URL
    document.getElementById('btn-load-url').addEventListener('click', () => {
      this.promptLoadFromUrl();
    });

    // Load from File
    const fileInput = document.getElementById('file-input');
    document.getElementById('btn-load-file').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadFile(file);
      }
      fileInput.value = '';
    });

    // Copy XML
    document.getElementById('btn-copy-xml').addEventListener('click', () => {
      const val = this.editor.getValue();
      if (val) {
        navigator.clipboard.writeText(val);
        showToast('XML copied to clipboard', 'success');
      }
    });

    // Download XML
    document.getElementById('btn-download-xml').addEventListener('click', () => {
      this.downloadXml();
    });

    // Clear XML
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Clear editor content?')) {
        this.editor.setValue('', true);
        showToast('Editor cleared', 'info');
      }
    });
  }

  initDragAndDrop() {
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.body.classList.add('drag-active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.clientX === 0 && e.clientY === 0) {
        document.body.classList.remove('drag-active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      document.body.classList.remove('drag-active');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.loadFile(files[0]);
      }
    });
  }

  loadSample(sampleKey) {
    const sample = XML_SAMPLES[sampleKey];
    if (sample) {
      this.editor.setValue(sample.xml, true);
      showToast(`Loaded "${sample.name}" sample`, 'info');
    }
  }

  handleContentChange(xml) {
    // 1. Quick validation status badge
    this.updateValidationBadge(xml);

    // 2. Refresh active right-pane view
    this.refreshActiveView(xml);
  }

  updateValidationBadge(xml) {
    const badge = document.getElementById('validation-badge');
    if (!xml || !xml.trim()) {
      badge.className = 'val-badge val-badge-empty';
      badge.innerHTML = '<span>Empty</span>';
      badge.title = 'No XML content loaded';
      return;
    }

    const valResult = validateXml(xml);
    if (valResult.valid) {
      badge.className = 'val-badge val-badge-valid';
      badge.innerHTML = `
        <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        <span>Valid XML</span>
      `;
      badge.title = valResult.summary;
    } else {
      badge.className = 'val-badge val-badge-invalid';
      badge.innerHTML = `
        <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>${valResult.errors.length} Error${valResult.errors.length === 1 ? '' : 's'}</span>
      `;
      badge.title = valResult.errors.map(e => `Ln ${e.line}:${e.column}: ${e.message}`).join('\n');
    }
  }

  switchView(viewName) {
    this.activeView = viewName;

    // View panels
    const viewContainers = {
      tree: document.getElementById('tree-view-container'),
      chart: document.getElementById('chart-view-container'),
      linter: document.getElementById('linter-view-container'),
      analyzer: document.getElementById('analyzer-view-container'),
      converter: document.getElementById('converter-view-container')
    };

    for (const [key, el] of Object.entries(viewContainers)) {
      if (el) {
        el.classList.toggle('hidden', key !== viewName);
      }
    }

    this.refreshActiveView(this.editor.getValue());
  }

  refreshActiveView(xml) {
    if (this.activeView === 'tree') {
      this.treeView.loadXml(xml);
    } else if (this.activeView === 'chart') {
      this.chartView.loadXml(xml);
    } else if (this.activeView === 'linter') {
      this.linterView.lint(xml);
    } else if (this.activeView === 'analyzer') {
      this.analyzerView.analyze(xml);
    } else if (this.activeView === 'converter') {
      this.converterView.loadXml(xml);
    }
  }

  formatCurrentXml() {
    const xml = this.editor.getValue();
    if (!xml.trim()) return;

    try {
      const formatted = formatXml(xml, { indent: '  ', preserveComments: true });
      this.editor.setValue(formatted, true);
      showToast('XML formatted cleanly', 'success');
    } catch (err) {
      showToast(`Format failed: ${err.message}`, 'error');
    }
  }

  minifyCurrentXml() {
    const xml = this.editor.getValue();
    if (!xml.trim()) return;

    try {
      const minified = minifyXml(xml, { removeComments: true, selfCloseEmpty: true });
      const stats = getMinifyStats(xml, minified);
      this.editor.setValue(minified, true);
      showToast(`Minified! Saved ${stats.savedBytes.toLocaleString()} B (${stats.savingsPercent}%)`, 'success');
    } catch (err) {
      showToast(`Minify failed: ${err.message}`, 'error');
    }
  }

  validateCurrentXml() {
    const xml = this.editor.getValue();
    const valResult = validateXml(xml);

    if (valResult.valid) {
      showToast(`XML is well-formed & valid! Root <${valResult.rootTag}> with ${valResult.elementCount} elements.`, 'success', 4000);
    } else {
      showToast(`Validation Failed: ${valResult.errors[0]?.message || 'Invalid XML'}`, 'error', 5000);
      // Auto-switch to Linter view to show diagnostics
      const linterTab = document.querySelector('.workbench-tab[data-view="linter"]');
      if (linterTab) linterTab.click();
    }
  }

  promptLoadFromUrl() {
    this.urlModal.show();
  }

  loadFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      this.editor.setValue(content, true);
      showToast(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`, 'success');
    };
    reader.onerror = () => {
      showToast(`Failed to read file "${file.name}"`, 'error');
    };
    reader.readAsText(file);
  }

  downloadXml() {
    const xml = this.editor.getValue();
    if (!xml.trim()) {
      showToast('No XML content to download', 'warning');
      return;
    }

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.xml';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded document.xml', 'success');
  }
}

// Bootstrap app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.__XML_APP__ = app;
});


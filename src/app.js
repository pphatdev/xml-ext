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
import { fetchXmlFromUrl } from './core/fetcher.js';

import { formatXml } from './core/formatter.js';
import { minifyXml, getMinifyStats } from './core/minifier.js';
import { validateXml } from './core/validator.js';
import {
  xmlToJson,
  jsonToXml,
  xmlToYaml,
  yamlToXml,
  yamlToJson,
  xmlToCsv,
  csvToXml,
  xmlToTxt,
  txtToXml,
  xmlToToml,
  tomlToXml,
  xmlToMarkdown,
  markdownToXml,
  detectFormat
} from './core/converter.js';

export class App {
  constructor() {
    this.activeView = 'tree'; // 'tree' | 'chart' | 'json' | 'txt' | 'linter' | 'analyzer' | 'converter'
    this.activeSample = 'catalog';
    this.editorFormat = 'xml'; // 'xml' | 'json' | 'yaml' | 'txt' | 'csv'
  }

  async init() {
    initTheme();
    this.initComponents();
    this.initEvents();
    this.initDragAndDrop();
    this.initAutoFormatSettings();

    // Check if opened from link (.xml) or query params
    await this.handleInitialRoute();
  }

  initAutoFormatSettings() {
    const toggleBtn = document.getElementById('btn-toggle-autoformat');
    if (!toggleBtn) return;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['autoFormatXml'], (res) => {
        const isEnabled = res.autoFormatXml !== false;
        this.updateAutoFormatButton(isEnabled);
      });
    }

    toggleBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['autoFormatXml'], (res) => {
          const newState = res.autoFormatXml === false ? true : false;
          chrome.storage.local.set({ autoFormatXml: newState }, () => {
            this.updateAutoFormatButton(newState);
            showToast(`Auto-format for .xml links ${newState ? 'enabled' : 'disabled'}`, 'info');
          });
        });
      } else {
        const active = toggleBtn.classList.toggle('active');
        this.updateAutoFormatButton(active);
        showToast(`Auto-format for .xml links ${active ? 'enabled' : 'disabled'}`, 'info');
      }
    });
  }

  updateAutoFormatButton(isEnabled) {
    const toggleBtn = document.getElementById('btn-toggle-autoformat');
    if (!toggleBtn) return;

    toggleBtn.classList.toggle('active', isEnabled);
    toggleBtn.title = `Auto-format .xml links: ${isEnabled ? 'Enabled' : 'Disabled'} (Click to toggle)`;
    toggleBtn.setAttribute('aria-label', toggleBtn.title);
  }

  async handleInitialRoute() {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');
    const autoFormat = params.get('autoformat') !== '0';
    const fromSelection = params.get('from') === 'selection';
    const rawXml = params.get('xml');

    if (targetUrl) {
      await this.loadAndFormatUrl(targetUrl, autoFormat);
      return;
    }

    if (fromSelection) {
      await this.loadFromSelection();
      return;
    }

    if (rawXml) {
      try {
        const decoded = decodeURIComponent(rawXml);
        const formatted = formatXml(decoded, { indent: '  ', preserveComments: true, entities: 'auto' });
        this.editor.setValue(formatted, true);
        showToast('Auto-formatted XML fields', 'success');
        return;
      } catch (_e) {}
    }

    // Default: load sample
    this.loadSample('ecommerce');
  }

  async loadAndFormatUrl(targetUrl, autoFormat = true) {
    this.showSourceBanner(targetUrl);
    showToast(`Loading XML from ${targetUrl}...`, 'info', 2500);

    try {
      const result = await fetchXmlFromUrl(targetUrl);
      const rawText = result.text;

      let contentToLoad = rawText;
      if (autoFormat) {
        try {
          contentToLoad = formatXml(rawText, { indent: '  ', preserveComments: true, entities: 'auto' });
        } catch (_fmtErr) {
          contentToLoad = rawText;
        }
      }

      if (this.editorFormat !== 'xml') {
        this.switchEditorFormat('xml', false);
      }

      this.editor.setValue(contentToLoad, true);
      this.handleContentChange(contentToLoad);

      const valRes = validateXml(contentToLoad);
      const elemInfo = valRes.valid ? ` (${valRes.elementCount} elements)` : '';
      showToast(`Auto-formatted XML fields from URL${elemInfo}`, 'success', 4000);
    } catch (err) {
      showToast(`Failed to load XML from URL: ${err.message}`, 'error', 6000);
      this.loadSample('ecommerce');
    }
  }

  showSourceBanner(targetUrl) {
    const banner = document.getElementById('xml-source-banner');
    const urlText = document.getElementById('source-url-text');
    const btnRaw = document.getElementById('btn-view-raw-source');
    const btnReload = document.getElementById('btn-reload-source');
    const btnClose = document.getElementById('btn-close-source-banner');

    if (!banner || !urlText) return;

    urlText.textContent = targetUrl;
    urlText.title = targetUrl;

    if (btnRaw) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      btnRaw.href = `${targetUrl}${sep}raw=true`;
    }

    if (btnReload) {
      btnReload.onclick = () => {
        this.loadAndFormatUrl(targetUrl, true);
      };
    }

    if (btnClose) {
      btnClose.onclick = () => {
        banner.classList.add('hidden');
      };
    }

    banner.classList.remove('hidden');
  }

  async loadFromSelection() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pendingXml'], (res) => {
        if (res.pendingXml) {
          let content = res.pendingXml;
          try {
            content = formatXml(content, { indent: '  ', preserveComments: true, entities: 'auto' });
          } catch (_e) {}

          if (this.editorFormat !== 'xml') {
            this.switchEditorFormat('xml', false);
          }
          this.editor.setValue(content, true);
          this.handleContentChange(content);
          chrome.storage.local.remove(['pendingXml']);
          showToast('Loaded and auto-formatted selected XML fields', 'success');
        } else {
          this.loadSample('ecommerce');
        }
      });
    } else {
      this.loadSample('ecommerce');
    }
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
        if (this.editorFormat !== 'xml') {
          this.switchEditorFormat('xml', false);
        }
        this.editor.setValue(xml, true);
        this.switchView('tree');
      }
    });

    // 7. Sitemap Modal
    this.sitemapModal = new SitemapModal({
      onLoadIntoEditor: (xml) => {
        if (this.editorFormat !== 'xml') {
          this.switchEditorFormat('xml', false);
        }
        this.editor.setValue(xml, true);
        this.switchView('tree');
      }
    });

    // 8. Load from URL Modal
    this.urlModal = new UrlModal({
      onLoadXml: (xml) => {
        if (this.editorFormat !== 'xml') {
          this.switchEditorFormat('xml', false);
        }
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

    // Editor format tabs (XML / JSON / YAML / TXT / CSV)
    const formatTabs = document.querySelectorAll('#editor-format-tabs .editor-format-tab');
    formatTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetFormat = tab.dataset.format;
        if (targetFormat && targetFormat !== this.editorFormat) {
          this.switchEditorFormat(targetFormat, true);
        }
      });
    });

    // Samples dropdown
    const sampleSelect = document.getElementById('select-sample');
    sampleSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadSample(e.target.value);
      }
    });

    // Format (Prettify) & Entity Dropdown
    const btnFormat = document.getElementById('btn-format');
    if (btnFormat) {
      btnFormat.addEventListener('click', () => {
        this.formatCurrentContent('auto');
      });
    }

    const btnFormatDropdown = document.getElementById('btn-format-dropdown');
    const formatDropdownMenu = document.getElementById('format-dropdown-menu');

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
          this.formatCurrentContent(mode);
        });
      });

      window.addEventListener('click', () => {
        formatDropdownMenu.classList.add('hidden');
      });
    }

    // Minify
    document.getElementById('btn-minify').addEventListener('click', () => {
      this.minifyCurrentContent();
    });

    // Validate
    document.getElementById('btn-validate').addEventListener('click', () => {
      this.validateCurrentContent();
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

    // Copy content
    const btnCopy = document.getElementById('btn-copy-xml');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const val = this.editor.getValue();
        if (val) {
          navigator.clipboard.writeText(val);
          showToast(`${this.editorFormat.toUpperCase()} copied to clipboard`, 'success');
        }
      });
    }

    // Download content
    const btnDownload = document.getElementById('btn-download-xml');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        this.downloadContent();
      });
    }

    // Clear editor
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm(`Clear ${this.editorFormat.toUpperCase()} editor content?`)) {
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
      if (this.editorFormat !== 'xml') {
        this.switchEditorFormat('xml', false);
      }
      this.editor.setValue(sample.xml, true);
      showToast(`Loaded "${sample.name}" sample`, 'info');
    }
  }

  switchEditorFormat(targetFormat, convertExisting = true) {
    if (!targetFormat || targetFormat === this.editorFormat) return;

    const currentContent = this.editor.getValue();
    let convertedContent = currentContent;

    if (convertExisting && currentContent.trim()) {
      try {
        const xml = this.contentToXml(currentContent, this.editorFormat);
        convertedContent = this.xmlToTargetFormat(xml, targetFormat);
      } catch (err) {
        showToast(`Cannot convert ${this.editorFormat.toUpperCase()} to ${targetFormat.toUpperCase()}: ${err.message}`, 'error', 4000);
        return;
      }
    }

    const prevFormat = this.editorFormat;
    this.editorFormat = targetFormat;

    // Update format tabs UI
    const tabs = document.querySelectorAll('#editor-format-tabs .editor-format-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.format === targetFormat);
    });

    // Update active format badge in pane header
    const badge = document.getElementById('editor-active-format-badge');
    if (badge) {
      badge.textContent = targetFormat.toUpperCase();
    }

    // Update editor status bar and placeholder
    this.editor.setFormat(targetFormat);

    if (convertExisting && currentContent.trim()) {
      this.editor.setValue(convertedContent, false);
    }

    // Refresh validation and right-pane visualizers
    this.handleContentChange(this.editor.getValue());

    if (convertExisting && currentContent.trim()) {
      showToast(`Converted ${prevFormat.toUpperCase()} to ${targetFormat.toUpperCase()}`, 'success');
    } else {
      showToast(`Switched editor to ${targetFormat.toUpperCase()}`, 'info');
    }
  }

  contentToXml(content, format = this.editorFormat) {
    if (!content || !content.trim()) return '';

    switch (format) {
      case 'xml':
        return content;
      case 'json': {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        return jsonToXml(parsed, { rootTag: 'root' });
      }
      case 'yaml':
        return yamlToXml(content, { rootTag: 'root' });
      case 'csv':
        return csvToXml(content, { rootTag: 'records', rowTag: 'row' });
      case 'txt':
        return txtToXml(content, { rootTag: 'document', lineTag: 'line' });
      case 'toml':
        return tomlToXml(content, { rootTag: 'config' });
      case 'markdown':
        return markdownToXml(content, { rootTag: 'document' });
      default:
        return content;
    }
  }

  xmlToTargetFormat(xml, targetFormat) {
    if (!xml || !xml.trim()) return '';

    switch (targetFormat) {
      case 'xml':
        return formatXml(xml, { indent: '  ', preserveComments: true });
      case 'json': {
        const obj = xmlToJson(xml, { mode: 'clean', parsePrimitives: true });
        return JSON.stringify(obj, null, 2);
      }
      case 'yaml':
        return xmlToYaml(xml);
      case 'csv':
        return xmlToCsv(xml);
      case 'txt':
        return xmlToTxt(xml);
      case 'toml':
        return xmlToToml(xml);
      case 'markdown':
        return xmlToMarkdown(xml);
      default:
        return xml;
    }
  }

  getContentAsXml(content) {
    if (!content || !content.trim()) return '';
    try {
      return this.contentToXml(content, this.editorFormat);
    } catch (_e) {
      return '';
    }
  }

  handleContentChange(content) {
    // 1. Validation status badge
    this.updateValidationBadge(content);

    // 2. Convert to XML for right-pane visualizers
    const xml = this.getContentAsXml(content);

    // 3. Refresh active right-pane view
    this.refreshActiveView(xml);
  }

  updateValidationBadge(content) {
    const badge = document.getElementById('validation-badge');
    if (!badge) return;

    if (!content || !content.trim()) {
      badge.className = 'val-badge val-badge-empty';
      badge.innerHTML = '<span>Empty</span>';
      badge.title = `No ${this.editorFormat.toUpperCase()} content loaded`;
      return;
    }

    const checkIcon = `
      <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    `;

    const errorIcon = `
      <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    `;

    if (this.editorFormat === 'xml') {
      const valResult = validateXml(content);
      if (valResult.valid) {
        badge.className = 'val-badge val-badge-valid';
        badge.innerHTML = `${checkIcon}<span>Valid XML</span>`;
        badge.title = valResult.summary;
      } else {
        badge.className = 'val-badge val-badge-invalid';
        badge.innerHTML = `${errorIcon}<span>${valResult.errors.length} Error${valResult.errors.length === 1 ? '' : 's'}</span>`;
        badge.title = valResult.errors.map(e => `Ln ${e.line}:${e.column}: ${e.message}`).join('\n');
      }
    } else if (this.editorFormat === 'json') {
      try {
        JSON.parse(content);
        badge.className = 'val-badge val-badge-valid';
        badge.innerHTML = `${checkIcon}<span>Valid JSON</span>`;
        badge.title = 'JSON syntax is valid';
      } catch (err) {
        badge.className = 'val-badge val-badge-invalid';
        badge.innerHTML = `${errorIcon}<span>Invalid JSON</span>`;
        badge.title = err.message;
      }
    } else if (this.editorFormat === 'yaml') {
      try {
        yamlToJson(content);
        badge.className = 'val-badge val-badge-valid';
        badge.innerHTML = `${checkIcon}<span>Valid YAML</span>`;
        badge.title = 'YAML structure is valid';
      } catch (err) {
        badge.className = 'val-badge val-badge-invalid';
        badge.innerHTML = `${errorIcon}<span>Invalid YAML</span>`;
        badge.title = err.message;
      }
    } else if (this.editorFormat === 'csv') {
      try {
        const lines = content.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
        const cols = lines[0].split(',').length;
        let valid = true;
        let mismatch = '';
        for (let i = 1; i < lines.length; i++) {
          const c = lines[i].split(',').length;
          if (c !== cols) {
            valid = false;
            mismatch = `Line ${i + 1} has ${c} columns (expected ${cols})`;
            break;
          }
        }
        if (valid) {
          badge.className = 'val-badge val-badge-valid';
          badge.innerHTML = `${checkIcon}<span>Valid CSV</span>`;
          badge.title = `${lines.length} rows, ${cols} columns`;
        } else {
          badge.className = 'val-badge val-badge-invalid';
          badge.innerHTML = `${errorIcon}<span>CSV Mismatch</span>`;
          badge.title = mismatch;
        }
      } catch (err) {
        badge.className = 'val-badge val-badge-invalid';
        badge.innerHTML = `${errorIcon}<span>Invalid CSV</span>`;
        badge.title = err.message;
      }
    } else if (this.editorFormat === 'txt') {
      const lineCount = content.split('\n').length;
      badge.className = 'val-badge val-badge-valid';
      badge.innerHTML = `${checkIcon}<span>Plain Text</span>`;
      badge.title = `${lineCount} lines, ${content.length} characters`;
    }
  }

  switchView(viewName) {
    this.activeView = viewName;

    const isFormatPreview = ['json', 'xml', 'csv', 'yaml', 'markdown', 'toml', 'txt', 'converter'].includes(viewName);

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
        if (key === 'converter') {
          el.classList.toggle('hidden', !isFormatPreview);
        } else {
          el.classList.toggle('hidden', key !== viewName);
        }
      }
    }

    if (isFormatPreview && viewName !== 'converter') {
      this.converterView.setTarget(viewName);
    }

    const xml = this.getContentAsXml(this.editor.getValue());
    this.refreshActiveView(xml);
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
    } else if (['json', 'xml', 'csv', 'yaml', 'markdown', 'toml', 'txt', 'converter'].includes(this.activeView)) {
      if (this.activeView !== 'converter') {
        this.converterView.setTarget(this.activeView);
      }
      this.converterView.loadXml(xml);
    }
  }

  formatCurrentContent(entityMode = 'auto') {
    const content = this.editor.getValue();
    if (!content.trim()) return;

    if (this.editorFormat === 'xml') {
      this.formatCurrentXml(entityMode);
      return;
    }

    try {
      if (this.editorFormat === 'json') {
        const obj = JSON.parse(content);
        const formatted = JSON.stringify(obj, null, 2);
        this.editor.setValue(formatted, true);
        showToast('JSON formatted cleanly', 'success');
      } else if (this.editorFormat === 'yaml') {
        const xml = yamlToXml(content);
        const formatted = xmlToYaml(xml);
        this.editor.setValue(formatted, true);
        showToast('YAML formatted cleanly', 'success');
      } else if (this.editorFormat === 'csv') {
        const xml = csvToXml(content);
        const formatted = xmlToCsv(xml);
        this.editor.setValue(formatted, true);
        showToast('CSV formatted cleanly', 'success');
      } else if (this.editorFormat === 'txt') {
        const formatted = content
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        this.editor.setValue(formatted, true);
        showToast('Text formatted', 'success');
      }
    } catch (err) {
      showToast(`Format failed: ${err.message}`, 'error');
    }
  }

  formatCurrentXml(entityMode = 'auto') {
    const xml = this.editor.getValue();
    if (!xml.trim()) return;

    try {
      const formatted = formatXml(xml, { indent: '  ', preserveComments: true, entities: entityMode });
      this.editor.setValue(formatted, true);
      const modeLabels = {
        auto: 'XML formatted cleanly',
        named: 'XML formatted with named entities (&amp;, &lt;, &gt;)',
        numeric: 'XML formatted with numeric character references (&#...;)',
        hex: 'XML formatted with hexadecimal character references (&#x...;)',
        decode: 'XML entities decoded to characters'
      };
      showToast(modeLabels[entityMode] || 'XML formatted', 'success');
    } catch (err) {
      showToast(`Format failed: ${err.message}`, 'error');
    }
  }

  minifyCurrentContent() {
    const content = this.editor.getValue();
    if (!content.trim()) return;

    if (this.editorFormat === 'xml') {
      this.minifyCurrentXml();
      return;
    }

    try {
      let minified = content;
      if (this.editorFormat === 'json') {
        const obj = JSON.parse(content);
        minified = JSON.stringify(obj);
      } else if (this.editorFormat === 'yaml') {
        minified = content
          .split('\n')
          .map(l => l.replace(/#.*$/, ''))
          .filter(l => l.trim().length > 0)
          .join('\n');
      } else if (this.editorFormat === 'csv') {
        minified = content
          .split('\n')
          .map(line => line.split(',').map(c => c.trim()).join(','))
          .filter(line => line.length > 0)
          .join('\n');
      } else if (this.editorFormat === 'txt') {
        minified = content
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .join('\n');
      }

      const saved = content.length - minified.length;
      const percent = content.length > 0 ? ((saved / content.length) * 100).toFixed(1) : 0;
      this.editor.setValue(minified, true);
      showToast(`${this.editorFormat.toUpperCase()} Minified! Saved ${saved} B (${percent}%)`, 'success');
    } catch (err) {
      showToast(`Minify failed: ${err.message}`, 'error');
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

  validateCurrentContent() {
    const content = this.editor.getValue();

    if (this.editorFormat === 'xml') {
      this.validateCurrentXml();
      return;
    }

    if (this.editorFormat === 'json') {
      try {
        const obj = JSON.parse(content);
        const keyCount = typeof obj === 'object' && obj !== null ? Object.keys(obj).length : 1;
        showToast(`JSON is valid! Root object has ${keyCount} top-level key(s).`, 'success', 4000);
      } catch (err) {
        showToast(`JSON Validation Failed: ${err.message}`, 'error', 5000);
      }
    } else if (this.editorFormat === 'yaml') {
      try {
        const obj = yamlToJson(content);
        const keyCount = typeof obj === 'object' && obj !== null ? Object.keys(obj).length : 1;
        showToast(`YAML is valid! Parsed ${keyCount} top-level key(s).`, 'success', 4000);
      } catch (err) {
        showToast(`YAML Validation Failed: ${err.message}`, 'error', 5000);
      }
    } else if (this.editorFormat === 'csv') {
      try {
        const lines = content.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) {
          showToast('CSV is empty', 'warning');
          return;
        }
        const cols = lines[0].split(',').length;
        for (let i = 1; i < lines.length; i++) {
          const c = lines[i].split(',').length;
          if (c !== cols) {
            showToast(`CSV Validation Error: Line ${i + 1} has ${c} columns (expected ${cols})`, 'error', 5000);
            return;
          }
        }
        showToast(`CSV is valid! ${lines.length} rows with ${cols} columns each.`, 'success', 4000);
      } catch (err) {
        showToast(`CSV Validation Error: ${err.message}`, 'error', 5000);
      }
    } else if (this.editorFormat === 'txt') {
      const lines = content.split('\n').length;
      showToast(`Plain Text document with ${lines} lines and ${content.length} characters.`, 'success', 4000);
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
      const name = (file.name || '').toLowerCase();
      let format = 'xml';
      if (name.endsWith('.json')) {
        format = 'json';
      } else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
        format = 'yaml';
      } else if (name.endsWith('.csv')) {
        format = 'csv';
      } else if (name.endsWith('.txt')) {
        format = 'txt';
      } else if (name.endsWith('.xml')) {
        format = 'xml';
      } else {
        format = detectFormat(content);
      }

      this.switchEditorFormat(format, false);
      this.editor.setValue(content, true);
      showToast(`Loaded "${file.name}" as ${format.toUpperCase()} (${(file.size / 1024).toFixed(1)} KB)`, 'success');
    };
    reader.onerror = () => {
      showToast(`Failed to read file "${file.name}"`, 'error');
    };
    reader.readAsText(file);
  }

  downloadContent() {
    const content = this.editor.getValue();
    if (!content.trim()) {
      showToast(`No ${this.editorFormat.toUpperCase()} content to download`, 'warning');
      return;
    }

    const mimeTypes = {
      xml: 'application/xml;charset=utf-8',
      json: 'application/json;charset=utf-8',
      yaml: 'text/yaml;charset=utf-8',
      txt: 'text/plain;charset=utf-8',
      csv: 'text/csv;charset=utf-8'
    };

    const extensions = {
      xml: 'xml',
      json: 'json',
      yaml: 'yaml',
      txt: 'txt',
      csv: 'csv'
    };

    const ext = extensions[this.editorFormat] || 'txt';
    const mime = mimeTypes[this.editorFormat] || 'text/plain;charset=utf-8';
    const filename = `document.${ext}`;

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  }

  downloadXml() {
    this.downloadContent();
  }
}

// Bootstrap app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.__XML_APP__ = app;
});


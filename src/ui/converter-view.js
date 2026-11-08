/**
 * Converter View Component
 * Supports bidirectional conversions to JSON, TXT, CSV, YAML, and Tree.
 * Features both syntax-highlighted Blog Code Preview and raw editable Textarea,
 * with word wrap toggle and full pane fit.
 */

import { xmlToJson, jsonToXml, xmlToTxt, xmlToCsv, xmlToYaml } from '../core/converter.js';
import { parseMarkdown } from '../core/markdown.js';
import { showToast } from './toast.js';

export class XmlConverterView {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onLoadIntoEditor = options.onLoadIntoEditor || (() => {});
    this.activeTarget = 'json'; // 'json' | 'txt' | 'csv' | 'yaml' | 'json2xml'
    this.viewMode = 'preview'; // 'preview' | 'raw'
    this.isWrapped = false;
    this.currentXml = '';
    this.convertedOutput = '';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="converter-wrapper">
        <div class="converter-toolbar">
          <div class="converter-format-tabs">
            <button type="button" class="tab-btn active" data-target="json">XML to JSON</button>
            <button type="button" class="tab-btn" data-target="txt">XML to TXT</button>
            <button type="button" class="tab-btn" data-target="csv">XML to CSV</button>
            <button type="button" class="tab-btn" data-target="yaml">XML to YAML</button>
            <button type="button" class="tab-btn" data-target="json2xml">JSON to XML</button>
          </div>
          <div class="converter-actions">
            <!-- Toggle Highlighted Preview vs Raw Text -->
            <button type="button" id="btn-toggle-preview-mode" class="btn-sm" title="Toggle between Highlighted Code Preview and Raw Text">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              <span id="preview-mode-text">Raw Text</span>
            </button>

            <!-- Word Wrap Toggle -->
            <button type="button" id="btn-toggle-wrap" class="btn-sm" title="Toggle Word Wrap (fit text to window width)">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h7a1 1 0 110 2H4a1 1 0 01-1-1zm11.293 1.293a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L17 14.414V17a1 1 0 11-2 0v-2.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3z" clip-rule="evenodd"/>
              </svg>
              Wrap
            </button>

            <!-- Copy Converted -->
            <button type="button" id="btn-copy-converted" class="btn-sm" title="Copy converted content">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
              </svg>
              Copy
            </button>

            <!-- Download -->
            <button type="button" id="btn-download-converted" class="btn-sm" title="Download file">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              Download
            </button>

            <!-- Load into editor -->
            <button type="button" id="btn-load-converted-to-editor" class="btn-sm hidden" title="Load XML to Main Editor">
              Load Into Editor
            </button>
          </div>
        </div>

        <!-- Options Bar -->
        <div class="converter-options-bar" id="converter-options-bar">
          <div id="opts-json" class="conv-opt-group">
            <label class="form-check-inline">
              <input type="radio" name="json-mode" value="clean" checked /> Standard JSON
            </label>
            <label class="form-check-inline">
              <input type="radio" name="json-mode" value="detailed" /> Detailed (Badgerfish)
            </label>
          </div>

          <div id="opts-txt" class="conv-opt-group hidden">
            <label class="form-check-inline">
              <input type="radio" name="txt-mode" value="outline" checked /> Structured Outline
            </label>
            <label class="form-check-inline">
              <input type="radio" name="txt-mode" value="raw" /> Raw Text Only
            </label>
          </div>

          <div id="opts-csv" class="conv-opt-group hidden">
            <label class="form-check-inline">
              <input type="radio" name="csv-delimiter" value="," checked /> Comma (CSV)
            </label>
            <label class="form-check-inline">
              <input type="radio" name="csv-delimiter" value="&#9;" /> Tab (TSV)
            </label>
          </div>

          <div id="opts-json2xml" class="conv-opt-group hidden">
            <label class="conv-label">Root Tag: <input type="text" id="json2xml-root" class="input-inline" value="root" /></label>
          </div>
        </div>

        <!-- Content Area: Preview Box + Textarea (Both fill 100% height & width) -->
        <div class="converter-content" id="converter-content-area">
          <div id="converter-preview-box" class="converter-preview-box"></div>
          <textarea
            id="converter-output-textarea"
            class="converter-textarea hidden"
            spellcheck="false"
            placeholder="Converted output will appear here..."
          ></textarea>
        </div>
      </div>
    `;

    this.previewBox = this.container.querySelector('#converter-preview-box');
    this.outputTextarea = this.container.querySelector('#converter-output-textarea');
    this.btnToggleMode = this.container.querySelector('#btn-toggle-preview-mode');
    this.previewModeText = this.container.querySelector('#preview-mode-text');
    this.btnToggleWrap = this.container.querySelector('#btn-toggle-wrap');
    this.btnCopy = this.container.querySelector('#btn-copy-converted');
    this.btnDownload = this.container.querySelector('#btn-download-converted');
    this.btnLoadEditor = this.container.querySelector('#btn-load-converted-to-editor');

    // Tab buttons
    const tabs = this.container.querySelectorAll('.converter-format-tabs .tab-btn');
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTarget = tab.dataset.target;
        this.updateOptionsVisibility();
        this.convert();
      });
    }

    // Toggle Preview vs Raw Mode
    this.btnToggleMode.addEventListener('click', () => {
      this.viewMode = this.viewMode === 'preview' ? 'raw' : 'preview';
      this.updateViewModeUI();
    });

    // Toggle Word Wrap
    this.btnToggleWrap.addEventListener('click', () => {
      this.isWrapped = !this.isWrapped;
      this.outputTextarea.classList.toggle('wrap-text', this.isWrapped);
      this.previewBox.classList.toggle('wrap-text', this.isWrapped);
      this.btnToggleWrap.classList.toggle('active', this.isWrapped);
      showToast(`Word wrap ${this.isWrapped ? 'enabled' : 'disabled'}`, 'info');
    });

    // Options changes
    this.container.querySelectorAll('input[type=radio]').forEach(r => {
      r.addEventListener('change', () => this.convert());
    });
    this.container.querySelector('#json2xml-root').addEventListener('input', () => this.convert());

    // Copy & Download
    this.btnCopy.addEventListener('click', () => {
      const textToCopy = this.convertedOutput || this.outputTextarea.value;
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        showToast('Converted content copied to clipboard', 'success');
      }
    });

    this.btnDownload.addEventListener('click', () => {
      this.downloadOutput();
    });

    this.btnLoadEditor.addEventListener('click', () => {
      const val = this.convertedOutput || this.outputTextarea.value;
      if (val) {
        this.onLoadIntoEditor(val);
        showToast('Converted XML loaded into Editor', 'success');
      }
    });

    // Support typing JSON directly when in json2xml mode
    this.outputTextarea.addEventListener('input', () => {
      if (this.activeTarget === 'json2xml') {
        const rootTag = this.container.querySelector('#json2xml-root').value.trim() || 'root';
        try {
          this.convertedOutput = jsonToXml(this.outputTextarea.value, { rootTag });
        } catch (_) {}
      }
    });
  }

  updateViewModeUI() {
    const isRaw = this.viewMode === 'raw' || this.activeTarget === 'json2xml';
    this.previewBox.classList.toggle('hidden', isRaw);
    this.outputTextarea.classList.toggle('hidden', !isRaw);
    this.previewModeText.textContent = isRaw ? 'Preview' : 'Raw Text';
  }

  updateOptionsVisibility() {
    this.container.querySelector('#opts-json').classList.toggle('hidden', this.activeTarget !== 'json');
    this.container.querySelector('#opts-txt').classList.toggle('hidden', this.activeTarget !== 'txt');
    this.container.querySelector('#opts-csv').classList.toggle('hidden', this.activeTarget !== 'csv');
    this.container.querySelector('#opts-json2xml').classList.toggle('hidden', this.activeTarget !== 'json2xml');
    this.btnLoadEditor.classList.toggle('hidden', this.activeTarget !== 'json2xml');

    if (this.activeTarget === 'json2xml') {
      this.outputTextarea.readOnly = false;
      this.outputTextarea.placeholder = 'Paste or type JSON here to convert into XML...';
      this.viewMode = 'raw';
    } else {
      this.outputTextarea.readOnly = true;
      this.outputTextarea.placeholder = 'Converted output will appear here...';
    }
    this.updateViewModeUI();
  }

  loadXml(xmlString) {
    this.currentXml = xmlString;
    this.convert();
  }

  convert() {
    if (this.activeTarget === 'json2xml') {
      const jsonStr = this.outputTextarea.value.trim();
      const rootTag = this.container.querySelector('#json2xml-root').value.trim() || 'root';
      if (jsonStr) {
        try {
          const xml = jsonToXml(jsonStr, { rootTag });
          this.convertedOutput = xml;
          this.renderOutput('xml');
          return;
        } catch (err) {
          this.renderError(err.message);
          return;
        }
      }
      return;
    }

    if (!this.currentXml || !this.currentXml.trim()) {
      this.convertedOutput = '';
      this.outputTextarea.value = '';
      this.previewBox.innerHTML = '<div class="text-muted" style="padding: 1.5rem; text-align: center;">No XML input to convert. Type or load XML in the editor.</div>';
      return;
    }

    try {
      let lang = 'json';
      if (this.activeTarget === 'json') {
        const mode = this.container.querySelector('input[name="json-mode"]:checked').value;
        const json = xmlToJson(this.currentXml, { mode });
        this.convertedOutput = JSON.stringify(json, null, 2);
        lang = 'json';
      } else if (this.activeTarget === 'txt') {
        const mode = this.container.querySelector('input[name="txt-mode"]:checked').value;
        this.convertedOutput = xmlToTxt(this.currentXml, { mode });
        lang = 'text';
      } else if (this.activeTarget === 'csv') {
        const delimiter = this.container.querySelector('input[name="csv-delimiter"]:checked').value;
        this.convertedOutput = xmlToCsv(this.currentXml, delimiter);
        lang = 'text';
      } else if (this.activeTarget === 'yaml') {
        this.convertedOutput = xmlToYaml(this.currentXml);
        lang = 'yaml';
      }

      this.outputTextarea.value = this.convertedOutput;
      this.renderOutput(lang);
    } catch (err) {
      this.renderError(err.message);
    }
  }

  renderOutput(lang) {
    if (!this.convertedOutput) {
      this.previewBox.innerHTML = '';
      return;
    }

    const md = `\`\`\`${lang}\n${this.convertedOutput}\n\`\`\``;
    const parsed = parseMarkdown(md);
    this.previewBox.innerHTML = parsed.html;

    // Bind copy button in preview header
    const copyBtn = this.previewBox.querySelector('.btn-copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.convertedOutput);
        showToast('Converted code copied to clipboard', 'success');
      });
    }
  }

  renderError(msg) {
    this.convertedOutput = `Conversion Error: ${msg}`;
    this.outputTextarea.value = this.convertedOutput;
    this.previewBox.innerHTML = `<div style="padding: 1rem; color: var(--error);">Conversion Error: ${msg}</div>`;
  }

  downloadOutput() {
    const content = this.convertedOutput || this.outputTextarea.value;
    if (!content) {
      showToast('No content to download', 'warning');
      return;
    }

    const extMap = {
      json: { ext: 'json', mime: 'application/json' },
      txt: { ext: 'txt', mime: 'text/plain' },
      csv: { ext: 'csv', mime: 'text/csv' },
      yaml: { ext: 'yaml', mime: 'text/yaml' },
      json2xml: { ext: 'xml', mime: 'application/xml' }
    };

    const targetInfo = extMap[this.activeTarget] || { ext: 'txt', mime: 'text/plain' };
    const blob = new Blob([content], { type: `${targetInfo.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${targetInfo.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded converted.${targetInfo.ext}`, 'success');
  }
}


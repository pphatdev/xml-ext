/**
 * Converter View Component
 * Supports bidirectional conversions to JSON, TXT, CSV, YAML, and Tree.
 */

import { xmlToJson, jsonToXml, xmlToTxt, xmlToCsv, xmlToYaml } from '../core/converter.js';
import { showToast } from './toast.js';

export class XmlConverterView {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onLoadIntoEditor = options.onLoadIntoEditor || (() => {});
    this.activeTarget = 'json'; // 'json' | 'txt' | 'csv' | 'yaml' | 'json2xml'
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
            <button type="button" id="btn-copy-converted" class="btn-sm" title="Copy converted content">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
              </svg>
              Copy
            </button>
            <button type="button" id="btn-download-converted" class="btn-sm" title="Download file">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              Download
            </button>
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

        <div class="converter-content">
          <textarea
            id="converter-output-textarea"
            class="converter-textarea"
            spellcheck="false"
            placeholder="Converted output will appear here..."
          ></textarea>
        </div>
      </div>
    `;

    this.outputTextarea = this.container.querySelector('#converter-output-textarea');
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

    // Options changes
    this.container.querySelectorAll('input[type=radio]').forEach(r => {
      r.addEventListener('change', () => this.convert());
    });
    this.container.querySelector('#json2xml-root').addEventListener('input', () => this.convert());

    // Copy & Download
    this.btnCopy.addEventListener('click', () => {
      if (this.outputTextarea.value) {
        navigator.clipboard.writeText(this.outputTextarea.value);
        showToast('Converted content copied to clipboard', 'success');
      }
    });

    this.btnDownload.addEventListener('click', () => {
      this.downloadOutput();
    });

    this.btnLoadEditor.addEventListener('click', () => {
      if (this.outputTextarea.value) {
        this.onLoadIntoEditor(this.outputTextarea.value);
        showToast('Converted XML loaded into Editor', 'success');
      }
    });

    // Support typing JSON directly when in json2xml mode
    this.outputTextarea.addEventListener('input', () => {
      if (this.activeTarget === 'json2xml') {
        // user editing JSON to convert to XML
      }
    });
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
    } else {
      this.outputTextarea.readOnly = true;
      this.outputTextarea.placeholder = 'Converted output will appear here...';
    }
  }

  loadXml(xmlString) {
    this.currentXml = xmlString;
    this.convert();
  }

  convert() {
    if (this.activeTarget === 'json2xml') {
      // Check if user has JSON in textarea or convert from currentXml
      const jsonStr = this.outputTextarea.value.trim();
      const rootTag = this.container.querySelector('#json2xml-root').value.trim() || 'root';
      if (jsonStr) {
        try {
          const xml = jsonToXml(jsonStr, { rootTag });
          this.convertedOutput = xml;
          return;
        } catch (_) {}
      }
      return;
    }

    if (!this.currentXml || !this.currentXml.trim()) {
      this.outputTextarea.value = '';
      return;
    }

    try {
      if (this.activeTarget === 'json') {
        const mode = this.container.querySelector('input[name="json-mode"]:checked').value;
        const json = xmlToJson(this.currentXml, { mode });
        this.convertedOutput = JSON.stringify(json, null, 2);
        this.outputTextarea.value = this.convertedOutput;
      } else if (this.activeTarget === 'txt') {
        const mode = this.container.querySelector('input[name="txt-mode"]:checked').value;
        this.convertedOutput = xmlToTxt(this.currentXml, { mode });
        this.outputTextarea.value = this.convertedOutput;
      } else if (this.activeTarget === 'csv') {
        const delimiter = this.container.querySelector('input[name="csv-delimiter"]:checked').value;
        this.convertedOutput = xmlToCsv(this.currentXml, delimiter);
        this.outputTextarea.value = this.convertedOutput;
      } else if (this.activeTarget === 'yaml') {
        this.convertedOutput = xmlToYaml(this.currentXml);
        this.outputTextarea.value = this.convertedOutput;
      }
    } catch (err) {
      this.outputTextarea.value = `Conversion Error: ${err.message}`;
    }
  }

  downloadOutput() {
    const content = this.outputTextarea.value;
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


/**
 * Multi-Format Preview & Converter View Component
 * Supports live syntax-highlighted previews for JSON, XML, CSV, YAML, Markdown, TOML, and TXT.
 * Features both syntax-highlighted Blog Code Preview, Rendered Markdown view, and raw editable Textarea,
 * with word wrap toggle and full pane fit.
 */

import {
  xmlToJson,
  jsonToXml,
  xmlToTxt,
  xmlToCsv,
  xmlToYaml,
  xmlToToml,
  xmlToMarkdown
} from '../core/converter.js';
import { formatXml } from '../core/formatter.js';
import { parseMarkdown } from '../core/markdown.js';
import { showToast } from './toast.js';

export class XmlConverterView {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onLoadIntoEditor = options.onLoadIntoEditor || (() => {});
    this.activeTarget = 'json'; // 'json' | 'xml' | 'csv' | 'yaml' | 'markdown' | 'toml' | 'txt' | 'entities'
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
          <div class="converter-header-left">
            <span class="preview-target-badge" id="preview-target-badge">JSON PREVIEW</span>
          </div>

          <!-- Format-Specific Options -->
          <div class="converter-options-bar" id="converter-options-bar">
            <!-- JSON Options -->
            <div id="opts-json" class="conv-opt-group">
              <label class="form-check-inline">
                <input type="radio" name="json-mode" value="clean" checked /> Standard JSON
              </label>
              <label class="form-check-inline">
                <input type="radio" name="json-mode" value="detailed" /> Detailed (Badgerfish)
              </label>
            </div>

            <!-- XML Options -->
            <div id="opts-xml" class="conv-opt-group hidden">
              <label class="form-check-inline">
                <input type="radio" name="xml-mode" value="auto" checked /> Clean Prettified
              </label>
              <label class="form-check-inline">
                <input type="radio" name="xml-mode" value="named" /> Named Entities
              </label>
              <label class="form-check-inline">
                <input type="radio" name="xml-mode" value="numeric" /> Numeric
              </label>
              <label class="form-check-inline">
                <input type="radio" name="xml-mode" value="hex" /> Hex
              </label>
              <label class="form-check-inline">
                <input type="radio" name="xml-mode" value="decode" /> Decode
              </label>
            </div>

            <!-- CSV Options -->
            <div id="opts-csv" class="conv-opt-group hidden">
              <label class="form-check-inline">
                <input type="radio" name="csv-delimiter" value="," checked /> Comma (CSV)
              </label>
              <label class="form-check-inline">
                <input type="radio" name="csv-delimiter" value="&#9;" /> Tab (TSV)
              </label>
            </div>

            <!-- Markdown Options -->
            <div id="opts-markdown" class="conv-opt-group hidden">
              <label class="form-check-inline">
                <input type="radio" name="md-mode" value="rendered" checked /> Rendered Document
              </label>
              <label class="form-check-inline">
                <input type="radio" name="md-mode" value="source" /> Markdown Code
              </label>
            </div>

            <!-- TXT Options -->
            <div id="opts-txt" class="conv-opt-group hidden">
              <label class="form-check-inline">
                <input type="radio" name="txt-mode" value="outline" checked /> Structured Outline
              </label>
              <label class="form-check-inline">
                <input type="radio" name="txt-mode" value="raw" /> Raw Text Only
              </label>
            </div>
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

            <!-- Copy Preview Content -->
            <button type="button" id="btn-copy-converted" class="btn-sm" title="Copy preview content" aria-label="Copy preview content">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
              </svg>
            </button>

            <!-- Download -->
            <button type="button" id="btn-download-converted" class="btn-sm" title="Download preview file">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              Download
            </button>
          </div>
        </div>

        <!-- Content Area: Preview Box + Rendered Markdown + Raw Textarea -->
        <div class="converter-content" id="converter-content-area">
          <div id="converter-preview-box" class="converter-preview-box"></div>
          <div id="converter-markdown-box" class="rendered-markdown-body hidden"></div>
          <textarea
            id="converter-output-textarea"
            class="converter-textarea hidden"
            spellcheck="false"
            placeholder="Preview output will appear here..."
          ></textarea>
        </div>
      </div>
    `;

    this.previewBadge = this.container.querySelector('#preview-target-badge');
    this.previewBox = this.container.querySelector('#converter-preview-box');
    this.markdownBox = this.container.querySelector('#converter-markdown-box');
    this.outputTextarea = this.container.querySelector('#converter-output-textarea');
    this.btnToggleMode = this.container.querySelector('#btn-toggle-preview-mode');
    this.previewModeText = this.container.querySelector('#preview-mode-text');
    this.btnToggleWrap = this.container.querySelector('#btn-toggle-wrap');
    this.btnCopy = this.container.querySelector('#btn-copy-converted');
    this.btnDownload = this.container.querySelector('#btn-download-converted');

    this.initEvents();
  }

  initEvents() {
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
      this.markdownBox.classList.toggle('wrap-text', this.isWrapped);
      this.btnToggleWrap.classList.toggle('active', this.isWrapped);
      showToast(`Word wrap ${this.isWrapped ? 'enabled' : 'disabled'}`, 'info');
    });

    // Options radio changes
    this.container.querySelectorAll('input[type=radio]').forEach(r => {
      r.addEventListener('change', () => this.convert());
    });

    // Copy & Download
    this.btnCopy.addEventListener('click', () => {
      const textToCopy = this.convertedOutput || this.outputTextarea.value;
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        showToast(`${this.activeTarget.toUpperCase()} preview copied to clipboard`, 'success');
      }
    });

    this.btnDownload.addEventListener('click', () => {
      this.downloadOutput();
    });
  }

  setTarget(target) {
    if (!target) return;
    this.activeTarget = target;
    this.updateOptionsVisibility();
    this.convert();
  }

  updateViewModeUI() {
    const isRaw = this.viewMode === 'raw';
    const isMarkdownRendered = this.activeTarget === 'markdown' && !isRaw &&
      (this.container.querySelector('input[name="md-mode"]:checked')?.value || 'rendered') === 'rendered';

    if (isMarkdownRendered) {
      this.markdownBox.classList.remove('hidden');
      this.previewBox.classList.add('hidden');
      this.outputTextarea.classList.add('hidden');
    } else {
      this.markdownBox.classList.add('hidden');
      this.previewBox.classList.toggle('hidden', isRaw);
      this.outputTextarea.classList.toggle('hidden', !isRaw);
    }

    this.previewModeText.textContent = isRaw ? 'Preview' : 'Raw Text';
  }

  updateOptionsVisibility() {
    if (this.previewBadge) {
      const titles = {
        json: 'JSON PREVIEW',
        xml: 'XML PREVIEW',
        csv: 'CSV PREVIEW',
        yaml: 'YAML PREVIEW',
        markdown: 'MARKDOWN PREVIEW',
        toml: 'TOML PREVIEW',
        txt: 'TXT PREVIEW'
      };
      this.previewBadge.textContent = titles[this.activeTarget] || `${this.activeTarget.toUpperCase()} PREVIEW`;
    }

    this.container.querySelector('#opts-json').classList.toggle('hidden', this.activeTarget !== 'json');
    this.container.querySelector('#opts-xml').classList.toggle('hidden', this.activeTarget !== 'xml');
    this.container.querySelector('#opts-txt').classList.toggle('hidden', this.activeTarget !== 'txt');
    this.container.querySelector('#opts-csv').classList.toggle('hidden', this.activeTarget !== 'csv');
    this.container.querySelector('#opts-markdown').classList.toggle('hidden', this.activeTarget !== 'markdown');

    this.updateViewModeUI();
  }

  loadXml(xmlString) {
    this.currentXml = xmlString;
    this.convert();
  }

  convert() {
    if (!this.currentXml || !this.currentXml.trim()) {
      this.convertedOutput = '';
      this.outputTextarea.value = '';
      this.previewBox.innerHTML = '<div class="text-muted" style="padding: 1.5rem; text-align: center;">No document loaded. Type or paste content in the editor.</div>';
      this.markdownBox.innerHTML = '<div class="text-muted" style="padding: 1.5rem; text-align: center;">No document loaded.</div>';
      return;
    }

    try {
      let lang = 'json';
      if (this.activeTarget === 'json') {
        const mode = this.container.querySelector('input[name="json-mode"]:checked')?.value || 'clean';
        const json = xmlToJson(this.currentXml, { mode });
        this.convertedOutput = JSON.stringify(json, null, 2);
        lang = 'json';
      } else if (this.activeTarget === 'xml') {
        const mode = this.container.querySelector('input[name="xml-mode"]:checked')?.value || 'auto';
        this.convertedOutput = formatXml(this.currentXml, { indent: '  ', preserveComments: true, entities: mode });
        lang = 'xml';
      } else if (this.activeTarget === 'csv') {
        const delimiter = this.container.querySelector('input[name="csv-delimiter"]:checked')?.value || ',';
        this.convertedOutput = xmlToCsv(this.currentXml, delimiter);
        lang = 'csv';
      } else if (this.activeTarget === 'yaml') {
        this.convertedOutput = xmlToYaml(this.currentXml);
        lang = 'yaml';
      } else if (this.activeTarget === 'markdown') {
        this.convertedOutput = xmlToMarkdown(this.currentXml);
        lang = 'markdown';
      } else if (this.activeTarget === 'toml') {
        this.convertedOutput = xmlToToml(this.currentXml);
        lang = 'toml';
      } else if (this.activeTarget === 'txt') {
        const mode = this.container.querySelector('input[name="txt-mode"]:checked')?.value || 'outline';
        this.convertedOutput = xmlToTxt(this.currentXml, { mode });
        lang = 'text';
      }

      this.outputTextarea.value = this.convertedOutput;

      const isMarkdownRendered = this.activeTarget === 'markdown' && this.viewMode === 'preview' &&
        (this.container.querySelector('input[name="md-mode"]:checked')?.value || 'rendered') === 'rendered';

      if (isMarkdownRendered) {
        this.markdownBox.classList.remove('hidden');
        this.previewBox.classList.add('hidden');
        this.outputTextarea.classList.add('hidden');
        const parsed = parseMarkdown(this.convertedOutput);
        this.markdownBox.innerHTML = parsed.html;
      } else {
        this.markdownBox.classList.add('hidden');
        this.renderOutput(lang);
      }
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

    // Bind copy button in code block header
    const copyBtn = this.previewBox.querySelector('.btn-copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.convertedOutput);
        showToast(`${this.activeTarget.toUpperCase()} preview copied`, 'success');
        const copyIcon = copyBtn.querySelector('.icon-copy');
        const checkIcon = copyBtn.querySelector('.icon-check');
        copyBtn.classList.add('copied');
        if (copyIcon) copyIcon.classList.add('hidden');
        if (checkIcon) checkIcon.classList.remove('hidden');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          if (copyIcon) copyIcon.classList.remove('hidden');
          if (checkIcon) checkIcon.classList.add('hidden');
        }, 1500);
      });
    }
  }

  renderError(msg) {
    this.convertedOutput = `Preview Error: ${msg}`;
    this.outputTextarea.value = this.convertedOutput;
    this.previewBox.innerHTML = `<div style="padding: 1.5rem; color: var(--error);">Preview Error: ${msg}</div>`;
  }

  downloadOutput() {
    const content = this.convertedOutput || this.outputTextarea.value;
    if (!content) {
      showToast('No content to download', 'warning');
      return;
    }

    const extMap = {
      json: { ext: 'json', mime: 'application/json' },
      xml: { ext: 'xml', mime: 'application/xml' },
      txt: { ext: 'txt', mime: 'text/plain' },
      csv: { ext: 'csv', mime: 'text/csv' },
      yaml: { ext: 'yaml', mime: 'text/yaml' },
      markdown: { ext: 'md', mime: 'text/markdown' },
      toml: { ext: 'toml', mime: 'application/toml' }
    };

    const targetInfo = extMap[this.activeTarget] || { ext: 'txt', mime: 'text/plain' };
    const blob = new Blob([content], { type: `${targetInfo.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview.${targetInfo.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded preview.${targetInfo.ext}`, 'success');
  }
}

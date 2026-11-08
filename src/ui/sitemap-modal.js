/**
 * Sitemap Generator Modal
 */

import { generateSitemapFromUrls, generateSitemapFromJson, CHANGEFREQ_OPTIONS } from '../core/sitemap.js';
import { showToast } from './toast.js';

export class SitemapModal {
  constructor(options = {}) {
    this.onLoadIntoEditor = options.onLoadIntoEditor || (() => {});
    this.activeTab = 'url'; // 'url' | 'json'
    this.generatedXml = '';
    this.init();
  }

  init() {
    let modal = document.getElementById('sitemap-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sitemap-modal';
      modal.className = 'modal-backdrop hidden';
      document.body.appendChild(modal);
    }
    this.modalEl = modal;
    this.render();
    this.initEvents();
  }

  render() {
    const today = new Date().toISOString().split('T')[0];

    this.modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">Sitemap Generator</h2>
            <p class="modal-subtitle">Generate Google & Bing compliant sitemaps from URL(s) or JSON data</p>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-sitemap" title="Close">
            <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>

        <div class="modal-tabs">
          <button type="button" class="tab-btn active" data-tab="url">From URL(s)</button>
          <button type="button" class="tab-btn" data-tab="json">From JSON</button>
        </div>

        <div class="modal-body">
          <!-- URL Form -->
          <div id="tab-pane-url" class="tab-pane active">
            <div class="form-group">
              <label class="form-label" for="sitemap-url-input">Website URL(s) <span class="text-muted">(one per line or single domain)</span></label>
              <textarea id="sitemap-url-input" class="form-control" rows="4" placeholder="https://example.com&#10;https://example.com/about&#10;https://example.com/products"></textarea>
            </div>

            <div class="form-check-group">
              <label class="form-check-label">
                <input type="checkbox" id="check-auto-subpaths" checked />
                Auto-generate standard routes (/about, /contact, /blog, /pricing, /docs) if single domain entered
              </label>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label" for="sitemap-changefreq">Change Frequency</label>
                <select id="sitemap-changefreq" class="form-control">
                  ${CHANGEFREQ_OPTIONS.map(opt => `<option value="${opt}" ${opt === 'weekly' ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
              <div class="form-group col">
                <label class="form-label" for="sitemap-priority">Default Priority</label>
                <select id="sitemap-priority" class="form-control">
                  <option value="1.0">1.0 (Highest)</option>
                  <option value="0.8" selected>0.8 (Standard)</option>
                  <option value="0.5">0.5 (Normal)</option>
                  <option value="0.3">0.3 (Low)</option>
                </select>
              </div>
              <div class="form-group col">
                <label class="form-label" for="sitemap-lastmod">Last Modified Date</label>
                <input type="date" id="sitemap-lastmod" class="form-control" value="${today}" />
              </div>
            </div>
          </div>

          <!-- JSON Form -->
          <div id="tab-pane-json" class="tab-pane">
            <div class="form-group">
              <div class="form-label-row">
                <label class="form-label" for="sitemap-json-input">JSON Sitemap Specification</label>
                <button type="button" id="btn-sample-json" class="btn-link">Load Sample JSON</button>
              </div>
              <textarea id="sitemap-json-input" class="form-control font-mono" rows="7" placeholder='[\n  { "loc": "https://example.com", "priority": 1.0, "changefreq": "daily" },\n  { "loc": "https://example.com/about", "priority": 0.8, "changefreq": "weekly" }\n]'></textarea>
            </div>
          </div>

          <!-- Preview & Action -->
          <div class="sitemap-generate-btn-row">
            <button type="button" id="btn-generate-sitemap" class="btn-primary w-full">Generate Sitemap XML</button>
          </div>

          <div class="sitemap-preview-wrap hidden" id="sitemap-preview-wrap">
            <div class="preview-header">
              <span class="preview-title">Generated sitemap.xml</span>
              <div class="preview-actions">
                <button type="button" id="btn-copy-sitemap" class="btn-sm">Copy XML</button>
                <button type="button" id="btn-download-sitemap" class="btn-sm">Download</button>
                <button type="button" id="btn-load-into-editor" class="btn-primary btn-sm">Load Into Editor</button>
              </div>
            </div>
            <textarea id="sitemap-preview-textarea" class="form-control font-mono preview-textarea" readonly rows="8"></textarea>
          </div>
        </div>
      </div>
    `;
  }

  initEvents() {
    this.modalEl.querySelector('#btn-close-sitemap').addEventListener('click', () => this.hide());
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hide();
    });

    // Tab buttons
    const tabs = this.modalEl.querySelectorAll('.modal-tabs .tab-btn');
    const paneUrl = this.modalEl.querySelector('#tab-pane-url');
    const paneJson = this.modalEl.querySelector('#tab-pane-json');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.tab;
        paneUrl.classList.toggle('active', this.activeTab === 'url');
        paneJson.classList.toggle('active', this.activeTab === 'json');
      });
    });

    // Sample JSON button
    this.modalEl.querySelector('#btn-sample-json').addEventListener('click', () => {
      const sample = [
        { loc: "https://example.com/", priority: 1.0, changefreq: "daily" },
        { loc: "https://example.com/products", priority: 0.9, changefreq: "daily" },
        { loc: "https://example.com/blog", priority: 0.8, changefreq: "weekly" },
        { loc: "https://example.com/about", priority: 0.6, changefreq: "monthly" },
        { loc: "https://example.com/contact", priority: 0.5, changefreq: "yearly" }
      ];
      this.modalEl.querySelector('#sitemap-json-input').value = JSON.stringify(sample, null, 2);
    });

    // Generate button
    this.modalEl.querySelector('#btn-generate-sitemap').addEventListener('click', () => {
      this.generate();
    });

    // Copy button
    this.modalEl.querySelector('#btn-copy-sitemap').addEventListener('click', () => {
      if (this.generatedXml) {
        navigator.clipboard.writeText(this.generatedXml);
        showToast('Sitemap XML copied to clipboard', 'success');
      }
    });

    // Download button
    this.modalEl.querySelector('#btn-download-sitemap').addEventListener('click', () => {
      if (this.generatedXml) {
        const blob = new Blob([this.generatedXml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded sitemap.xml', 'success');
      }
    });

    // Load into main editor button
    this.modalEl.querySelector('#btn-load-into-editor').addEventListener('click', () => {
      if (this.generatedXml) {
        this.onLoadIntoEditor(this.generatedXml);
        this.hide();
        showToast('Sitemap loaded into XML Editor', 'success');
      }
    });
  }

  show() {
    this.modalEl.classList.remove('hidden');
    // Pre-populate URL if empty
    const urlInput = this.modalEl.querySelector('#sitemap-url-input');
    if (!urlInput.value) {
      urlInput.value = 'https://example.com';
    }
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  generate() {
    try {
      if (this.activeTab === 'url') {
        const urlVal = this.modalEl.querySelector('#sitemap-url-input').value.trim();
        if (!urlVal) {
          showToast('Please enter at least one URL', 'warning');
          return;
        }

        const autoSubpaths = this.modalEl.querySelector('#check-auto-subpaths').checked;
        const subpaths = autoSubpaths ? ['/about', '/products', '/services', '/contact', '/blog', '/pricing'] : [];
        const changefreq = this.modalEl.querySelector('#sitemap-changefreq').value;
        const priority = this.modalEl.querySelector('#sitemap-priority').value;
        const lastmod = this.modalEl.querySelector('#sitemap-lastmod').value;

        this.generatedXml = generateSitemapFromUrls(urlVal, {
          defaultChangefreq: changefreq,
          defaultPriority: priority,
          lastmod,
          subpaths
        });
      } else {
        const jsonVal = this.modalEl.querySelector('#sitemap-json-input').value.trim();
        if (!jsonVal) {
          showToast('Please enter JSON sitemap specification', 'warning');
          return;
        }
        this.generatedXml = generateSitemapFromJson(jsonVal);
      }

      const previewWrap = this.modalEl.querySelector('#sitemap-preview-wrap');
      const previewText = this.modalEl.querySelector('#sitemap-preview-textarea');
      previewWrap.classList.remove('hidden');
      previewText.value = this.generatedXml;
      showToast('Sitemap generated successfully!', 'success');
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, 'error');
    }
  }
}


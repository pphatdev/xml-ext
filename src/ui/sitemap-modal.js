/**
 * Sitemap Generator Modal
 * Interactive Google & Bing Compliant XML Sitemap Visualizer & Generator
 * Zero Emojis, Modern Frosted Glass Aesthetic
 */

import {
  generateSitemapFromUrls,
  generateSitemapFromJson,
  parseSitemapEntries,
  crawlRealWebsiteUrls,
  CHANGEFREQ_OPTIONS
} from '../core/sitemap.js';
import { fetchXmlFromUrl } from '../core/fetcher.js';
import { highlightCode } from '../core/markdown.js';
import { validateXml } from '../core/validator.js';
import { showToast } from './toast.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class SitemapModal {
  constructor(options = {}) {
    this.onLoadIntoEditor = options.onLoadIntoEditor || (() => {});
    this.activeTab = 'url'; // 'url' | 'json'
    this.previewMode = 'code'; // 'code' | 'table' | 'raw'
    this.generatedXml = '';
    this.currentEntries = [];
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
      <div class="modal-dialog sitemap-modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="sitemap-dialog-header-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icon-tabler-sitemap">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M3 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                <path d="M15 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                <path d="M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
                <path d="M12 9l0 3" />
              </svg>
              <span>Sitemap Generator</span>
            </div>
            <p class="modal-subtitle">Generate Google & Bing compliant sitemaps from URL(s) or JSON data</p>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-sitemap" title="Close">
            <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>

        <div class="modal-tabs sitemap-modal-tabs">
          <button type="button" class="tab-btn active" data-tab="url">From URL(s)</button>
          <button type="button" class="tab-btn" data-tab="json">From JSON</button>
        </div>

        <div class="modal-body sitemap-modal-body">
          <!-- URL Form -->
          <div id="tab-pane-url" class="tab-pane active">
            <div class="form-group">
              <div class="form-label-row">
                <label class="form-label" for="sitemap-url-input">Website URL(s) <span class="text-muted">(one per line or single domain)</span></label>
                <div class="sitemap-url-quick-tools">
                  <button type="button" id="btn-use-active-tab" class="sitemap-quick-link-btn" title="Use current active tab URL">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span>Use Active Tab</span>
                  </button>
                </div>
              </div>
              <textarea id="sitemap-url-input" class="form-control" rows="3" placeholder="https://example.com&#10;https://example.com/about&#10;https://example.com/products"></textarea>
            </div>

            <div class="sitemap-discovery-options">
              <label class="form-check-label">
                <input type="checkbox" id="check-crawl-live" checked />
                <span><strong>Live Site Crawler:</strong> Automatically crawl and extract real internal links from website HTML</span>
              </label>
              <label class="form-check-label">
                <input type="checkbox" id="check-auto-sitemap-discover" checked />
                <span><strong>Auto-Import:</strong> Check if website has an existing live sitemap.xml to import</span>
              </label>
              <label class="form-check-label">
                <input type="checkbox" id="check-auto-subpaths" />
                <span>Fallback routes (/about, /products, /contact, etc.) if website has no discoverable links</span>
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
              <textarea id="sitemap-json-input" class="form-control font-mono" rows="6" placeholder='[\n  { "loc": "https://example.com", "priority": 1.0, "changefreq": "daily" },\n  { "loc": "https://example.com/about", "priority": 0.8, "changefreq": "weekly" }\n]'></textarea>
            </div>
          </div>

          <!-- Generate Action Button -->
          <div class="sitemap-generate-btn-row">
            <button type="button" id="btn-generate-sitemap" class="btn-primary w-full sitemap-glow-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icon-tabler-sparkles">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
              </svg>
              <span>Generate Sitemap XML</span>
            </button>
          </div>

          <!-- Redesigned Generated sitemap.xml Glass Container -->
          <div class="sitemap-preview-wrap hidden" id="sitemap-preview-wrap">
            <!-- Glass Header & Actions Bar -->
            <div class="sitemap-preview-header">
              <div class="sitemap-preview-title-group">
                <div class="sitemap-preview-badge-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icon-tabler-sitemap">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M3 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                    <path d="M15 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                    <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                    <path d="M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
                    <path d="M12 9l0 3" />
                  </svg>
                </div>
                <div>
                  <div class="sitemap-preview-title-row">
                    <span class="sitemap-preview-title">Generated sitemap.xml</span>
                    <span class="sitemap-status-chip sitemap-status-valid" id="sitemap-stat-valid">
                      <span class="status-dot"></span> Valid XML
                    </span>
                  </div>
                  <div class="sitemap-stats-ribbon" id="sitemap-stats-ribbon">
                    <span class="sitemap-stat-item" id="sitemap-stat-protocol">sitemaps.org 0.9</span>
                    <span class="sitemap-stat-dot">•</span>
                    <span class="sitemap-stat-item" id="sitemap-stat-count">0 URLs</span>
                    <span class="sitemap-stat-dot">•</span>
                    <span class="sitemap-stat-item" id="sitemap-stat-size">0 B</span>
                  </div>
                </div>
              </div>

              <div class="sitemap-preview-actions">
                <!-- Mode Tabs: Code | Routes | Raw -->
                <div class="sitemap-view-tabs" role="group" aria-label="Sitemap Preview Mode">
                  <button type="button" class="sitemap-tab-btn active" id="sitemap-tab-code" data-mode="code" title="Syntax-Highlighted Code View">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M7 8l-4 4l4 4"/><path d="M17 8l4 4l-4 4"/><path d="M14 4l-4 16"/>
                    </svg>
                    <span>Code</span>
                  </button>
                  <button type="button" class="sitemap-tab-btn" id="sitemap-tab-table" data-mode="table" title="Table / Route Inspector">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z"/><path d="M3 10h18"/><path d="M10 3v18"/>
                    </svg>
                    <span>Routes</span>
                  </button>
                  <button type="button" class="sitemap-tab-btn" id="sitemap-tab-raw" data-mode="raw" title="Plain Text / Edit">
                    <span>Raw</span>
                  </button>
                </div>

                <div class="sitemap-actions-divider"></div>

                <!-- Action Buttons: Copy | Download | Load Into Editor -->
                <button type="button" id="btn-copy-sitemap" class="sitemap-action-btn" title="Copy sitemap XML" aria-label="Copy sitemap XML">
                  <svg class="icon-sm icon-copy" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                  </svg>
                  <svg class="icon-sm icon-check hidden" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </button>
                <button type="button" id="btn-download-sitemap" class="sitemap-action-btn" title="Download sitemap.xml file" aria-label="Download sitemap XML">
                  <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </button>
                <button type="button" id="btn-load-into-editor" class="sitemap-btn-primary" title="Load into XML Studio Editor">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Load Into Editor</span>
                </button>
              </div>
            </div>

            <!-- Content Panes Container -->
            <div class="sitemap-preview-content">
              <!-- 1. Code View (macOS Window frame + Gutter line numbers + Syntax Highlighting) -->
              <div class="sitemap-preview-pane" id="sitemap-pane-code">
                <div class="sitemap-code-window">
                  <div class="sitemap-code-window-bar">
                    <div class="sitemap-window-dots" aria-hidden="true">
                      <span class="window-dot dot-red"></span>
                      <span class="window-dot dot-yellow"></span>
                      <span class="window-dot dot-green"></span>
                    </div>
                    <div class="sitemap-window-filename">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
                        <path d="M10 13l-1 2l1 2"></path>
                        <path d="M14 13l1 2l-1 2"></path>
                      </svg>
                      <span>sitemap.xml</span>
                    </div>
                    <div class="sitemap-window-lines" id="sitemap-code-linecount">0 lines</div>
                  </div>
                  <div class="sitemap-code-body">
                    <div class="sitemap-code-gutter" id="sitemap-code-gutter" aria-hidden="true"></div>
                    <pre class="sitemap-code-pre"><code class="sitemap-code-root" id="sitemap-code-root"></code></pre>
                  </div>
                </div>
              </div>

              <!-- 2. Routes Table Inspector -->
              <div class="sitemap-preview-pane hidden" id="sitemap-pane-table">
                <div class="sitemap-table-container">
                  <div class="sitemap-table-search-row">
                    <div class="sitemap-search-wrap">
                      <svg viewBox="0 0 20 20" fill="currentColor" class="sitemap-search-icon">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                      </svg>
                      <input type="text" class="sitemap-filter-input" id="sitemap-filter-input" placeholder="Filter routes..." spellcheck="false" autocomplete="off" />
                    </div>
                    <span class="sitemap-filter-count" id="sitemap-filter-count"></span>
                  </div>
                  <div class="sitemap-table-scroll">
                    <table class="sitemap-routes-table">
                      <thead>
                        <tr>
                          <th style="width: 52%;">Location (URL)</th>
                          <th style="width: 14%;">Priority</th>
                          <th style="width: 16%;">Changefreq</th>
                          <th style="width: 18%;">Last Modified</th>
                        </tr>
                      </thead>
                      <tbody id="sitemap-routes-tbody"></tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- 3. Raw Textarea Pane -->
              <div class="sitemap-preview-pane hidden" id="sitemap-pane-raw">
                <textarea id="sitemap-preview-textarea" class="sitemap-raw-textarea" spellcheck="false" placeholder="Raw sitemap XML..."></textarea>
              </div>
            </div>
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

    // Generator Tab buttons (URL vs JSON)
    const tabs = this.modalEl.querySelectorAll('.sitemap-modal-tabs .tab-btn');
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

    // Use Active Tab URL button
    const btnActiveTab = this.modalEl.querySelector('#btn-use-active-tab');
    if (btnActiveTab) {
      btnActiveTab.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].url) {
              const u = tabs[0].url;
              if (!u.startsWith('chrome') && !u.startsWith('about:') && !u.startsWith('edge') && !u.startsWith('devtools:')) {
                this.modalEl.querySelector('#sitemap-url-input').value = u;
                try {
                  const host = new URL(u).hostname;
                  showToast(`Loaded active tab: ${host}`, 'success');
                } catch (_) {
                  showToast('Loaded active tab URL', 'success');
                }
              } else {
                showToast('Current tab is an internal browser page', 'warning');
              }
            }
          });
        } else if (typeof window !== 'undefined' && window.location) {
          this.modalEl.querySelector('#sitemap-url-input').value = window.location.href;
          showToast('Loaded current URL', 'success');
        }
      });
    }

    // Generate button
    this.modalEl.querySelector('#btn-generate-sitemap').addEventListener('click', () => {
      this.generate();
    });

    // Preview Mode Switcher (Code | Routes | Raw)
    const modeTabs = this.modalEl.querySelectorAll('.sitemap-view-tabs .sitemap-tab-btn');
    modeTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setPreviewMode(mode);
      });
    });

    // Copy button with checkmark transition
    const copyBtn = this.modalEl.querySelector('#btn-copy-sitemap');
    copyBtn.addEventListener('click', async () => {
      if (!this.generatedXml) return;
      try {
        await navigator.clipboard.writeText(this.generatedXml);
        const iconCopy = copyBtn.querySelector('.icon-copy');
        const iconCheck = copyBtn.querySelector('.icon-check');
        if (iconCopy && iconCheck) {
          iconCopy.classList.add('hidden');
          iconCheck.classList.remove('hidden');
          setTimeout(() => {
            iconCopy.classList.remove('hidden');
            iconCheck.classList.add('hidden');
          }, 1800);
        }
        showToast('Sitemap XML copied to clipboard', 'success');
      } catch (_) {
        showToast('Failed to copy to clipboard', 'error');
      }
    });

    // Download button
    this.modalEl.querySelector('#btn-download-sitemap').addEventListener('click', () => {
      if (!this.generatedXml) return;
      const blob = new Blob([this.generatedXml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded sitemap.xml', 'success');
    });

    // Load into main editor button
    this.modalEl.querySelector('#btn-load-into-editor').addEventListener('click', () => {
      if (!this.generatedXml) return;
      this.onLoadIntoEditor(this.generatedXml);
      this.hide();
      showToast('Sitemap loaded into XML Editor', 'success');
    });

    // Filter input for Routes Table
    const filterInput = this.modalEl.querySelector('#sitemap-filter-input');
    filterInput.addEventListener('input', () => {
      this.renderTable(this.currentEntries, filterInput.value);
    });

    // Raw textarea change sync
    const rawTextarea = this.modalEl.querySelector('#sitemap-preview-textarea');
    rawTextarea.addEventListener('input', () => {
      this.generatedXml = rawTextarea.value;
      this.syncFromRaw();
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

  setPreviewMode(mode) {
    this.previewMode = mode;
    const modeTabs = this.modalEl.querySelectorAll('.sitemap-view-tabs .sitemap-tab-btn');
    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    const paneCode = this.modalEl.querySelector('#sitemap-pane-code');
    const paneTable = this.modalEl.querySelector('#sitemap-pane-table');
    const paneRaw = this.modalEl.querySelector('#sitemap-pane-raw');

    paneCode.classList.toggle('hidden', mode !== 'code');
    paneTable.classList.toggle('hidden', mode !== 'table');
    paneRaw.classList.toggle('hidden', mode !== 'raw');
  }

  async generate() {
    const btnGen = this.modalEl.querySelector('#btn-generate-sitemap');
    const originalBtnHtml = btnGen.innerHTML;

    try {
      if (this.activeTab === 'url') {
        const urlVal = this.modalEl.querySelector('#sitemap-url-input').value.trim();
        if (!urlVal) {
          showToast('Please enter at least one URL', 'warning');
          return;
        }

        const lines = urlVal.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
        const changefreq = this.modalEl.querySelector('#sitemap-changefreq').value;
        const priority = this.modalEl.querySelector('#sitemap-priority').value;
        const lastmod = this.modalEl.querySelector('#sitemap-lastmod').value;
        const checkCrawl = this.modalEl.querySelector('#check-crawl-live')?.checked ?? true;
        const checkAutoSitemap = this.modalEl.querySelector('#check-auto-sitemap-discover')?.checked ?? true;
        const autoSubpaths = this.modalEl.querySelector('#check-auto-subpaths')?.checked ?? false;

        // If a single website/domain is entered and live discovery is enabled:
        if (lines.length === 1 && (checkCrawl || checkAutoSitemap)) {
          btnGen.disabled = true;
          btnGen.innerHTML = `<span class="sitemap-btn-spinner"></span> <span>Crawling & discovering real routes...</span>`;

          const crawlResult = await crawlRealWebsiteUrls(lines[0], fetchXmlFromUrl, {
            checkSitemap: checkAutoSitemap,
            crawlHtml: checkCrawl
          });

          if (crawlResult.source === 'sitemap.xml' && crawlResult.sitemapXml) {
            this.generatedXml = crawlResult.sitemapXml;
            showToast(`Imported live online sitemap.xml (${crawlResult.urls.length} URLs)`, 'success');
          } else if (crawlResult.source === 'crawler' && crawlResult.urls.length > 1) {
            this.generatedXml = generateSitemapFromUrls(crawlResult.urls, {
              defaultChangefreq: changefreq,
              defaultPriority: priority,
              lastmod
            });
            showToast(`Crawled & discovered ${crawlResult.urls.length} real routes from HTML`, 'success');
          } else {
            // Fallback: standard subpaths if checked, or single domain
            const subpaths = autoSubpaths ? ['/about', '/products', '/services', '/contact', '/blog', '/pricing'] : [];
            this.generatedXml = generateSitemapFromUrls(urlVal, {
              defaultChangefreq: changefreq,
              defaultPriority: priority,
              lastmod,
              subpaths
            });
            showToast(`Generated sitemap for website (${subpaths.length + 1} routes)`, 'success');
          }
        } else {
          // Multi-line list of URLs or crawler toggled off
          const subpaths = autoSubpaths ? ['/about', '/products', '/services', '/contact', '/blog', '/pricing'] : [];
          this.generatedXml = generateSitemapFromUrls(urlVal, {
            defaultChangefreq: changefreq,
            defaultPriority: priority,
            lastmod,
            subpaths
          });
          showToast('Sitemap generated successfully!', 'success');
        }
      } else {
        const jsonVal = this.modalEl.querySelector('#sitemap-json-input').value.trim();
        if (!jsonVal) {
          showToast('Please enter JSON sitemap specification', 'warning');
          return;
        }
        this.generatedXml = generateSitemapFromJson(jsonVal);
        showToast('Sitemap generated from JSON spec!', 'success');
      }

      this.updatePreview();
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, 'error');
    } finally {
      btnGen.disabled = false;
      btnGen.innerHTML = originalBtnHtml;
    }
  }

  updatePreview() {
    if (!this.generatedXml) return;
    const previewWrap = this.modalEl.querySelector('#sitemap-preview-wrap');
    previewWrap.classList.remove('hidden');

    const totalBytes = new TextEncoder().encode(this.generatedXml).length;
    const entries = parseSitemapEntries(this.generatedXml);
    this.currentEntries = entries;
    const isIndex = this.generatedXml.includes('<sitemapindex');
    const protocolName = isIndex ? 'sitemapindex' : 'sitemaps.org 0.9';
    const entryLabel = isIndex
      ? (entries.length === 1 ? '1 sitemap' : `${entries.length} sitemaps`)
      : (entries.length === 1 ? '1 URL' : `${entries.length} URLs`);

    // Validation Status
    const valResult = validateXml(this.generatedXml);
    const validChip = this.modalEl.querySelector('#sitemap-stat-valid');
    if (valResult.valid) {
      validChip.className = 'sitemap-status-chip sitemap-status-valid';
      validChip.innerHTML = `<span class="status-dot"></span> Valid XML`;
    } else {
      validChip.className = 'sitemap-status-chip sitemap-status-warn';
      validChip.innerHTML = `<span class="status-dot"></span> Needs Review`;
    }

    this.modalEl.querySelector('#sitemap-stat-protocol').textContent = protocolName;
    this.modalEl.querySelector('#sitemap-stat-count').textContent = entryLabel;
    this.modalEl.querySelector('#sitemap-stat-size').textContent = formatBytes(totalBytes);

    // Populate Code View with Syntax Highlighting and Synced Line Gutter
    const lines = this.generatedXml.split('\n');
    const gutterEl = this.modalEl.querySelector('#sitemap-code-gutter');
    const codeRoot = this.modalEl.querySelector('#sitemap-code-root');
    const lineCountEl = this.modalEl.querySelector('#sitemap-code-linecount');

    gutterEl.textContent = lines.map((_, i) => i + 1).join('\n');
    codeRoot.innerHTML = highlightCode(this.generatedXml, 'xml');
    lineCountEl.textContent = `${lines.length} lines`;

    // Populate Routes Table
    this.renderTable(entries);

    // Sync Raw Textarea
    const textarea = this.modalEl.querySelector('#sitemap-preview-textarea');
    textarea.value = this.generatedXml;
  }

  syncFromRaw() {
    if (!this.generatedXml) return;
    const lines = this.generatedXml.split('\n');
    const totalBytes = new TextEncoder().encode(this.generatedXml).length;
    const entries = parseSitemapEntries(this.generatedXml);
    this.currentEntries = entries;

    const gutterEl = this.modalEl.querySelector('#sitemap-code-gutter');
    const codeRoot = this.modalEl.querySelector('#sitemap-code-root');
    const lineCountEl = this.modalEl.querySelector('#sitemap-code-linecount');
    gutterEl.textContent = lines.map((_, i) => i + 1).join('\n');
    codeRoot.innerHTML = highlightCode(this.generatedXml, 'xml');
    lineCountEl.textContent = `${lines.length} lines`;

    this.modalEl.querySelector('#sitemap-stat-size').textContent = formatBytes(totalBytes);
    this.modalEl.querySelector('#sitemap-stat-count').textContent = `${entries.length} URLs`;

    this.renderTable(entries, this.modalEl.querySelector('#sitemap-filter-input').value);
  }

  renderTable(entries, filterQuery = '') {
    const tbody = this.modalEl.querySelector('#sitemap-routes-tbody');
    const countEl = this.modalEl.querySelector('#sitemap-filter-count');
    const q = (filterQuery || '').toLowerCase().trim();

    const filtered = q
      ? entries.filter(e => e.loc.toLowerCase().includes(q) || (e.changefreq && e.changefreq.toLowerCase().includes(q)))
      : entries;

    if (countEl) {
      countEl.textContent = q ? `${filtered.length} of ${entries.length}` : `${entries.length} routes`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="sitemap-table-empty">No matching routes found</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(e => {
      const isIndex = e.type === 'sitemap';
      let priorityClass = 'sitemap-p-norm';
      const pVal = parseFloat(e.priority);
      if (pVal >= 0.9) priorityClass = 'sitemap-p-high';
      else if (pVal >= 0.6) priorityClass = 'sitemap-p-med';
      else if (pVal < 0.4) priorityClass = 'sitemap-p-low';

      const prioBadge = isIndex
        ? `<span class="sitemap-badge-index">index</span>`
        : `<span class="sitemap-priority-pill ${priorityClass}">${escapeHtml(e.priority || '0.8')}</span>`;

      const freqBadge = e.changefreq
        ? `<span class="sitemap-freq-badge freq-${escapeHtml(e.changefreq)}">${escapeHtml(e.changefreq)}</span>`
        : '<span class="text-muted">—</span>';

      const dateVal = e.lastmod ? escapeHtml(e.lastmod) : '<span class="text-muted">—</span>';

      return `
        <tr>
          <td class="sitemap-td-loc">
            <div class="sitemap-loc-cell">
              <a href="${escapeHtml(e.loc)}" target="_blank" rel="noopener noreferrer" class="sitemap-loc-link" title="${escapeHtml(e.loc)}">
                ${escapeHtml(e.loc)}
              </a>
              <button type="button" class="sitemap-loc-copy-btn" data-url="${escapeHtml(e.loc)}" title="Copy route URL">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                </svg>
              </button>
            </div>
          </td>
          <td>${prioBadge}</td>
          <td>${freqBadge}</td>
          <td class="sitemap-td-date">${dateVal}</td>
        </tr>
      `;
    }).join('');

    // Attach click events to individual row copy buttons
    const rowCopyBtns = tbody.querySelectorAll('.sitemap-loc-copy-btn');
    rowCopyBtns.forEach(b => {
      b.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        const url = b.dataset.url;
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          showToast('Route URL copied', 'success');
        } catch (_) {}
      });
    });
  }
}

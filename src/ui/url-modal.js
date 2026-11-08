/**
 * Load XML from URL Dialog Modal
 * Provides URL input, preset samples, multi-tier CORS fallback handling,
 * diagnostic feedback, and direct paste workaround.
 */

import { fetchXmlFromUrl } from '../core/fetcher.js';
import { showToast } from './toast.js';

export class UrlModal {
  constructor(options = {}) {
    this.onLoadXml = options.onLoadXml || (() => {});
    this.init();
  }

  init() {
    let modal = document.getElementById('url-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'url-modal';
      modal.className = 'modal-backdrop hidden';
      document.body.appendChild(modal);
    }
    this.modalEl = modal;
    this.render();
    this.initEvents();
  }

  render() {
    this.modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 620px;">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">Load XML from URL</h2>
            <p class="modal-subtitle">Fetch an online XML file, sitemap, or RSS feed</p>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-url-modal" title="Close">
            <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="url-modal-input">XML Resource URL</label>
            <div style="display: flex; gap: 0.5rem;">
              <input
                type="url"
                id="url-modal-input"
                class="form-control"
                placeholder="https://example.com/sitemap.xml"
                style="flex: 1;"
              />
              <button type="button" id="btn-fetch-url-submit" class="btn-primary" style="min-width: 110px;">
                <span id="btn-fetch-text">Fetch XML</span>
                <span id="btn-fetch-spinner" class="hidden">Loading...</span>
              </button>
            </div>
          </div>

          <!-- Quick Test URL Presets -->
          <div class="form-group">
            <span class="form-label text-dim" style="font-size: 0.72rem;">Try Quick Examples:</span>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.2rem;">
              <button type="button" class="btn-sm btn-quick-url" data-url="https://www.w3schools.com/xml/cd_catalog.xml">CD Catalog</button>
              <button type="button" class="btn-sm btn-quick-url" data-url="https://www.sitemaps.org/sitemap.xml">Sitemaps.org</button>
              <button type="button" class="btn-sm btn-quick-url" data-url="https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml">NYT RSS Feed</button>
            </div>
          </div>

          <!-- CORS Alert & Direct Paste Box (shown on CORS errors) -->
          <div id="url-cors-alert" class="hidden" style="background-color: var(--warning-bg); border: 1px solid var(--warning); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.78rem;">
            <div style="display: flex; align-items: flex-start; gap: 0.4rem; color: var(--warning); font-weight: 600;">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink: 0; margin-top: 2px;">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span>Browser CORS Security Restriction</span>
            </div>
            <div style="color: var(--text-normal); line-height: 1.5;" id="url-cors-msg">
              Browsers block cross-origin requests made from <code>localhost:3000</code> when servers don't return <code>Access-Control-Allow-Origin</code>.
            </div>
            <div style="color: var(--text-dim); font-size: 0.72rem; line-height: 1.4;">
              <strong>Pro-tip:</strong> When installed as an unpacked Chrome Extension in <code>chrome://extensions</code>, the extension automatically bypasses CORS using its <code>host_permissions</code>.
            </div>
            <div style="margin-top: 0.25rem;">
              <label class="form-label" style="font-size: 0.75rem;">Or Paste XML Content Here:</label>
              <textarea id="url-fallback-paste" class="form-control font-mono" rows="5" placeholder="Paste downloaded or copied XML content here..."></textarea>
              <button type="button" id="btn-load-fallback-paste" class="btn-primary btn-sm" style="margin-top: 0.4rem; width: 100%;">
                Load Pasted XML into Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initEvents() {
    this.urlInput = this.modalEl.querySelector('#url-modal-input');
    this.btnSubmit = this.modalEl.querySelector('#btn-fetch-url-submit');
    this.btnText = this.modalEl.querySelector('#btn-fetch-text');
    this.btnSpinner = this.modalEl.querySelector('#btn-fetch-spinner');
    this.corsAlert = this.modalEl.querySelector('#url-cors-alert');
    this.corsMsg = this.modalEl.querySelector('#url-cors-msg');
    this.fallbackTextarea = this.modalEl.querySelector('#url-fallback-paste');
    this.btnFallbackLoad = this.modalEl.querySelector('#btn-load-fallback-paste');

    // Close buttons
    this.modalEl.querySelector('#btn-close-url-modal').addEventListener('click', () => this.hide());
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hide();
    });

    // Preset quick URLs
    const quickBtns = this.modalEl.querySelectorAll('.btn-quick-url');
    for (const btn of quickBtns) {
      btn.addEventListener('click', () => {
        this.urlInput.value = btn.dataset.url;
        this.fetch();
      });
    }

    // Submit button
    this.btnSubmit.addEventListener('click', () => this.fetch());
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.fetch();
      }
    });

    // Fallback paste load button
    this.btnFallbackLoad.addEventListener('click', () => {
      const val = this.fallbackTextarea.value.trim();
      if (!val) {
        showToast('Please paste XML content first', 'warning');
        return;
      }
      this.onLoadXml(val);
      this.hide();
      showToast('Pasted XML loaded into Editor', 'success');
    });
  }

  show(defaultUrl = '') {
    this.modalEl.classList.remove('hidden');
    this.corsAlert.classList.add('hidden');
    this.urlInput.value = defaultUrl || 'https://www.w3schools.com/xml/cd_catalog.xml';
    this.urlInput.focus();
    this.urlInput.select();
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  async fetch() {
    const url = this.urlInput.value.trim();
    if (!url) {
      showToast('Please enter a valid URL', 'warning');
      return;
    }

    this.btnSubmit.disabled = true;
    this.btnText.classList.add('hidden');
    this.btnSpinner.classList.remove('hidden');
    this.corsAlert.classList.add('hidden');

    try {
      showToast(`Fetching XML from ${url}...`, 'info');
      const result = await fetchXmlFromUrl(url);

      this.onLoadXml(result.text);
      this.hide();
      const kb = (result.text.length / 1024).toFixed(1);
      showToast(`Successfully loaded XML (${kb} KB) via ${result.method}!`, 'success', 4000);
    } catch (err) {
      // Show CORS alert and fallback paste area
      this.corsAlert.classList.remove('hidden');
      this.corsMsg.textContent = err.message;
      this.fallbackTextarea.focus();
      showToast('Fetch blocked by CORS. You can paste the content directly below.', 'error', 5000);
    } finally {
      this.btnSubmit.disabled = false;
      this.btnText.classList.remove('hidden');
      this.btnSpinner.classList.add('hidden');
    }
  }
}

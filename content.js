/**
 * XML Pro Toolkit - Universal Content Script
 * Automatically detects and formats XML, JSON, YAML, CSV, Markdown, and TXT data responses
 * directly in the browser tab on that exact URL without redirecting.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.location) return;
  if (window.__XML_PRO_READER_INITIALIZED__) return;

  const currentHref = window.location.href;
  const isExtensionUrl = currentHref.startsWith('chrome') ||
    currentHref.startsWith('edge') ||
    currentHref.startsWith('about:') ||
    currentHref.startsWith('devtools:') ||
    currentHref.startsWith('view-source:');
  if (isExtensionUrl) return;

  const isRawBypass = currentHref.includes('raw=true') ||
    currentHref.includes('raw=1') ||
    currentHref.includes('noformat=1');

  let docInfo = null;

  function detectSupportedDocument() {
    const contentType = (document.contentType || '').toLowerCase();

    // 1. Check Content-Type header
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
      return { supported: true, format: 'xml' };
    }
    if (contentType.includes('json')) {
      return { supported: true, format: 'json' };
    }
    if (contentType.includes('yaml') || contentType.includes('x-yaml')) {
      return { supported: true, format: 'yaml' };
    }
    if (contentType.includes('csv') || contentType.includes('tab-separated-values')) {
      return { supported: true, format: 'csv' };
    }
    if (contentType.includes('markdown')) {
      return { supported: true, format: 'markdown' };
    }

    // 2. Check URL extension & common API patterns
    if (/\.(xml|rss|atom|xsd|wsdl)($|\?|#)/i.test(currentHref) || /\/(sitemap|feed|rss)($|\?|#)/i.test(currentHref)) {
      return { supported: true, format: 'xml' };
    }
    if (/\.(json|geojson|jsonld)($|\?|#)/i.test(currentHref)) {
      return { supported: true, format: 'json' };
    }
    if (/\.(yaml|yml)($|\?|#)/i.test(currentHref)) {
      return { supported: true, format: 'yaml' };
    }
    if (/\.(csv|tsv)($|\?|#)/i.test(currentHref)) {
      return { supported: true, format: 'csv' };
    }
    if (/\.(md|markdown)($|\?|#)/i.test(currentHref)) {
      return { supported: true, format: 'markdown' };
    }
    if (/\.(txt|log)($|\?|#)/i.test(currentHref)) {
      return { supported: true, format: 'txt' };
    }

    // 3. XML non-HTML root tag
    if (document.documentElement) {
      const rootTag = (document.documentElement.tagName || '').toLowerCase();
      if (rootTag && rootTag !== 'html' && rootTag !== 'body') {
        return { supported: true, format: 'xml' };
      }
    }

    // 4. Raw API responses / PRE inspector (e.g. /api/admin/provinces returning JSON/text)
    const isSinglePre = document.body && (
      (document.body.children.length === 1 && document.body.firstElementChild && document.body.firstElementChild.tagName.toLowerCase() === 'pre') ||
      (document.body.children.length === 0 && document.body.textContent && document.body.textContent.trim().length > 0) ||
      document.querySelector('pre') !== null
    );

    if (isSinglePre || contentType.includes('text/plain') || /\/api\/.+/i.test(currentHref)) {
      const pre = document.querySelector('pre') || document.body;
      let text = (pre ? pre.textContent : '').trim();
      text = text.replace(/^Pretty-print\s*/i, '').trim();
      if (text.length > 0) {
        // XML check
        if (text.startsWith('<?xml') || /^<[a-zA-Z][\w:-]*(\s|>)/.test(text)) {
          return { supported: true, format: 'xml' };
        }
        // JSON check
        if (text.startsWith('{') || text.startsWith('[')) {
          try {
            JSON.parse(text);
            return { supported: true, format: 'json' };
          } catch (_) { }
        }
        // YAML check
        if (/^[a-zA-Z0-9_-]+\s*:\s*.+/m.test(text) || /^\s*-\s+.+/m.test(text)) {
          return { supported: true, format: 'yaml' };
        }
        // CSV check
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length >= 2) {
          const c0 = (lines[0].match(/,/g) || []).length;
          const c1 = (lines[1].match(/,/g) || []).length;
          if (c0 > 0 && c0 === c1) {
            return { supported: true, format: 'csv' };
          }
        }
        // Markdown check
        if (/^#{1,6}\s+/m.test(text) || /^\|.+?\|.+?\|/m.test(text)) {
          return { supported: true, format: 'markdown' };
        }
        // Plain text file check
        if (contentType.includes('text/plain') || /\.(txt|log)($|\?|#)/i.test(currentHref)) {
          return { supported: true, format: 'txt' };
        }
      }
    }

    return { supported: false, format: null };
  }

  // Extract raw document content from page DOM
  function getPageRawContent() {
    try {
      const pre = document.querySelector('pre');
      if (pre && pre.textContent && pre.textContent.trim()) {
        return pre.textContent.trim().replace(/^Pretty-print\s*/i, '').trim();
      }
      const webkitXml = document.querySelector('#webkit-xml-viewer-source-xml');
      if (webkitXml && (webkitXml.textContent || webkitXml.outerHTML)) {
        return (webkitXml.textContent || webkitXml.outerHTML).trim();
      }
      if (document.documentElement) {
        const rootTag = (document.documentElement.tagName || '').toLowerCase();
        if (rootTag !== 'html') {
          const clone = document.documentElement.cloneNode(true);
          if (clone.querySelector) {
            const existingFrame = clone.querySelector('#xml-pro-reader-frame');
            if (existingFrame) existingFrame.remove();
            const existingBtn = clone.querySelector('#xml-pro-floating-btn');
            if (existingBtn) existingBtn.remove();
          }
          return new XMLSerializer().serializeToString(clone).trim();
        }
      }
      if (document.body && document.body.textContent) {
        return document.body.textContent.trim().replace(/^Pretty-print\s*/i, '').trim();
      }
    } catch (_) { }
    return '';
  }

  function start() {
    if (window.__XML_PRO_READER_INITIALIZED__) return;
    docInfo = detectSupportedDocument();
    if (!docInfo.supported) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      }
      return;
    }
    window.__XML_PRO_READER_INITIALIZED__ = true;

    // Check auto-format setting
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['autoFormatXml'], (res) => {
        const autoFormat = res.autoFormatXml !== false;
        if (autoFormat && !isRawBypass) {
          injectReaderFrame();
        } else {
          injectFloatingFormatButton();
        }
      });

      // Real-time listener for Enable/Disable extension changes
      if (chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes.autoFormatXml) {
            const isEnabled = changes.autoFormatXml.newValue !== false;
            const frame = document.getElementById('xml-pro-reader-frame');
            const floatBtn = document.getElementById('xml-pro-floating-btn');

            if (!isEnabled) {
              // Extension disabled: remove reader frame and show floating format button
              if (frame) frame.remove();
              injectFloatingFormatButton();
            } else if (isEnabled && !isRawBypass) {
              // Extension enabled: inject reader frame
              if (floatBtn) floatBtn.remove();
              injectReaderFrame();
            }
          }
        });
      }
    } else {
      injectReaderFrame();
    }

    // Handle messages from reader iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'READER_FRAME_READY') {
        sendContentToReader();
      }
      if (event.data && event.data.type === 'DISABLE_READER_AND_SHOW_RAW') {
        const frame = document.getElementById('xml-pro-reader-frame');
        if (frame) frame.remove();
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ autoFormatXml: false });
        }
        injectFloatingFormatButton();
      }
    });

    function sendContentToReader() {
      const frame = document.getElementById('xml-pro-reader-frame');
      if (!frame || !frame.contentWindow) return;

      const pageContent = getPageRawContent();
      if (pageContent) {
        try {
          frame.contentWindow.postMessage({
            type: 'INIT_READER_DATA',
            content: pageContent,
            format: docInfo.format,
            url: currentHref
          }, '*');
        } catch (_) { }
      }

      // Also fetch same-origin text in background to ensure 100% byte fidelity
      try {
        fetch(currentHref)
          .then(res => res.text())
          .then(rawText => {
            if (rawText && rawText.trim() && frame.contentWindow) {
              frame.contentWindow.postMessage({
                type: 'INIT_READER_DATA',
                content: rawText.trim(),
                format: docInfo.format,
                url: currentHref
              }, '*');
            }
          })
          .catch(() => { });
      } catch (_) { }
    }

    function injectReaderFrame() {
      if (document.getElementById('xml-pro-reader-frame')) return;

      const HTML_NS = 'http://www.w3.org/1999/xhtml';
      const iframe = document.createElementNS(HTML_NS, 'iframe');
      iframe.id = 'xml-pro-reader-frame';
      const targetUrl = chrome.runtime.getURL(`reader.html?url=${encodeURIComponent(currentHref)}&format=${encodeURIComponent(docInfo.format)}`);
      iframe.src = targetUrl;
      iframe.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 2147483647 !important;
      background: #090d16 !important;
      display: block !important;
      box-sizing: border-box !important;
    `;

      // Transmit data to reader frame when loaded
      iframe.addEventListener('load', () => {
        sendContentToReader();
      });

      if (document.body) {
        document.body.appendChild(iframe);
      } else if (document.documentElement) {
        document.documentElement.appendChild(iframe);
      }
    }

    function injectFloatingFormatButton() {
      if (document.getElementById('xml-pro-floating-btn')) return;
      const HTML_NS = 'http://www.w3.org/1999/xhtml';
      const btn = document.createElementNS(HTML_NS, 'button');
      btn.id = 'xml-pro-floating-btn';
      btn.type = 'button';
      btn.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background-color: #0f172a;
      color: #38bdf8;
      border: 1px solid #334155;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      transition: all 0.2s ease;
    `;
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.innerHTML = '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 4a2 2 0 0 0 -2 2v3a2 3 0 0 1 -2 3a2 3 0 0 1 2 3v3a2 2 0 0 0 2 2" /><path d="M17 4a2 2 0 0 1 2 2v3a2 3 0 0 0 2 3a2 3 0 0 0 -2 3v3a2 2 0 0 1 -2 2" />';

      const span = document.createElementNS(HTML_NS, 'span');
      span.textContent = `Format in XML Pro (${docInfo.format.toUpperCase()})`;

      btn.appendChild(svg);
      btn.appendChild(span);
      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#0284c7';
        btn.style.color = '#ffffff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = '#0f172a';
        btn.style.color = '#38bdf8';
      });
      btn.addEventListener('click', () => {
        btn.remove();
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ autoFormatXml: true });
        }
        injectReaderFrame();
      });
      if (document.body) document.body.appendChild(btn);
      else if (document.documentElement) document.documentElement.appendChild(btn);

    }
  }
  // Start initialization
  start();
})();

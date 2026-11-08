/**
 * XML Pro Toolkit - Content Script
 * Automatically detects XML pages/links and facilitates instant auto-formatting.
 */

(function () {
  // Prevent execution on extension pages or invalid contexts
  if (typeof window === 'undefined' || !window.location) return;
  if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'about:') return;

  const currentHref = window.location.href;
  const isRawRequested = currentHref.includes('raw=true') || currentHref.includes('raw=1') || currentHref.includes('noformat=1');

  // Detect whether document is XML
  const contentType = (document.contentType || '').toLowerCase();
  const isXmlContentType = contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom');
  const isXmlUrl = /\.(xml|rss|atom|xsd|wsdl)($|\?|#)/i.test(currentHref);
  const isNonHtmlRoot = document.documentElement && document.documentElement.tagName && document.documentElement.tagName.toLowerCase() !== 'html';

  const isXmlDocument = isXmlContentType || isXmlUrl || isNonHtmlRoot;

  if (!isXmlDocument) return;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime) {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      // Auto-format is enabled by default upon install
      const isAutoFormatEnabled = res.autoFormatXml !== false;

      if (isAutoFormatEnabled && !isRawRequested) {
        const studioUrl = chrome.runtime.getURL(`index.html?url=${encodeURIComponent(currentHref)}&autoformat=1`);
        window.location.replace(studioUrl);
      } else if (isRawRequested) {
        // User requested raw view: inject a floating button to allow one-click formatting
        injectFloatingFormatButton();
      }
    });
  }

  function injectFloatingFormatButton() {
    if (document.getElementById('xml-pro-floating-btn')) return;

    const btn = document.createElement('a');
    btn.id = 'xml-pro-floating-btn';
    btn.href = chrome.runtime.getURL(`index.html?url=${encodeURIComponent(currentHref)}&autoformat=1`);
    btn.style.position = 'fixed';
    btn.style.top = '12px';
    btn.style.right = '12px';
    btn.style.zIndex = '2147483647';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    btn.style.padding = '8px 14px';
    btn.style.backgroundColor = '#1e293b';
    btn.style.color = '#38bdf8';
    btn.style.border = '1px solid #334155';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '600';
    btn.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    btn.style.textDecoration = 'none';
    btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';

    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
      </svg>
      <span>Format in XML Pro</span>
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#0284c7';
      btn.style.color = '#ffffff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#1e293b';
      btn.style.color = '#38bdf8';
    });

    if (document.body) {
      document.body.appendChild(btn);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) document.body.appendChild(btn);
      });
    }
  }
})();

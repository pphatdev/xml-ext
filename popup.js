/**
 * XML Pro Toolkit - Popup Control Hub Logic
 * Lightweight, instant-loading hub for extension settings,
 * active tab inspection, and multi-format clipboard export grid.
 */

import { initTheme, toggleTheme } from './src/ui/theme.js';
import { formatXml } from './src/core/formatter.js';
import {
  detectFormat,
  xmlToTxt,
  xmlToMarkdown,
  xmlToJson,
  xmlToCsv,
  xmlToYaml,
  jsonToXml,
  yamlToXml,
  csvToXml,
  markdownToXml,
  txtToXml
} from './src/core/converter.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme
  initTheme();

  const themeBtn = document.getElementById('btn-popup-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // Toast Helper
  const toastEl = document.getElementById('popup-toast');
  function showToast(msg, type = 'info') {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = `popup-toast visible ${type}`;
    setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 2200);
  }

  // 2. Extension Enable/Disable Power Switch
  const powerCheckbox = document.getElementById('popup-power-checkbox');
  const powerDot = document.getElementById('popup-power-dot');
  const powerTitle = document.getElementById('popup-power-title');
  const powerSubtitle = document.getElementById('popup-power-subtitle');

  function updatePowerUI(enabled) {
    if (!powerCheckbox) return;
    powerCheckbox.checked = enabled;
    if (powerDot) {
      powerDot.classList.toggle('active', enabled);
      powerDot.classList.toggle('disabled', !enabled);
    }
    if (powerTitle) {
      powerTitle.textContent = enabled ? 'Extension Enabled' : 'Extension Disabled';
    }
    if (powerSubtitle) {
      powerSubtitle.textContent = enabled
        ? 'Auto-formats XML, JSON & data responses in browser'
        : 'Default browser raw data viewer active';
    }
  }

  // Load current extension state
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      const isEnabled = res.autoFormatXml !== false;
      updatePowerUI(isEnabled);
    });
  }

  // Handle Switch Change
  if (powerCheckbox) {
    powerCheckbox.addEventListener('change', () => {
      const isEnabled = powerCheckbox.checked;
      updatePowerUI(isEnabled);

      if (typeof chrome !== 'undefined') {
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ autoFormatXml: isEnabled }, () => {
            showToast(isEnabled ? 'Extension Enabled' : 'Extension Disabled', isEnabled ? 'success' : 'info');
          });
        }
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'SET_AUTOFORMAT_STATUS', enabled: isEnabled });
        }
      }
    });
  }

  // 3. Detect Active Tab Content & URL
  const tabBadge = document.getElementById('tab-card-badge');
  const tabUrlEl = document.getElementById('tab-card-url');
  const btnTabStudio = document.getElementById('btn-tab-open-studio');
  const btnTabStudioText = document.getElementById('btn-tab-open-studio-text');
  const btnTabSidepanel = document.getElementById('btn-tab-open-sidepanel');

  let activeTabUrl = '';
  let activeTabId = null;
  let activeTabFormat = null;

  function detectUrlFormat(url) {
    if (!url || typeof url !== 'string') return null;
    if (/\.(xml|rss|atom|xsd|wsdl)($|\?|#)/i.test(url) || /\/(sitemap|feed|rss)($|\?|#)/i.test(url)) return 'xml';
    if (/\.(json|geojson|jsonld)($|\?|#)/i.test(url)) return 'json';
    if (/\.(yaml|yml)($|\?|#)/i.test(url)) return 'yaml';
    if (/\.(csv|tsv)($|\?|#)/i.test(url)) return 'csv';
    if (/\.(md|markdown)($|\?|#)/i.test(url)) return 'markdown';
    if (/\.(txt|log)($|\?|#)/i.test(url)) return 'txt';
    if (/\/api\/.+/i.test(url)) return 'json';
    return null;
  }

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const currentTab = tabs && tabs[0];
      if (!currentTab || !currentTab.url) {
        if (tabBadge) tabBadge.textContent = 'No active tab';
        if (tabUrlEl) tabUrlEl.textContent = 'Ready to convert';
        return;
      }

      activeTabUrl = currentTab.url;
      activeTabId = currentTab.id;
      let detectedFormat = detectUrlFormat(activeTabUrl);

      // Clean display URL (e.g. hostname + pathname)
      let displayUrl = activeTabUrl;
      try {
        const parsed = new URL(activeTabUrl);
        displayUrl = parsed.hostname + parsed.pathname;
        if (displayUrl.length > 36) {
          displayUrl = '...' + displayUrl.slice(-33);
        }
      } catch (_) {}

      if (tabUrlEl) tabUrlEl.textContent = displayUrl;

      // Inspect DOM for raw data responses
      if (chrome.scripting && activeTabId) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: () => {
              const ct = (document.contentType || '').toLowerCase();
              let text = '';
              const pre = document.querySelector('pre');
              if (pre && pre.textContent) text = pre.textContent;
              else if (document.body && document.body.textContent) text = document.body.textContent;
              text = text.replace(/^Pretty-print\s*/i, '').trim().slice(0, 1000);
              return { contentType: ct, snippet: text };
            }
          });
          if (results && results[0] && results[0].result) {
            const { contentType, snippet } = results[0].result;
            if (contentType.includes('json') || snippet.startsWith('{') || snippet.startsWith('[')) {
              detectedFormat = 'json';
            } else if (contentType.includes('xml') || snippet.startsWith('<?xml') || /^<[a-zA-Z][\w:-]*/.test(snippet)) {
              detectedFormat = 'xml';
            } else if (contentType.includes('yaml') || /^[a-zA-Z0-9_-]+\s*:\s*.+/m.test(snippet)) {
              detectedFormat = 'yaml';
            } else if (contentType.includes('csv')) {
              detectedFormat = 'csv';
            } else if (contentType.includes('markdown') || /^#{1,6}\s+/m.test(snippet)) {
              detectedFormat = 'markdown';
            } else if (contentType.includes('text/plain')) {
              detectedFormat = detectedFormat || 'txt';
            }
          }
        } catch (_) {}
      }

      activeTabFormat = detectedFormat;

      if (detectedFormat) {
        const badgeNames = {
          xml: 'XML Found',
          json: 'JSON Found',
          yaml: 'YAML Found',
          csv: 'CSV Found',
          markdown: 'Markdown Found',
          txt: 'TXT Found'
        };
        if (tabBadge) {
          tabBadge.textContent = badgeNames[detectedFormat] || `${detectedFormat.toUpperCase()} Found`;
          tabBadge.classList.add('format-found', 'xml-found');
        }
        if (btnTabStudioText) {
          btnTabStudioText.textContent = `Open ${detectedFormat.toUpperCase()}`;
        }
      } else {
        if (tabBadge) {
          tabBadge.textContent = 'Web Page';
          tabBadge.classList.remove('format-found', 'xml-found');
        }
        if (btnTabStudioText) {
          btnTabStudioText.textContent = 'Open XML Studio';
        }
      }
    });
  }

  // Open Studio from Active Tab Card
  if (btnTabStudio) {
    btnTabStudio.addEventListener('click', () => {
      let targetUrl = 'index.html';
      if (activeTabFormat && activeTabUrl) {
        targetUrl = `index.html?url=${encodeURIComponent(activeTabUrl)}&autoformat=1&format=${encodeURIComponent(activeTabFormat)}`;
      }
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: targetUrl });
      } else {
        window.open(targetUrl, '_blank');
      }
    });
  }

  // Open Side Panel from Active Tab Card
  if (btnTabSidepanel) {
    btnTabSidepanel.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.sidePanel && activeTabId) {
        chrome.sidePanel.open({ tabId: activeTabId });
        window.close();
      } else {
        showToast('Side Panel available in browser', 'info');
      }
    });
  }

  // 4. Multi-Format Grid Exporter (Active Tab Data or Clipboard Data)
  async function getSourceData() {
    // Strategy 1: Try reading raw text from the active browser tab
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting && activeTabId) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          func: () => {
            const pre = document.querySelector('pre');
            if (pre && pre.textContent && pre.textContent.trim()) {
              return pre.textContent.trim().replace(/^Pretty-print\s*/i, '').trim();
            }
            const webkitXml = document.querySelector('#webkit-xml-viewer-source-xml');
            if (webkitXml && (webkitXml.textContent || webkitXml.outerHTML)) {
              return (webkitXml.textContent || webkitXml.outerHTML).trim();
            }
            if (document.documentElement && document.documentElement.tagName.toLowerCase() !== 'html') {
              const clone = document.documentElement.cloneNode(true);
              if (clone.querySelector) {
                const frame = clone.querySelector('#xml-pro-reader-frame');
                if (frame) frame.remove();
                const btn = clone.querySelector('#xml-pro-floating-btn');
                if (btn) btn.remove();
              }
              return new XMLSerializer().serializeToString(clone).trim();
            }
            if (document.body && document.body.textContent) {
              return document.body.textContent.trim().replace(/^Pretty-print\s*/i, '').trim();
            }
            return '';
          }
        });
        if (results && results[0] && results[0].result && results[0].result.trim()) {
          const raw = results[0].result.trim();
          const format = activeTabFormat || detectFormat(raw);
          return { raw, format };
        }
      } catch (_) {}
    }

    // Strategy 2: Fetch directly if active tab has a data URL
    if (activeTabUrl && activeTabFormat) {
      try {
        const res = await fetch(activeTabUrl);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) {
            const clean = text.trim();
            return { raw: clean, format: activeTabFormat || detectFormat(clean) };
          }
        }
      } catch (_) {}
    }

    // Strategy 3: Fallback to clipboard
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          const clean = clipText.trim();
          return { raw: clean, format: detectFormat(clean) };
        }
      } catch (_) {}
    }

    return null;
  }

  function convertDataToXml(raw, format) {
    if (!raw) return '<root/>';
    if (format === 'xml') return raw;

    try {
      switch (format) {
        case 'json': {
          const obj = JSON.parse(raw);
          return jsonToXml(obj, { rootTag: 'root' });
        }
        case 'yaml':
          return yamlToXml(raw, { rootTag: 'root' });
        case 'csv':
          return csvToXml(raw, { rootTag: 'records', itemTag: 'row' });
        case 'markdown':
          return markdownToXml(raw, { rootTag: 'document' });
        case 'txt':
          return txtToXml(raw, { rootTag: 'document' });
        default:
          return `<root><raw>${raw}</raw></root>`;
      }
    } catch (_) {
      return `<root><raw>${raw}</raw></root>`;
    }
  }

  async function handleCopyAsFormat(targetFormat) {
    try {
      const source = await getSourceData();
      if (!source || !source.raw) {
        showToast('No data on tab or clipboard', 'error');
        return;
      }

      const { raw, format: srcFormat } = source;
      let output = '';
      const formatNames = {
        txt: 'TXT',
        xml: 'XML',
        markdown: 'Markdown',
        json: 'JSON',
        csv: 'CSV',
        yaml: 'YAML'
      };
      const formatName = formatNames[targetFormat] || targetFormat.toUpperCase();

      // If source and target formats are identical, just prettify
      if (srcFormat === targetFormat) {
        if (targetFormat === 'json') {
          try {
            output = JSON.stringify(JSON.parse(raw), null, 2);
          } catch (_) {
            output = raw;
          }
        } else if (targetFormat === 'xml') {
          try {
            output = formatXml(raw, { indent: '  ', preserveComments: true, entities: 'auto' });
          } catch (_) {
            output = raw;
          }
        } else {
          output = raw;
        }
      } else {
        // Convert to intermediate XML first
        const xml = convertDataToXml(raw, srcFormat);

        switch (targetFormat) {
          case 'txt':
            output = xmlToTxt(xml);
            break;
          case 'xml':
            output = formatXml(xml, { indent: '  ', preserveComments: true, entities: 'auto' });
            break;
          case 'markdown':
            output = xmlToMarkdown(xml);
            break;
          case 'json': {
            const jsonObj = xmlToJson(xml, { mode: 'clean' });
            output = JSON.stringify(jsonObj, null, 2);
            break;
          }
          case 'csv':
            output = xmlToCsv(xml, ',');
            break;
          case 'yaml':
            output = xmlToYaml(xml);
            break;
          default:
            throw new Error(`Unsupported format: ${targetFormat}`);
        }
      }

      if (!output || !output.trim()) {
        showToast(`Empty ${formatName} output`, 'error');
        return;
      }

      await navigator.clipboard.writeText(output);
      showToast(`Copied as ${formatName} to clipboard!`, 'success');
    } catch (err) {
      showToast(`Conversion failed: ${err.message}`, 'error');
    }
  }

  // Bind Quick Tools grid buttons
  document.querySelectorAll('.quick-tool-btn[data-format]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleCopyAsFormat(btn.dataset.format);
    });
  });
});

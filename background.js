/**
 * Chrome Extension Background Service Worker (Manifest V3)
 * Handles auto-formatting on opening .xml links, webNavigation interception,
 * CORS proxying, and context menus.
 */

// Cache recent redirects to prevent duplicate navigations
const redirectCache = new Map();

// Helper to check if a URL is an XML resource
function isXmlTargetUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (
    url.startsWith('chrome') ||
    url.startsWith('edge') ||
    url.startsWith('about:') ||
    url.startsWith('devtools:') ||
    url.startsWith('view-source:')
  ) {
    return false;
  }
  return /\.(xml|rss|atom|xsd|wsdl)($|\?|#)/i.test(url);
}

function isRawBypassRequested(url) {
  if (!url) return false;
  return url.includes('raw=true') || url.includes('raw=1') || url.includes('noformat=1');
}

// Initialize on extension installation
chrome.runtime.onInstalled.addListener(() => {
  // 1. Enable auto-format by default upon installation
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      if (res.autoFormatXml === undefined) {
        chrome.storage.local.set({ autoFormatXml: true });
      }
    });
  }

  // 2. Create Context Menus
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'open-xml-studio',
      title: 'Open in XML Pro Studio',
      contexts: ['selection', 'page', 'link']
    });

    chrome.contextMenus.create({
      id: 'open-xml-sidepanel',
      title: 'Inspect XML in Side Panel',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'open-xml-docs',
      title: 'Open XML Documentation',
      contexts: ['action']
    });
  }
});

// Primary Interception: webNavigation.onBeforeNavigate (fires before request renders)
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Only intercept top-level main frame navigation
    if (details.frameId !== 0) return;
    const targetUrl = details.url;
    if (!targetUrl || !isXmlTargetUrl(targetUrl) || isRawBypassRequested(targetUrl)) return;

    // Prevent duplicate redirection within 4 seconds
    const last = redirectCache.get(details.tabId);
    if (last && last.url === targetUrl && (Date.now() - last.time < 4000)) {
      return;
    }
    redirectCache.set(details.tabId, { url: targetUrl, time: Date.now() });

    chrome.storage.local.get(['autoFormatXml'], (data) => {
      if (data.autoFormatXml !== false) {
        const studioUrl = chrome.runtime.getURL(`index.html?url=${encodeURIComponent(targetUrl)}&autoformat=1`);
        chrome.tabs.update(details.tabId, { url: studioUrl });
      }
    });
  });
}

// Fallback Interception: tabs.onUpdated
if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const targetUrl = changeInfo.url || tab?.url;
    if (!targetUrl || !isXmlTargetUrl(targetUrl) || isRawBypassRequested(targetUrl)) return;

    // Prevent duplicate redirection within 4 seconds
    const last = redirectCache.get(tabId);
    if (last && last.url === targetUrl && (Date.now() - last.time < 4000)) {
      return;
    }
    redirectCache.set(tabId, { url: targetUrl, time: Date.now() });

    chrome.storage.local.get(['autoFormatXml'], (data) => {
      if (data.autoFormatXml !== false) {
        const studioUrl = chrome.runtime.getURL(`index.html?url=${encodeURIComponent(targetUrl)}&autoformat=1`);
        chrome.tabs.update(tabId, { url: studioUrl });
      }
    });
  });
}

// Clean up redirect cache on tab close
if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    redirectCache.delete(tabId);
  });
}

// Handle Context Menu clicks
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-xml-studio') {
    if (info.linkUrl) {
      const studioUrl = chrome.runtime.getURL(`index.html?url=${encodeURIComponent(info.linkUrl)}&autoformat=1`);
      chrome.tabs.create({ url: studioUrl });
    } else if (info.selectionText) {
      chrome.storage.local.set({ pendingXml: info.selectionText }, () => {
        const studioUrl = chrome.runtime.getURL('index.html?from=selection&autoformat=1');
        chrome.tabs.create({ url: studioUrl });
      });
    } else if (info.pageUrl) {
      const studioUrl = chrome.runtime.getURL(`index.html?url=${encodeURIComponent(info.pageUrl)}&autoformat=1`);
      chrome.tabs.create({ url: studioUrl });
    } else {
      chrome.tabs.create({ url: 'index.html' });
    }
  } else if (info.menuItemId === 'open-xml-docs') {
    chrome.tabs.create({ url: 'docs.html' });
  } else if (info.menuItemId === 'open-xml-sidepanel') {
    if (info.selectionText) {
      chrome.storage.local.set({ pendingSidepanelXml: info.selectionText }, () => {
        if (chrome.sidePanel && tab?.id) {
          chrome.sidePanel.open({ tabId: tab.id });
        }
      });
    } else if (chrome.sidePanel && tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// Extension message listener (CORS proxy fetcher & configuration status)
chrome.runtime?.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_XML_URL') {
    let fetchUrl = (request.url || '').trim();
    if (!/^https?:\/\//i.test(fetchUrl) && !fetchUrl.startsWith('file://')) {
      fetchUrl = 'https://' + fetchUrl;
    }

    fetch(fetchUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }
        const text = await res.text();
        sendResponse({ success: true, text });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }

  if (request.type === 'GET_AUTOFORMAT_STATUS') {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      sendResponse({ autoFormatXml: res.autoFormatXml !== false });
    });
    return true;
  }

  if (request.type === 'SET_AUTOFORMAT_STATUS') {
    chrome.storage.local.set({ autoFormatXml: !!request.enabled }, () => {
      sendResponse({ success: true, autoFormatXml: !!request.enabled });
    });
    return true;
  }
});

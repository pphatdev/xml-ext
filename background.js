/**
 * Chrome Extension Background Service Worker (Manifest V3)
 * Handles in-place XML reader execution, context menus,
 * storage preferences, and CORS proxy fetching.
 */

// Helper to check if a URL is a supported data resource (XML, JSON, YAML, CSV, Markdown, TXT)
function isSupportedTargetUrl(url) {
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
  return /\.(xml|rss|atom|xsd|wsdl)($|\?|#)/i.test(url) ||
         /\/sitemap(\.xml)?($|\?|#)/i.test(url) ||
         /\/feed(\.xml)?($|\?|#)/i.test(url) ||
         /\/rss(\.xml)?($|\?|#)/i.test(url) ||
         /\.(json|geojson|jsonld)($|\?|#)/i.test(url) ||
         /\.(yaml|yml)($|\?|#)/i.test(url) ||
         /\.(csv|tsv)($|\?|#)/i.test(url) ||
         /\.(md|markdown)($|\?|#)/i.test(url) ||
         /\.(txt|log)($|\?|#)/i.test(url) ||
         /\/api\/.+/i.test(url);
}

function isRawBypassRequested(url) {
  if (!url) return false;
  return url.includes('raw=true') || url.includes('raw=1') || url.includes('noformat=1');
}

// Manage Extension Badge and Context Menu
function updateExtensionBadge(enabled) {
  if (chrome.action) {
    if (enabled) {
      chrome.action.setBadgeText({ text: '' });
    } else {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  }
}

function updateContextMenuState(enabled) {
  if (chrome.contextMenus) {
    try {
      chrome.contextMenus.update('toggle-extension-enabled', {
        title: enabled ? 'Disable XML Pro Extension' : 'Enable XML Pro Extension'
      });
    } catch (_) {}
  }
}

// Track tabs where script execution was already attempted
const injectedTabs = new Set();

// Initialize on extension installation
chrome.runtime.onInstalled.addListener(() => {
  // 1. Enable auto-format by default upon installation
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      const isEnabled = res.autoFormatXml !== false;
      if (res.autoFormatXml === undefined) {
        chrome.storage.local.set({ autoFormatXml: true });
      }
      updateExtensionBadge(isEnabled);
    });
  }

  // 2. Create Context Menus
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'toggle-extension-enabled',
      title: 'Disable XML Pro Extension',
      contexts: ['action']
    });

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

// Sync on browser startup
chrome.runtime.onStartup?.addListener(() => {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      const isEnabled = res.autoFormatXml !== false;
      updateExtensionBadge(isEnabled);
      updateContextMenuState(isEnabled);
    });
  }
});

// Ensure in-place XML formatting runs directly in browser tab on that exact URL
function ensureContentScriptInjected(tabId, url) {
  if (!tabId || !url || !isSupportedTargetUrl(url) || isRawBypassRequested(url)) return;

  chrome.storage.local.get(['autoFormatXml'], (data) => {
    if (data.autoFormatXml === false) return;

    if (chrome.scripting && chrome.scripting.executeScript) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      }).then(() => {
        injectedTabs.add(tabId);
      }).catch(() => {
        // Tab might be restricted or closed
      });
    }
  });
}

// Fallback injection on tabs.onUpdated
if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = changeInfo.url || tab?.url;
    if (changeInfo.status === 'complete' && url) {
      ensureContentScriptInjected(tabId, url);
    }
  });
}

// Fallback injection on webNavigation.onCompleted
if (chrome.webNavigation && chrome.webNavigation.onCompleted) {
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0 && details.url) {
      ensureContentScriptInjected(details.tabId, details.url);
    }
  });
}

// Clean up injection cache on tab close
if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
  });
}

// Handle Context Menu clicks
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toggle-extension-enabled') {
    chrome.storage.local.get(['autoFormatXml'], (res) => {
      const isCurrentlyEnabled = res.autoFormatXml !== false;
      const nextState = !isCurrentlyEnabled;
      chrome.storage.local.set({ autoFormatXml: nextState }, () => {
        updateExtensionBadge(nextState);
        updateContextMenuState(nextState);
      });
    });
  } else if (info.menuItemId === 'open-xml-studio') {
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
    const nextState = !!request.enabled;
    chrome.storage.local.set({ autoFormatXml: nextState }, () => {
      updateExtensionBadge(nextState);
      updateContextMenuState(nextState);
      sendResponse({ success: true, autoFormatXml: nextState });
    });
    return true;
  }
});

/**
 * Chrome Extension Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu item
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

// Handle Context Menu clicks
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-xml-studio') {
    chrome.tabs.create({ url: 'index.html' });
  } else if (info.menuItemId === 'open-xml-docs') {
    chrome.tabs.create({ url: 'docs.html' });
  } else if (info.menuItemId === 'open-xml-sidepanel') {
    if (chrome.sidePanel && tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});


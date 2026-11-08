/**
 * Universal XML URL Fetcher
 * Handles CORS bypass via Chrome Extension background worker,
 * local dev server proxy, and multi-tier public CORS proxies.
 */

export async function fetchXmlFromUrl(targetUrl, options = {}) {
  const url = (targetUrl || '').trim();
  if (!url) {
    throw new Error('URL cannot be empty');
  }

  // Auto-normalize protocol if missing
  let effectiveUrl = url;
  if (!/^https?:\/\//i.test(effectiveUrl) && !effectiveUrl.startsWith('file://')) {
    effectiveUrl = 'https://' + effectiveUrl;
  }

  // Auto-normalize GitHub blob URLs to raw.githubusercontent.com
  if (effectiveUrl.includes('github.com') && effectiveUrl.includes('/blob/')) {
    effectiveUrl = effectiveUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  const errors = [];

  // Strategy 1: Chrome Extension Background Service Worker (Bypasses CORS with host_permissions)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_XML_URL', url: effectiveUrl }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { success: false, error: 'Empty background response' });
          }
        });
      });

      if (response && response.success && response.text) {
        return { text: response.text, method: 'extension-background' };
      } else if (response && response.error) {
        errors.push(`Extension proxy: ${response.error}`);
      }
    } catch (extErr) {
      errors.push(`Extension message: ${extErr.message}`);
    }
  }

  // Strategy 2: Local Dev Server Proxy (/proxy?url=...) if running locally
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const localProxyUrl = `/proxy?url=${encodeURIComponent(effectiveUrl)}`;
      const res = await fetch(localProxyUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes('<!DOCTYPE html>')) {
          return { text, method: 'local-dev-proxy' };
        }
      }
    } catch (_) {
      // Dev proxy not active, continue to fallbacks
    }
  }

  // Strategy 3: Direct Browser Fetch (Works if target server enables CORS or raw files)
  try {
    const res = await fetch(effectiveUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      return { text, method: 'direct' };
    }
    errors.push(`Direct fetch returned HTTP ${res.status}`);
  } catch (directErr) {
    errors.push(`Direct fetch: ${directErr.message}`);
  }

  // Strategy 4: corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(effectiveUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      return { text, method: 'corsproxy.io' };
    }
    errors.push(`corsproxy.io returned HTTP ${res.status}`);
  } catch (p1Err) {
    errors.push(`corsproxy.io: ${p1Err.message}`);
  }

  // Strategy 5: CodeTabs CORS Proxy
  try {
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(effectiveUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      return { text, method: 'codetabs' };
    }
    errors.push(`CodeTabs returned HTTP ${res.status}`);
  } catch (p2Err) {
    errors.push(`CodeTabs: ${p2Err.message}`);
  }

  // Strategy 6: AllOrigins JSON endpoint (more reliable than /raw)
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(effectiveUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.contents) {
        return { text: data.contents, method: 'allorigins-json' };
      }
    }
  } catch (p3Err) {
    errors.push(`AllOrigins: ${p3Err.message}`);
  }

  // If all strategies failed, throw comprehensive error with advice
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  let message = `Failed to fetch "${effectiveUrl}" due to browser CORS security restrictions.`;
  if (isLocalhost) {
    message += ` Running standalone on localhost:3000 blocks cross-origin requests. Use the Chrome Extension (which bypasses CORS with host permissions) or paste the XML directly.`;
  }

  const err = new Error(message);
  err.details = errors;
  err.url = effectiveUrl;
  throw err;
}

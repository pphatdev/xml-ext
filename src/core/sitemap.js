/**
 * XML Sitemap Generator
 * Generates Google & Bing compliant sitemaps from URL(s) and JSON data.
 */

export const CHANGEFREQ_OPTIONS = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never'
];

/**
 * Normalizes URL string
 */
export function normalizeUrl(rawUrl, baseUrl = '') {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (baseUrl) {
      try {
        return new URL(url, baseUrl).href;
      } catch (_) {
        url = baseUrl.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
      }
    } else {
      url = 'https://' + url;
    }
  }

  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch (_) {
    return url;
  }
}

/**
 * Generates an XML sitemap from a list of URLs or single URL with routes
 * @param {string|string[]} urlInput - single URL, multi-line string, or array of URLs
 * @param {object} [options]
 * @returns {string} XML Sitemap
 */
export function generateSitemapFromUrls(urlInput, options = {}) {
  const {
    defaultChangefreq = 'weekly',
    defaultPriority = '0.8',
    homePriority = '1.0',
    lastmod = new Date().toISOString().split('T')[0],
    subpaths = []
  } = options;

  let urls = [];

  if (Array.isArray(urlInput)) {
    urls = urlInput;
  } else if (typeof urlInput === 'string') {
    const lines = urlInput
      .split(/[\r\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (lines.length === 1 && subpaths && subpaths.length > 0) {
      const base = normalizeUrl(lines[0]);
      urls.push(base);
      for (const p of subpaths) {
        urls.push(normalizeUrl(p, base));
      }
    } else {
      urls = lines.map(u => normalizeUrl(u));
    }
  }

  // Deduplicate URLs
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

  const urlEntries = uniqueUrls.map(u => {
    let priority = defaultPriority;
    try {
      const parsed = new URL(u);
      if (parsed.pathname === '/' || parsed.pathname === '') {
        priority = homePriority;
      }
    } catch (_) {}

    return {
      loc: u,
      lastmod,
      changefreq: defaultChangefreq,
      priority
    };
  });

  return renderUrlsetXml(urlEntries);
}

/**
 * Crawls a target URL and extracts all internal same-origin links from HTML
 * @param {string} targetUrl
 * @param {string} htmlContent
 * @returns {string[]} Array of unique, normalized absolute URLs
 */
export function extractInternalLinksFromHtml(targetUrl, htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return [];
  const base = normalizeUrl(targetUrl);
  let baseOrigin = '';
  try {
    baseOrigin = new URL(base).origin;
  } catch (_) {
    return [base];
  }

  const foundUrls = new Set();
  foundUrls.add(base);

  // Match href attributes: href="..." or href='...'
  const hrefRegex = /<a\s+[^>]*?href\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match;
  while ((match = hrefRegex.exec(htmlContent)) !== null) {
    const rawHref = match[2].trim();
    if (!rawHref) continue;

    // Ignore anchors, javascript:, mailto:, tel:
    if (
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref.startsWith('data:')
    ) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, base);
      // Keep only same origin (internal links)
      if (resolved.origin === baseOrigin) {
        // Strip fragment (#)
        resolved.hash = '';
        // Skip common static binary assets (.css, .js, images, fonts, zips)
        if (!/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf|zip|tar|gz|mp4|webm)($|\?)/i.test(resolved.pathname)) {
          foundUrls.add(resolved.href);
        }
      }
    } catch (_) {}
  }

  return Array.from(foundUrls);
}

/**
 * Discovers real-world website URLs by checking for online sitemap.xml and/or crawling live HTML
 * @param {string} websiteUrl
 * @param {Function} fetcherFn - async (url) => { text: string }
 * @param {object} [options]
 * @returns {Promise<{ urls: string[], source: 'sitemap.xml' | 'crawler' | 'fallback', sitemapXml?: string, targetSitemapUrl?: string }>}
 */
export async function crawlRealWebsiteUrls(websiteUrl, fetcherFn, options = {}) {
  const normBase = normalizeUrl(websiteUrl);
  let parsed;
  try {
    parsed = new URL(normBase);
  } catch (_) {
    return { urls: [normBase], source: 'fallback' };
  }

  const origin = parsed.origin;
  const checkSitemap = options.checkSitemap !== false;
  const crawlHtml = options.crawlHtml !== false;

  // 1. First, check if the website has an existing real sitemap.xml online
  if (checkSitemap && typeof fetcherFn === 'function') {
    const sitemapCandidates = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`
    ];

    for (const smUrl of sitemapCandidates) {
      try {
        const res = await fetcherFn(smUrl);
        if (res && res.text) {
          const text = res.text.trim();
          if (text.startsWith('<?xml') || text.includes('<urlset') || text.includes('<sitemapindex')) {
            const entries = parseSitemapEntries(text);
            if (entries && entries.length > 0) {
              return {
                urls: entries.map(e => e.loc),
                source: 'sitemap.xml',
                sitemapXml: text,
                targetSitemapUrl: smUrl
              };
            }
          }
        }
      } catch (_) {
        // Ignore error and proceed
      }
    }
  }

  // 2. Fetch the live homepage HTML and extract real internal links
  if (crawlHtml && typeof fetcherFn === 'function') {
    try {
      const res = await fetcherFn(normBase);
      if (res && res.text) {
        const links = extractInternalLinksFromHtml(normBase, res.text);
        if (links.length > 1) {
          return {
            urls: links,
            source: 'crawler'
          };
        }
      }
    } catch (_) {
      // Ignore error and proceed to fallback
    }
  }

  return {
    urls: [normBase],
    source: 'fallback'
  };
}

/**
 * Generates an XML sitemap from JSON data
 * @param {string|object} jsonInput
 * @param {object} [options]
 * @returns {string} XML Sitemap or Sitemap Index
 */
export function generateSitemapFromJson(jsonInput, options = {}) {
  const defaultLastmod = options.lastmod || new Date().toISOString().split('T')[0];
  let data;

  if (typeof jsonInput === 'string') {
    data = JSON.parse(jsonInput);
  } else {
    data = jsonInput;
  }

  // Case 1: Sitemap Index Spec
  if (data && (data.sitemaps || data.sitemapindex)) {
    const sitemaps = data.sitemaps || data.sitemapindex;
    if (Array.isArray(sitemaps)) {
      return renderSitemapIndexXml(sitemaps, defaultLastmod);
    }
  }

  // Case 2: Array of URLs or Objects
  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.urls)) {
      items = data.urls;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    } else {
      // Single object
      items = [data];
    }
  }

  const entries = items.map(item => {
    if (typeof item === 'string') {
      return {
        loc: normalizeUrl(item),
        lastmod: defaultLastmod,
        changefreq: options.defaultChangefreq || 'weekly',
        priority: options.defaultPriority || '0.8'
      };
    }

    if (item && typeof item === 'object') {
      const loc = normalizeUrl(item.loc || item.url || item.path || '');
      const lastmod = item.lastmod || item.updatedAt || defaultLastmod;
      const changefreq = item.changefreq || item.frequency || options.defaultChangefreq || 'weekly';
      const priority = item.priority !== undefined ? String(item.priority) : (options.defaultPriority || '0.8');

      return {
        loc,
        lastmod,
        changefreq,
        priority,
        images: item.images || item.image ? (Array.isArray(item.images) ? item.images : [item.image]) : []
      };
    }

    return null;
  }).filter(e => e && e.loc);

  return renderUrlsetXml(entries);
}

function renderUrlsetXml(entries) {
  const hasImages = entries.some(e => e.images && e.images.length > 0);
  const imageNs = hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>\n`;

  for (const entry of entries) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`;
    }
    if (entry.priority) {
      xml += `    <priority>${escapeXml(entry.priority)}</priority>\n`;
    }

    if (entry.images && entry.images.length > 0) {
      for (const img of entry.images) {
        const imgLoc = typeof img === 'string' ? img : (img.loc || img.url);
        if (imgLoc) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${escapeXml(imgLoc)}</image:loc>\n`;
          if (img.title) xml += `      <image:title>${escapeXml(img.title)}</image:title>\n`;
          if (img.caption) xml += `      <image:caption>${escapeXml(img.caption)}</image:caption>\n`;
          xml += `    </image:image>\n`;
        }
      }
    }

    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

function renderSitemapIndexXml(sitemaps, defaultLastmod) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const item of sitemaps) {
    const loc = typeof item === 'string' ? item : (item.loc || item.url);
    const lastmod = (item && item.lastmod) || defaultLastmod;
    if (loc) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${escapeXml(loc)}</loc>\n`;
      xml += `    <lastmod>${escapeXml(lastmod)}</lastmod>\n`;
      xml += `  </sitemap>\n`;
    }
  }

  xml += `</sitemapindex>`;
  return xml;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parses generated or existing sitemap XML into structured route entries
 * @param {string} xmlString
 * @returns {Array<{type: 'url'|'sitemap', loc: string, lastmod: string, changefreq: string, priority: string}>}
 */
export function parseSitemapEntries(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') return [];
  const entries = [];

  // 1. If DOMParser is available (Browser context)
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
      const isIndex = doc.querySelector('sitemapindex') !== null;
      if (isIndex) {
        const sitemaps = doc.querySelectorAll('sitemap');
        sitemaps.forEach(sm => {
          const loc = sm.querySelector('loc')?.textContent?.trim() || '';
          const lastmod = sm.querySelector('lastmod')?.textContent?.trim() || '';
          if (loc) {
            entries.push({ type: 'sitemap', loc, lastmod, changefreq: '', priority: '' });
          }
        });
        if (entries.length > 0) return entries;
      } else {
        const urls = doc.querySelectorAll('url');
        urls.forEach(u => {
          const loc = u.querySelector('loc')?.textContent?.trim() || '';
          const lastmod = u.querySelector('lastmod')?.textContent?.trim() || '';
          const changefreq = u.querySelector('changefreq')?.textContent?.trim() || '';
          const priority = u.querySelector('priority')?.textContent?.trim() || '';
          if (loc) {
            entries.push({ type: 'url', loc, lastmod, changefreq, priority });
          }
        });
        if (entries.length > 0) return entries;
      }
    } catch (_) {}
  }

  // 2. High-speed regex parser fallback (Deno / Node / SSR context)
  const isIndex = /<sitemapindex[\s>]/i.test(xmlString);
  if (isIndex) {
    const sitemapBlocks = xmlString.match(/<sitemap>[\s\S]*?<\/sitemap>/gi) || [];
    for (const b of sitemapBlocks) {
      const locMatch = b.match(/<loc>([\s\S]*?)<\/loc>/i);
      const lastmodMatch = b.match(/<lastmod>([\s\S]*?)<\/lastmod>/i);
      if (locMatch) {
        entries.push({
          type: 'sitemap',
          loc: locMatch[1].trim(),
          lastmod: lastmodMatch ? lastmodMatch[1].trim() : '',
          changefreq: '',
          priority: ''
        });
      }
    }
  } else {
    const urlBlocks = xmlString.match(/<url>[\s\S]*?<\/url>/gi) || [];
    for (const b of urlBlocks) {
      const locMatch = b.match(/<loc>([\s\S]*?)<\/loc>/i);
      const lastmodMatch = b.match(/<lastmod>([\s\S]*?)<\/lastmod>/i);
      const freqMatch = b.match(/<changefreq>([\s\S]*?)<\/changefreq>/i);
      const prioMatch = b.match(/<priority>([\s\S]*?)<\/priority>/i);
      if (locMatch) {
        entries.push({
          type: 'url',
          loc: locMatch[1].trim(),
          lastmod: lastmodMatch ? lastmodMatch[1].trim() : '',
          changefreq: freqMatch ? freqMatch[1].trim() : '',
          priority: prioMatch ? prioMatch[1].trim() : ''
        });
      }
    }
  }

  return entries;
}



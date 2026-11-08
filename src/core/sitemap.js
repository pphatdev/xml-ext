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

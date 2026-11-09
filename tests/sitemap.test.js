import { assert, assertEquals } from './assert.js';
import {
  generateSitemapFromUrls,
  generateSitemapFromJson,
  normalizeUrl,
  parseSitemapEntries,
  extractInternalLinksFromHtml,
  crawlRealWebsiteUrls
} from '../src/core/sitemap.js';
import { validateXml } from '../src/core/validator.js';

Deno.test('Normalize URL handles missing protocols', () => {
  assertEquals(normalizeUrl('example.com'), 'https://example.com/');
  assertEquals(normalizeUrl('https://example.com/about'), 'https://example.com/about');
  assertEquals(normalizeUrl('/contact', 'https://example.com'), 'https://example.com/contact');
});

Deno.test('Generate Sitemap from single URL and subpaths', () => {
  const xml = generateSitemapFromUrls('https://example.com', {
    subpaths: ['/about', '/products', '/contact'],
    defaultChangefreq: 'daily',
    defaultPriority: '0.8',
    homePriority: '1.0'
  });

  assert(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Has urlset root');
  assert(xml.includes('<loc>https://example.com/</loc>'), 'Has home loc');
  assert(xml.includes('<priority>1.0</priority>'), 'Home has priority 1.0');
  assert(xml.includes('<loc>https://example.com/about</loc>'), 'Has about loc');
  assert(xml.includes('<changefreq>daily</changefreq>'), 'Has changefreq daily');
});

Deno.test('Generate Sitemap from multi-line URL string', () => {
  const input = `
    https://example.com/page1
    https://example.com/page2
  `;
  const xml = generateSitemapFromUrls(input);
  assert(xml.includes('<loc>https://example.com/page1</loc>'));
  assert(xml.includes('<loc>https://example.com/page2</loc>'));
});

Deno.test('Generate Sitemap from JSON objects', () => {
  const json = [
    { loc: 'https://example.com', priority: 1.0, changefreq: 'always' },
    { loc: 'https://example.com/blog', priority: 0.7, changefreq: 'weekly' }
  ];

  const xml = generateSitemapFromJson(json);
  assert(xml.includes('<loc>https://example.com/</loc>'));
  assert(xml.includes('<priority>1</priority>') || xml.includes('<priority>1.0</priority>'));
  assert(xml.includes('<loc>https://example.com/blog</loc>'));
  assert(xml.includes('<changefreq>weekly</changefreq>'));
});

Deno.test('Generate Sitemap Index from JSON spec', () => {
  const json = {
    sitemaps: [
      { loc: 'https://example.com/sitemap-1.xml', lastmod: '2026-11-08' },
      { loc: 'https://example.com/sitemap-2.xml', lastmod: '2026-11-08' }
    ]
  };

  const xml = generateSitemapFromJson(json);
  assert(xml.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert(xml.includes('<loc>https://example.com/sitemap-1.xml</loc>'));
});

Deno.test('Parse sitemap entries extracts structured routes, priorities, and changefreq', () => {
  const xml = generateSitemapFromUrls('https://example.com', {
    subpaths: ['/about', '/products', '/contact'],
    defaultChangefreq: 'daily',
    defaultPriority: '0.8',
    homePriority: '1.0'
  });

  const entries = parseSitemapEntries(xml);
  assertEquals(entries.length, 4);
  assertEquals(entries[0].loc, 'https://example.com/');
  assertEquals(entries[0].priority, '1.0');
  assertEquals(entries[0].changefreq, 'daily');
  assertEquals(entries[1].loc, 'https://example.com/about');
  assertEquals(entries[1].priority, '0.8');

  // Verify full XML validity
  const valResult = validateXml(xml);
  assertEquals(valResult.valid, true);
  assertEquals(valResult.rootTag, 'urlset');
  assert(valResult.elementCount >= 16);
});

Deno.test('Parse sitemap index extracts child sitemaps and validates', () => {
  const json = {
    sitemaps: [
      { loc: 'https://example.com/sitemap-posts.xml', lastmod: '2026-11-09' },
      { loc: 'https://example.com/sitemap-pages.xml', lastmod: '2026-11-09' }
    ]
  };

  const xml = generateSitemapFromJson(json);
  const entries = parseSitemapEntries(xml);
  assertEquals(entries.length, 2);
  assertEquals(entries[0].type, 'sitemap');
  assertEquals(entries[0].loc, 'https://example.com/sitemap-posts.xml');
  assertEquals(entries[1].loc, 'https://example.com/sitemap-pages.xml');

  const valResult = validateXml(xml);
  assertEquals(valResult.valid, true);
  assertEquals(valResult.rootTag, 'sitemapindex');
});

Deno.test('Extract internal links from live HTML filters out external URLs and assets', () => {
  const html = `
    <html>
      <body>
        <a href="/">Home</a>
        <a href="/api/admin/provinces">Provinces</a>
        <a href="/docs/guide">Documentation</a>
        <a href="/login?redirect=1">Login</a>
        <a href="#section-top">Skip to content</a>
        <a href="javascript:void(0)">Click me</a>
        <a href="mailto:support@pphat.me">Email</a>
        <a href="https://external-domain.com/other">External Partner</a>
        <a href="/assets/logo.png">Brand Logo</a>
        <a href="/style.css">Styles</a>
      </body>
    </html>
  `;

  const links = extractInternalLinksFromHtml('https://opengeo-cambodia.pphat.me', html);
  assertEquals(links.length, 4);
  assert(links.includes('https://opengeo-cambodia.pphat.me/'));
  assert(links.includes('https://opengeo-cambodia.pphat.me/api/admin/provinces'));
  assert(links.includes('https://opengeo-cambodia.pphat.me/docs/guide'));
  assert(links.includes('https://opengeo-cambodia.pphat.me/login?redirect=1'));
  // Ensure external links and assets are omitted
  assert(!links.some(l => l.includes('external-domain.com')));
  assert(!links.some(l => l.includes('logo.png')));
  assert(!links.some(l => l.includes('style.css')));
});

Deno.test('Crawl real website URLs auto-discovers online sitemap.xml', async () => {
  const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://mysite.com/</loc><priority>1.0</priority></url>
    <url><loc>https://mysite.com/features</loc><priority>0.8</priority></url>
  </urlset>`;

  const mockFetcher = async (url) => {
    if (url === 'https://mysite.com/sitemap.xml') {
      return { text: mockSitemap, method: 'mock' };
    }
    return { text: '', method: 'mock' };
  };

  const res = await crawlRealWebsiteUrls('https://mysite.com', mockFetcher);
  assertEquals(res.source, 'sitemap.xml');
  assertEquals(res.urls.length, 2);
  assert(res.urls.includes('https://mysite.com/'));
  assert(res.urls.includes('https://mysite.com/features'));
});

Deno.test('Crawl real website URLs crawls HTML when sitemap.xml does not exist', async () => {
  const mockHtml = `
    <html>
      <body>
        <a href="/">Home</a>
        <a href="/services">Services</a>
        <a href="/contact-us">Contact</a>
      </body>
    </html>
  `;

  const mockFetcher = async (url) => {
    if (url.endsWith('.xml')) {
      throw new Error('Not found 404');
    }
    return { text: mockHtml, method: 'mock' };
  };

  const res = await crawlRealWebsiteUrls('https://newstartup.io', mockFetcher);
  assertEquals(res.source, 'crawler');
  assertEquals(res.urls.length, 3);
  assert(res.urls.includes('https://newstartup.io/'));
  assert(res.urls.includes('https://newstartup.io/services'));
  assert(res.urls.includes('https://newstartup.io/contact-us'));
});

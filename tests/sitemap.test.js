import { assert, assertEquals } from './assert.js';
import {
  generateSitemapFromUrls,
  generateSitemapFromJson,
  normalizeUrl
} from '../src/core/sitemap.js';

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

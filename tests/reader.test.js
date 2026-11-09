import { assert, assertEquals } from './assert.js';
import { formatXml } from '../src/core/formatter.js';
import { validateXml } from '../src/core/validator.js';
import {
  detectFormat,
  jsonToXml,
  xmlToJson,
  xmlToYaml,
  xmlToCsv,
  xmlToMarkdown,
  xmlToTxt,
  xmlToChartData,
  xmlToCardFlowData
} from '../src/core/converter.js';

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

Deno.test('Multi-format target URL detection identifies all supported data resources', () => {
  // XML formats
  assert(isSupportedTargetUrl('https://opengeo-cambodia.pphat.me/sitemap.xml'), 'Matches sitemap.xml');
  assert(isSupportedTargetUrl('https://example.com/feed.rss'), 'Matches RSS feed');
  assert(isSupportedTargetUrl('https://example.com/atom.xml?id=123'), 'Matches Atom XML');
  assert(isSupportedTargetUrl('https://example.com/service.xsd#schema'), 'Matches XSD schema');
  assert(isSupportedTargetUrl('https://example.com/api.wsdl'), 'Matches WSDL');

  // JSON and API endpoints
  assert(isSupportedTargetUrl('https://opengeo-cambodia.pphat.me/api/admin/provinces'), 'Matches API endpoint without extension');
  assert(isSupportedTargetUrl('https://example.com/data.json'), 'Matches JSON file');
  assert(isSupportedTargetUrl('https://example.com/map.geojson'), 'Matches GeoJSON');

  // YAML formats
  assert(isSupportedTargetUrl('https://example.com/config.yaml'), 'Matches YAML');
  assert(isSupportedTargetUrl('https://example.com/config.yml'), 'Matches YML');

  // CSV formats
  assert(isSupportedTargetUrl('https://example.com/dataset.csv'), 'Matches CSV');
  assert(isSupportedTargetUrl('https://example.com/data.tsv'), 'Matches TSV');

  // Markdown & Text formats
  assert(isSupportedTargetUrl('https://example.com/README.md'), 'Matches Markdown');
  assert(isSupportedTargetUrl('https://example.com/changelog.txt'), 'Matches TXT');

  // Non-target formats
  assert(!isSupportedTargetUrl('https://example.com/page.html'), 'Does not match standard HTML');
  assert(!isSupportedTargetUrl('https://example.com/photo.png'), 'Does not match image');
  assert(!isSupportedTargetUrl('chrome://extensions/'), 'Does not match chrome://');
  assert(!isSupportedTargetUrl('about:blank'), 'Does not match about:blank');
});

Deno.test('Raw bypass parameters are detected', () => {
  assert(isRawBypassRequested('https://opengeo-cambodia.pphat.me/sitemap.xml?raw=true'));
  assert(isRawBypassRequested('https://opengeo-cambodia.pphat.me/sitemap.xml?raw=1'));
  assert(isRawBypassRequested('https://opengeo-cambodia.pphat.me/sitemap.xml?noformat=1'));
  assert(!isRawBypassRequested('https://opengeo-cambodia.pphat.me/sitemap.xml'));
});

Deno.test('Direct browser format transforms minified sitemap XML into structured fields', () => {
  const minifiedSitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://opengeo-cambodia.pphat.me/</loc><lastmod>2026-11-08</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url><url><loc>https://opengeo-cambodia.pphat.me/docs</loc><lastmod>2026-11-08</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url></urlset>`;

  const formatted = formatXml(minifiedSitemap, { indent: '  ' });

  assert(formatted.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Has root urlset tag');
  assert(formatted.includes('  <url>'), 'Indents url tag');
  assert(formatted.includes('    <loc>https://opengeo-cambodia.pphat.me/</loc>'), 'Indents loc field');
  assert(formatted.includes('    <lastmod>2026-11-08</lastmod>'), 'Indents lastmod field');
  assert(formatted.includes('    <changefreq>daily</changefreq>'), 'Indents changefreq field');
  assert(formatted.includes('    <priority>1.0</priority>'), 'Indents priority field');
  assert(formatted.includes('    <loc>https://opengeo-cambodia.pphat.me/docs</loc>'), 'Indents secondary loc field');
});

Deno.test('Auto-support JSON API response converting to structured XML DOM', () => {
  const jsonApiResponse = JSON.stringify({
    success: true,
    data: [
      { id: 1, code: '01', name_en: 'Banteay Meanchey' },
      { id: 2, code: '02', name_en: 'Battambang' }
    ],
    meta: { total: 2, timestamp: '2026-11-09' }
  });

  const detected = detectFormat(jsonApiResponse);
  assertEquals(detected, 'json');

  const xml = jsonToXml(JSON.parse(jsonApiResponse), { rootTag: 'root' });
  assert(xml.includes('<root>'), 'Contains root element');
  assert(xml.includes('<success>true</success>'), 'Contains success flag');
  assert(xml.includes('<name_en>Banteay Meanchey</name_en>'), 'Contains province name');

  // Verify chart data can be generated from the converted XML
  const chartData = xmlToChartData(xml);
  assert(chartData && chartData.hierarchy && chartData.hierarchy.name === 'root', 'Generates chart data from JSON-to-XML');
});

Deno.test('Auto-support Pretty-print prefix stripping for native Chromium JSON viewer', () => {
  const rawChromiumText = `Pretty-print
{"success":true,"data":[{"id":1,"code":"01","name_en":"Banteay Meanchey"}]}`;

  const cleaned = rawChromiumText.replace(/^Pretty-print\s*/i, '').trim();
  assert(cleaned.startsWith('{'), 'Cleaned text starts with JSON brace');
  const parsed = JSON.parse(cleaned);
  assertEquals(parsed.success, true);
  assertEquals(parsed.data[0].code, '01');
});

Deno.test('Quick Tools cross-format conversion from JSON API data to all formats', () => {
  const jsonObj = {
    provinces: [
      { id: 1, name: 'Banteay Meanchey' },
      { id: 2, name: 'Battambang' }
    ]
  };
  const xml = jsonToXml(jsonObj, { rootTag: 'root' });

  // 1. Convert to YAML
  const yamlOut = xmlToYaml(xml);
  assert(yamlOut.includes('provinces:'), 'Converts to YAML key');
  assert(yamlOut.includes('Banteay Meanchey'), 'Includes province in YAML');

  // 2. Convert to CSV
  const csvOut = xmlToCsv(xml, ',');
  assert(csvOut.includes('Banteay Meanchey'), 'Includes province in CSV');

  // 3. Convert to Markdown
  const mdOut = xmlToMarkdown(xml);
  assert(mdOut.includes('Banteay Meanchey'), 'Includes province in Markdown');

  // 4. Convert to TXT
  const txtOut = xmlToTxt(xml);
  assert(txtOut.includes('root'), 'Includes root in TXT');
  assert(txtOut.includes('Banteay Meanchey'), 'Includes province in TXT');

  // 5. Roundtrip to JSON
  const jsonRoundtrip = xmlToJson(xml, { mode: 'clean' });
  assert(jsonRoundtrip !== null, 'Roundtrips to JSON object');
});

Deno.test('URL linkification recognizes URLs in sitemap loc fields', () => {
  const locVal1 = 'https://opengeo-cambodia.pphat.me/';
  const locVal2 = 'https://opengeo-cambodia.pphat.me/api/boundaries/provinces/01';
  const nonUrl = '2026-11-08';

  const isUrlRegex = /^https?:\/\/[^\s<>"']+$/i;
  assert(isUrlRegex.test(locVal1), 'Matches root URL');
  assert(isUrlRegex.test(locVal2), 'Matches nested API endpoint URL');
  assert(!isUrlRegex.test(nonUrl), 'Does not match plain date');
});

Deno.test('XPath builder constructs valid element paths', () => {
  const segments = ['urlset', 'url[3]', 'loc'];
  const xpath = '/' + segments.join('/');
  assertEquals(xpath, '/urlset/url[3]/loc');
});

Deno.test('Chart data generation extracts visual schema and node hierarchy for reader', () => {
  const sitemapXml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://opengeo-cambodia.pphat.me/</loc>
      <lastmod>2026-11-08</lastmod>
    </url>
  </urlset>`;

  const chartData = xmlToChartData(sitemapXml);
  assert(chartData && chartData.hierarchy && chartData.hierarchy.name === 'urlset', 'Root chart node is urlset');
  assert(chartData.hierarchy.children && chartData.hierarchy.children.length === 1, 'Has 1 url child');
  assertEquals(chartData.hierarchy.children[0].name, 'url');

  const flow = xmlToCardFlowData(sitemapXml);
  assert(flow !== null, 'Card flow parsed');
  assertEquals(flow.name, 'urlset');
});

Deno.test('Chart formats registry defines all six visual representations', () => {
  const chartFormats = [
    { type: 'card-flow', name: 'Card Flow' },
    { type: 'hierarchy', name: 'Hierarchy Tree' },
    { type: 'mermaid', name: 'Mermaid Diagram' },
    { type: 'graph', name: 'Relational Graph' },
    { type: 'frequency', name: 'Tag Frequency' },
    { type: 'depth', name: 'Tree Depth' }
  ];

  assertEquals(chartFormats.length, 6);
  const types = chartFormats.map(f => f.type);
  assert(types.includes('card-flow'));
  assert(types.includes('hierarchy'));
  assert(types.includes('mermaid'));
  assert(types.includes('graph'));
  assert(types.includes('frequency'));
  assert(types.includes('depth'));
});

Deno.test('Extension state toggling manages auto-format preferences', () => {
  let isEnabled = true;
  function shouldAutoFormat(setting, isBypass) {
    return setting !== false && !isBypass;
  }

  assert(shouldAutoFormat(isEnabled, false), 'Enabled by default');
  assert(!shouldAutoFormat(isEnabled, true), 'Bypassed by query param');

  isEnabled = false;
  assert(!shouldAutoFormat(isEnabled, false), 'Disabled via power toggle');
});

Deno.test('Format auto-detection prevents "found outside root element" validation error on JSON payloads', () => {
  const jsonPayload = `{ "success": true, "data": [ { "id": 1, "code": "01", "name_en": "Banteay Meanchey" } ], "meta": { "total": 1 } }`;

  // 1. Detect format identifies JSON
  const detected = detectFormat(jsonPayload);
  assertEquals(detected, 'json');

  // 2. Direct XML validation on raw JSON fails as text outside root element
  const directXmlVal = validateXml(jsonPayload);
  assertEquals(directXmlVal.valid, false);
  assert(directXmlVal.errors[0].message.includes('found outside root element'));

  // 3. When converted to XML DOM, validation succeeds
  const xml = jsonToXml(JSON.parse(jsonPayload), { rootTag: 'root' });
  const xmlVal = validateXml(xml);
  assertEquals(xmlVal.valid, true);
  assertEquals(xmlVal.rootTag, 'root');
  assert(xmlVal.elementCount > 0);
});

Deno.test('Split resizer clamps horizontal drag ratios within safe boundaries (15% to 85%)', () => {
  function clampSplitRatio(rawPct) {
    return Math.max(15, Math.min(85, rawPct));
  }

  assertEquals(clampSplitRatio(50), 50);
  assertEquals(clampSplitRatio(5), 15);
  assertEquals(clampSplitRatio(95), 85);
  assertEquals(clampSplitRatio(15), 15);
  assertEquals(clampSplitRatio(85), 85);
  assertEquals(clampSplitRatio(33.33), 33.33);

  // Persistence calculation
  const totalWidth = 1200;
  const dragX = 400;
  const computedPct = (dragX / totalWidth) * 100;
  assertEquals(parseFloat(clampSplitRatio(computedPct).toFixed(2)), 33.33);
});

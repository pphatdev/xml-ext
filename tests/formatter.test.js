import { assert, assertEquals } from './assert.js';
import { formatXml, formatXmlAsEntities, decodeXmlEntities } from '../src/core/formatter.js';

Deno.test('Format minified XML with proper indentation', () => {
  const minified = `<root><child id="1"><subchild>Content</subchild></child><empty/></root>`;
  const formatted = formatXml(minified, { indent: '  ' });

  assert(formatted.includes('<root>'), 'Root tag exists');
  assert(formatted.includes('  <child id="1">'), 'Child has 2 spaces indent');
  assert(formatted.includes('    <subchild>Content</subchild>'), 'Subchild has 4 spaces indent');
  assert(formatted.includes('  <empty/>'), 'Empty tag preserved with indent');
});

Deno.test('Format preserves declaration and comments', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><root><!-- Comment --><item>Val</item></root>`;
  const formatted = formatXml(xml, { indent: '  ', preserveComments: true });

  assert(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Declaration should be at top');
  assert(formatted.includes('<!-- Comment -->'), 'Comment preserved');
});

Deno.test('Format with entities avoids double-escaping and handles HTML entities', () => {
  const xml = `<doc title="AT&amp;T &copy; 2026"><text>A &amp; B &lt; C &copy;</text></doc>`;
  const formatted = formatXml(xml);

  assert(!formatted.includes('&amp;amp;'), 'Should not double-escape &amp;');
  assert(formatted.includes('&amp;'), 'Should preserve &amp;');
  assert(formatted.includes('&lt;'), 'Should preserve &lt;');
  assert(formatted.includes('©'), 'Should decode HTML entity &copy; cleanly without double-escaping');

  const numeric = formatXmlAsEntities(xml, 'numeric');
  assert(numeric.includes('&#169;'), 'Numeric mode should format as &#169;');
});

Deno.test('Format as numeric entities encodes non-ASCII and symbols', () => {
  const xml = `<book><title>Euro Price: €100 — "Sale"</title></book>`;
  const formatted = formatXmlAsEntities(xml, 'numeric');

  assert(formatted.includes('&#8364;'), 'Euro symbol should be numeric entity &#8364;');
  assert(formatted.includes('&#8212;'), 'Em-dash should be numeric entity &#8212;');
});

Deno.test('Format as hex entities encodes non-ASCII', () => {
  const xml = `<book><title>Euro Price: €100</title></book>`;
  const formatted = formatXmlAsEntities(xml, 'hex');

  assert(formatted.includes('&#x20AC;'), 'Euro symbol should be hex entity &#x20AC;');
});

Deno.test('Decode XML entities converts back to UTF-8 characters', () => {
  const xml = `<book><title>Euro: &#8364;100 &amp; &#169; 2026</title></book>`;
  const decoded = decodeXmlEntities(xml);

  assert(decoded.includes('Euro: €100'), 'Numeric entity should be decoded to €');
  assert(decoded.includes('© 2026'), 'Numeric entity should be decoded to ©');
  assert(decoded.includes('&amp;'), 'Syntax &amp; should remain safely escaped');
});


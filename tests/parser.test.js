import { assert, assertEquals } from './assert.js';
import { parseXml, decodeEntities, encodeEntities } from '../src/core/parser.js';

Deno.test('Entities encoding and decoding', () => {
  const text = 'Rock & Roll <music> "quotes"';
  const encoded = encodeEntities(text, { quote: true });
  assertEquals(encoded, 'Rock &amp; Roll &lt;music&gt; &quot;quotes&quot;');
  const decoded = decodeEntities(encoded);
  assertEquals(decoded, text);
});

Deno.test('Entities numeric and hex encoding and HTML entity decoding', () => {
  const text = 'Price: €100 © 2026';
  const numeric = encodeEntities(text, { mode: 'numeric' });
  assert(numeric.includes('&#8364;'));
  assert(numeric.includes('&#169;'));

  const hex = encodeEntities(text, { mode: 'hex' });
  assert(hex.includes('&#x20AC;'));
  assert(hex.includes('&#xA9;'));

  const decodedHtml = decodeEntities('&copy; 2026 &euro; &trade; &#160;');
  assertEquals(decodedHtml, '© 2026 € ™ \u00A0');
});

Deno.test('Parse simple XML document', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root id="main" enabled="true">
  <title>Hello World</title>
  <description>Sample description</description>
  <empty/>
</root>`;

  const result = parseXml(xml);
  assert(result.root !== null, 'Root should not be null');
  assertEquals(result.root.name, 'root');
  assertEquals(result.root.attributes.id, 'main');
  assertEquals(result.root.attributes.enabled, 'true');
  assertEquals(result.declaration.attributes.version, '1.0');
  assertEquals(result.declaration.attributes.encoding, 'UTF-8');
});

Deno.test('Parse CDATA and comments', () => {
  const xml = `<root>
  <!-- This is a comment -->
  <![CDATA[Some <raw> data & entities]]>
</root>`;

  const result = parseXml(xml);
  const comment = result.root.children.find(c => c.type === 'comment');
  const cdata = result.root.children.find(c => c.type === 'cdata');

  assert(comment !== undefined, 'Comment should be parsed');
  assertEquals(comment.text, ' This is a comment ');

  assert(cdata !== undefined, 'CDATA should be parsed');
  assertEquals(cdata.text, 'Some <raw> data & entities');
});

Deno.test('Parse tolerant mode captures errors', () => {
  const xml = `<root><child>unclosed</root>`;
  const result = parseXml(xml, { tolerant: true });
  assert(result.errors.length > 0, 'Should have errors in tolerant mode');
});


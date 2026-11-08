import { assert, assertEquals } from './assert.js';
import { minifyXml, getMinifyStats } from '../src/core/minifier.js';

Deno.test('Minify XML collapses whitespace and comments', () => {
  const xml = `<?xml version="1.0"?>
  <!-- Comment to strip -->
  <root>
    <item id="1">   Hello World   </item>
    <empty></empty>
  </root>`;

  const minified = minifyXml(xml, { removeComments: true, selfCloseEmpty: true });
  assert(!minified.includes('<!-- Comment to strip -->'), 'Comments should be removed');
  assert(minified.includes('<empty/>'), 'Empty tags should be self-closed');

  const stats = getMinifyStats(xml, minified);
  assert(stats.savedBytes > 0, 'Bytes should be saved');
  assert(stats.savingsPercent > 0, 'Savings percentage should be > 0');
});

Deno.test('Minify preserves CDATA', () => {
  const xml = `<root><data><![CDATA[   Spaces   Kept   ]]></data></root>`;
  const minified = minifyXml(xml);
  assert(minified.includes('<![CDATA[   Spaces   Kept   ]]>'), 'CDATA contents should be preserved');
});

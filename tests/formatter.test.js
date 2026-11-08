import { assert, assertEquals } from './assert.js';
import { formatXml } from '../src/core/formatter.js';

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


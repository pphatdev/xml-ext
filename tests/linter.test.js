import { assert, assertEquals } from './assert.js';
import { lintXml } from '../src/core/linter.js';

Deno.test('Lint clean XML with no issues', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <item id="1">Value</item>
</root>`;

  const result = lintXml(xml);
  assertEquals(result.stats.errors, 0);
});

Deno.test('Lint empty element recommendation', () => {
  const xml = `<root><empty></empty></root>`;
  const result = lintXml(xml, { preferSelfClosing: true });
  const emptyIssue = result.issues.find(i => i.rule === 'prefer-self-closing');
  assert(emptyIssue !== undefined, 'Should detect non-self-closed empty tag');
});

Deno.test('Lint unescaped ampersand error', () => {
  const xml = `<root><company>Ben & Jerry</company></root>`;
  const result = lintXml(xml);
  const ampIssue = result.issues.find(i => i.rule === 'unescaped-ampersand');
  assert(ampIssue !== undefined, 'Should detect unescaped ampersand');
  assertEquals(ampIssue.severity, 'error');
});

Deno.test('Lint declaration not on first line', () => {
  const xml = `
  <?xml version="1.0"?>
<root/>`;
  const result = lintXml(xml);
  const declIssue = result.issues.find(i => i.rule === 'xml-decl-first-line');
  assert(declIssue !== undefined, 'Should detect XML decl not on line 1 col 1');
});

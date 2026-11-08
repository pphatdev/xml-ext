import { assert, assertEquals } from './assert.js';
import { validateXml } from '../src/core/validator.js';

Deno.test('Validate valid XML document', () => {
  const xml = `<store name="TechShop">
  <item id="1">Laptop</item>
  <item id="2">Keyboard</item>
</store>`;

  const result = validateXml(xml);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
  assertEquals(result.rootTag, 'store');
  assertEquals(result.elementCount, 3);
});

Deno.test('Validate empty input', () => {
  const result = validateXml('');
  assertEquals(result.valid, false);
  assert(result.errors.length > 0);
});

Deno.test('Validate mismatched tags', () => {
  const xml = `<root><tag>content</wrong></root>`;
  const result = validateXml(xml);
  assertEquals(result.valid, false);
  assert(result.errors.length > 0);
});

Deno.test('Validate unescaped ampersands gives warning', () => {
  const xml = `<root><tag>AT&T</tag></root>`;
  const result = validateXml(xml);
  assert(result.warnings.length > 0);
});


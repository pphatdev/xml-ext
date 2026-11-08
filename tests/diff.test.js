import { assert, assertEquals } from './assert.js';
import { diffXml } from '../src/core/diff.js';

Deno.test('Diff detects identical XML documents', () => {
  const xmlA = `<root><item id="1">Text</item></root>`;
  const xmlB = `<root><item id="1">Text</item></root>`;
  const result = diffXml(xmlA, xmlB);
  assertEquals(result.identical, true);
  assertEquals(result.totalDiffs, 0);
});

Deno.test('Diff detects added and removed elements', () => {
  const xmlA = `<store><item id="1">A</item></store>`;
  const xmlB = `<store><item id="1">A</item><item id="2">B</item></store>`;
  const result = diffXml(xmlA, xmlB);
  assertEquals(result.identical, false);
  assert(result.counts.added > 0, 'Should detect added element');
});

Deno.test('Diff detects attribute and text changes', () => {
  const xmlA = `<user role="guest">Alice</user>`;
  const xmlB = `<user role="admin">Bob</user>`;
  const result = diffXml(xmlA, xmlB);
  assertEquals(result.identical, false);
  assert(result.counts.changed >= 2, 'Should detect attribute change and text change');
});

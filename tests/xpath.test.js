import { assert, assertEquals } from './assert.js';
import { evaluateXPath } from '../src/core/xpath.js';

Deno.test('XPath evaluate all elements with //tag', () => {
  const xml = `<store><item id="1">A</item><item id="2">B</item></store>`;
  const res = evaluateXPath(xml, '//item');
  assertEquals(res.count, 2);
  assertEquals(res.results[0].name, 'item');
});

Deno.test('XPath evaluate count function', () => {
  const xml = `<catalog><book/><book/><book/></catalog>`;
  const res = evaluateXPath(xml, 'count(//book)');
  assertEquals(res.type, 'number');
  assertEquals(res.results[0], 3);
});

Deno.test('XPath evaluate attribute filter', () => {
  const xml = `<users><user role="admin">Alice</user><user role="guest">Bob</user></users>`;
  const res = evaluateXPath(xml, '//user[@role="admin"]');
  assertEquals(res.count, 1);
  assertEquals(res.results[0].text, 'Alice');
});

Deno.test('XPath evaluate text() selector', () => {
  const xml = `<root><title>XML Pro</title></root>`;
  const res = evaluateXPath(xml, '//title/text()');
  assertEquals(res.count, 1);
  assertEquals(res.results[0].value, 'XML Pro');
});


import { assert, assertEquals } from './assert.js';
import { analyzeXml } from '../src/core/analyzer.js';

Deno.test('Analyze XML metrics and distribution', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<catalog xmlns="http://example.com/ns">
  <book id="bk101" genre="Computer">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>44.95</price>
  </book>
  <book id="bk102" genre="Fantasy">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
  </book>
</catalog>`;

  const result = analyzeXml(xml);

  assertEquals(result.general.rootTag, 'catalog');
  assertEquals(result.general.elementCount, 9); // catalog + 2 books + 2 authors + 2 titles + 2 prices
  assertEquals(result.general.uniqueElementsCount, 5); // catalog, book, author, title, price
  assertEquals(result.structure.maxDepth, 3); // catalog(1) -> book(2) -> author/title/price(3)
  assert(result.general.attributeCount >= 4, 'Should count id and genre attributes');
  assert(result.elementFrequency.length > 0, 'Element frequency populated');
  assertEquals(result.elementFrequency[0].tag, 'book'); // book or author/title/price tied
  assert(result.complexity.score > 0, 'Complexity score computed');
});


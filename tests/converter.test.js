import { assert, assertEquals } from './assert.js';
import {
  xmlToJson,
  jsonToXml,
  xmlToTree,
  xmlToChartData,
  xmlToTxt,
  xmlToCsv,
  xmlToYaml
} from '../src/core/converter.js';

Deno.test('XML to JSON conversion (clean mode)', () => {
  const xml = `<store name="MegaStore">
  <category id="electronics">
    <item>TV</item>
    <item>Radio</item>
  </category>
</store>`;

  const json = xmlToJson(xml);
  assert(json.store !== undefined);
  assertEquals(json.store['@name'], 'MegaStore');
  assert(Array.isArray(json.store.category.item));
  assertEquals(json.store.category.item.length, 2);
  assertEquals(json.store.category.item[0], 'TV');
  assertEquals(json.store.category.item[1], 'Radio');
});

Deno.test('JSON to XML roundtrip', () => {
  const obj = {
    book: {
      '@id': '101',
      title: 'JavaScript Mastery',
      price: 29.99
    }
  };

  const xml = jsonToXml(obj);
  assert(xml.includes('<book id="101">'));
  assert(xml.includes('<title>JavaScript Mastery</title>'));
  assert(xml.includes('<price>29.99</price>'));
});

Deno.test('XML to Tree structure', () => {
  const xml = `<root id="1"><child name="sub">hello</child></root>`;
  const tree = xmlToTree(xml);

  assert(tree !== null);
  assertEquals(tree.name, 'root');
  assertEquals(tree.attributes.id, '1');
  assertEquals(tree.children.length, 1);
  assertEquals(tree.children[0].name, 'child');
  assertEquals(tree.children[0].inlineText, 'hello');
  assertEquals(tree.children[0].xpath, '/root/child');
});

Deno.test('XML to Chart Data', () => {
  const xml = `<company>
  <dept name="Engineering">
    <team>Frontend</team>
    <team>Backend</team>
  </dept>
</company>`;

  const chartData = xmlToChartData(xml);
  assert(chartData.tagFrequency.length > 0);
  assert(chartData.hierarchy !== null);
  assertEquals(chartData.hierarchy.name, 'company');
  assertEquals(chartData.maxDepth, 3);
});

Deno.test('XML to Plain Text outline', () => {
  const xml = `<note to="Tove" from="Jani"><heading>Reminder</heading><body>Don't forget me!</body></note>`;
  const txt = xmlToTxt(xml);
  assert(txt.includes('note [to="Tove" from="Jani"]'));
  assert(txt.includes('heading: Reminder'));
  assert(txt.includes("body: Don't forget me!"));
});

Deno.test('XML to CSV tabular extraction', () => {
  const xml = `<catalog>
  <book id="1" genre="fiction"><title>Dune</title><author>Frank Herbert</author></book>
  <book id="2" genre="sci-fi"><title>Neuromancer</title><author>William Gibson</author></book>
</catalog>`;

  const csv = xmlToCsv(xml);
  assert(csv.includes('@id') || csv.includes('title'));
  assert(csv.includes('Dune'));
  assert(csv.includes('Neuromancer'));
});

Deno.test('XML to YAML conversion', () => {
  const xml = `<config><app><name>SuperApp</name><port>8080</port></app></config>`;
  const yaml = xmlToYaml(xml);
  assert(yaml.includes('config:'));
  assert(yaml.includes('app:'));
  assert(yaml.includes('name: SuperApp'));
  assert(yaml.includes('port: 8080'));
});

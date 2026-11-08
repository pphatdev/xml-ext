import { assert, assertEquals } from './assert.js';
import {
  xmlToJson,
  jsonToXml,
  xmlToTree,
  xmlToChartData,
  xmlToCardFlowData,
  xmlToTxt,
  xmlToCsv,
  xmlToYaml,
  csvToXml,
  yamlToJson,
  yamlToXml,
  txtToXml,
  xmlToToml,
  tomlToJson,
  tomlToXml,
  xmlToMarkdown,
  markdownToXml,
  detectFormat
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

Deno.test('XML to Card Flow Data schema extraction', () => {
  const xml = `<categories>
  <category id="1">
    <name>Electronics</name>
    <products>
      <product id="101"><name>Laptop</name><price>999.99</price></product>
      <product id="102"><name>Smartphone</name><price>599.99</price></product>
    </products>
  </category>
</categories>`;

  const flow = xmlToCardFlowData(xml);
  assert(flow !== null);
  assertEquals(flow.name, 'categories');
  assertEquals(flow.isPill, true);
  assertEquals(flow.lines[0].key, 'categories');
  assertEquals(flow.lines[0].value, '[1]');
  assertEquals(flow.children.length, 1);

  const cat = flow.children[0];
  assertEquals(cat.name, 'category');
  assertEquals(cat.lines.length, 3);
  assertEquals(cat.lines[0].key, 'id');
  assertEquals(cat.lines[0].value, '1');
  assertEquals(cat.lines[1].key, 'name');
  assertEquals(cat.lines[1].value, 'Electronics');
  assertEquals(cat.lines[2].key, 'products');
  assertEquals(cat.lines[2].value, '[2]');
  assertEquals(cat.children.length, 2);

  const prod1 = cat.children[0];
  assertEquals(prod1.name, 'product');
  assertEquals(prod1.lines[0].key, 'id');
  assertEquals(prod1.lines[0].value, '101');
  assertEquals(prod1.lines[1].key, 'name');
  assertEquals(prod1.lines[1].value, 'Laptop');
  assertEquals(prod1.lines[2].key, 'price');
  assertEquals(prod1.lines[2].value, '999.99');
  assertEquals(prod1.children.length, 0);
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

Deno.test('CSV to XML conversion', () => {
  const csv = `name,price,category\nLaptop,999.99,Electronics\nT-shirt,19.99,Clothing`;
  const xml = csvToXml(csv);
  assert(xml.includes('<records>'));
  assert(xml.includes('<name>Laptop</name>'));
  assert(xml.includes('<price>999.99</price>'));
  assert(xml.includes('<category>Clothing</category>'));
});

Deno.test('YAML to JSON and XML conversion', () => {
  const yaml = `project:\n  name: xml-ext\n  version: 1.0\n  tags:\n    - dev\n    - web`;
  const json = yamlToJson(yaml);
  assertEquals(json.project.name, 'xml-ext');
  assertEquals(json.project.version, 1.0);
  assertEquals(json.project.tags.length, 2);

  const xml = yamlToXml(yaml);
  assert(xml.includes('<project>'));
  assert(xml.includes('<name>xml-ext</name>'));
});

Deno.test('TXT to XML conversion', () => {
  const txt = `First line\nSecond line`;
  const xml = txtToXml(txt);
  assert(xml.includes('<document>'));
  assert(xml.includes('<line>First line</line>'));
  assert(xml.includes('<line>Second line</line>'));
});

Deno.test('Auto-detect data formats', () => {
  assertEquals(detectFormat('<root><test/></root>'), 'xml');
  assertEquals(detectFormat('{"active": true}'), 'json');
  assertEquals(detectFormat('[1, 2, 3]'), 'json');
  assertEquals(detectFormat('name,age\nAlice,30\nBob,25'), 'csv');
  assertEquals(detectFormat('title: Hello\nauthor: Antigravity'), 'yaml');
  assertEquals(detectFormat('[package]\nname = "my-crate"'), 'toml');
  assertEquals(detectFormat('# Project Overview\n\n- Item 1\n- Item 2'), 'markdown');
  assertEquals(detectFormat('Just plain unstructured sentences.'), 'txt');
});

Deno.test('XML to TOML conversion', () => {
  const xml = `<server><host>127.0.0.1</host><port>8000</port><enabled>true</enabled></server>`;
  const toml = xmlToToml(xml);
  assert(toml.includes('host = "127.0.0.1"'));
  assert(toml.includes('port = 8000'));
  assert(toml.includes('enabled = true'));

  const parsed = tomlToJson(toml);
  assertEquals(parsed.host, '127.0.0.1');
  assertEquals(parsed.port, 8000);
  assertEquals(parsed.enabled, true);

  const backXml = tomlToXml(toml, { rootTag: 'server' });
  assert(backXml.includes('<server>'));
  assert(backXml.includes('<host>127.0.0.1</host>'));
});

Deno.test('XML to Markdown and back conversion', () => {
  const xml = `<catalog><book><title>Dune</title><author>Frank Herbert</author></book><book><title>Neuromancer</title><author>William Gibson</author></book></catalog>`;
  const md = xmlToMarkdown(xml);
  assert(md.includes('| title | author |') || md.includes('title') || md.includes('Dune'));

  const backXml = markdownToXml(md);
  assert(backXml.includes('<document>') || backXml.includes('Dune'));
});

Deno.test('Multi-format roundtrips: XML to YAML and back', () => {
  const xml = `<service><name>AuthAPI</name><port>3000</port></service>`;
  const yaml = xmlToYaml(xml);
  const backToXml = yamlToXml(yaml);
  assert(backToXml.includes('<service>'));
  assert(backToXml.includes('<name>AuthAPI</name>'));
  assert(backToXml.includes('<port>3000</port>'));
});

Deno.test('Multi-format roundtrips: CSV to XML and back', () => {
  const csv = `product,price\nWidget,12.5\nGadget,45`;
  const xml = csvToXml(csv);
  const backToCsv = xmlToCsv(xml);
  assert(backToCsv.includes('product'));
  assert(backToCsv.includes('price'));
  assert(backToCsv.includes('Widget'));
  assert(backToCsv.includes('12.5'));
});

Deno.test('Multi-format roundtrips: TXT to XML and back', () => {
  const txt = `Intro paragraph\nSecond line details`;
  const xml = txtToXml(txt);
  const backToTxt = xmlToTxt(xml);
  assert(backToTxt.includes('Intro paragraph'));
  assert(backToTxt.includes('Second line details'));
});


import { assert, assertEquals } from './assert.js';
import { parseMarkdown } from '../src/core/markdown.js';

Deno.test('Parse markdown headings and list', () => {
  const md = `# Title
## Subtitle

- Item 1
- Item 2
`;
  const result = parseMarkdown(md);
  assert(result.html.includes('<h1 id="title">Title</h1>'));
  assert(result.html.includes('<h2 id="subtitle">Subtitle</h2>'));
  assert(result.html.includes('<ul>'));
  assert(result.html.includes('<li>Item 1</li>'));
  assertEquals(result.headings.length, 2);
  assertEquals(result.headings[0].text, 'Title');
});

Deno.test('Parse markdown code blocks', () => {
  const md = `\`\`\`xml
<root>
  <item>Value</item>
</root>
\`\`\``;

  const result = parseMarkdown(md);
  assert(result.html.includes('class="code-block-wrap"'));
  assert(result.html.includes('&lt;root&gt;'));
});

Deno.test('Parse markdown tables', () => {
  const md = `| Header A | Header B |
| --- | --- |
| Val 1 | Val 2 |`;

  const result = parseMarkdown(md);
  assert(result.html.includes('<table class="docs-table">'));
  assert(result.html.includes('<th>Header A</th>'));
  assert(result.html.includes('<td>Val 1</td>'));
});

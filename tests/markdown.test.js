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
<root id="1">
  <item>Value</item>
</root>
\`\`\``;

  const result = parseMarkdown(md);
  assert(result.html.includes('class="code-block-wrap"'));
  assert(result.html.includes('class="code-window-controls"'));
  assert(result.html.includes('class="code-dot dot-red"'));
  assert(result.html.includes('class="code-line-numbers"'));
  assert(result.html.includes('&lt;root'));
  assert(result.html.includes('class="token-tag"'));
  assert(result.html.includes('class="token-attr"'));
});

Deno.test('Parse markdown code blocks for JSON and Bash', () => {
  const jsonMd = `\`\`\`json
{
  "name": "xml-ext",
  "active": true
}
\`\`\``;
  const jsonResult = parseMarkdown(jsonMd);
  assert(jsonResult.html.includes('class="token-property"'));
  assert(jsonResult.html.includes('class="token-boolean"'));

  const bashMd = `\`\`\`bash
# Run server
deno task dev --port 3000
\`\`\``;
  const bashResult = parseMarkdown(bashMd);
  assert(bashResult.html.includes('class="token-comment"'));
  assert(bashResult.html.includes('class="token-command"'));
  assert(bashResult.html.includes('class="token-flag"'));
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

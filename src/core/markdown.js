/**
 * Lightweight Client-Side Markdown Parser and HTML Renderer
 * Universal ES Module with zero external dependencies.
 */

export function parseMarkdown(mdString) {
  if (!mdString) return { html: '', headings: [] };

  const headings = [];
  const lines = mdString.split('\n');
  const output = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inList = false;
  let listType = 'ul'; // 'ul' | 'ol'
  let inTable = false;
  let tableHeaderParsed = false;
  let inBlockquote = false;
  let blockquoteBuffer = [];

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function flushList() {
    if (inList) {
      output.push(`</${listType}>`);
      inList = false;
    }
  }

  function flushBlockquote() {
    if (inBlockquote) {
      output.push(`<blockquote>${blockquoteBuffer.map(renderInline).join('<br/>')}</blockquote>`);
      inBlockquote = false;
      blockquoteBuffer = [];
    }
  }

  function flushTable() {
    if (inTable) {
      output.push('</tbody></table></div>');
      inTable = false;
      tableHeaderParsed = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // 1. Code Blocks (```)
    if (line.startsWith('```')) {
      flushList();
      flushBlockquote();
      flushTable();

      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const codeContent = codeBuffer.join('\n');
        output.push(`
          <div class="code-block-wrap">
            <div class="code-block-header">
              <span class="code-lang">${escapeHtml(codeLang || 'text')}</span>
              <button type="button" class="btn-copy-code" title="Copy code" data-code="${escapeHtml(codeContent)}">
                <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                </svg>
                Copy
              </button>
            </div>
            <pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeContent)}</code></pre>
          </div>
        `);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // 2. Headings (# to ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushBlockquote();
      flushTable();

      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      headings.push({ text, id, level });

      output.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      continue;
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      flushBlockquote();
      flushTable();
      output.push('<hr/>');
      continue;
    }

    // 4. Blockquotes (> ...)
    if (line.startsWith('>')) {
      flushList();
      flushTable();
      inBlockquote = true;
      blockquoteBuffer.push(line.replace(/^>\s?/, ''));
      continue;
    } else {
      flushBlockquote();
    }

    // 5. Tables (| col | col |)
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());

      // Check if separator line (|---|---|)
      const isSeparator = cells.every(c => /^:?-+:?$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaderParsed = true;
        output.push('<div class="table-responsive"><table class="docs-table"><thead><tr>');
        for (const cell of cells) {
          output.push(`<th>${renderInline(cell)}</th>`);
        }
        output.push('</tr></thead><tbody>');
      } else {
        output.push('<tr>');
        for (const cell of cells) {
          output.push(`<td>${renderInline(cell)}</td>`);
        }
        output.push('</tr>');
      }
      continue;
    } else {
      flushTable();
    }

    // 6. Unordered Lists (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      flushTable();
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
        output.push('<ul>');
      }
      output.push(`<li>${renderInline(ulMatch[2])}</li>`);
      continue;
    }

    // 7. Ordered Lists (1. 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      flushTable();
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
        output.push('<ol>');
      }
      output.push(`<li>${renderInline(olMatch[2])}</li>`);
      continue;
    }

    flushList();

    // 8. Empty lines
    if (!line.trim()) {
      continue;
    }

    // 9. Paragraph
    output.push(`<p>${renderInline(line)}</p>`);
  }

  flushList();
  flushBlockquote();
  flushTable();

  return {
    html: output.join('\n'),
    headings
  };
}

export function renderInline(text) {
  if (!text) return '';

  let res = escapeHtml(text);

  // Inline Code `code`
  res = res.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold **text**
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *text* or _text_
  res = res.replace(/(^|[^\*])\*([^*]+)\*/g, '$1<em>$2</em>');

  // Links [text](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="docs-link" target="_blank" rel="noopener">$1</a>');

  return res;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

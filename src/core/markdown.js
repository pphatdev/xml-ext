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
        const linesCount = Math.max(1, codeBuffer.length);
        const lineNumbersHtml = Array.from({ length: linesCount }, (_, idx) => `<span>${idx + 1}</span>`).join('');
        const highlighted = highlightCode(codeContent, codeLang);

        output.push(`
          <div class="code-block-wrap">
            <div class="code-block-header">
              <div class="code-header-left">
                <div class="code-window-controls" aria-hidden="true">
                  <span class="code-dot dot-red"></span>
                  <span class="code-dot dot-yellow"></span>
                  <span class="code-dot dot-green"></span>
                </div>
                <div class="code-header-badge">
                  <span class="code-lang">${escapeHtml(codeLang || 'text')}</span>
                  <span class="code-line-count">${linesCount} ${linesCount === 1 ? 'line' : 'lines'}</span>
                </div>
              </div>
              <button type="button" class="btn-copy-code" title="Copy code" data-code="${escapeHtml(codeContent)}">
                <svg class="icon-sm icon-copy" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                </svg>
                <svg class="icon-sm icon-check hidden" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span class="copy-label">Copy</span>
              </button>
            </div>
            <div class="code-body-wrapper">
              <div class="code-line-numbers" aria-hidden="true">${lineNumbersHtml}</div>
              <pre><code class="language-${escapeHtml(codeLang || 'text')}">${highlighted}</code></pre>
            </div>
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

/**
 * Universal Syntax Highlighter for Blog Code Themes
 * Supports XML/HTML/SVG, JSON, Bash/Shell, JavaScript/TypeScript, and YAML.
 */
export function highlightCode(code, lang = '') {
  if (!code) return '';
  const l = (lang || '').toLowerCase().trim();

  let effectiveLang = l;
  if (!effectiveLang || effectiveLang === 'text' || effectiveLang === 'plain') {
    const trimmed = code.trim();
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      effectiveLang = 'xml';
    } else if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      effectiveLang = 'json';
    } else if (trimmed.startsWith('$ ') || trimmed.startsWith('#!')) {
      effectiveLang = 'bash';
    }
  }

  if (effectiveLang === 'xml' || effectiveLang === 'html' || effectiveLang === 'svg' || effectiveLang === 'rss' || effectiveLang === 'atom' || effectiveLang === 'xhtml') {
    return highlightXml(code);
  }
  if (effectiveLang === 'json' || effectiveLang === 'json5' || effectiveLang === 'jsonc') {
    return highlightJson(code);
  }
  if (effectiveLang === 'bash' || effectiveLang === 'sh' || effectiveLang === 'shell' || effectiveLang === 'zsh') {
    return highlightBash(code);
  }
  if (effectiveLang === 'js' || effectiveLang === 'javascript' || effectiveLang === 'ts' || effectiveLang === 'typescript') {
    return highlightJs(code);
  }
  if (effectiveLang === 'yaml' || effectiveLang === 'yml') {
    return highlightYaml(code);
  }

  return escapeHtml(code);
}

function highlightXml(code) {
  const escaped = escapeHtml(code);

  const comments = [];
  let s = escaped.replace(/&lt;!--[\s\S]*?--&gt;/g, (m) => {
    comments.push(`<span class="token-comment">${m}</span>`);
    return `___XML_COMMENT_${comments.length - 1}___`;
  });

  const cdatas = [];
  s = s.replace(/&lt;!\[CDATA\[[\s\S]*?\]\]&gt;/g, (m) => {
    cdatas.push(`<span class="token-cdata">${m}</span>`);
    return `___XML_CDATA_${cdatas.length - 1}___`;
  });

  // XML declaration
  s = s.replace(/&lt;\?xml([\s\S]*?)\?&gt;/g, (_m, attrs) => {
    const highlightedAttrs = attrs.replace(/([a-zA-Z0-9_:\.-]+)(\s*=\s*)(&quot;.*?&quot;|&apos;.*?&apos;)/g,
      `<span class="token-attr">$1</span>$2<span class="token-string">$3</span>`
    );
    return `<span class="token-meta">&lt;?xml${highlightedAttrs}?&gt;</span>`;
  });

  // Tags
  s = s.replace(/&lt;(\/?[a-zA-Z0-9_:\.-]+)([\s\S]*?)(\/?)&gt;/g, (_match, tagName, attrs, selfClose) => {
    if (!attrs.trim()) {
      return `<span class="token-tag">&lt;${tagName}${selfClose ? '/' : ''}&gt;</span>`;
    }
    const highlightedAttrs = attrs.replace(/([a-zA-Z0-9_:\.-]+)(\s*=\s*)(&quot;.*?&quot;|&apos;.*?&apos;)|([a-zA-Z0-9_:\.-]+)/g, (_m, aName, eq, val, booleanAttr) => {
      if (booleanAttr) return `<span class="token-attr">${booleanAttr}</span>`;
      return `<span class="token-attr">${aName}</span>${eq}<span class="token-string">${val}</span>`;
    });
    return `<span class="token-tag">&lt;${tagName}</span>${highlightedAttrs}<span class="token-tag">${selfClose ? '/' : ''}&gt;</span>`;
  });

  s = s.replace(/___XML_CDATA_(\d+)___/g, (_, i) => cdatas[i]);
  s = s.replace(/___XML_COMMENT_(\d+)___/g, (_, i) => comments[i]);

  return s;
}

function highlightJson(code) {
  const escaped = escapeHtml(code);
  return escaped.replace(/(&quot;(?:(?!&quot;).)*&quot;(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?\b)/g, (match) => {
    if (match.endsWith(':')) {
      const key = match.slice(0, -1);
      return `<span class="token-property">${key}</span>:`;
    }
    if (match.startsWith('&quot;')) {
      return `<span class="token-string">${match}</span>`;
    }
    if (match === 'true' || match === 'false') {
      return `<span class="token-boolean">${match}</span>`;
    }
    if (match === 'null') {
      return `<span class="token-null">${match}</span>`;
    }
    return `<span class="token-number">${match}</span>`;
  });
}

function highlightBash(code) {
  return code.split('\n').map(line => {
    if (/^\s*#/.test(line)) {
      return `<span class="token-comment">${escapeHtml(line)}</span>`;
    }
    let l = escapeHtml(line);
    l = l.replace(/^(\s*[$#]\s+)/, `<span class="token-prompt">$1</span>`);
    l = l.replace(/(^|[\s>|&;])(\b(?:deno|python3|python|node|npm|npx|git|curl|wget|cat|echo|mkdir|cd|rm|cp|mv|chmod|tar|docker|bash|sh)\b)/g,
      `$1<span class="token-command">$2</span>`
    );
    l = l.replace(/(\s)(--?[a-zA-Z0-9_-]+)/g, `$1<span class="token-flag">$2</span>`);
    l = l.replace(/(&quot;.*?&quot;|&apos;.*?&apos;)/g, `<span class="token-string">$1</span>`);
    return l;
  }).join('\n');
}

function highlightJs(code) {
  return code.split('\n').map(line => {
    if (/^\s*\/\//.test(line)) {
      return `<span class="token-comment">${escapeHtml(line)}</span>`;
    }
    let l = escapeHtml(line);
    l = l.replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|new|try|catch|finally|async|await|default|typeof)\b/g,
      `<span class="token-keyword">$1</span>`
    );
    l = l.replace(/(&quot;.*?&quot;|&apos;.*?&apos;|`.*?`)/g, `<span class="token-string">$1</span>`);
    l = l.replace(/\b(\d+(?:\.\d+)?)\b/g, `<span class="token-number">$1</span>`);
    return l;
  }).join('\n');
}

function highlightYaml(code) {
  return code.split('\n').map(line => {
    if (/^\s*#/.test(line)) {
      return `<span class="token-comment">${escapeHtml(line)}</span>`;
    }
    let l = escapeHtml(line);
    l = l.replace(/^(\s*)([a-zA-Z0-9_-]+)(:)/, `$1<span class="token-property">$2</span>$3`);
    l = l.replace(/(&quot;.*?&quot;|&apos;.*?&apos;)/g, `<span class="token-string">$1</span>`);
    l = l.replace(/:\s*(true|false)\b/g, `: <span class="token-boolean">$1</span>`);
    l = l.replace(/:\s*(\d+(?:\.\d+)?)\b/g, `: <span class="token-number">$1</span>`);
    return l;
  }).join('\n');
}

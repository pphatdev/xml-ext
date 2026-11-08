/**
 * Core XML Parser and AST Builder
 * Works universally in Browser and Deno environments with zero external dependencies.
 */

export const XML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'"
};

export const REVERSE_XML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

export function decodeEntities(text) {
  if (!text) return '';
  return text
    .replace(/&(amp|lt|gt|quot|apos);/g, (match) => XML_ENTITIES[match] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function encodeEntities(text, options = {}) {
  if (!text) return '';
  const { quote = false } = options;
  let res = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  if (quote) {
    res = res.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  return res;
}

export class ParseError extends Error {
  constructor(message, line = 1, column = 1, index = 0) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
    this.index = index;
  }
}

/**
 * Parses XML string into an AST
 * @param {string} xmlString
 * @param {object} [options]
 * @returns {{ root: object, declaration: object|null, doctype: string|null, errors: Array }}
 */
export function parseXml(xmlString, options = {}) {
  const { tolerant = false } = options;
  const errors = [];
  let index = 0;
  let line = 1;
  let col = 1;
  const length = xmlString.length;

  let declaration = null;
  let doctype = null;
  let root = null;
  const stack = [];

  function updatePos(char) {
    if (char === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }

  function peek(count = 1) {
    return xmlString.slice(index, index + count);
  }

  function advance(count = 1) {
    for (let i = 0; i < count && index < length; i++) {
      updatePos(xmlString[index]);
      index++;
    }
  }

  function skipWhitespace() {
    while (index < length && /\s/.test(xmlString[index])) {
      advance(1);
    }
  }

  function reportError(msg, errLine = line, errCol = col, errIdx = index) {
    const err = new ParseError(msg, errLine, errCol, errIdx);
    errors.push(err);
    if (!tolerant) {
      throw err;
    }
  }

  function parseAttributes() {
    const attrs = {};
    while (index < length) {
      skipWhitespace();
      if (index >= length || peek(1) === '>' || peek(2) === '/>' || peek(2) === '?>') {
        break;
      }

      const attrLine = line;
      const attrCol = col;
      // Read attribute name
      const nameMatch = xmlString.slice(index).match(/^[a-zA-Z_:][a-zA-Z0-9.\-_:]*/);
      if (!nameMatch) {
        reportError(`Invalid attribute name starting with "${xmlString[index]}"`, line, col, index);
        advance(1);
        continue;
      }
      const attrName = nameMatch[0];
      advance(attrName.length);
      skipWhitespace();

      if (attrs.hasOwnProperty(attrName)) {
        reportError(`Duplicate attribute "${attrName}"`, attrLine, attrCol, index);
      }

      if (peek(1) !== '=') {
        reportError(`Expected "=" after attribute "${attrName}"`, line, col, index);
        attrs[attrName] = '';
        continue;
      }
      advance(1); // skip '='
      skipWhitespace();

      const quoteChar = peek(1);
      if (quoteChar !== '"' && quoteChar !== "'") {
        reportError(`Attribute "${attrName}" value must be enclosed in quotes`, line, col, index);
        // read until whitespace or tag close
        const unquotedMatch = xmlString.slice(index).match(/^[^\s>]+/);
        const val = unquotedMatch ? unquotedMatch[0] : '';
        advance(val.length);
        attrs[attrName] = decodeEntities(val);
        continue;
      }

      advance(1); // skip quote
      let valStart = index;
      let valStr = '';
      while (index < length && xmlString[index] !== quoteChar) {
        valStr += xmlString[index];
        advance(1);
      }

      if (index >= length) {
        reportError(`Unterminated attribute value for "${attrName}"`, line, col, index);
      } else {
        advance(1); // skip closing quote
      }

      attrs[attrName] = decodeEntities(valStr);
    }
    return attrs;
  }

  while (index < length) {
    if (peek(2) === '<?') {
      // XML declaration or processing instruction
      const startLine = line;
      const startCol = col;
      advance(2);
      const isDecl = xmlString.slice(index, index + 3).toLowerCase() === 'xml';
      const closeIdx = xmlString.indexOf('?>', index);
      if (closeIdx === -1) {
        reportError('Unclosed processing instruction or XML declaration', startLine, startCol, index);
        break;
      }
      const content = xmlString.slice(index, closeIdx);
      if (isDecl && !declaration) {
        // Parse declaration attributes
        const declAttrs = {};
        const vMatch = content.match(/version=["']([^"']+)["']/i);
        const eMatch = content.match(/encoding=["']([^"']+)["']/i);
        const sMatch = content.match(/standalone=["']([^"']+)["']/i);
        if (vMatch) declAttrs.version = vMatch[1];
        if (eMatch) declAttrs.encoding = eMatch[1];
        if (sMatch) declAttrs.standalone = sMatch[1];
        declaration = {
          type: 'declaration',
          attributes: declAttrs,
          raw: `<?${content}?>`,
          line: startLine,
          column: startCol
        };
      }
      advance(closeIdx - index + 2);
      continue;
    }

    if (peek(4) === '<!--') {
      // Comment
      const startLine = line;
      const startCol = col;
      advance(4);
      const closeIdx = xmlString.indexOf('-->', index);
      if (closeIdx === -1) {
        reportError('Unclosed XML comment', startLine, startCol, index);
        break;
      }
      const commentText = xmlString.slice(index, closeIdx);
      const commentNode = {
        type: 'comment',
        text: commentText,
        line: startLine,
        column: startCol
      };
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(commentNode);
      }
      advance(closeIdx - index + 3);
      continue;
    }

    if (peek(9).toUpperCase() === '<![CDATA[') {
      // CDATA
      const startLine = line;
      const startCol = col;
      advance(9);
      const closeIdx = xmlString.indexOf(']]>', index);
      if (closeIdx === -1) {
        reportError('Unclosed CDATA section', startLine, startCol, index);
        break;
      }
      const cdataText = xmlString.slice(index, closeIdx);
      const cdataNode = {
        type: 'cdata',
        text: cdataText,
        line: startLine,
        column: startCol
      };
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(cdataNode);
      } else {
        reportError('CDATA section found outside root element', startLine, startCol, index);
      }
      advance(closeIdx - index + 3);
      continue;
    }

    if (peek(9).toUpperCase() === '<!DOCTYPE') {
      // DOCTYPE
      const startLine = line;
      const startCol = col;
      advance(9);
      let depth = 1;
      let inQuote = false;
      let qChar = '';
      let dtContent = '';
      while (index < length) {
        const ch = xmlString[index];
        if (!inQuote && (ch === '"' || ch === "'")) {
          inQuote = true;
          qChar = ch;
        } else if (inQuote && ch === qChar) {
          inQuote = false;
        } else if (!inQuote && ch === '[') {
          depth++;
        } else if (!inQuote && ch === ']') {
          depth--;
        } else if (!inQuote && ch === '>') {
          depth--;
          if (depth === 0) {
            advance(1);
            break;
          }
        }
        dtContent += ch;
        advance(1);
      }
      doctype = dtContent.trim();
      continue;
    }

    if (peek(2) === '</') {
      // Closing tag
      const startLine = line;
      const startCol = col;
      advance(2);
      const closeMatch = xmlString.slice(index).match(/^([a-zA-Z_:][a-zA-Z0-9.\-_:]*)\s*>/);
      if (!closeMatch) {
        reportError('Malformed closing tag', startLine, startCol, index);
        const nextGt = xmlString.indexOf('>', index);
        if (nextGt !== -1) advance(nextGt - index + 1);
        else advance(1);
        continue;
      }
      const tagName = closeMatch[1];
      advance(closeMatch[0].length);

      if (stack.length === 0) {
        reportError(`Unexpected closing tag </${tagName}> without matching opening tag`, startLine, startCol, index);
        continue;
      }

      const current = stack[stack.length - 1];
      if (current.name !== tagName) {
        reportError(`Mismatched closing tag: expected </${current.name}>, but found </${tagName}>`, startLine, startCol, index);
        // Find if this tag exists in the stack
        const foundIdx = stack.map(s => s.name).lastIndexOf(tagName);
        if (foundIdx !== -1) {
          stack.length = foundIdx; // close up to this tag
        }
      } else {
        stack.pop();
      }
      continue;
    }

    if (peek(1) === '<') {
      // Opening tag
      const startLine = line;
      const startCol = col;
      advance(1);
      const tagMatch = xmlString.slice(index).match(/^([a-zA-Z_:][a-zA-Z0-9.\-_:]*)/);
      if (!tagMatch) {
        reportError(`Expected tag name after '<', found "${xmlString[index]}"`, startLine, startCol, index);
        advance(1);
        continue;
      }

      const tagName = tagMatch[1];
      advance(tagName.length);

      const attrs = parseAttributes();
      skipWhitespace();

      const isSelfClosing = peek(2) === '/>';
      if (isSelfClosing) {
        advance(2);
      } else if (peek(1) === '>') {
        advance(1);
      } else {
        reportError(`Expected '>' to close tag <${tagName}>`, line, col, index);
      }

      const elemNode = {
        type: 'element',
        name: tagName,
        attributes: attrs,
        children: [],
        selfClosing: isSelfClosing,
        line: startLine,
        column: startCol
      };

      if (stack.length === 0) {
        if (root !== null) {
          reportError(`Multiple root elements detected: found <${tagName}> after root <${root.name}>`, startLine, startCol, index);
        } else {
          root = elemNode;
        }
      } else {
        stack[stack.length - 1].children.push(elemNode);
      }

      if (!isSelfClosing) {
        stack.push(elemNode);
      }
      continue;
    }

    // Text content
    const textStartLine = line;
    const textStartCol = col;
    let textBuffer = '';

    while (index < length && xmlString[index] !== '<') {
      textBuffer += xmlString[index];
      advance(1);
    }

    const decoded = decodeEntities(textBuffer);
    if (decoded.trim().length > 0) {
      if (stack.length === 0) {
        if (decoded.trim()) {
          reportError(`Text content "${decoded.trim()}" found outside root element`, textStartLine, textStartCol, index);
        }
      } else {
        stack[stack.length - 1].children.push({
          type: 'text',
          text: decoded,
          raw: textBuffer,
          line: textStartLine,
          column: textStartCol
        });
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.pop();
    reportError(`Unclosed element <${unclosed.name}> opened at line ${unclosed.line}`, unclosed.line, unclosed.column, index);
  }

  if (!root && errors.length === 0) {
    reportError('Empty XML document: no root element found', 1, 1, 0);
  }

  return {
    root,
    declaration,
    doctype,
    errors
  };
}


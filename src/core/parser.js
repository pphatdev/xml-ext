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

export const COMMON_HTML_ENTITIES = {
  nbsp: 160, iexcl: 161, cent: 162, pound: 163, curren: 164, yen: 165,
  brvbar: 166, sect: 167, uml: 168, copy: 169, ordf: 170, laquo: 171,
  not: 172, shy: 173, reg: 174, macr: 175, deg: 176, plusmn: 177,
  sup2: 178, sup3: 179, acute: 180, micro: 181, para: 182, middot: 183,
  cedil: 184, sup1: 185, ordm: 186, raquo: 187, frac14: 188, frac12: 189,
  frac34: 190, iquest: 191, Agrave: 192, Aacute: 193, Acirc: 194, Atilde: 195,
  Auml: 196, Aring: 197, AElig: 198, Ccedil: 199, Egrave: 200, Eacute: 201,
  Ecirc: 202, Euml: 203, Igrave: 204, Iacute: 205, Icirc: 206, Iuml: 207,
  ETH: 208, Ntilde: 209, Ograve: 210, Oacute: 211, Ocirc: 212, Otilde: 213,
  Ouml: 214, times: 215, Oslash: 216, Ugrave: 217, Uacute: 218, Ucirc: 219,
  Uuml: 220, Yacute: 221, THORN: 222, szlig: 223, agrave: 224, aacute: 225,
  acirc: 226, atilde: 227, auml: 228, aring: 229, aelig: 230, ccedil: 231,
  egrave: 232, eacute: 233, ecirc: 234, euml: 235, igrave: 236, iacute: 237,
  icirc: 238, iuml: 239, eth: 240, ntilde: 241, ograve: 242, oacute: 243,
  ocirc: 244, otilde: 245, ouml: 246, divide: 247, oslash: 248, ugrave: 249,
  uacute: 250, ucirc: 251, uuml: 252, yacute: 253, thorn: 254, yuml: 255,
  euro: 8364, trade: 8482, ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217,
  sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222, dagger: 8224, Dagger: 8225,
  bull: 8226, hellip: 8230, permil: 8240, lsaquo: 8249, rsaquo: 8250
};

export function decodeEntities(text, options = {}) {
  if (!text) return '';
  const { htmlEntities = true } = options;
  let res = text
    .replace(/&(amp|lt|gt|quot|apos);/g, (match) => XML_ENTITIES[match] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  if (htmlEntities) {
    res = res.replace(/&([a-zA-Z]+);/g, (match, name) => {
      const code = COMMON_HTML_ENTITIES[name];
      if (code !== undefined) {
        return String.fromCharCode(code);
      }
      return match;
    });
  }

  return res;
}

export function encodeEntities(text, options = {}) {
  if (!text) return '';
  const {
    mode = 'xml', // 'xml' | 'numeric' | 'hex'
    quote = false,
    preserveExisting = true,
    convertHtmlEntities = true
  } = options;

  let s = text;

  // 1. Convert HTML named entities to standard XML numeric entities if present
  if (convertHtmlEntities) {
    s = s.replace(/&([a-zA-Z]+);/g, (match, name) => {
      if (['amp', 'lt', 'gt', 'quot', 'apos'].includes(name)) {
        return match;
      }
      const code = COMMON_HTML_ENTITIES[name];
      if (code !== undefined) {
        return mode === 'hex' ? `&#x${code.toString(16).toUpperCase()};` : `&#${code};`;
      }
      return match;
    });
  }

  // 2. Escape bare ampersands not part of a valid XML entity or numeric entity
  if (preserveExisting) {
    s = s.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
  } else {
    s = s.replace(/&/g, '&amp;');
  }

  // 3. Escape < and >
  s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 4. Escape quotes if in attribute context
  if (quote) {
    s = s.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // 5. Numeric or hex encoding for non-ASCII characters
  if (mode === 'numeric') {
    s = s.replace(/[^\x00-\x7F]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  } else if (mode === 'hex') {
    s = s.replace(/[^\x00-\x7F]/g, (ch) => `&#x${ch.charCodeAt(0).toString(16).toUpperCase()};`);
  }

  return s;
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


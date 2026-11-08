/**
 * XML Formatter / Beautifier
 * Prettifies XML with customizable indentation, entity formatting (named, numeric, hex, decoded),
 * attribute wrapping, and CDATA preservation.
 */

import { parseXml, encodeEntities, decodeEntities } from './parser.js';

export function formatXml(xmlString, options = {}) {
  const {
    indent = '  ', // 2 spaces by default (or '    ', '\t')
    preserveComments = true,
    selfCloseEmpty = true,
    entities = 'auto' // 'auto' | 'named' | 'numeric' | 'hex' | 'decode'
  } = options;

  if (!xmlString || !xmlString.trim()) return '';

  let parsed;
  try {
    parsed = parseXml(xmlString, { tolerant: true });
  } catch (err) {
    // Fallback regex-based beautifier if parsing fails
    return fallbackFormatXml(xmlString, indent);
  }

  if (!parsed.root) {
    return xmlString;
  }

  const lines = [];

  // Declaration
  if (parsed.declaration) {
    const declAttrs = Object.entries(parsed.declaration.attributes || {})
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    lines.push(`<?xml ${declAttrs}?>`);
  }

  // Doctype
  if (parsed.doctype) {
    lines.push(`<!DOCTYPE ${parsed.doctype}>`);
  }

  function serializeNode(node, depth = 0) {
    const currentIndent = indent.repeat(depth);

    if (node.type === 'comment') {
      if (preserveComments) {
        lines.push(`${currentIndent}<!--${node.text}-->`);
      }
      return;
    }

    if (node.type === 'cdata') {
      lines.push(`${currentIndent}<![CDATA[${node.text}]]>`);
      return;
    }

    if (node.type === 'text') {
      const text = (node.text || '').trim();
      if (text) {
        const formattedText = formatNodeEntities(text, entities, false);
        lines.push(`${currentIndent}${formattedText}`);
      }
      return;
    }

    if (node.type === 'element') {
      const attrEntries = Object.entries(node.attributes || {});
      let attrStr = '';
      if (attrEntries.length > 0) {
        attrStr = ' ' + attrEntries.map(([k, v]) => {
          const formattedVal = formatNodeEntities(String(v), entities, true);
          return `${k}="${formattedVal}"`;
        }).join(' ');
      }

      // Check children
      const children = (node.children || []).filter(c => {
        if (c.type === 'text') return (c.text || '').trim().length > 0;
        if (c.type === 'comment') return preserveComments;
        return true;
      });

      // Case 1: Empty element
      if (children.length === 0) {
        if (selfCloseEmpty) {
          lines.push(`${currentIndent}<${node.name}${attrStr}/>`);
        } else {
          lines.push(`${currentIndent}<${node.name}${attrStr}></${node.name}>`);
        }
        return;
      }

      // Case 2: Single short text child -> inline <tag>text</tag>
      if (children.length === 1 && children[0].type === 'text') {
        const textVal = formatNodeEntities(children[0].text.trim(), entities, false);
        if (!textVal.includes('\n') && (currentIndent.length + node.name.length * 2 + attrStr.length + textVal.length + 5) <= 100) {
          lines.push(`${currentIndent}<${node.name}${attrStr}>${textVal}</${node.name}>`);
          return;
        }
      }

      // Case 3: Block children
      lines.push(`${currentIndent}<${node.name}${attrStr}>`);
      for (const child of children) {
        serializeNode(child, depth + 1);
      }
      lines.push(`${currentIndent}</${node.name}>`);
    }
  }

  serializeNode(parsed.root, 0);

  return lines.join('\n');
}

function formatNodeEntities(str, mode = 'auto', isAttr = false) {
  if (!str) return '';

  if (mode === 'decode') {
    const decoded = decodeEntities(str, { htmlEntities: true });
    return encodeEntities(decoded, { mode: 'xml', quote: isAttr, preserveExisting: false });
  }

  if (mode === 'numeric') {
    return encodeEntities(str, { mode: 'numeric', quote: isAttr, preserveExisting: true, convertHtmlEntities: true });
  }

  if (mode === 'hex') {
    return encodeEntities(str, { mode: 'hex', quote: isAttr, preserveExisting: true, convertHtmlEntities: true });
  }

  // 'auto' or 'named'
  return encodeEntities(str, { mode: 'xml', quote: isAttr, preserveExisting: true, convertHtmlEntities: true });
}

/**
 * Format XML document as Entities (escapes symbols and non-ASCII as numeric or hex XML entities)
 * @param {string} xmlString
 * @param {'numeric'|'hex'|'named'} [entityMode='numeric']
 * @param {object} [options]
 * @returns {string} Formatted XML with entities
 */
export function formatXmlAsEntities(xmlString, entityMode = 'numeric', options = {}) {
  return formatXml(xmlString, { ...options, entities: entityMode });
}

/**
 * Decode XML entities back to literal characters where safe
 * @param {string} xmlString
 * @param {object} [options]
 * @returns {string} XML with decoded entities
 */
export function decodeXmlEntities(xmlString, options = {}) {
  return formatXml(xmlString, { ...options, entities: 'decode' });
}

function fallbackFormatXml(xml, indent) {
  let formatted = '';
  let pad = 0;
  // Clean whitespace between tags
  const reg = /(>)(<)(\/*)/g;
  const cleaned = xml.replace(reg, '$1\r\n$2$3');
  const lines = cleaned.split('\r\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line.match(/^<\/\w/)) {
      pad = Math.max(0, pad - 1);
    }

    formatted += indent.repeat(pad) + line + '\n';

    if (line.match(/^<\w[^>]*[^\/]>$/) && !line.startsWith('<?') && !line.startsWith('<!')) {
      pad++;
    }
  }

  return formatted.trim();
}


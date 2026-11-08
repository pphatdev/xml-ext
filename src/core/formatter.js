/**
 * XML Formatter / Beautifier
 * Prettifies XML with customizable indentation, attribute wrapping, and CDATA preservation.
 */

import { parseXml } from './parser.js';

export function formatXml(xmlString, options = {}) {
  const {
    indent = '  ', // 2 spaces by default (or '    ', '\t')
    preserveComments = true,
    selfCloseEmpty = true
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
        lines.push(`${currentIndent}${escapeXmlText(text)}`);
      }
      return;
    }

    if (node.type === 'element') {
      const attrEntries = Object.entries(node.attributes || {});
      let attrStr = '';
      if (attrEntries.length > 0) {
        attrStr = ' ' + attrEntries.map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`).join(' ');
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
        const textVal = escapeXmlText(children[0].text.trim());
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

function escapeXmlText(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

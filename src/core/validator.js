/**
 * XML Validator
 * Checks XML documents for well-formedness and structural conformance.
 */

import { parseXml } from './parser.js';

export function validateXml(xmlString) {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    rootTag: null,
    elementCount: 0,
    summary: ''
  };

  if (!xmlString || !xmlString.trim()) {
    result.errors.push({
      line: 1,
      column: 1,
      message: 'XML input is empty'
    });
    result.summary = 'Validation failed: Input is empty.';
    return result;
  }

  // Pre-check for raw unescaped '&' in text
  checkRawEntities(xmlString, result.warnings);

  try {
    const parsed = parseXml(xmlString, { tolerant: true });

    if (parsed.errors && parsed.errors.length > 0) {
      for (const err of parsed.errors) {
        result.errors.push({
          line: err.line || 1,
          column: err.column || 1,
          message: err.message
        });
      }
    }

    if (parsed.root) {
      result.rootTag = parsed.root.name;
      result.elementCount = countElements(parsed.root);
    }

    if (result.errors.length === 0 && parsed.root) {
      result.valid = true;
      result.summary = `Valid XML: Root <${result.rootTag}> with ${result.elementCount} elements.`;
    } else {
      result.valid = false;
      result.summary = `Invalid XML: ${result.errors.length} error(s) found.`;
    }
  } catch (err) {
    result.valid = false;
    result.errors.push({
      line: err.line || 1,
      column: err.column || 1,
      message: err.message || String(err)
    });
    result.summary = `Validation failed: ${err.message}`;
  }

  return result;
}

function countElements(node) {
  if (!node || node.type !== 'element') return 0;
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      if (child.type === 'element') {
        count += countElements(child);
      }
    }
  }
  return count;
}

function checkRawEntities(xmlString, warnings) {
  const lines = xmlString.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineStr = lines[i];
    // Find bare '&' not followed by valid entity or #
    const ampersandRegex = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g;
    let match;
    while ((match = ampersandRegex.exec(lineStr)) !== null) {
      warnings.push({
        line: i + 1,
        column: match.index + 1,
        message: `Unescaped '&' found. Did you mean '&amp;'?`
      });
    }
  }
}

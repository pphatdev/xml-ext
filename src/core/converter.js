/**
 * XML Multi-Format Converter
 * Converts between XML, JSON, Tree, Chart data, TXT, CSV, and YAML.
 */

import { parseXml } from './parser.js';

/**
 * Converts XML to JSON
 * @param {string} xmlString
 * @param {object} [options]
 * @returns {object} JSON object
 */
export function xmlToJson(xmlString, options = {}) {
  const {
    mode = 'clean', // 'clean' or 'detailed'
    parsePrimitives = true,
    attributePrefix = '@'
  } = options;

  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return {};

  function transformClean(node) {
    if (node.type === 'text') {
      const val = (node.text || '').trim();
      if (!val) return null;
      if (parsePrimitives) {
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (val === 'null') return null;
        if (!isNaN(val) && val !== '' && !val.includes(' ') && !/^0[0-9]+/.test(val)) {
          return Number(val);
        }
      }
      return val;
    }

    if (node.type === 'cdata') {
      return node.text;
    }

    if (node.type !== 'element') return null;

    const obj = {};
    let hasChildren = false;

    // Attributes
    if (node.attributes) {
      for (const [k, v] of Object.entries(node.attributes)) {
        obj[`${attributePrefix}${k}`] = v;
        hasChildren = true;
      }
    }

    // Children
    const nonCommentChildren = (node.children || []).filter(c => c.type !== 'comment');

    // If only one text child and no attributes, return primitive
    if (nonCommentChildren.length === 1 && nonCommentChildren[0].type === 'text' && Object.keys(obj).length === 0) {
      return transformClean(nonCommentChildren[0]);
    }

    for (const child of nonCommentChildren) {
      if (child.type === 'text') {
        const txt = transformClean(child);
        if (txt !== null) {
          obj['#text'] = txt;
          hasChildren = true;
        }
      } else if (child.type === 'cdata') {
        obj['#cdata'] = child.text;
        hasChildren = true;
      } else if (child.type === 'element') {
        hasChildren = true;
        const childVal = transformClean(child);
        const childName = child.name;

        if (obj.hasOwnProperty(childName)) {
          if (Array.isArray(obj[childName])) {
            obj[childName].push(childVal);
          } else {
            obj[childName] = [obj[childName], childVal];
          }
        } else {
          obj[childName] = childVal;
        }
      }
    }

    return hasChildren ? obj : '';
  }

  function transformDetailed(node) {
    if (node.type === 'text') return { type: 'text', value: node.text };
    if (node.type === 'cdata') return { type: 'cdata', value: node.text };
    if (node.type === 'comment') return { type: 'comment', value: node.text };

    return {
      type: 'element',
      name: node.name,
      attributes: node.attributes || {},
      children: (node.children || []).map(transformDetailed)
    };
  }

  if (mode === 'detailed') {
    return transformDetailed(parsed.root);
  }

  return { [parsed.root.name]: transformClean(parsed.root) };
}

/**
 * Converts JSON to XML
 * @param {string|object} jsonInput
 * @param {object} [options]
 * @returns {string} XML string
 */
export function jsonToXml(jsonInput, options = {}) {
  const {
    rootTag = 'root',
    indent = '  ',
    attributePrefix = '@'
  } = options;

  let data;
  if (typeof jsonInput === 'string') {
    try {
      data = JSON.parse(jsonInput);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
  } else {
    data = jsonInput;
  }

  function serialize(obj, tagName, depth = 0) {
    const curIndent = indent.repeat(depth);

    if (obj === null || obj === undefined) {
      return `${curIndent}<${tagName}/>`;
    }

    if (typeof obj !== 'object') {
      return `${curIndent}<${tagName}>${escapeXml(String(obj))}</${tagName}>`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => serialize(item, tagName, depth)).join('\n');
    }

    // Object
    const attrs = [];
    const children = [];

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith(attributePrefix)) {
        attrs.push(`${key.slice(attributePrefix.length)}="${escapeXml(String(value))}"`);
      } else if (key === '#text') {
        children.push(`${curIndent}${indent}${escapeXml(String(value))}`);
      } else if (key === '#cdata') {
        children.push(`${curIndent}${indent}<![CDATA[${String(value)}]]>`);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          children.push(serialize(item, key, depth + 1));
        }
      } else {
        children.push(serialize(value, key, depth + 1));
      }
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    if (children.length === 0) {
      return `${curIndent}<${tagName}${attrStr}/>`;
    }

    return `${curIndent}<${tagName}${attrStr}>\n${children.join('\n')}\n${curIndent}</${tagName}>`;
  }

  // If top-level object has exactly one key, use that key as root tag
  if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 1) {
    const key = Object.keys(data)[0];
    return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(data[key], key, 0)}`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(data, rootTag, 0)}`;
}

/**
 * Converts XML to an interactive Tree Model
 * @param {string} xmlString
 * @returns {object|null} Tree node
 */
export function xmlToTree(xmlString) {
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return null;

  let nodeId = 0;

  function buildTree(node, xpath = '', depth = 0) {
    const id = `node_${++nodeId}`;

    if (node.type === 'text') {
      const text = (node.text || '').trim();
      if (!text) return null;
      return {
        id,
        type: 'text',
        name: '#text',
        text,
        depth,
        xpath: `${xpath}/text()`
      };
    }

    if (node.type === 'cdata') {
      return {
        id,
        type: 'cdata',
        name: '#cdata-section',
        text: node.text,
        depth,
        xpath: `${xpath}/text()`
      };
    }

    if (node.type === 'comment') {
      return {
        id,
        type: 'comment',
        name: '#comment',
        text: node.text,
        depth,
        xpath: `${xpath}/comment()`
      };
    }

    const currentXpath = xpath || `/${node.name}`;
    const children = [];

    // Group child elements for indexed xpath
    const childTagCounts = {};

    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'element') {
          childTagCounts[child.name] = (childTagCounts[child.name] || 0) + 1;
        }
      }

      const currentTagIndices = {};
      for (const child of node.children) {
        let childXpath = currentXpath;
        if (child.type === 'element') {
          currentTagIndices[child.name] = (currentTagIndices[child.name] || 0) + 1;
          const idx = currentTagIndices[child.name];
          const hasMultiple = childTagCounts[child.name] > 1;
          childXpath = `${currentXpath}/${child.name}${hasMultiple ? `[${idx}]` : ''}`;
        }
        const treeChild = buildTree(child, childXpath, depth + 1);
        if (treeChild) {
          children.push(treeChild);
        }
      }
    }

    // Extract immediate text if any
    let inlineText = '';
    const textChildren = children.filter(c => c.type === 'text');
    if (textChildren.length === 1 && children.length === 1) {
      inlineText = textChildren[0].text;
    }

    return {
      id,
      type: 'element',
      name: node.name,
      attributes: node.attributes || {},
      children,
      inlineText,
      depth,
      xpath: currentXpath,
      line: node.line || 1
    };
  }

  return buildTree(parsed.root);
}

/**
 * Converts XML to Chart Data format
 * @param {string} xmlString
 * @returns {object} Chart datasets
 */
export function xmlToChartData(xmlString) {
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) {
    return { tagFrequency: [], hierarchy: null, depthDistribution: [] };
  }

  const tagCounts = new Map();
  const depthCounts = {};
  let maxDepth = 0;

  function traverse(node, depth) {
    if (!node || node.type !== 'element') return;

    tagCounts.set(node.name, (tagCounts.get(node.name) || 0) + 1);
    depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    if (depth > maxDepth) maxDepth = depth;

    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
  }

  traverse(parsed.root, 1);

  // Tag frequency sorted
  const total = Array.from(tagCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const tagFrequency = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      percent: Math.round((count / total) * 1000) / 10
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15); // Top 15 tags

  // Depth distribution array
  const depthDistribution = [];
  for (let d = 1; d <= maxDepth; d++) {
    depthDistribution.push({
      depth: d,
      count: depthCounts[d] || 0
    });
  }

  // Hierarchy Tree for Node diagram
  function buildHierarchy(node, depth = 1) {
    if (!node || node.type !== 'element') return null;
    const children = (node.children || [])
      .filter(c => c.type === 'element')
      .map(c => buildHierarchy(c, depth + 1))
      .filter(Boolean);

    const textChildren = (node.children || []).filter(c => c.type === 'text');
    const textVal = textChildren.map(t => t.text.trim()).filter(Boolean).join(' ');

    return {
      name: node.name,
      depth,
      attributes: node.attributes || {},
      attrsCount: Object.keys(node.attributes || {}).length,
      text: textVal,
      children: children.length > 0 ? children : undefined,
      value: children.length === 0 ? 1 : children.length
    };
  }

  return {
    tagFrequency,
    depthDistribution,
    hierarchy: buildHierarchy(parsed.root),
    totalElements: total,
    maxDepth
  };
}

/**
 * Converts XML to structured plain text (TXT)
 * @param {string} xmlString
 * @param {object} [options]
 * @returns {string} Plain text
 */
export function xmlToTxt(xmlString, options = {}) {
  const { mode = 'outline', indent = '  ' } = options;
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return '';

  const lines = [];

  if (mode === 'raw') {
    // Just extracts all text nodes
    function extractText(node) {
      if (node.type === 'text' && node.text.trim()) {
        lines.push(node.text.trim());
      }
      if (node.children) {
        for (const child of node.children) {
          extractText(child);
        }
      }
    }
    extractText(parsed.root);
    return lines.join('\n');
  }

  // Outline mode
  function buildOutline(node, depth = 0) {
    const curIndent = indent.repeat(depth);

    if (node.type === 'element') {
      const attrs = Object.entries(node.attributes || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      const attrStr = attrs ? ` [${attrs}]` : '';

      const nonCommentChildren = (node.children || []).filter(c => c.type !== 'comment');
      const textOnly = nonCommentChildren.length === 1 && nonCommentChildren[0].type === 'text';

      if (textOnly) {
        const val = nonCommentChildren[0].text.trim();
        lines.push(`${curIndent}${node.name}${attrStr}: ${val}`);
      } else {
        lines.push(`${curIndent}${node.name}${attrStr}`);
        for (const child of nonCommentChildren) {
          buildOutline(child, depth + 1);
        }
      }
    } else if (node.type === 'text') {
      const val = (node.text || '').trim();
      if (val) {
        lines.push(`${curIndent}- ${val}`);
      }
    } else if (node.type === 'cdata') {
      lines.push(`${curIndent}[CDATA]: ${node.text}`);
    }
  }

  buildOutline(parsed.root, 0);
  return lines.join('\n');
}

/**
 * Converts XML to CSV / TSV if repeating sibling structures exist
 * @param {string} xmlString
 * @param {string} [delimiter=',']
 * @returns {string} CSV text
 */
export function xmlToCsv(xmlString, delimiter = ',') {
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return '';

  // Look for repeating sibling elements under root or direct container
  let records = [];
  const children = (parsed.root.children || []).filter(c => c.type === 'element');

  if (children.length > 1 && children.every(c => c.name === children[0].name)) {
    records = children;
  } else {
    // Check if one child has repeating grand-children (e.g. <catalog><books><book>...)
    for (const ch of children) {
      const grandChildren = (ch.children || []).filter(c => c.type === 'element');
      if (grandChildren.length > 1 && grandChildren.every(g => g.name === grandChildren[0].name)) {
        records = grandChildren;
        break;
      }
    }
  }

  if (records.length === 0) {
    records = children;
  }

  // Extract all unique field names (attributes and leaf child tags)
  const headersSet = new Set();
  const rowData = [];

  for (const record of records) {
    const row = {};

    // Attributes
    for (const [k, v] of Object.entries(record.attributes || {})) {
      const header = `@${k}`;
      headersSet.add(header);
      row[header] = v;
    }

    // Children
    if (record.children) {
      for (const child of record.children) {
        if (child.type === 'element') {
          const textChildren = (child.children || []).filter(c => c.type === 'text');
          const val = textChildren.map(t => t.text.trim()).join(' ');
          headersSet.add(child.name);
          row[child.name] = val;
        }
      }
    }

    rowData.push(row);
  }

  const headers = Array.from(headersSet);
  if (headers.length === 0) return '';

  function escapeCsvCell(cell) {
    const str = cell !== undefined && cell !== null ? String(cell) : '';
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csvLines = [];
  csvLines.push(headers.map(escapeCsvCell).join(delimiter));

  for (const row of rowData) {
    const line = headers.map(h => escapeCsvCell(row[h] || '')).join(delimiter);
    csvLines.push(line);
  }

  return csvLines.join('\n');
}

/**
 * Converts XML to YAML
 * @param {string} xmlString
 * @returns {string} YAML representation
 */
export function xmlToYaml(xmlString) {
  const json = xmlToJson(xmlString, { mode: 'clean' });
  return jsonToYaml(json, 0);
}

function jsonToYaml(data, depth = 0) {
  const indent = '  '.repeat(depth);
  if (data === null || data === undefined) return 'null';
  if (typeof data !== 'object') {
    if (typeof data === 'string' && (data.includes(':') || data.includes('\n') || data.includes('#'))) {
      return JSON.stringify(data);
    }
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    return data.map(item => {
      const val = jsonToYaml(item, depth + 1);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const itemYaml = jsonToYaml(item, depth + 1).trimStart();
        return `${indent}- ${itemYaml}`;
      }
      return `${indent}- ${val}`;
    }).join('\n');
  }

  const keys = Object.keys(data);
  if (keys.length === 0) return '{}';

  return keys.map(k => {
    const val = data[k];
    if (typeof val === 'object' && val !== null) {
      if (Array.isArray(val) && val.length === 0) {
        return `${indent}${k}: []`;
      }
      if (!Array.isArray(val) && Object.keys(val).length === 0) {
        return `${indent}${k}: {}`;
      }
      return `${indent}${k}:\n${jsonToYaml(val, depth + 1)}`;
    }
    return `${indent}${k}: ${jsonToYaml(val, depth + 1)}`;
  }).join('\n');
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

  // If top-level object has exactly one key and its value is not an array, use that key as root tag
  if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 1) {
    const key = Object.keys(data)[0];
    if (!Array.isArray(data[key])) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(data[key], key, 0)}`;
    }
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
 * Converts XML to Object Schema / Card Flow structure
 * Extracts attributes and scalar child tags as key-value lines,
 * groups complex children and array collections, and generates
 * hierarchy suitable for Card Flow diagram rendering.
 *
 * @param {string} xmlString
 * @returns {object|null} Card node hierarchy
 */
export function xmlToCardFlowData(xmlString) {
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return null;

  let idCounter = 0;

  function buildCard(node, path = '') {
    if (!node || node.type !== 'element') return null;
    const curPath = path ? `${path}/${node.name}` : `/${node.name}`;
    const id = `card_${++idCounter}`;

    const lines = [];
    const childCards = [];

    // 1. Attributes
    if (node.attributes) {
      for (const [k, v] of Object.entries(node.attributes)) {
        lines.push({ key: k, value: String(v) });
      }
    }

    // 2. Element children
    const elementChildren = (node.children || []).filter(c => c.type === 'element');
    const scalarLeafChildren = [];
    const complexChildren = [];

    for (const child of elementChildren) {
      const subElements = (child.children || []).filter(c => c.type === 'element');
      const hasAttrs = child.attributes && Object.keys(child.attributes).length > 0;
      if (subElements.length === 0 && !hasAttrs) {
        // Scalar leaf child
        const textVal = (child.children || [])
          .filter(c => c.type === 'text')
          .map(c => c.text.trim())
          .filter(Boolean)
          .join(' ');
        scalarLeafChildren.push({ name: child.name, text: textVal });
      } else {
        complexChildren.push(child);
      }
    }

    // If node has no attributes and no scalar leaves, and has multiple children:
    // It's a top-level container node (like <categories> holding categories)
    if (lines.length === 0 && scalarLeafChildren.length === 0 && complexChildren.length > 0) {
      lines.push({
        key: node.name,
        value: `[${complexChildren.length}]`,
        isCollection: true
      });
      complexChildren.forEach((child, idx) => {
        const card = buildCard(child, `${curPath}[${idx}]`);
        if (card) childCards.push(card);
      });
      return {
        id,
        path: curPath,
        name: node.name,
        isPill: true,
        lines,
        children: childCards
      };
    }

    // Add scalar leaves to lines
    for (const leaf of scalarLeafChildren) {
      lines.push({ key: leaf.name, value: leaf.text || '""' });
    }

    // Group complex children by tag name
    const groupedComplex = new Map();
    for (const complex of complexChildren) {
      if (!groupedComplex.has(complex.name)) {
        groupedComplex.set(complex.name, []);
      }
      groupedComplex.get(complex.name).push(complex);
    }

    for (const [tagName, items] of groupedComplex.entries()) {
      // Check if this single item is a container wrapper (e.g. <products> holding <product> list)
      if (items.length === 1) {
        const item = items[0];
        const grandSubElements = (item.children || []).filter(c => c.type === 'element');
        const grandAttrs = item.attributes && Object.keys(item.attributes).length > 0;
        const isContainerWrapper = grandSubElements.length > 0 && !grandAttrs;

        if (isContainerWrapper) {
          lines.push({
            key: tagName,
            value: `[${grandSubElements.length}]`,
            isCollection: true
          });
          grandSubElements.forEach((grandChild, idx) => {
            const card = buildCard(grandChild, `${curPath}/${tagName}[${idx}]`);
            if (card) childCards.push(card);
          });
          continue;
        }
      }

      // If items have multiple elements or a single complex element
      if (items.length > 1) {
        lines.push({
          key: tagName,
          value: `[${items.length}]`,
          isCollection: true
        });
        items.forEach((item, idx) => {
          const card = buildCard(item, `${curPath}/${tagName}[${idx}]`);
          if (card) childCards.push(card);
        });
      } else {
        const item = items[0];
        const subCount = (item.children || []).filter(c => c.type === 'element').length;
        lines.push({
          key: tagName,
          value: subCount > 0 ? `[${subCount}]` : `{...}`,
          isCollection: true
        });
        const card = buildCard(item, `${curPath}/${tagName}`);
        if (card) childCards.push(card);
      }
    }

    // If still empty (e.g. leaf node with only text)
    if (lines.length === 0) {
      const textVal = (node.children || [])
        .filter(c => c.type === 'text')
        .map(c => c.text.trim())
        .filter(Boolean)
        .join(' ');
      lines.push({ key: node.name, value: textVal || '(empty)' });
    }

    const isPill = lines.length === 1 && lines[0].isCollection;

    return {
      id,
      path: curPath,
      name: node.name,
      isPill,
      lines,
      children: childCards
    };
  }

  return buildCard(parsed.root);
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

/**
 * Converts CSV text into XML representation
 * @param {string} csvString
 * @param {object} [options]
 * @returns {string} XML string
 */
export function csvToXml(csvString, options = {}) {
  const { rootTag = 'records', rowTag = 'item', delimiter = ',' } = options;
  if (!csvString || !csvString.trim()) return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}/>`;

  const lines = csvString.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}/>`;

  function parseCsvLine(line, delim) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delim && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  // Detect delimiter if not strictly specified
  const firstLine = lines[0];
  let actualDelim = delimiter;
  if (delimiter === ',' && !firstLine.includes(',') && (firstLine.includes('\t') || firstLine.includes(';'))) {
    actualDelim = firstLine.includes('\t') ? '\t' : ';';
  }

  const rawHeaders = parseCsvLine(lines[0], actualDelim);
  const cleanHeaders = rawHeaders.map((h, i) => {
    let clean = h.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!clean || !/^[a-zA-Z_]/.test(clean)) {
      clean = `col_${i + 1}`;
    }
    return clean;
  });

  const rowXmls = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], actualDelim);
    const colXmls = cleanHeaders.map((header, colIdx) => {
      const val = (values[colIdx] || '').trim();
      return `    <${header}>${escapeXml(val)}</${header}>`;
    });
    rowXmls.push(`  <${rowTag} id="${i}">\n${colXmls.join('\n')}\n  </${rowTag}>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${rowXmls.join('\n')}\n</${rootTag}>`;
}

/**
 * Converts YAML text into JavaScript object/JSON
 * @param {string} yamlString
 * @returns {object} Parsed JSON structure
 */
export function yamlToJson(yamlString) {
  if (!yamlString || !yamlString.trim()) return {};
  const lines = yamlString.split(/\r?\n/);

  function parseLines(startIdx, minIndent) {
    let obj = null;
    let arr = null;
    let i = startIdx;

    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*(#|$)/.test(line)) {
        i++;
        continue;
      }

      const indent = line.search(/\S/);
      if (indent < minIndent) break;

      const trimmed = line.trim();

      // List item
      if (trimmed.startsWith('- ')) {
        if (!arr) arr = [];
        const content = trimmed.slice(2).trim();
        if (content.includes(': ') || content.endsWith(':')) {
          const fakeLine = ' '.repeat(indent + 2) + content;
          const oldLine = lines[i];
          lines[i] = fakeLine;
          const [subObj, nextI] = parseLines(i, indent + 2);
          lines[i] = oldLine;
          arr.push(subObj);
          i = nextI;
          continue;
        } else {
          arr.push(parseYamlValue(content));
          i++;
          continue;
        }
      }

      // Key-value pair
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        if (!obj) obj = {};
        const key = trimmed.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
        const valStr = trimmed.slice(colonIdx + 1).trim();

        if (valStr === '' || valStr.startsWith('#')) {
          const [subVal, nextI] = parseLines(i + 1, indent + 1);
          obj[key] = subVal !== null ? subVal : {};
          i = nextI;
          continue;
        } else {
          obj[key] = parseYamlValue(valStr);
          i++;
          continue;
        }
      }

      i++;
    }

    return [arr !== null ? arr : (obj !== null ? obj : {}), i];
  }

  function parseYamlValue(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null' || val === '~') return null;
    if (!isNaN(val) && val !== '' && !val.includes(' ') && !/^0[0-9]+/.test(val)) {
      return Number(val);
    }
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  }

  const [result] = parseLines(0, 0);
  return result;
}

/**
 * Converts YAML text into XML representation
 * @param {string} yamlString
 * @param {object} [options]
 * @returns {string} XML string
 */
export function yamlToXml(yamlString, options = {}) {
  const { rootTag = 'root' } = options;
  const json = yamlToJson(yamlString);
  return jsonToXml(json, { rootTag });
}

/**
 * Converts Plain Text into XML representation
 * @param {string} txtString
 * @param {object} [options]
 * @returns {string} XML string
 */
export function txtToXml(txtString, options = {}) {
  const { rootTag = 'document' } = options;
  if (!txtString || !txtString.trim()) return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}/>`;
  const lines = txtString.trim().split(/\r?\n/);
  const lineNodes = lines.map(line => `  <line>${escapeXml(line)}</line>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${lineNodes}\n</${rootTag}>`;
}

/**
 * Converts XML to TOML string representation
 * @param {string} xmlString
 * @param {object} [options]
 * @returns {string} TOML string
 */
export function xmlToToml(xmlString, options = {}) {
  const json = xmlToJson(xmlString, { mode: 'clean', parsePrimitives: true });
  if (!json || typeof json !== 'object') return '';
  return jsonToToml(json, options);
}

/**
 * Converts a JavaScript object to TOML format
 * @param {object} obj
 * @param {object} [options]
 * @returns {string} TOML string
 */
export function jsonToToml(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return '';

  const keys = Object.keys(obj);
  let targetObj = obj;
  if (keys.length === 1 && typeof obj[keys[0]] === 'object' && obj[keys[0]] !== null && !Array.isArray(obj[keys[0]])) {
    targetObj = obj[keys[0]];
  }

  const lines = [];

  function formatValue(val) {
    if (typeof val === 'string') {
      return JSON.stringify(val);
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (val === null || val === undefined) {
      return '""';
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      if (typeof val[0] !== 'object' || val[0] === null) {
        return `[ ${val.map(formatValue).join(', ')} ]`;
      }
    }
    return JSON.stringify(val);
  }

  // Pass 1: Primitives and flat arrays
  for (const [k, v] of Object.entries(targetObj)) {
    if (v === null || typeof v !== 'object') {
      const cleanKey = /^[a-zA-Z0-9_\-]+$/.test(k) ? k : JSON.stringify(k);
      lines.push(`${cleanKey} = ${formatValue(v)}`);
    } else if (Array.isArray(v) && (v.length === 0 || typeof v[0] !== 'object')) {
      const cleanKey = /^[a-zA-Z0-9_\-]+$/.test(k) ? k : JSON.stringify(k);
      lines.push(`${cleanKey} = ${formatValue(v)}`);
    }
  }

  // Pass 2: Nested tables
  function renderTables(parentKey, o) {
    for (const [k, v] of Object.entries(o)) {
      const fullKey = parentKey ? `${parentKey}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (lines.length > 0) lines.push('');
        lines.push(`[${fullKey}]`);
        for (const [subK, subV] of Object.entries(v)) {
          if (subV === null || typeof subV !== 'object' || (Array.isArray(subV) && (subV.length === 0 || typeof subV[0] !== 'object'))) {
            const cleanKey = /^[a-zA-Z0-9_\-]+$/.test(subK) ? subK : JSON.stringify(subK);
            lines.push(`${cleanKey} = ${formatValue(subV)}`);
          }
        }
        for (const [subK, subV] of Object.entries(v)) {
          if (subV && typeof subV === 'object') {
            if (Array.isArray(subV)) {
              if (subV.length > 0 && typeof subV[0] === 'object') {
                renderArrayOfTables(`${fullKey}.${subK}`, subV);
              }
            } else {
              renderTables(fullKey, { [subK]: subV });
            }
          }
        }
      }
    }
  }

  function renderArrayOfTables(key, arr) {
    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        if (lines.length > 0) lines.push('');
        lines.push(`[[${key}]]`);
        for (const [k, v] of Object.entries(item)) {
          if (v === null || typeof v !== 'object' || (Array.isArray(v) && (v.length === 0 || typeof v[0] !== 'object'))) {
            const cleanKey = /^[a-zA-Z0-9_\-]+$/.test(k) ? k : JSON.stringify(k);
            lines.push(`${cleanKey} = ${formatValue(v)}`);
          }
        }
        for (const [k, v] of Object.entries(item)) {
          if (v && typeof v === 'object') {
            if (Array.isArray(v)) {
              if (v.length > 0 && typeof v[0] === 'object') {
                renderArrayOfTables(`${key}.${k}`, v);
              }
            } else {
              renderTables(key, { [k]: v });
            }
          }
        }
      }
    }
  }

  for (const [k, v] of Object.entries(targetObj)) {
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        if (v.length > 0 && typeof v[0] === 'object') {
          renderArrayOfTables(k, v);
        }
      } else {
        renderTables('', { [k]: v });
      }
    }
  }

  return lines.join('\n');
}

/**
 * Parses TOML into a JavaScript Object
 * @param {string} tomlString
 * @returns {object}
 */
export function tomlToJson(tomlString) {
  if (!tomlString || !tomlString.trim()) return {};

  const lines = tomlString.split(/\r?\n/);
  const root = {};
  let currentObj = root;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      const pre = line.slice(0, commentIdx);
      const quoteCount = (pre.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        line = pre.trim();
      }
    }
    if (!line) continue;

    if (line.startsWith('[[') && line.endsWith(']]')) {
      const sectionPath = line.slice(2, -2).trim().split('.');
      let target = root;
      for (let i = 0; i < sectionPath.length; i++) {
        const seg = sectionPath[i];
        if (i === sectionPath.length - 1) {
          if (!Array.isArray(target[seg])) {
            target[seg] = [];
          }
          const newObj = {};
          target[seg].push(newObj);
          currentObj = newObj;
        } else {
          if (!target[seg] || typeof target[seg] !== 'object' || Array.isArray(target[seg])) {
            target[seg] = {};
          }
          target = target[seg];
        }
      }
      continue;
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      const sectionPath = line.slice(1, -1).trim().split('.');
      let target = root;
      for (let i = 0; i < sectionPath.length; i++) {
        const seg = sectionPath[i];
        if (!target[seg] || typeof target[seg] !== 'object' || Array.isArray(target[seg])) {
          target[seg] = {};
        }
        target = target[seg];
      }
      currentObj = target;
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim().replace(/^["']|["']$/g, '');
      const rawVal = line.slice(eqIdx + 1).trim();

      let val = rawVal;
      if (rawVal === 'true') val = true;
      else if (rawVal === 'false') val = false;
      else if (!isNaN(rawVal) && rawVal !== '') val = Number(rawVal);
      else if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
        try {
          val = JSON.parse(rawVal);
        } catch {
          val = rawVal.slice(1, -1);
        }
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        try {
          val = JSON.parse(rawVal);
        } catch {
          val = rawVal.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        }
      }

      currentObj[key] = val;
    }
  }

  return root;
}

/**
 * Converts TOML string to XML
 * @param {string} tomlString
 * @param {object} [options]
 * @returns {string} XML string
 */
export function tomlToXml(tomlString, options = {}) {
  const json = tomlToJson(tomlString);
  const rootTag = options.rootTag || 'config';
  return jsonToXml({ [rootTag]: json }, options);
}

/**
 * Converts XML document into structured Markdown outline and tables
 * @param {string} xmlString
 * @param {object} [options]
 * @returns {string} Markdown string
 */
export function xmlToMarkdown(xmlString, options = {}) {
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return '';

  const lines = [];

  function formatAttributes(attrs) {
    if (!attrs || Object.keys(attrs).length === 0) return '';
    const parts = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`);
    return ` *(${parts.join(', ')})*`;
  }

  function walk(node, depth = 1) {
    if (node.type === 'element') {
      const headerPrefix = '#'.repeat(Math.min(depth, 6));
      const attrStr = formatAttributes(node.attributes);

      const children = (node.children || []).filter(c => c.type === 'element');
      const textChildren = (node.children || []).filter(c => c.type === 'text' && c.text.trim());

      if (children.length === 0 && textChildren.length > 0) {
        const textVal = textChildren.map(t => t.text.trim()).join(' ');
        if (depth > 2) {
          lines.push(`${'  '.repeat(depth - 3)}- **${node.name}**${attrStr}: ${textVal}`);
        } else {
          lines.push(`${headerPrefix} ${node.name}${attrStr}`);
          lines.push('');
          lines.push(textVal);
          lines.push('');
        }
        return;
      }

      // Check if children form a tabular collection of identical elements
      if (children.length >= 2 && children.every(c => c.name === children[0].name)) {
        const sampleRecord = children[0];
        const recordChildren = (sampleRecord.children || []).filter(c => c.type === 'element');
        const hasSubObjects = recordChildren.some(rc => (rc.children || []).some(sub => sub.type === 'element'));

        if (!hasSubObjects && recordChildren.length >= 1) {
          lines.push(`${headerPrefix} ${node.name}${attrStr}`);
          lines.push('');

          const colSet = new Set();
          if (sampleRecord.attributes) {
            Object.keys(sampleRecord.attributes).forEach(k => colSet.add(`@${k}`));
          }
          recordChildren.forEach(rc => colSet.add(rc.name));
          const cols = Array.from(colSet);

          lines.push(`| ${cols.join(' | ')} |`);
          lines.push(`| ${cols.map(() => '---').join(' | ')} |`);

          for (const rec of children) {
            const rowVals = cols.map(col => {
              if (col.startsWith('@')) {
                const attrName = col.slice(1);
                return rec.attributes ? (rec.attributes[attrName] || '') : '';
              }
              const childEl = (rec.children || []).find(c => c.name === col);
              if (!childEl) return '';
              const txt = (childEl.children || [])
                .filter(c => c.type === 'text')
                .map(c => c.text.trim())
                .join(' ');
              return txt.replace(/\|/g, '\\|');
            });
            lines.push(`| ${rowVals.join(' | ')} |`);
          }
          lines.push('');
          return;
        }
      }

      if (depth <= 3) {
        lines.push(`${headerPrefix} ${node.name}${attrStr}`);
        lines.push('');
      } else {
        lines.push(`${'  '.repeat(depth - 3)}- **${node.name}**${attrStr}`);
      }

      for (const child of node.children || []) {
        if (child.type === 'element') {
          walk(child, depth + 1);
        } else if (child.type === 'text' && child.text.trim()) {
          lines.push(`${'  '.repeat(Math.max(0, depth - 2))}${child.text.trim()}`);
        }
      }

      if (depth <= 3) {
        lines.push('');
      }
    }
  }

  walk(parsed.root, 1);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Converts structured Markdown headings, lists, and tables into XML
 * @param {string} mdString
 * @param {object} [options]
 * @returns {string} XML string
 */
export function markdownToXml(mdString, options = {}) {
  if (!mdString || !mdString.trim()) return '<document></document>';

  const lines = mdString.split(/\r?\n/);
  const rootTag = options.rootTag || 'document';
  const xmlLines = [`<${rootTag}>`];

  let inTable = false;
  let tableHeaders = [];

  function escapeXmlText(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      if (inTable) {
        xmlLines.push('  </table>');
        inTable = false;
      }
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells.map(c => c.replace(/[^a-zA-Z0-9_-]/g, '_') || 'col');
        xmlLines.push('  <table>');
      } else {
        xmlLines.push('    <row>');
        cells.forEach((cell, idx) => {
          const colName = tableHeaders[idx] || `col_${idx + 1}`;
          xmlLines.push(`      <${colName}>${escapeXmlText(cell)}</${colName}>`);
        });
        xmlLines.push('    </row>');
      }
      continue;
    } else if (inTable) {
      xmlLines.push('  </table>');
      inTable = false;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const title = hMatch[2].replace(/\s*\*\(.*?\)\*\s*$/, '').trim();
      xmlLines.push(`  <heading level="${level}">${escapeXmlText(title)}</heading>`);
      continue;
    }

    const listMatch = line.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      const content = listMatch[1];
      const kvMatch = content.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].replace(/[^a-zA-Z0-9_-]/g, '_') || 'item';
        const val = kvMatch[2];
        xmlLines.push(`  <${key}>${escapeXmlText(val)}</${key}>`);
      } else {
        xmlLines.push(`  <item>${escapeXmlText(content)}</item>`);
      }
      continue;
    }

    xmlLines.push(`  <paragraph>${escapeXmlText(line)}</paragraph>`);
  }

  if (inTable) {
    xmlLines.push('  </table>');
  }

  xmlLines.push(`</${rootTag}>`);
  return xmlLines.join('\n');
}

/**
 * Auto-detects data format: 'xml' | 'json' | 'yaml' | 'csv' | 'toml' | 'markdown' | 'txt'
 * @param {string} text
 * @returns {'xml'|'json'|'yaml'|'csv'|'toml'|'markdown'|'txt'}
 */
export function detectFormat(text) {
  if (!text || !text.trim()) return 'xml';
  const trimmed = text.trim();

  // 1. XML check: starts with <
  if (trimmed.startsWith('<')) {
    return 'xml';
  }

  // 2. JSON check: starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch (_) {}
  }

  // 3. TOML check: [section] or [[section]]
  if (/^\[\[?[a-zA-Z0-9_\-\.]+\]?\]/m.test(trimmed)) {
    return 'toml';
  }

  // 4. Markdown check: headings or tables
  if (/^#{1,6}\s+/m.test(trimmed) || /^\|.+?\|.+?\|/m.test(trimmed)) {
    return 'markdown';
  }

  // 5. CSV check: multiple lines with consistent commas, semicolons, or tabs
  const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
  if (lines.length >= 2) {
    const commaCount0 = (lines[0].match(/,/g) || []).length;
    const commaCount1 = (lines[1].match(/,/g) || []).length;
    if (commaCount0 > 0 && commaCount0 === commaCount1) {
      return 'csv';
    }
  }

  // 6. YAML check: key: value structure
  if (/^[a-zA-Z0-9_-]+\s*:\s*.+/m.test(trimmed) || /^\s*-\s+.+/m.test(trimmed)) {
    return 'yaml';
  }

  return 'txt';
}

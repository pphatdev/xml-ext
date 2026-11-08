/**
 * XML Analyzer
 * Deep inspection, structural metrics, complexity scoring, and tag frequency analysis.
 */

import { parseXml } from './parser.js';
import { minifyXml } from './minifier.js';

export function analyzeXml(xmlString) {
  const result = {
    general: {
      rawBytes: new TextEncoder().encode(xmlString || '').length,
      charCount: (xmlString || '').length,
      lineCount: (xmlString || '').split('\n').length,
      elementCount: 0,
      uniqueElementsCount: 0,
      attributeCount: 0,
      uniqueAttributesCount: 0,
      textNodeCount: 0,
      textCharCount: 0,
      commentCount: 0,
      cdataCount: 0,
      selfClosingCount: 0,
      rootTag: null,
      declaration: null
    },
    structure: {
      maxDepth: 0,
      avgDepth: 0,
      leafNodesCount: 0,
      branchNodesCount: 0,
      depthDistribution: {}
    },
    namespaces: [],
    elementFrequency: [],
    attributeFrequency: [],
    compression: {
      minifiedBytes: 0,
      savedBytes: 0,
      savingsPercent: 0
    },
    complexity: {
      score: 0,
      grade: 'Simple'
    }
  };

  if (!xmlString || !xmlString.trim()) {
    return result;
  }

  // Calculate compression potential
  try {
    const minified = minifyXml(xmlString);
    const minBytes = new TextEncoder().encode(minified).length;
    result.compression.minifiedBytes = minBytes;
    result.compression.savedBytes = Math.max(0, result.general.rawBytes - minBytes);
    result.compression.savingsPercent = result.general.rawBytes > 0
      ? Math.round((result.compression.savedBytes / result.general.rawBytes) * 1000) / 10
      : 0;
  } catch (_) {
    // If minify fails due to syntax error, leave 0
  }

  let parsed;
  try {
    parsed = parseXml(xmlString, { tolerant: true });
  } catch (err) {
    return result;
  }

  if (parsed.declaration) {
    result.general.declaration = parsed.declaration.attributes;
  }

  if (!parsed.root) {
    return result;
  }

  result.general.rootTag = parsed.root.name;

  const elementCounts = new Map();
  const attributeCounts = new Map();
  const namespacesSet = new Set();
  const depthCounts = {};
  let totalDepthSum = 0;

  function traverse(node, depth) {
    if (!node) return;

    if (node.type === 'element') {
      result.general.elementCount++;
      totalDepthSum += depth;

      // Depth distribution
      depthCounts[depth] = (depthCounts[depth] || 0) + 1;
      if (depth > result.structure.maxDepth) {
        result.structure.maxDepth = depth;
      }

      // Element counts
      const name = node.name;
      const elInfo = elementCounts.get(name) || {
        tag: name,
        count: 0,
        minDepth: depth,
        maxDepth: depth,
        attributeTotal: 0
      };
      elInfo.count++;
      elInfo.minDepth = Math.min(elInfo.minDepth, depth);
      elInfo.maxDepth = Math.max(elInfo.maxDepth, depth);

      // Attributes
      const attrs = node.attributes || {};
      const attrKeys = Object.keys(attrs);
      result.general.attributeCount += attrKeys.length;
      elInfo.attributeTotal += attrKeys.length;

      for (const k of attrKeys) {
        if (k === 'xmlns' || k.startsWith('xmlns:')) {
          namespacesSet.add(`${k}="${attrs[k]}"`);
        }
        const attrInfo = attributeCounts.get(k) || { name: k, count: 0, tags: new Set() };
        attrInfo.count++;
        attrInfo.tags.add(node.name);
        attributeCounts.set(k, attrInfo);
      }

      if (node.selfClosing) {
        result.general.selfClosingCount++;
      }

      elementCounts.set(name, elInfo);

      // Children check: leaf vs branch
      const elementChildren = (node.children || []).filter(c => c.type === 'element');
      if (elementChildren.length === 0) {
        result.structure.leafNodesCount++;
      } else {
        result.structure.branchNodesCount++;
      }

      // Traverse children
      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    } else if (node.type === 'text') {
      const trimmed = (node.text || '').trim();
      if (trimmed.length > 0) {
        result.general.textNodeCount++;
        result.general.textCharCount += trimmed.length;
      }
    } else if (node.type === 'comment') {
      result.general.commentCount++;
    } else if (node.type === 'cdata') {
      result.general.cdataCount++;
    }
  }

  traverse(parsed.root, 1);

  result.general.uniqueElementsCount = elementCounts.size;
  result.general.uniqueAttributesCount = attributeCounts.size;
  result.structure.depthDistribution = depthCounts;
  result.structure.avgDepth = result.general.elementCount > 0
    ? Math.round((totalDepthSum / result.general.elementCount) * 10) / 10
    : 0;

  // Format element frequencies
  const totalElements = result.general.elementCount || 1;
  result.elementFrequency = Array.from(elementCounts.values())
    .map(e => ({
      tag: e.tag,
      count: e.count,
      percentage: Math.round((e.count / totalElements) * 1000) / 10,
      depthRange: `${e.minDepth}..${e.maxDepth}`,
      avgAttrs: Math.round((e.attributeTotal / e.count) * 10) / 10
    }))
    .sort((a, b) => b.count - a.count);

  // Format attribute frequencies
  result.attributeFrequency = Array.from(attributeCounts.values())
    .map(a => ({
      name: a.name,
      count: a.count,
      tagsCount: a.tags.size,
      exampleTags: Array.from(a.tags).slice(0, 3).join(', ')
    }))
    .sort((a, b) => b.count - a.count);

  result.namespaces = Array.from(namespacesSet);

  // Calculate Complexity Score (0 - 100)
  // Factors: element count, unique elements, max depth, attribute density
  let score = 0;
  score += Math.min(30, (result.general.elementCount / 100) * 10);
  score += Math.min(25, result.general.uniqueElementsCount * 2);
  score += Math.min(25, result.structure.maxDepth * 4);
  score += Math.min(20, (result.general.attributeCount / Math.max(1, result.general.elementCount)) * 15);
  result.complexity.score = Math.min(100, Math.round(score));

  if (result.complexity.score < 25) {
    result.complexity.grade = 'Simple';
  } else if (result.complexity.score < 50) {
    result.complexity.grade = 'Moderate';
  } else if (result.complexity.score < 75) {
    result.complexity.grade = 'Complex';
  } else {
    result.complexity.grade = 'Very Complex';
  }

  return result;
}

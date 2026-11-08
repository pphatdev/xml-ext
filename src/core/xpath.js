/**
 * XPath Query Evaluator
 * Evaluates XPath expressions on XML documents.
 * Works natively in browser via DOMParser/XPathEvaluator, with a pure JS fallback for Deno/Node.
 */

export function evaluateXPath(xmlString, xpathExpr) {
  if (!xmlString || !xpathExpr) {
    return { results: [], count: 0, type: 'nodes' };
  }

  // 1. In browser with DOMParser & XPathEvaluator
  if (typeof DOMParser !== 'undefined' && typeof XPathEvaluator !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'application/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(parseError.textContent.split('\n')[0]);
      }

      const evaluator = new XPathEvaluator();
      const resolver = doc.createNSResolver(doc.documentElement);

      const result = evaluator.evaluate(
        xpathExpr,
        doc,
        resolver,
        XPathResult.ANY_TYPE,
        null
      );

      const items = [];

      if (result.resultType === XPathResult.NUMBER_TYPE) {
        return { results: [result.numberValue], count: 1, type: 'number' };
      }
      if (result.resultType === XPathResult.STRING_TYPE) {
        return { results: [result.stringValue], count: 1, type: 'string' };
      }
      if (result.resultType === XPathResult.BOOLEAN_TYPE) {
        return { results: [result.booleanValue], count: 1, type: 'boolean' };
      }

      // Node set
      const nodesResult = evaluator.evaluate(
        xpathExpr,
        doc,
        resolver,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < nodesResult.snapshotLength; i++) {
        const node = nodesResult.snapshotItem(i);
        if (node.nodeType === 1) { // Element
          items.push({
            type: 'element',
            name: node.nodeName,
            text: node.textContent,
            xml: new XMLSerializer().serializeToString(node)
          });
        } else if (node.nodeType === 2) { // Attribute
          items.push({
            type: 'attribute',
            name: node.nodeName,
            value: node.nodeValue
          });
        } else if (node.nodeType === 3) { // Text
          if (node.nodeValue.trim()) {
            items.push({
              type: 'text',
              value: node.nodeValue.trim()
            });
          }
        }
      }

      return { results: items, count: items.length, type: 'nodes' };
    } catch (err) {
      throw new Error(`XPath Error: ${err.message}`);
    }
  }

  // 2. Pure JS Fallback evaluator (for Deno test runner / CLI)
  return fallbackEvaluateXPath(xmlString, xpathExpr);
}

import { parseXml } from './parser.js';

function fallbackEvaluateXPath(xmlString, xpathExpr) {
  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) return { results: [], count: 0, type: 'nodes' };

  const expr = xpathExpr.trim();
  const results = [];

  // Match expressions like //tag, //tag/subtag, /root/tag, count(//tag), //tag[@attr='val']
  if (expr.startsWith('count(') && expr.endsWith(')')) {
    const inner = expr.slice(6, -1);
    const subRes = fallbackEvaluateXPath(xmlString, inner);
    return { results: [subRes.count], count: 1, type: 'number' };
  }

  function matchTag(node, tagName) {
    if (tagName === '*') return true;
    return node.name === tagName;
  }

  if (expr.startsWith('//')) {
    const rest = expr.slice(2);
    // Simple //tag or //tag[@attr="val"] or //tag/text()
    const parts = rest.split('/');
    const targetTag = parts[0].replace(/\[.*\]/, '');
    const attrMatch = parts[0].match(/\[@([a-zA-Z0-9_\-]+)\s*=\s*['"]([^'"]+)['"]\]/);

    function searchAll(node) {
      if (node.type === 'element') {
        let isMatch = matchTag(node, targetTag);
        if (isMatch && attrMatch) {
          const [, attrName, attrVal] = attrMatch;
          isMatch = node.attributes && node.attributes[attrName] === attrVal;
        }

        if (isMatch) {
          if (parts[1] === 'text()') {
            const texts = (node.children || []).filter(c => c.type === 'text').map(c => c.text.trim());
            for (const t of texts) {
              if (t) results.push({ type: 'text', value: t });
            }
          } else {
            results.push({
              type: 'element',
              name: node.name,
              attributes: node.attributes,
              text: (node.children || []).filter(c => c.type === 'text').map(c => c.text).join('')
            });
          }
        }

        if (node.children) {
          for (const c of node.children) {
            searchAll(c);
          }
        }
      }
    }

    searchAll(parsed.root);
  } else if (expr.startsWith('/')) {
    // Exact path /root/tag
    const parts = expr.split('/').filter(Boolean);
    let currentNodes = [parsed.root];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === 'text()') {
        const textResults = [];
        for (const n of currentNodes) {
          const texts = (n.children || []).filter(c => c.type === 'text').map(c => c.text.trim());
          for (const t of texts) {
            if (t) textResults.push({ type: 'text', value: t });
          }
        }
        return { results: textResults, count: textResults.length, type: 'nodes' };
      }

      const nextNodes = [];
      for (const n of currentNodes) {
        if (i === 0) {
          if (matchTag(n, part)) nextNodes.push(n);
        } else if (n.children) {
          for (const c of n.children) {
            if (c.type === 'element' && matchTag(c, part)) {
              nextNodes.push(c);
            }
          }
        }
      }
      currentNodes = nextNodes;
    }

    for (const n of currentNodes) {
      results.push({
        type: 'element',
        name: n.name,
        attributes: n.attributes,
        text: (n.children || []).filter(c => c.type === 'text').map(c => c.text).join('')
      });
    }
  }

  return { results, count: results.length, type: 'nodes' };
}


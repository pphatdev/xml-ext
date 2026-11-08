/**
 * XML Diff Engine
 * Compares two XML strings and identifies structural, attribute, and text changes.
 */

import { parseXml } from './parser.js';

export function diffXml(xmlA, xmlB) {
  const parsedA = parseXml(xmlA || '', { tolerant: true });
  const parsedB = parseXml(xmlB || '', { tolerant: true });

  const diffs = [];

  function compareNodes(nodeA, nodeB, path = '') {
    const curPath = path ? `${path}/${(nodeA || nodeB).name}` : `/${(nodeA || nodeB).name}`;

    if (!nodeA && nodeB) {
      diffs.push({
        type: 'added',
        path: curPath,
        name: nodeB.name,
        message: `Element <${nodeB.name}> added`,
        node: nodeB
      });
      return;
    }

    if (nodeA && !nodeB) {
      diffs.push({
        type: 'removed',
        path: curPath,
        name: nodeA.name,
        message: `Element <${nodeA.name}> removed`,
        node: nodeA
      });
      return;
    }

    // Compare attributes
    const attrsA = nodeA.attributes || {};
    const attrsB = nodeB.attributes || {};
    const allAttrKeys = Array.from(new Set([...Object.keys(attrsA), ...Object.keys(attrsB)]));

    for (const key of allAttrKeys) {
      if (attrsA[key] === undefined && attrsB[key] !== undefined) {
        diffs.push({
          type: 'attr_added',
          path: `${curPath}/@${key}`,
          message: `Attribute @${key} added with value "${attrsB[key]}"`,
          newValue: attrsB[key]
        });
      } else if (attrsA[key] !== undefined && attrsB[key] === undefined) {
        diffs.push({
          type: 'attr_removed',
          path: `${curPath}/@${key}`,
          message: `Attribute @${key} removed (was "${attrsA[key]}")`,
          oldValue: attrsA[key]
        });
      } else if (attrsA[key] !== attrsB[key]) {
        diffs.push({
          type: 'attr_changed',
          path: `${curPath}/@${key}`,
          message: `Attribute @${key} changed from "${attrsA[key]}" to "${attrsB[key]}"`,
          oldValue: attrsA[key],
          newValue: attrsB[key]
        });
      }
    }

    // Compare immediate text
    const textA = (nodeA.children || []).filter(c => c.type === 'text').map(c => c.text.trim()).join(' ');
    const textB = (nodeB.children || []).filter(c => c.type === 'text').map(c => c.text.trim()).join(' ');

    if (textA !== textB) {
      diffs.push({
        type: 'text_changed',
        path: `${curPath}/text()`,
        message: `Text changed from "${textA}" to "${textB}"`,
        oldValue: textA,
        newValue: textB
      });
    }

    // Compare element children
    const elemChildrenA = (nodeA.children || []).filter(c => c.type === 'element');
    const elemChildrenB = (nodeB.children || []).filter(c => c.type === 'element');

    const maxLen = Math.max(elemChildrenA.length, elemChildrenB.length);
    for (let i = 0; i < maxLen; i++) {
      compareNodes(elemChildrenA[i], elemChildrenB[i], curPath);
    }
  }

  if (parsedA.root || parsedB.root) {
    compareNodes(parsedA.root, parsedB.root, '');
  }

  const counts = {
    added: diffs.filter(d => d.type === 'added' || d.type === 'attr_added').length,
    removed: diffs.filter(d => d.type === 'removed' || d.type === 'attr_removed').length,
    changed: diffs.filter(d => d.type === 'attr_changed' || d.type === 'text_changed').length
  };

  return {
    identical: diffs.length === 0,
    diffs,
    counts,
    totalDiffs: diffs.length
  };
}

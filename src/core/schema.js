/**
 * XML Schema (XSD) & Rule Validator
 */

import { parseXml } from './parser.js';

export function validateXmlSchema(xmlString, schemaRules = {}) {
  const result = {
    valid: true,
    errors: [],
    checkedCount: 0
  };

  const parsed = parseXml(xmlString, { tolerant: true });
  if (!parsed.root) {
    result.valid = false;
    result.errors.push({ message: 'Cannot validate schema: document has no root element' });
    return result;
  }

  // 1. Root element check
  if (schemaRules.rootElement && parsed.root.name !== schemaRules.rootElement) {
    result.valid = false;
    result.errors.push({
      line: parsed.root.line || 1,
      message: `Root element must be <${schemaRules.rootElement}>, found <${parsed.root.name}>`
    });
  }

  // 2. Element and Attribute rules
  const elementRules = schemaRules.elements || {};

  function checkNode(node) {
    if (!node || node.type !== 'element') return;
    result.checkedCount++;

    const rule = elementRules[node.name];
    if (rule) {
      // Required attributes check
      if (rule.requiredAttributes) {
        for (const reqAttr of rule.requiredAttributes) {
          if (!node.attributes || !node.attributes.hasOwnProperty(reqAttr)) {
            result.valid = false;
            result.errors.push({
              line: node.line || 1,
              message: `Element <${node.name}> is missing required attribute "${reqAttr}"`
            });
          }
        }
      }

      // Required child tags check
      if (rule.requiredChildren) {
        const childNames = (node.children || []).filter(c => c.type === 'element').map(c => c.name);
        for (const reqChild of rule.requiredChildren) {
          if (!childNames.includes(reqChild)) {
            result.valid = false;
            result.errors.push({
              line: node.line || 1,
              message: `Element <${node.name}> is missing required child element <${reqChild}>`
            });
          }
        }
      }

      // Max occurs check
      if (rule.maxOccurs !== undefined) {
        // Handled in parent
      }
    }

    if (node.children) {
      for (const child of node.children) {
        checkNode(child);
      }
    }
  }

  checkNode(parsed.root);
  return result;
}


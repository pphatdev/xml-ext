/**
 * XML Linter
 * Provides static analysis, code quality checks, and best practice diagnostics.
 */

import { parseXml } from './parser.js';

export const LINT_RULES = {
  XML_DECLARATION_FIRST: 'xml-decl-first-line',
  XML_DECLARATION_ENCODING: 'xml-decl-encoding',
  NO_DUPLICATE_ATTRS: 'no-duplicate-attrs',
  PREFER_SELF_CLOSING: 'prefer-self-closing',
  NO_TRAILING_WHITESPACE: 'no-trailing-whitespace',
  UNESCAPED_AMPERSAND: 'unescaped-ampersand',
  TAG_NAME_FORMAT: 'tag-name-format',
  EMPTY_DOCUMENT: 'empty-document',
  SINGLE_ROOT: 'single-root-element',
  PROPER_QUOTES: 'proper-attribute-quotes'
};

export function lintXml(xmlString, options = {}) {
  const issues = [];
  const {
    requireDecl = false,
    preferSelfClosing = true,
    checkTrailingSpaces = true
  } = options;

  if (!xmlString || !xmlString.trim()) {
    issues.push({
      line: 1,
      column: 1,
      severity: 'error',
      rule: LINT_RULES.EMPTY_DOCUMENT,
      message: 'Document is completely empty.',
      suggestion: 'Add XML declaration and a root element.'
    });
    return { issues, stats: summarize(issues) };
  }

  const lines = xmlString.split('\n');

  // Rule 1: Trailing whitespace check
  if (checkTrailingSpaces) {
    for (let i = 0; i < lines.length; i++) {
      if (/[ \t]+$/.test(lines[i])) {
        issues.push({
          line: i + 1,
          column: lines[i].trimEnd().length + 1,
          severity: 'info',
          rule: LINT_RULES.NO_TRAILING_WHITESPACE,
          message: 'Line contains trailing whitespace.',
          suggestion: 'Trim trailing spaces or tabs.'
        });
      }
    }
  }

  // Rule 2: XML Declaration checks
  const trimmed = xmlString.trimStart();
  const hasDecl = trimmed.startsWith('<?xml');
  if (hasDecl) {
    if (!xmlString.startsWith('<?xml')) {
      issues.push({
        line: 1,
        column: 1,
        severity: 'error',
        rule: LINT_RULES.XML_DECLARATION_FIRST,
        message: 'XML declaration must be at the very start of the document (line 1, column 1).',
        suggestion: 'Move <?xml ...?> to the beginning without leading whitespace or comments.'
      });
    }

    const declMatch = xmlString.match(/<\?xml\s+([^?]+)\?>/i);
    if (declMatch) {
      const declBody = declMatch[1];
      if (!/encoding=["'][^"']+["']/i.test(declBody)) {
        issues.push({
          line: 1,
          column: 1,
          severity: 'info',
          rule: LINT_RULES.XML_DECLARATION_ENCODING,
          message: 'XML declaration does not specify encoding.',
          suggestion: 'Add encoding="UTF-8" to the declaration.'
        });
      }
    }
  } else if (requireDecl) {
    issues.push({
      line: 1,
      column: 1,
      severity: 'info',
      rule: 'xml-decl-missing',
      message: 'Document is missing standard XML declaration.',
      suggestion: 'Add <?xml version="1.0" encoding="UTF-8"?> at top of file.'
    });
  }

  // Rule 3: Unescaped ampersand check in text
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Ignore inside comments or CDATA
    if (l.includes('<!--') || l.includes('<![CDATA[')) continue;

    const regex = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g;
    let match;
    while ((match = regex.exec(l)) !== null) {
      issues.push({
        line: i + 1,
        column: match.index + 1,
        severity: 'error',
        rule: LINT_RULES.UNESCAPED_AMPERSAND,
        message: `Bare '&' character detected outside of an entity reference.`,
        suggestion: `Replace '&' with '&amp;'`
      });
    }
  }

  // Parse and check AST-level rules
  try {
    const parsed = parseXml(xmlString, { tolerant: true });

    // Parser errors become lint errors
    if (parsed.errors) {
      for (const err of parsed.errors) {
        issues.push({
          line: err.line || 1,
          column: err.column || 1,
          severity: 'error',
          rule: 'syntax-error',
          message: err.message,
          suggestion: 'Fix syntax mismatch or missing tag.'
        });
      }
    }

    // Inspect AST for self-closing recommendation and naming conventions
    if (parsed.root) {
      traverseAst(parsed.root, (node) => {
        // Empty tag self-closing recommendation
        if (preferSelfClosing && node.type === 'element' && !node.selfClosing) {
          const hasChildren = node.children && node.children.length > 0;
          if (!hasChildren) {
            issues.push({
              line: node.line || 1,
              column: node.column || 1,
              severity: 'info',
              rule: LINT_RULES.PREFER_SELF_CLOSING,
              message: `Element <${node.name}></${node.name}> is empty and can be self-closed.`,
              suggestion: `Use <${node.name}/> instead.`
            });
          }
        }

        // Tag naming convention
        if (node.type === 'element' && node.name) {
          if (/[A-Z]/.test(node.name) && /[a-z]/.test(node.name) && node.name.includes('-')) {
            // Mixed case with dashes might be intentional, but flag unusual patterns
          }
        }
      });
    }
  } catch (err) {
    issues.push({
      line: err.line || 1,
      column: err.column || 1,
      severity: 'error',
      rule: 'parser-exception',
      message: err.message
    });
  }

  // Sort issues by line then column
  issues.sort((a, b) => (a.line - b.line) || (a.column - b.column));

  return {
    issues,
    stats: summarize(issues)
  };
}

function traverseAst(node, callback) {
  if (!node) return;
  callback(node);
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      traverseAst(child, callback);
    }
  }
}

function summarize(issues) {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const issue of issues) {
    if (issue.severity === 'error') errors++;
    else if (issue.severity === 'warning') warnings++;
    else if (issue.severity === 'info') infos++;
  }
  return { errors, warnings, infos, total: issues.length };
}

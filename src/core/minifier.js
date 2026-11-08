/**
 * XML Minifier
 * Compresses XML documents by removing superfluous whitespace, comments, and empty tag expansions.
 */

export function minifyXml(xmlString, options = {}) {
  const {
    removeComments = true,
    removeDeclaration = false,
    collapseWhitespace = true,
    selfCloseEmpty = true
  } = options;

  if (!xmlString) return '';

  let result = xmlString;

  // 1. Remove comments if requested
  if (removeComments) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }

  // 2. Remove declaration if requested
  if (removeDeclaration) {
    result = result.replace(/<\?xml[\s\S]*?\?>/g, '');
  }

  // 3. Preserve CDATA sections during whitespace compression
  const cdataPlaceholders = [];
  result = result.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (match) => {
    const key = `___CDATA_BLOCK_${cdataPlaceholders.length}___`;
    cdataPlaceholders.push({ key, content: match });
    return key;
  });

  // 4. Collapse whitespace between tags
  if (collapseWhitespace) {
    // Trim whitespace around tags
    result = result.replace(/>\s+</g, '><');
    // Normalize spaces inside tags (between attributes)
    result = result.replace(/<([a-zA-Z0-9.\-_:]+)(\s+[^>]*?)?>/g, (match, tagName, attrs) => {
      if (!attrs) return `<${tagName}>`;
      const cleanAttrs = attrs.replace(/\s+/g, ' ').trim();
      return `<${tagName} ${cleanAttrs}>`;
    });
    // Trim leading/trailing whitespace
    result = result.trim();
  }

  // 5. Self-close empty tags: <tag></tag> -> <tag/>
  if (selfCloseEmpty) {
    result = result.replace(/<([a-zA-Z0-9.\-_:]+)([^>]*)><\/\1>/g, '<$1$2/>');
  }

  // 6. Restore CDATA
  for (const item of cdataPlaceholders) {
    result = result.replace(item.key, item.content);
  }

  return result;
}

export function getMinifyStats(originalXml, minifiedXml) {
  const origBytes = new TextEncoder().encode(originalXml || '').length;
  const minBytes = new TextEncoder().encode(minifiedXml || '').length;
  const savedBytes = Math.max(0, origBytes - minBytes);
  const savingsPercent = origBytes > 0
    ? Math.round((savedBytes / origBytes) * 1000) / 10
    : 0;

  return {
    originalBytes: origBytes,
    minifiedBytes: minBytes,
    savedBytes,
    savingsPercent
  };
}


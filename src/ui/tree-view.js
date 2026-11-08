/**
 * Interactive XML Tree View Component
 */

import { xmlToTree } from '../core/converter.js';
import { showToast } from './toast.js';

export class XmlTreeView {
  constructor(containerEl) {
    this.container = containerEl;
    this.rootNode = null;
    this.searchQuery = '';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="tree-wrapper">
        <div class="tree-toolbar">
          <div class="tree-search-wrap">
            <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
            <input type="text" id="tree-search-input" class="tree-search-input" placeholder="Search tree (tag, attribute, text)..." />
          </div>
          <div class="tree-actions">
            <button type="button" id="btn-tree-expand-all" class="btn-sm" title="Expand All">Expand All</button>
            <button type="button" id="btn-tree-collapse-all" class="btn-sm" title="Collapse All">Collapse All</button>
          </div>
        </div>
        <div class="tree-content" id="tree-content">
          <div class="tree-empty-state">No XML loaded. Enter or paste XML to explore the DOM Tree.</div>
        </div>
      </div>
    `;

    this.contentEl = this.container.querySelector('#tree-content');
    this.searchInput = this.container.querySelector('#tree-search-input');

    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.refreshTree();
    });

    this.container.querySelector('#btn-tree-expand-all').addEventListener('click', () => {
      this.toggleAll(true);
    });

    this.container.querySelector('#btn-tree-collapse-all').addEventListener('click', () => {
      this.toggleAll(false);
    });
  }

  loadXml(xmlString) {
    if (!xmlString || !xmlString.trim()) {
      this.rootNode = null;
      this.contentEl.innerHTML = `<div class="tree-empty-state">No XML loaded. Enter or paste XML to explore the DOM Tree.</div>`;
      return;
    }

    try {
      this.rootNode = xmlToTree(xmlString);
      if (!this.rootNode) {
        this.contentEl.innerHTML = `<div class="tree-empty-state error">Failed to parse XML tree.</div>`;
        return;
      }
      this.refreshTree();
    } catch (err) {
      this.contentEl.innerHTML = `<div class="tree-empty-state error">Tree render error: ${err.message}</div>`;
    }
  }

  refreshTree() {
    if (!this.rootNode) return;
    this.contentEl.innerHTML = '';
    const rootEl = this.renderNode(this.rootNode, true);
    this.contentEl.appendChild(rootEl);
  }

  renderNode(node, isRoot = false) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';
    nodeEl.dataset.id = node.id;

    if (node.type === 'text') {
      const isMatch = this.searchQuery && node.text.toLowerCase().includes(this.searchQuery);
      nodeEl.innerHTML = `
        <div class="tree-node-row tree-leaf ${isMatch ? 'highlight-match' : ''}">
          <span class="tree-node-icon">
            <svg class="icon-tiny" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 1a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h5a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span class="tree-text-content">"${escapeHtml(node.text)}"</span>
          <button type="button" class="btn-copy-xpath" title="Copy XPath" data-xpath="${escapeHtml(node.xpath)}">XPath</button>
        </div>
      `;
      this.bindCopyXpath(nodeEl);
      return nodeEl;
    }

    if (node.type === 'cdata') {
      nodeEl.innerHTML = `
        <div class="tree-node-row tree-cdata">
          <span class="tree-badge cdata-badge">CDATA</span>
          <span class="tree-text-content">${escapeHtml(node.text)}</span>
        </div>
      `;
      return nodeEl;
    }

    if (node.type === 'comment') {
      nodeEl.innerHTML = `
        <div class="tree-node-row tree-comment">
          <span class="tree-node-icon">
            <svg class="icon-tiny" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span class="tree-comment-content">&lt;!-- ${escapeHtml(node.text)} --&gt;</span>
        </div>
      `;
      return nodeEl;
    }

    // Element node
    const hasChildren = node.children && node.children.length > 0;
    const isMatch = this.searchQuery && (
      node.name.toLowerCase().includes(this.searchQuery) ||
      Object.entries(node.attributes || {}).some(([k, v]) =>
        k.toLowerCase().includes(this.searchQuery) || String(v).toLowerCase().includes(this.searchQuery)
      ) ||
      (node.inlineText && node.inlineText.toLowerCase().includes(this.searchQuery))
    );

    // Auto-expand if root or matches search
    const shouldExpand = isRoot || Boolean(this.searchQuery && isMatch);

    const row = document.createElement('div');
    row.className = `tree-node-row ${isMatch ? 'highlight-match' : ''}`;

    let toggleHtml = '';
    if (hasChildren) {
      toggleHtml = `
        <button type="button" class="tree-toggle ${shouldExpand ? 'expanded' : ''}" aria-label="Toggle node">
          <svg class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
          </svg>
        </button>
      `;
    } else {
      toggleHtml = `<span class="tree-toggle-placeholder"></span>`;
    }

    // Attributes HTML
    let attrsHtml = '';
    if (node.attributes) {
      for (const [k, v] of Object.entries(node.attributes)) {
        attrsHtml += ` <span class="attr-pill"><span class="attr-name">${escapeHtml(k)}</span>=<span class="attr-val">"${escapeHtml(String(v))}"</span></span>`;
      }
    }

    // Inline text preview if leaf with text
    let inlineHtml = '';
    if (node.inlineText) {
      inlineHtml = ` <span class="tree-inline-val">"${escapeHtml(node.inlineText)}"</span>`;
    }

    // Child count badge
    let childBadgeHtml = '';
    if (hasChildren) {
      const elemCount = node.children.filter(c => c.type === 'element').length;
      if (elemCount > 0) {
        childBadgeHtml = ` <span class="tree-child-count">${elemCount}</span>`;
      }
    }

    row.innerHTML = `
      ${toggleHtml}
      <span class="tree-tag-name">&lt;${escapeHtml(node.name)}&gt;</span>
      ${attrsHtml}
      ${inlineHtml}
      ${childBadgeHtml}
      <button type="button" class="btn-copy-xpath" title="Copy XPath: ${escapeHtml(node.xpath)}" data-xpath="${escapeHtml(node.xpath)}">XPath</button>
    `;

    nodeEl.appendChild(row);

    if (hasChildren) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = `tree-children ${shouldExpand ? '' : 'hidden'}`;

      for (const child of node.children) {
        childrenContainer.appendChild(this.renderNode(child, false));
      }
      nodeEl.appendChild(childrenContainer);

      const toggleBtn = row.querySelector('.tree-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = childrenContainer.classList.toggle('hidden');
          toggleBtn.classList.toggle('expanded', !isHidden);
        });
      }
    }

    this.bindCopyXpath(row);
    return nodeEl;
  }

  bindCopyXpath(container) {
    const btn = container.querySelector('.btn-copy-xpath');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const xpath = btn.dataset.xpath;
      if (xpath) {
        navigator.clipboard.writeText(xpath);
        showToast(`Copied XPath: ${xpath}`, 'success');
      }
    });
  }

  toggleAll(expand) {
    const childrenContainers = this.contentEl.querySelectorAll('.tree-children');
    for (const c of childrenContainers) {
      c.classList.toggle('hidden', !expand);
    }
    const toggles = this.contentEl.querySelectorAll('.tree-toggle');
    for (const t of toggles) {
      t.classList.toggle('expanded', expand);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


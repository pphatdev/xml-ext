/**
 * Documentation Application Coordinator
 * Handles documentation rendering, table of contents, searching,
 * and user posting/uploading of Markdown files.
 */

import { BUILTIN_DOCS } from './docs-data.js';
import { parseMarkdown } from '../core/markdown.js';
import { initTheme, toggleTheme } from '../ui/theme.js';
import { showToast } from '../ui/toast.js';

const CUSTOM_DOCS_KEY = 'xml_ext_custom_docs';

export class DocsApp {
  constructor() {
    this.docs = [...BUILTIN_DOCS];
    this.activeDocId = 'getting-started';
    this.searchQuery = '';
    this.loadCustomDocs();
  }

  init() {
    initTheme();
    this.initElements();
    this.initEvents();

    // Check URL hash (e.g. #features)
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && this.docs.some(d => d.id === hash)) {
      this.activeDocId = hash;
    }

    this.renderNav();
    this.renderActiveDoc();
  }

  initElements() {
    this.navListEl = document.getElementById('docs-nav-list');
    this.contentPane = document.getElementById('docs-content-pane');
    this.tocListEl = document.getElementById('docs-toc-list');
    this.searchInput = document.getElementById('docs-search-input');
    this.postModal = document.getElementById('post-doc-modal');
    this.fileInput = document.getElementById('md-file-input');
  }

  initEvents() {
    // Theme toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      toggleTheme();
    });

    // Search filter
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderNav();
    });

    // Open Post Doc Modal
    document.getElementById('btn-open-post-modal').addEventListener('click', () => {
      this.showPostModal();
    });

    // Upload .md file button
    document.getElementById('btn-upload-md').addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileUpload(file);
      }
      this.fileInput.value = '';
    });

    // Modal Close
    document.getElementById('btn-close-post-modal').addEventListener('click', () => {
      this.hidePostModal();
    });

    this.postModal.addEventListener('click', (e) => {
      if (e.target === this.postModal) this.hidePostModal();
    });

    // Modal tabs: Edit vs Live Preview
    const modalTabs = this.postModal.querySelectorAll('.modal-tabs .tab-btn');
    const editPane = document.getElementById('post-pane-edit');
    const previewPane = document.getElementById('post-pane-preview');
    const mdContentInput = document.getElementById('post-content-input');
    const previewContainer = document.getElementById('post-preview-container');

    modalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        modalTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isPreview = tab.dataset.tab === 'preview';
        editPane.classList.toggle('hidden', isPreview);
        previewPane.classList.toggle('hidden', !isPreview);

        if (isPreview) {
          const parsed = parseMarkdown(mdContentInput.value);
          previewContainer.innerHTML = parsed.html || '<p class="text-muted">No content to preview.</p>';
        }
      });
    });

    // Modal Submit
    document.getElementById('btn-submit-post-doc').addEventListener('click', () => {
      this.submitCustomDoc();
    });

    // Modal Drag and drop zone
    const dropZone = document.getElementById('post-drop-zone');
    dropZone.addEventListener('click', () => this.fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    // Listen to hash change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && this.docs.some(d => d.id === hash)) {
        this.activeDocId = hash;
        this.renderNav();
        this.renderActiveDoc();
      }
    });
  }

  loadCustomDocs() {
    try {
      const saved = localStorage.getItem(CUSTOM_DOCS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.docs = [...BUILTIN_DOCS, ...parsed];
        }
      }
    } catch (_) {}
  }

  saveCustomDocs() {
    const customOnly = this.docs.filter(d => d.isCustom);
    localStorage.setItem(CUSTOM_DOCS_KEY, JSON.stringify(customOnly));
  }

  renderNav() {
    const filtered = this.docs.filter(d => {
      if (!this.searchQuery) return true;
      return d.title.toLowerCase().includes(this.searchQuery) ||
             d.category.toLowerCase().includes(this.searchQuery) ||
             d.content.toLowerCase().includes(this.searchQuery);
    });

    // Group by category
    const categories = {};
    for (const doc of filtered) {
      const cat = doc.category || 'General';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(doc);
    }

    if (filtered.length === 0) {
      this.navListEl.innerHTML = `<div class="text-muted" style="padding: 1rem 0.5rem; font-size: 0.8rem;">No documents match "${escapeHtml(this.searchQuery)}"</div>`;
      return;
    }

    let html = '';
    for (const [catName, docList] of Object.entries(categories)) {
      html += `
        <div class="docs-group">
          <div class="docs-group-title">${escapeHtml(catName)}</div>
          ${docList.map(doc => `
            <a href="#${doc.id}" class="docs-nav-item ${doc.id === this.activeDocId ? 'active' : ''}" data-id="${doc.id}">
              <span>${escapeHtml(doc.title)}</span>
              ${doc.isCustom ? '<span class="doc-custom-tag">Custom</span>' : ''}
            </a>
          `).join('')}
        </div>
      `;
    }

    this.navListEl.innerHTML = html;

    // Click handler on nav items
    const navItems = this.navListEl.querySelectorAll('.docs-nav-item');
    for (const item of navItems) {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const id = item.dataset.id;
        this.activeDocId = id;
        window.location.hash = id;
        this.renderNav();
        this.renderActiveDoc();
      });
    }
  }

  renderActiveDoc() {
    const doc = this.docs.find(d => d.id === this.activeDocId) || this.docs[0];
    if (!doc) return;

    // Parse Markdown
    const parsed = parseMarkdown(doc.content);

    // Estimate reading time
    const wordCount = doc.content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Render Main Content
    this.contentPane.innerHTML = `
      <div class="doc-top-bar">
        <div class="doc-badge-group">
          <span class="doc-category-badge">${escapeHtml(doc.category)}</span>
          <span class="doc-path-tag">${escapeHtml(doc.path || 'custom')}</span>
          <span class="text-dim" style="font-size: 0.72rem;">• ${readingTime} min read</span>
        </div>
        <div class="doc-actions-group">
          <button type="button" id="btn-download-md" class="btn-sm" title="Download Markdown file">
            <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
            Download .md
          </button>
          ${doc.isCustom ? `
            <button type="button" id="btn-delete-doc" class="btn-sm" style="color: var(--error);" title="Delete custom document">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              Delete
            </button>
          ` : ''}
        </div>
      </div>

      <article class="markdown-body">
        ${parsed.html}
      </article>
    `;

    // Bind Copy Code buttons
    const copyBtns = this.contentPane.querySelectorAll('.btn-copy-code');
    for (const btn of copyBtns) {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        if (code) {
          navigator.clipboard.writeText(code);
          showToast('Code copied to clipboard', 'success');
        }
      });
    }

    // Bind Download .md
    document.getElementById('btn-download-md').addEventListener('click', () => {
      this.downloadMarkdownFile(doc);
    });

    // Bind Delete if custom
    const deleteBtn = document.getElementById('btn-delete-doc');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete custom document "${doc.title}"?`)) {
          this.docs = this.docs.filter(d => d.id !== doc.id);
          this.saveCustomDocs();
          this.activeDocId = 'getting-started';
          this.renderNav();
          this.renderActiveDoc();
          showToast('Document deleted', 'info');
        }
      });
    }

    // Render Table of Contents in right sidebar
    this.renderTableOfContents(parsed.headings);

    // Scroll content pane to top
    this.contentPane.scrollTop = 0;
  }

  renderTableOfContents(headings) {
    if (!headings || headings.length === 0) {
      this.tocListEl.innerHTML = `<span class="text-dim" style="font-size: 0.75rem;">No sections detected.</span>`;
      return;
    }

    const filtered = headings.filter(h => h.level >= 2 && h.level <= 3);

    this.tocListEl.innerHTML = filtered.map(h => `
      <a href="#${h.id}" class="toc-item level-${h.level}">
        ${escapeHtml(h.text)}
      </a>
    `).join('');

    // Smooth scroll to heading when TOC link is clicked
    const tocLinks = this.tocListEl.querySelectorAll('.toc-item');
    for (const link of tocLinks) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').replace(/^#/, '');
        const targetEl = this.contentPane.querySelector(`#${targetId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  showPostModal() {
    this.postModal.classList.remove('hidden');
    document.getElementById('post-title-input').focus();
  }

  hidePostModal() {
    this.postModal.classList.add('hidden');
  }

  handleFileUpload(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;

      // Extract title from first # Heading if available, otherwise filename
      let title = file.name.replace(/\.(md|markdown|txt)$/i, '');
      const firstHeadingMatch = content.match(/^#\s+(.+)$/m);
      if (firstHeadingMatch) {
        title = firstHeadingMatch[1].trim();
      }

      const id = 'custom-' + Date.now();
      const newDoc = {
        id,
        title,
        category: 'Custom Docs',
        description: `Uploaded from ${file.name}`,
        path: `docs/${file.name}`,
        content,
        isCustom: true
      };

      this.docs.push(newDoc);
      this.saveCustomDocs();
      this.activeDocId = id;
      this.hidePostModal();
      this.renderNav();
      this.renderActiveDoc();
      showToast(`Posted "${title}" from ${file.name}!`, 'success');
    };

    reader.onerror = () => {
      showToast(`Failed to read file ${file.name}`, 'error');
    };

    reader.readAsText(file);
  }

  submitCustomDoc() {
    const title = document.getElementById('post-title-input').value.trim();
    const category = document.getElementById('post-category-input').value.trim() || 'Custom Docs';
    const content = document.getElementById('post-content-input').value.trim();

    if (!title) {
      showToast('Please provide a document title', 'warning');
      return;
    }

    if (!content) {
      showToast('Please provide document markdown content', 'warning');
      return;
    }

    const id = 'custom-' + Date.now();
    const newDoc = {
      id,
      title,
      category,
      description: `User-posted document`,
      path: `docs/${title.toLowerCase().replace(/\s+/g, '-')}.md`,
      content,
      isCustom: true
    };

    this.docs.push(newDoc);
    this.saveCustomDocs();
    this.activeDocId = id;
    this.hidePostModal();

    // Clear form
    document.getElementById('post-title-input').value = '';
    document.getElementById('post-content-input').value = '';

    this.renderNav();
    this.renderActiveDoc();
    showToast(`Posted document "${title}"!`, 'success');
  }

  downloadMarkdownFile(doc) {
    const filename = `${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Bootstrap DocsApp
document.addEventListener('DOMContentLoaded', () => {
  const app = new DocsApp();
  app.init();
  window.__DOCS_APP__ = app;
});

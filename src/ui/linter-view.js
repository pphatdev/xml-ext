/**
 * Linter Diagnostics View
 * Displays syntax and quality diagnostics with line jump integration.
 */

import { lintXml } from '../core/linter.js';

export class XmlLinterView {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onJumpToLine = options.onJumpToLine || (() => {});
    this.currentFilter = 'all'; // 'all' | 'error' | 'warning' | 'info'
    this.issues = [];
    this.stats = { errors: 0, warnings: 0, infos: 0, total: 0 };
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="linter-wrapper">
        <div class="linter-header">
          <div class="linter-stats">
            <span class="linter-badge badge-error" id="badge-errors">0 Errors</span>
            <span class="linter-badge badge-warning" id="badge-warnings">0 Warnings</span>
            <span class="linter-badge badge-info" id="badge-infos">0 Info</span>
          </div>
          <div class="linter-filters">
            <button type="button" class="btn-filter active" data-filter="all">All</button>
            <button type="button" class="btn-filter" data-filter="error">Errors</button>
            <button type="button" class="btn-filter" data-filter="warning">Warnings</button>
            <button type="button" class="btn-filter" data-filter="info">Info</button>
          </div>
        </div>
        <div class="linter-list" id="linter-issues-list">
          <div class="linter-empty-state">No issues detected. XML conforms to all lint rules.</div>
        </div>
      </div>
    `;

    this.listEl = this.container.querySelector('#linter-issues-list');
    this.badgeErrors = this.container.querySelector('#badge-errors');
    this.badgeWarnings = this.container.querySelector('#badge-warnings');
    this.badgeInfos = this.container.querySelector('#badge-infos');

    const filterBtns = this.container.querySelectorAll('.btn-filter');
    for (const btn of filterBtns) {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderIssues();
      });
    }
  }

  lint(xmlString) {
    if (!xmlString || !xmlString.trim()) {
      this.issues = [];
      this.stats = { errors: 0, warnings: 0, infos: 0, total: 0 };
      this.updateBadges();
      this.listEl.innerHTML = `<div class="linter-empty-state">Document is empty. Enter XML to run the linter.</div>`;
      return;
    }

    const result = lintXml(xmlString);
    this.issues = result.issues;
    this.stats = result.stats;

    this.updateBadges();
    this.renderIssues();
  }

  updateBadges() {
    this.badgeErrors.textContent = `${this.stats.errors} Error${this.stats.errors === 1 ? '' : 's'}`;
    this.badgeWarnings.textContent = `${this.stats.warnings} Warning${this.stats.warnings === 1 ? '' : 's'}`;
    this.badgeInfos.textContent = `${this.stats.infos} Info`;

    this.badgeErrors.classList.toggle('has-items', this.stats.errors > 0);
    this.badgeWarnings.classList.toggle('has-items', this.stats.warnings > 0);
    this.badgeInfos.classList.toggle('has-items', this.stats.infos > 0);
  }

  renderIssues() {
    const filtered = this.issues.filter(issue => {
      if (this.currentFilter === 'all') return true;
      return issue.severity === this.currentFilter;
    });

    if (filtered.length === 0) {
      this.listEl.innerHTML = `<div class="linter-empty-state success">✓ No issues found under "${this.currentFilter}" filter!</div>`;
      return;
    }

    this.listEl.innerHTML = '';
    for (const issue of filtered) {
      const item = document.createElement('div');
      item.className = `linter-issue-item severity-${issue.severity}`;
      item.innerHTML = `
        <div class="issue-left">
          <span class="issue-pos" title="Jump to Line ${issue.line}, Col ${issue.column}">Ln ${issue.line}:${issue.column}</span>
          <span class="issue-rule">${escapeHtml(issue.rule || 'syntax')}</span>
        </div>
        <div class="issue-content">
          <div class="issue-msg">${escapeHtml(issue.message)}</div>
          ${issue.suggestion ? `<div class="issue-suggestion">💡 ${escapeHtml(issue.suggestion)}</div>` : ''}
        </div>
        <div class="issue-action">
          <button type="button" class="btn-jump">Jump →</button>
        </div>
      `;

      item.addEventListener('click', () => {
        this.onJumpToLine(issue.line, issue.column);
      });

      this.listEl.appendChild(item);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

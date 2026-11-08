/**
 * Code Editor Component
 * Supports line numbers, syntax indentation, find/replace, undo/redo, and status bar.
 */

export class XmlEditor {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onChange = options.onChange || (() => {});
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 100;
    this.isComposing = false;

    this.render();
    this.initEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="editor-wrapper">
        <div class="editor-search-bar hidden" id="editor-search-bar">
          <div class="search-inputs">
            <input type="text" id="editor-find-input" class="search-input" placeholder="Find..." />
            <input type="text" id="editor-replace-input" class="search-input" placeholder="Replace..." />
          </div>
          <div class="search-actions">
            <span id="search-count" class="search-count">0 of 0</span>
            <button type="button" id="btn-find-prev" class="btn-icon" title="Previous match">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button type="button" id="btn-find-next" class="btn-icon" title="Next match">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button type="button" id="btn-replace" class="btn-sm">Replace</button>
            <button type="button" id="btn-replace-all" class="btn-sm">All</button>
            <button type="button" id="btn-close-search" class="btn-icon" title="Close">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="editor-body">
          <div class="editor-gutter" id="editor-gutter">1</div>
          <div class="editor-textarea-wrap">
            <textarea
              id="editor-textarea"
              class="editor-textarea"
              spellcheck="false"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              placeholder="Paste or type XML here, or drag & drop a file..."
            ></textarea>
          </div>
        </div>

        <div class="editor-status-bar">
          <div class="status-left">
            <span id="status-cursor">Ln 1, Col 1</span>
            <span class="status-divider"></span>
            <span id="status-lines">1 lines</span>
            <span class="status-divider"></span>
            <span id="status-size">0 B</span>
          </div>
          <div class="status-right">
            <span id="status-format">XML 1.0</span>
            <span class="status-divider"></span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    `;

    this.textarea = this.container.querySelector('#editor-textarea');
    this.gutter = this.container.querySelector('#editor-gutter');
    this.searchBar = this.container.querySelector('#editor-search-bar');
    this.findInput = this.container.querySelector('#editor-find-input');
    this.replaceInput = this.container.querySelector('#editor-replace-input');
    this.searchCount = this.container.querySelector('#search-count');
    this.cursorStatus = this.container.querySelector('#status-cursor');
    this.linesStatus = this.container.querySelector('#status-lines');
    this.sizeStatus = this.container.querySelector('#status-size');
  }

  initEvents() {
    this.textarea.addEventListener('input', () => {
      this.updateGutter();
      this.updateStatus();
      this.saveHistory(this.getValue());
      this.onChange(this.getValue());
    });

    this.textarea.addEventListener('scroll', () => {
      this.gutter.scrollTop = this.textarea.scrollTop;
    });

    this.textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.textarea.addEventListener('keyup', () => this.updateCursorStatus());
    this.textarea.addEventListener('click', () => this.updateCursorStatus());

    // Search events
    this.container.querySelector('#btn-close-search').addEventListener('click', () => {
      this.toggleSearch(false);
    });

    this.findInput.addEventListener('input', () => this.findMatches());
    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) this.findNext(-1);
        else this.findNext(1);
      } else if (e.key === 'Escape') {
        this.toggleSearch(false);
      }
    });

    this.container.querySelector('#btn-find-next').addEventListener('click', () => this.findNext(1));
    this.container.querySelector('#btn-find-prev').addEventListener('click', () => this.findNext(-1));
    this.container.querySelector('#btn-replace').addEventListener('click', () => this.replaceCurrent());
    this.container.querySelector('#btn-replace-all').addEventListener('click', () => this.replaceAll());
  }

  handleKeydown(e) {
    // Ctrl+F / Cmd+F -> Search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      this.toggleSearch(true);
      return;
    }

    // Ctrl+Z -> Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z -> Redo
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      this.redo();
      return;
    }

    // Tab key -> Indent / Outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;

      if (start === end) {
        // Insert 2 spaces
        this.textarea.value = val.substring(0, start) + '  ' + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
      } else {
        // Multi-line indent/outdent
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = val.indexOf('\n', end);
        const effectiveEnd = lineEnd === -1 ? val.length : lineEnd;
        const lines = val.substring(lineStart, effectiveEnd).split('\n');

        let modified;
        if (e.shiftKey) {
          // Outdent
          modified = lines.map(l => l.startsWith('  ') ? l.slice(2) : l.startsWith(' ') ? l.slice(1) : l).join('\n');
        } else {
          // Indent
          modified = lines.map(l => '  ' + l).join('\n');
        }

        this.textarea.value = val.substring(0, lineStart) + modified + val.substring(effectiveEnd);
        this.textarea.selectionStart = lineStart;
        this.textarea.selectionEnd = lineStart + modified.length;
      }

      this.updateGutter();
      this.updateStatus();
      this.onChange(this.getValue());
    }
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(val, triggerChange = true) {
    this.textarea.value = val;
    this.updateGutter();
    this.updateStatus();
    this.saveHistory(val);
    if (triggerChange) {
      this.onChange(val);
    }
  }

  updateGutter() {
    const lines = this.textarea.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += `<div>${i}</div>`;
    }
    this.gutter.innerHTML = numbers;
  }

  updateStatus() {
    const val = this.textarea.value;
    const lines = val.split('\n').length;
    const bytes = new TextEncoder().encode(val).length;

    this.linesStatus.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}`;
    this.sizeStatus.textContent = formatBytes(bytes);
    this.updateCursorStatus();
  }

  updateCursorStatus() {
    const pos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, pos);
    const lines = textBefore.split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    this.cursorStatus.textContent = `Ln ${currentLine}, Col ${currentCol}`;
  }

  jumpToLine(targetLine, targetCol = 1) {
    const lines = this.textarea.value.split('\n');
    let pos = 0;
    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    pos += Math.min(targetCol - 1, (lines[targetLine - 1] || '').length);

    this.textarea.focus();
    this.textarea.setSelectionRange(pos, pos + (lines[targetLine - 1] || '').length);

    // Scroll gutter and textarea to target
    const lineHeight = 20; // approximate line height in px
    this.textarea.scrollTop = Math.max(0, (targetLine - 3) * lineHeight);
    this.gutter.scrollTop = this.textarea.scrollTop;
  }

  saveHistory(text) {
    if (this.history[this.historyIndex] === text) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(text);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.setValue(this.history[this.historyIndex], true);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.setValue(this.history[this.historyIndex], true);
    }
  }

  toggleSearch(show) {
    if (show) {
      this.searchBar.classList.remove('hidden');
      const selected = this.textarea.value.substring(this.textarea.selectionStart, this.textarea.selectionEnd);
      if (selected && !selected.includes('\n')) {
        this.findInput.value = selected;
      }
      this.findInput.focus();
      this.findInput.select();
      this.findMatches();
    } else {
      this.searchBar.classList.add('hidden');
      this.textarea.focus();
    }
  }

  findMatches() {
    const query = this.findInput.value;
    if (!query) {
      this.searchCount.textContent = '0 of 0';
      this.matches = [];
      return;
    }

    const val = this.textarea.value;
    this.matches = [];
    let idx = 0;
    while ((idx = val.indexOf(query, idx)) !== -1) {
      this.matches.push(idx);
      idx += query.length;
    }

    this.currentMatchIdx = this.matches.length > 0 ? 0 : -1;
    this.updateSearchCount();
    if (this.matches.length > 0) {
      this.highlightMatch(this.matches[0], query.length);
    }
  }

  findNext(direction = 1) {
    if (!this.matches || this.matches.length === 0) return;
    this.currentMatchIdx = (this.currentMatchIdx + direction + this.matches.length) % this.matches.length;
    this.updateSearchCount();
    this.highlightMatch(this.matches[this.currentMatchIdx], this.findInput.value.length);
  }

  highlightMatch(pos, len) {
    this.textarea.focus();
    this.textarea.setSelectionRange(pos, pos + len);
  }

  updateSearchCount() {
    if (!this.matches || this.matches.length === 0) {
      this.searchCount.textContent = '0 of 0';
    } else {
      this.searchCount.textContent = `${this.currentMatchIdx + 1} of ${this.matches.length}`;
    }
  }

  replaceCurrent() {
    if (!this.matches || this.currentMatchIdx === -1) return;
    const query = this.findInput.value;
    const replacement = this.replaceInput.value;
    const pos = this.matches[this.currentMatchIdx];

    const val = this.textarea.value;
    this.textarea.value = val.substring(0, pos) + replacement + val.substring(pos + query.length);
    this.onChange(this.getValue());
    this.findMatches();
  }

  replaceAll() {
    const query = this.findInput.value;
    const replacement = this.replaceInput.value;
    if (!query) return;

    const val = this.textarea.value;
    const nextVal = val.split(query).join(replacement);
    this.setValue(nextVal, true);
    this.findMatches();
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


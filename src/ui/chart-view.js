/**
 * Interactive Horizontal Tree and Schema Card Flow Chart Visualizer
 * Supports Card Flow (Schema Object cards with dashed bezier forks),
 * Horizontal Node-Link Tree with smooth bezier curves,
 * Tag Frequency distribution, and Depth Analysis.
 */

import { xmlToChartData, xmlToCardFlowData } from '../core/converter.js';
import { showToast } from './toast.js';

export class XmlChartView {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeChartType = 'card-flow'; // 'card-flow' | 'hierarchy' | 'mermaid' | 'graph' | 'frequency' | 'depth'
    this.currentData = null;
    this.cardFlowData = null;

    // Pan & Zoom state
    this.panX = 60;
    this.panY = 60;
    this.scale = 0.95;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;

    // Collapsed nodes set (by node path / id)
    this.collapsedNodeIds = new Set();

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="chart-wrapper">
        <div class="chart-toolbar">
          <div class="chart-type-tabs">
            <button type="button" class="tab-btn active" data-chart="card-flow" title="Card Flow (Object Schema cards)" aria-label="Card Flow">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2H4zm8 0a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2h-4zm-8 8a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2a2 2 0 00-2-2H4zm8 0a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2a2 2 0 00-2-2h-4z"/>
              </svg>
            </button>
            <button type="button" class="tab-btn" data-chart="hierarchy" title="Hierarchy (Horizontal node-link tree)" aria-label="Hierarchy">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/>
              </svg>
            </button>
            <button type="button" class="tab-btn" data-chart="mermaid" title="Mermaid Flowchart Diagram & Code" aria-label="Mermaid">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button type="button" class="tab-btn" data-chart="graph" title="Relational Network Graph" aria-label="Graph">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a3 3 0 100 6 3 3 0 000-6zM3 13a3 3 0 100 6 3 3 0 000-6zM17 13a3 3 0 100 6 3 3 0 000-6zM6.5 13.5l2.2-4.2m2.6 0l2.2 4.2"/>
              </svg>
            </button>
            <button type="button" class="tab-btn" data-chart="frequency" title="Element Tag Frequency Distribution" aria-label="Tag Frequency">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
            </button>
            <button type="button" class="tab-btn" data-chart="depth" title="Element Depth Distribution" aria-label="Depth">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L9.586 10l1.293 1.293a1 1 0 001.414 0l3-3z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div class="chart-actions">
            <button type="button" id="btn-chart-copy-mermaid" class="btn-sm hidden" title="Copy Mermaid syntax code" aria-label="Copy Mermaid syntax code">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
              </svg>
            </button>
            <button type="button" id="btn-chart-expand-all" class="btn-sm" title="Expand all nodes">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button type="button" id="btn-chart-collapse-all" class="btn-sm" title="Collapse all nodes">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button type="button" id="btn-chart-fit" class="btn-sm" title="Fit diagram to screen (auto-center and scale)">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7V3h4m10 4V3h-4M3 13v4h4m10-4v4h-4"/>
              </svg>
            </button>
            <button type="button" id="btn-export-svg" class="btn-sm" title="Export / Download as SVG image" aria-label="Export / Download as SVG image">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="chart-container" id="chart-svg-container">
          <div class="chart-canvas-wrap" id="chart-canvas-wrap">
            <svg id="tree-svg-root" class="tree-canvas-svg">
              <g id="tree-viewport"></g>
            </svg>
            <div class="chart-overlay-controls">
              <button type="button" id="btn-zoom-in" class="chart-ctrl-btn" title="Zoom In">
                <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
              </button>
              <button type="button" id="btn-zoom-out" class="chart-ctrl-btn" title="Zoom Out">
                <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd"/>
                </svg>
              </button>
              <button type="button" id="btn-zoom-fit" class="chart-ctrl-btn" title="Fit to View">
                <svg class="icon-sm" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7V3h4m10 4V3h-4M3 13v4h4m10-4v4h-4"/>
                </svg>
              </button>
            </div>
            <div id="chart-tooltip" class="chart-tooltip hidden"></div>
          </div>
        </div>
      </div>
    `;

    this.svgContainer = this.container.querySelector('#chart-svg-container');
    this.canvasWrap = this.container.querySelector('#chart-canvas-wrap');
    this.svgRoot = this.container.querySelector('#tree-svg-root');
    this.viewportGroup = this.container.querySelector('#tree-viewport');
    this.tooltipEl = this.container.querySelector('#chart-tooltip');

    this.initTabs();
    this.initPanZoom();
    this.initToolbarButtons();
  }

  initTabs() {
    const tabs = this.container.querySelectorAll('.chart-type-tabs .tab-btn');
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeChartType = tab.dataset.chart;
        this.refreshChart();
      });
    }
  }

  initPanZoom() {
    // Mouse dragging on canvas to pan
    this.canvasWrap.addEventListener('mousedown', (e) => {
      // Ignore if clicking on interactive nodes or ports
      if (
        e.target.closest('.tree-node-interactive') ||
        e.target.closest('.card-flow-node') ||
        e.target.closest('.card-flow-port')
      ) return;

      this.isPanning = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.canvasWrap.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateViewportTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvasWrap.classList.remove('panning');
      }
    });

    // Wheel zooming
    this.canvasWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const rect = this.canvasWrap.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newScale = Math.min(3.5, Math.max(0.2, this.scale * zoomFactor));

      // Zoom towards mouse position
      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateViewportTransform();
    }, { passive: false });
  }

  initToolbarButtons() {
    this.container.querySelector('#btn-zoom-in').addEventListener('click', () => {
      this.scale = Math.min(3.5, this.scale * 1.2);
      this.updateViewportTransform();
    });

    this.container.querySelector('#btn-zoom-out').addEventListener('click', () => {
      this.scale = Math.max(0.2, this.scale * 0.83);
      this.updateViewportTransform();
    });

    this.container.querySelector('#btn-zoom-fit').addEventListener('click', () => {
      this.fitToView(true);
    });

    const btnChartFit = this.container.querySelector('#btn-chart-fit');
    if (btnChartFit) {
      btnChartFit.addEventListener('click', () => {
        this.fitToView(true);
      });
    }

    const btnCopyMermaid = this.container.querySelector('#btn-chart-copy-mermaid');
    if (btnCopyMermaid) {
      btnCopyMermaid.addEventListener('click', () => {
        if (this.currentMermaidCode) {
          navigator.clipboard.writeText(this.currentMermaidCode);
          showToast('Mermaid syntax copied to clipboard', 'success');
        } else if (this.currentData && this.currentData.hierarchy) {
          const code = this.generateMermaidCode(this.currentData.hierarchy);
          navigator.clipboard.writeText(code);
          showToast('Mermaid syntax copied to clipboard', 'success');
        }
      });
    }

    this.container.querySelector('#btn-chart-expand-all').addEventListener('click', () => {
      this.collapsedNodeIds.clear();
      this.refreshChart();
      showToast('Expanded all nodes', 'info');
    });

    this.container.querySelector('#btn-chart-collapse-all').addEventListener('click', () => {
      if (this.activeChartType === 'card-flow' && this.cardFlowData) {
        this.collapseAllExceptRootCardFlow(this.cardFlowData);
        this.refreshChart();
        showToast('Collapsed all subtrees', 'info');
      } else if (this.currentData && this.currentData.hierarchy) {
        this.collapseAllExceptRoot(this.currentData.hierarchy);
        this.refreshChart();
        showToast('Collapsed all subtrees', 'info');
      }
    });

    this.container.querySelector('#btn-export-svg').addEventListener('click', () => {
      this.exportSvg();
    });
  }

  collapseAllExceptRootCardFlow(root) {
    this.collapsedNodeIds.clear();
    const self = this;
    function mark(node) {
      if (node.children && node.children.length > 0) {
        if (node !== root && node.id) {
          self.collapsedNodeIds.add(node.id);
        }
        for (const child of node.children) {
          mark(child);
        }
      }
    }
    mark(root);
  }

  collapseAllExceptRoot(root) {
    this.collapsedNodeIds.clear();
    const self = this;
    function mark(node) {
      if (node.children && node.children.length > 0) {
        if (node !== root && node._id) {
          self.collapsedNodeIds.add(node._id);
        }
        for (const child of node.children) {
          mark(child);
        }
      }
    }
    mark(root);
  }

  updateViewportTransform() {
    if (this.viewportGroup) {
      this.viewportGroup.setAttribute(
        'transform',
        `translate(${this.panX}, ${this.panY}) scale(${this.scale})`
      );
    }
  }

  loadXml(xmlString) {
    if (!xmlString || !xmlString.trim()) {
      this.currentData = null;
      this.cardFlowData = null;
      this.renderEmptyState('No XML loaded to visualize. Enter XML to generate charts.');
      return;
    }

    try {
      this.currentData = xmlToChartData(xmlString);
      this.cardFlowData = xmlToCardFlowData(xmlString);
      this.assignNodeIds(this.currentData.hierarchy);
      this.refreshChart();
    } catch (err) {
      this.renderEmptyState(`Chart generation error: ${err.message}`);
    }
  }

  assignNodeIds(node, path = '') {
    if (!node) return;
    const curPath = path ? `${path}/${node.name}` : `/${node.name}`;
    node._id = curPath;
    if (node.children) {
      node.children.forEach((c, idx) => this.assignNodeIds(c, `${curPath}[${idx}]`));
    }
  }

  renderEmptyState(msg) {
    if (this.viewportGroup) {
      this.viewportGroup.innerHTML = '';
    }
    this.canvasWrap.querySelector('.chart-overlay-controls')?.classList.add('hidden');
    let emptyEl = this.canvasWrap.querySelector('.chart-empty-msg');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'chart-empty-msg';
      this.canvasWrap.appendChild(emptyEl);
    }
    emptyEl.textContent = msg;
    emptyEl.classList.remove('hidden');
  }

  refreshChart() {
    const emptyEl = this.canvasWrap.querySelector('.chart-empty-msg');
    if (emptyEl) emptyEl.classList.add('hidden');

    if (!this.currentData || !this.currentData.hierarchy) {
      this.renderEmptyState('No XML loaded to visualize.');
      return;
    }

    const overlay = this.canvasWrap.querySelector('.chart-overlay-controls');
    if (overlay) overlay.classList.remove('hidden');

    const btnCopyMermaid = this.container.querySelector('#btn-chart-copy-mermaid');
    if (btnCopyMermaid) {
      btnCopyMermaid.classList.toggle('hidden', this.activeChartType !== 'mermaid');
    }

    const btnExpand = this.container.querySelector('#btn-chart-expand-all');
    const btnCollapse = this.container.querySelector('#btn-chart-collapse-all');
    const isBarChart = this.activeChartType === 'frequency' || this.activeChartType === 'depth';
    if (btnExpand) btnExpand.classList.toggle('hidden', isBarChart);
    if (btnCollapse) btnCollapse.classList.toggle('hidden', isBarChart);

    this.canvasWrap.classList.toggle('theme-card-flow', this.activeChartType === 'card-flow');
    this.canvasWrap.classList.toggle('theme-mermaid', this.activeChartType === 'mermaid');
    this.canvasWrap.classList.toggle('theme-graph', this.activeChartType === 'graph');

    if (this.activeChartType === 'card-flow') {
      this.renderCardFlow(this.cardFlowData);
    } else if (this.activeChartType === 'hierarchy') {
      this.renderHorizontalHierarchy(this.currentData.hierarchy);
    } else if (this.activeChartType === 'mermaid') {
      this.renderMermaid(this.currentData.hierarchy);
    } else if (this.activeChartType === 'graph') {
      this.renderGraph(this.currentData.hierarchy);
    } else if (this.activeChartType === 'frequency') {
      this.renderFrequencyBarChart(this.currentData.tagFrequency);
    } else if (this.activeChartType === 'depth') {
      this.renderDepthChart(this.currentData.depthDistribution);
    }
  }

  /**
   * Renders the Card Flow format (Object Schema cards with branching dashed bezier curves and fork chevrons)
   */
  renderCardFlow(rootCard) {
    if (!rootCard) {
      this.renderEmptyState('No schema cards to visualize.');
      return;
    }

    // 1. Traverse and measure cards
    const nodesByDepth = [];
    const allNodes = [];
    const self = this;

    function measureCard(card, depth = 0) {
      if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
      nodesByDepth[depth].push(card);
      card.depth = depth;
      card.isCollapsed = self.collapsedNodeIds.has(card.id);

      let maxLineLen = 0;
      for (const l of card.lines) {
        const len = `${l.key} : ${l.value}`.length;
        if (len > maxLineLen) maxLineLen = len;
      }

      if (card.isPill) {
        card.naturalWidth = Math.max(120, maxLineLen * 8.2 + 36);
        card.height = 34;
      } else {
        card.naturalWidth = Math.max(150, maxLineLen * 7.8 + 36);
        card.height = 24 + card.lines.length * 20;
      }

      if (card.children && !card.isCollapsed) {
        for (const child of card.children) {
          measureCard(child, depth + 1);
        }
      }
    }

    measureCard(rootCard, 0);

    // 2. Uniform column widths for clean vertical alignment
    const colWidths = nodesByDepth.map(nodes => Math.max(...nodes.map(n => n.naturalWidth), 130));
    for (let d = 0; d < nodesByDepth.length; d++) {
      for (const n of nodesByDepth[d]) {
        n.width = n.isPill ? n.naturalWidth : colWidths[d];
      }
    }

    // 3. Assign X coordinates per column
    const colX = [];
    let curX = 50;
    for (let d = 0; d < colWidths.length; d++) {
      colX[d] = curX;
      curX += colWidths[d] + 80; // 80px gap between columns
    }

    for (let d = 0; d < nodesByDepth.length; d++) {
      for (const n of nodesByDepth[d]) {
        n.x = colX[d];
      }
    }

    // 4. Compute Subtree heights
    function computeSubtreeHeight(n) {
      if (!n.children || n.children.length === 0 || n.isCollapsed) {
        n.subtreeHeight = n.height + 24;
        return n.subtreeHeight;
      }
      let total = 0;
      for (const child of n.children) {
        total += computeSubtreeHeight(child);
      }
      n.subtreeHeight = Math.max(n.height + 24, total);
      return n.subtreeHeight;
    }

    computeSubtreeHeight(rootCard);

    // 5. Compute Y coordinates (recursive centered layout)
    function layoutY(n, currentY) {
      if (!n.children || n.children.length === 0 || n.isCollapsed) {
        n.y = currentY + (n.subtreeHeight - n.height) / 2;
        return;
      }

      let totalChildHeight = 0;
      for (const child of n.children) {
        totalChildHeight += child.subtreeHeight;
      }
      const offset = Math.max(0, (n.subtreeHeight - totalChildHeight) / 2);

      let childY = currentY + offset;
      for (const child of n.children) {
        layoutY(child, childY);
        childY += child.subtreeHeight;
      }

      const first = n.children[0];
      const last = n.children[n.children.length - 1];
      const center = ((first.y + first.height / 2) + (last.y + last.height / 2)) / 2;
      n.y = center - n.height / 2;
    }

    layoutY(rootCard, 40);

    // Collect all visible nodes
    function collect(n) {
      allNodes.push(n);
      if (n.children && !n.isCollapsed) {
        for (const c of n.children) collect(c);
      }
    }
    collect(rootCard);

    // 6. Generate SVG elements
    let connectorsSvg = '';
    let cardsSvg = '';

    for (const n of allNodes) {
      const hasChildren = n.children && n.children.length > 0;
      const isCollapsed = n.isCollapsed;

      // Draw connector if node has children
      if (hasChildren) {
        const px = n.x + n.width;
        const py = n.y + n.height / 2;
        const forkX = px + 14;

        if (isCollapsed) {
          // Collapsed port with distinct amber indicator
          connectorsSvg += `
            <rect class="card-flow-port card-flow-port-collapsed" x="${px - 3}" y="${py - 3}" width="6" height="6" fill="#f59e0b" data-id="${escapeXml(n.id)}">
              <title>Click to expand</title>
            </rect>
          `;
        } else {
          // Port rect
          connectorsSvg += `
            <rect class="card-flow-port" x="${px - 2.5}" y="${py - 2.5}" width="5" height="5" fill="#ffffff" data-id="${escapeXml(n.id)}">
              <title>Click to collapse</title>
            </rect>
            <line class="card-flow-stub" x1="${px + 2.5}" y1="${py}" x2="${forkX}" y2="${py}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3, 3" />
            <path class="card-flow-fork" d="M ${forkX + 5} ${py - 4.5} L ${forkX} ${py} L ${forkX + 5} ${py + 4.5}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          `;

          // Dashed Bezier curves to children
          const k = n.children.length;
          n.children.forEach((c, idx) => {
            const cx = c.x;
            const cy = c.y + c.height / 2;
            let startY = py;
            if (k > 1) {
              const t = idx / (k - 1); // 0 to 1
              startY = (py - 4.5) + t * 9.0;
            }
            const startX = forkX + 5;
            const midX = (startX + cx) / 2;
            const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${cy}, ${cx} ${cy}`;
            connectorsSvg += `
              <path class="card-flow-curve" d="${d}" data-parent="${escapeXml(n.id)}" data-child="${escapeXml(c.id)}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="4, 4" fill="none" />
            `;
          });
        }
      }

      // Draw Card
      const rx = n.isPill ? 17 : 12;
      cardsSvg += `
        <g class="card-flow-node" data-id="${escapeXml(n.id)}">
          <rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="${rx}" ry="${rx}"
                fill="#0c1938" stroke="#3f619e" stroke-width="1.5" class="card-flow-card"/>
      `;

      if (n.isPill) {
        const line = n.lines[0];
        cardsSvg += `
          <text x="${n.x + n.width / 2}" y="${n.y + 21}" text-anchor="middle"
                class="card-flow-pill-text">
            ${escapeXml(line.key)} : ${escapeXml(line.value)}
          </text>
        `;
      } else {
        n.lines.forEach((l, i) => {
          const lineY = n.y + 21 + i * 20;
          cardsSvg += `
            <text x="${n.x + 16}" y="${lineY}" class="card-flow-text">
              <tspan class="card-flow-key">${escapeXml(l.key)}</tspan>
              <tspan class="card-flow-colon"> : </tspan>
              <tspan class="card-flow-val">${escapeXml(l.value)}</tspan>
            </text>
          `;
        });
      }

      cardsSvg += `</g>\n`;
    }

    this.viewportGroup.innerHTML = `
      <g class="card-flow-connectors-group">${connectorsSvg}</g>
      <g class="card-flow-cards-group">${cardsSvg}</g>
    `;

    this.updateViewportTransform();
    this.bindCardFlowInteractions(allNodes);
  }

  bindCardFlowInteractions(allNodes) {
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const nodeElements = this.viewportGroup.querySelectorAll('.card-flow-node');
    const portElements = this.viewportGroup.querySelectorAll('.card-flow-port');

    // Click card or port to toggle collapse
    const toggleCollapse = (id) => {
      const node = nodeMap.get(id);
      if (node && node.children && node.children.length > 0) {
        if (this.collapsedNodeIds.has(node.id)) {
          this.collapsedNodeIds.delete(node.id);
        } else {
          this.collapsedNodeIds.add(node.id);
        }
        this.refreshChart();
      }
    };

    for (const el of nodeElements) {
      const id = el.dataset.id;
      const node = nodeMap.get(id);
      if (!node) continue;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse(id);
      });

      // Hover highlights
      el.addEventListener('mouseenter', (e) => {
        // Highlight connected curves
        const curves = this.viewportGroup.querySelectorAll(
          `.card-flow-curve[data-parent="${id}"], .card-flow-curve[data-child="${id}"]`
        );
        curves.forEach(c => c.classList.add('highlighted'));

        this.showCardTooltip(node, e);
      });

      el.addEventListener('mouseleave', () => {
        const curves = this.viewportGroup.querySelectorAll('.card-flow-curve.highlighted');
        curves.forEach(c => c.classList.remove('highlighted'));
        this.hideTooltip();
      });
    }

    for (const port of portElements) {
      port.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse(port.dataset.id);
      });
    }
  }

  showCardTooltip(node, evt) {
    if (!this.tooltipEl) return;

    let fieldsHtml = node.lines.map(l =>
      `<span class="tooltip-attr">${escapeXml(l.key)} : ${escapeXml(l.value)}</span>`
    ).join('<br/>');

    const childrenCount = node.children ? node.children.length : 0;
    const isPill = node.isPill ? 'Pill Summary' : 'Object Card';

    this.tooltipEl.innerHTML = `
      <div class="tooltip-title">&lt;${escapeXml(node.name)}&gt; <span style="font-size:10px;opacity:0.7">(${isPill})</span></div>
      <div class="tooltip-meta">Path: ${escapeXml(node.path)} • Depth: ${node.depth} • Children: ${childrenCount}</div>
      <div class="tooltip-section">
        <strong>Fields:</strong><br/>
        ${fieldsHtml}
      </div>
    `;

    const rect = this.canvasWrap.getBoundingClientRect();
    const x = evt.clientX - rect.left + 15;
    const y = evt.clientY - rect.top + 15;

    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  /**
   * Renders the Horizontal Node-Link Tree matching the user's reference UI
   */
  renderHorizontalHierarchy(root) {
    // 1. Compute tree layout
    let leafRowIndex = 0;
    const rowHeight = 60; // vertical spacing
    const colSpacing = 280; // horizontal spacing between levels
    const nodes = [];
    const links = [];

    const self = this;

    function layoutNode(node, depth = 0) {
      const isCollapsed = self.collapsedNodeIds.has(node._id);
      node.isCollapsed = isCollapsed;
      node.x = depth * colSpacing;

      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = hasChildren && !isCollapsed;

      if (!isExpanded) {
        // Leaf or collapsed node: occupies its own row
        node.y = leafRowIndex * rowHeight;
        leafRowIndex++;
      } else {
        // Expanded node: children layout first
        for (const child of node.children) {
          layoutNode(child, depth + 1);
          links.push({ parent: node, child });
        }
        // Center vertically relative to its children
        const firstY = node.children[0].y;
        const lastY = node.children[node.children.length - 1].y;
        node.y = (firstY + lastY) / 2;
      }

      nodes.push(node);
    }

    layoutNode(root, 0);

    // 2. Generate SVG Elements
    // Draw links (bezier curves)
    let linksSvg = '';
    for (const link of links) {
      const p = link.parent;
      const c = link.child;
      const midX = (p.x + c.x) / 2;
      const pathData = `M ${p.x} ${p.y} C ${midX} ${p.y}, ${midX} ${c.y}, ${c.x} ${c.y}`;

      linksSvg += `
        <path d="${pathData}" class="tree-curve" data-parent="${escapeXml(p.name)}" data-child="${escapeXml(c.name)}"/>
      `;
    }

    // Draw nodes
    let nodesSvg = '';
    for (const node of nodes) {
      const hasChildren = node.children && node.children.length > 0;
      const isCollapsed = node.isCollapsed;

      // Color selection matching the design in user's image:
      // - Root: teal/cyan (#2dd4bf)
      // - Container/Header/Body: teal/mint (#2dd4bf / #14b8a6)
      // - Leaf tokens: blue (#38bdf8)
      // - Actions/Payloads: soft red/coral (#f87171)
      let circleFill = '#38bdf8'; // default leaf blue
      let circleStroke = '#0284c7';

      if (node.depth === 0) {
        circleFill = '#2dd4bf'; // root cyan
        circleStroke = '#0f766e';
      } else if (hasChildren) {
        circleFill = '#2dd4bf'; // branch cyan
        circleStroke = '#0f766e';
      } else if (node.name.toLowerCase().includes('request') || node.name.toLowerCase().includes('order') || node.name.toLowerCase().includes('price') || node.name.toLowerCase().includes('error')) {
        circleFill = '#f87171'; // coral red for actions/payloads
        circleStroke = '#b91c1c';
      } else if (node.name.toLowerCase().includes('token') || node.name.toLowerCase().includes('auth') || node.name.toLowerCase().includes('id') || node.name.toLowerCase().includes('key')) {
        circleFill = '#38bdf8'; // sky blue for token/auth
        circleStroke = '#0369a1';
      } else {
        circleFill = '#818cf8'; // indigo
        circleStroke = '#4338ca';
      }

      // Format attribute subtitle string (e.g. xmlns:soap="http://schemas.xmlsoap.org/s...")
      let attrSubtitle = '';
      if (node.attributes) {
        const entries = Object.entries(node.attributes);
        if (entries.length > 0) {
          // Prioritize xmlns or id
          const primaryAttr = entries.find(([k]) => k.startsWith('xmlns') || k === 'id' || k === 'name') || entries[0];
          attrSubtitle = `${primaryAttr[0]}="${truncate(String(primaryAttr[1]), 38)}"`;
          if (entries.length > 1) {
            attrSubtitle += ` (+${entries.length - 1})`;
          }
        }
      }

      // Text Anchor:
      // If node has children and is expanded: label on the LEFT of the dot (text-anchor="end")
      // If node is leaf or collapsed: label on the RIGHT of the dot (text-anchor="start")
      const isLabelOnLeft = hasChildren && !isCollapsed;
      const textAnchor = isLabelOnLeft ? 'end' : 'start';
      const labelX = isLabelOnLeft ? node.x - 12 : node.x + 12;

      // Collapsed indicator ring
      const collapsedRing = (hasChildren && isCollapsed)
        ? `<circle cx="${node.x}" cy="${node.y}" r="11" fill="none" stroke="${circleFill}" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.8"/>`
        : '';

      nodesSvg += `
        <g class="tree-node-interactive" data-id="${escapeXml(node._id)}" transform="translate(0, 0)">
          <!-- Node Connecting Circle Dot -->
          ${collapsedRing}
          <circle cx="${node.x}" cy="${node.y}" r="6.5" fill="${circleFill}" stroke="${circleStroke}" stroke-width="2" class="tree-node-dot">
            <title>&lt;${escapeXml(node.name)}&gt;</title>
          </circle>

          <!-- Tag Name -->
          <text x="${labelX}" y="${node.y - 2}" text-anchor="${textAnchor}" class="tree-node-tag-text">${escapeXml(node.name)}</text>

          <!-- Attribute Subtitle (Golden/Amber) -->
          ${attrSubtitle ? `<text x="${labelX}" y="${node.y + 13}" text-anchor="${textAnchor}" class="tree-node-attr-text">${escapeXml(attrSubtitle)}</text>` : ''}
        </g>
      `;
    }

    this.viewportGroup.innerHTML = `
      <g class="tree-links-group">${linksSvg}</g>
      <g class="tree-nodes-group">${nodesSvg}</g>
    `;

    this.updateViewportTransform();
    this.bindNodeInteractions(nodes);
  }

  bindNodeInteractions(nodes) {
    const nodeElements = this.viewportGroup.querySelectorAll('.tree-node-interactive');
    const nodeMap = new Map(nodes.map(n => [n._id, n]));

    for (const el of nodeElements) {
      const id = el.dataset.id;
      const node = nodeMap.get(id);
      if (!node) continue;

      // Click circle to toggle collapse
      const dot = el.querySelector('.tree-node-dot');
      if (dot) {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (node.children && node.children.length > 0) {
            if (this.collapsedNodeIds.has(node._id)) {
              this.collapsedNodeIds.delete(node._id);
            } else {
              this.collapsedNodeIds.add(node._id);
            }
            this.refreshChart();
          }
        });
      }

      // Hover tooltip
      el.addEventListener('mouseenter', (e) => {
        this.showTooltip(node, e);
      });

      el.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    }
  }

  showTooltip(node, evt) {
    if (!this.tooltipEl) return;

    let attrsHtml = '';
    if (node.attributes && Object.keys(node.attributes).length > 0) {
      attrsHtml = `<div class="tooltip-section"><strong>Attributes:</strong><br/>` +
        Object.entries(node.attributes).map(([k, v]) => `<span class="tooltip-attr">${escapeXml(k)}="${escapeXml(String(v))}"</span>`).join('<br/>') +
        `</div>`;
    }

    let textHtml = '';
    if (node.text) {
      textHtml = `<div class="tooltip-section"><strong>Text:</strong> ${escapeXml(truncate(node.text, 80))}</div>`;
    }

    const childrenCount = node.children ? node.children.length : 0;

    this.tooltipEl.innerHTML = `
      <div class="tooltip-title">&lt;${escapeXml(node.name)}&gt;</div>
      <div class="tooltip-meta">Depth: ${node.depth} • Children: ${childrenCount}</div>
      ${attrsHtml}
      ${textHtml}
    `;

    const rect = this.canvasWrap.getBoundingClientRect();
    const x = evt.clientX - rect.left + 15;
    const y = evt.clientY - rect.top + 15;

    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.classList.add('hidden');
    }
  }

  fitToView(showNotice = false) {
    let fitted = false;

    try {
      if (this.viewportGroup && typeof this.viewportGroup.getBBox === 'function') {
        const bbox = this.viewportGroup.getBBox();
        const containerWidth = this.canvasWrap?.clientWidth || this.svgRoot?.clientWidth || 0;
        const containerHeight = this.canvasWrap?.clientHeight || this.svgRoot?.clientHeight || 0;

        if (bbox.width > 0 && bbox.height > 0 && containerWidth > 80 && containerHeight > 80) {
          const padding = 50;
          const availWidth = Math.max(50, containerWidth - padding * 2);
          const availHeight = Math.max(50, containerHeight - padding * 2);

          const scaleX = availWidth / bbox.width;
          const scaleY = availHeight / bbox.height;

          // Comfortable scale range: not over-enlarging small trees, scaling down wide ones
          const targetScale = Math.min(Math.max(0.15, Math.min(scaleX, scaleY)), 1.15);

          // Center the bounding box within the container
          const targetPanX = (containerWidth - bbox.width * targetScale) / 2 - bbox.x * targetScale;
          const targetPanY = (containerHeight - bbox.height * targetScale) / 2 - bbox.y * targetScale;

          this.scale = targetScale;
          this.panX = targetPanX;
          this.panY = targetPanY;
          this.updateViewportTransform();
          fitted = true;
        }
      }
    } catch (_) {
      fitted = false;
    }

    if (!fitted) {
      if (this.activeChartType === 'card-flow') {
        this.panX = 60;
        this.panY = 60;
        this.scale = 0.95;
      } else {
        this.panX = 140;
        this.panY = 120;
        this.scale = 1.0;
      }
      this.updateViewportTransform();
    }

    if (showNotice) {
      showToast('Chart fitted to screen', 'info');
    }
  }

  generateMermaidCode(root) {
    if (!root) return '';
    const lines = ['flowchart LR'];
    let counter = 0;
    const idMap = new Map();

    function getId(node) {
      if (!idMap.has(node)) {
        idMap.set(node, `node_${++counter}`);
      }
      return idMap.get(node);
    }

    function sanitize(text) {
      return String(text || '').replace(/["[\]()]/g, "'").trim();
    }

    function walk(node) {
      const curId = getId(node);
      let label = node.name || 'node';
      if (node.inlineText) {
        label += `: ${node.inlineText}`;
      }
      if (node.attributes && Object.keys(node.attributes).length > 0) {
        const attrs = Object.entries(node.attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
        label += ` [${attrs}]`;
      }

      lines.push(`    ${curId}["${sanitize(label)}"]`);

      if (node.children) {
        for (const child of node.children) {
          const childId = getId(child);
          lines.push(`    ${curId} --> ${childId}`);
          walk(child);
        }
      }
    }

    walk(root);
    return lines.join('\n');
  }

  renderMermaid(root) {
    if (!root) {
      this.renderEmptyState('No hierarchy to generate Mermaid diagram.');
      return;
    }

    this.currentMermaidCode = this.generateMermaidCode(root);

    let leafRowIndex = 0;
    const rowHeight = 54;
    const colSpacing = 280;
    const nodes = [];
    const links = [];
    const self = this;

    function layoutNode(node, depth = 0) {
      const isCollapsed = self.collapsedNodeIds.has(node._id);
      node.isCollapsed = isCollapsed;
      node.depth = depth;
      node.x = depth * colSpacing;

      let label = node.name || 'node';
      if (node.inlineText) {
        label += `: ${node.inlineText}`;
      }
      if (node.attributes && Object.keys(node.attributes).length > 0) {
        const attrs = Object.entries(node.attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
        label += ` [${attrs}]`;
      }
      node.mermaidLabel = label;
      node.width = Math.min(340, Math.max(130, label.length * 7.5 + 36));
      node.height = 36;

      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = hasChildren && !isCollapsed;

      if (!isExpanded) {
        node.y = leafRowIndex * rowHeight;
        leafRowIndex++;
      } else {
        for (const child of node.children) {
          layoutNode(child, depth + 1);
        }
        const first = node.children[0];
        const last = node.children[node.children.length - 1];
        node.y = (first.y + last.y) / 2;
      }

      nodes.push(node);
      if (isExpanded) {
        for (const child of node.children) {
          links.push({ parent: node, child });
        }
      }
    }

    layoutNode(root, 0);

    const defsSvg = `
      <defs>
        <marker id="mermaid-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#60a5fa" />
        </marker>
        <filter id="mermaid-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#3b82f6" flood-opacity="0.3"/>
        </filter>
      </defs>
    `;

    let linksSvg = '';
    for (const link of links) {
      const p = link.parent;
      const c = link.child;
      const x1 = p.x + p.width;
      const y1 = p.y + p.height / 2;
      const x2 = c.x;
      const y2 = c.y + c.height / 2;
      const midX = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
      linksSvg += `<path class="mermaid-edge" d="${d}" stroke="#60a5fa" stroke-width="1.8" fill="none" marker-end="url(#mermaid-arrow)" />`;
    }

    let nodesSvg = '';
    for (const n of nodes) {
      const hasChildren = n.children && n.children.length > 0;
      const isCollapsed = n.isCollapsed;
      const badgeColor = n.depth === 0 ? '#3b82f6' : (hasChildren ? '#8b5cf6' : '#10b981');

      nodesSvg += `
        <g class="mermaid-node" data-id="${escapeXml(n._id)}" transform="translate(${n.x}, ${n.y})">
          <rect width="${n.width}" height="${n.height}" rx="8" ry="8"
                fill="#1e293b" stroke="${badgeColor}" stroke-width="1.6" class="mermaid-node-rect" filter="url(#mermaid-glow)" />
          <circle cx="16" cy="18" r="5" fill="${badgeColor}" />
          <text x="28" y="22" class="mermaid-node-text" fill="#f8fafc" font-size="12" font-family="ui-monospace, monospace">
            ${escapeXml(truncate(n.mermaidLabel, 34))}
          </text>
          ${hasChildren ? `
            <circle cx="${n.width - 12}" cy="18" r="7" fill="${isCollapsed ? '#f59e0b' : 'rgba(255,255,255,0.2)'}" class="mermaid-collapse-btn" />
            <text x="${n.width - 12}" y="21" text-anchor="middle" font-size="9" fill="#ffffff" font-weight="700">${isCollapsed ? '+' : '-'}</text>
          ` : ''}
        </g>
      `;
    }

    this.viewportGroup.innerHTML = `
      ${defsSvg}
      <g class="mermaid-links-group">${linksSvg}</g>
      <g class="mermaid-nodes-group">${nodesSvg}</g>
    `;

    const nodeEls = this.viewportGroup.querySelectorAll('.mermaid-node');
    nodeEls.forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (id) {
          if (self.collapsedNodeIds.has(id)) {
            self.collapsedNodeIds.delete(id);
          } else {
            self.collapsedNodeIds.add(id);
          }
          self.refreshChart();
        }
      });
    });

    this.updateViewportTransform();
  }

  renderGraph(root) {
    if (!root) {
      this.renderEmptyState('No hierarchy to generate relational graph.');
      return;
    }

    const nodes = [];
    const links = [];
    let counter = 0;
    const levels = [];

    function collectLevels(node, depth = 0) {
      if (!levels[depth]) levels[depth] = [];
      node._graphIndex = counter++;
      node.depth = depth;
      levels[depth].push(node);
      nodes.push(node);
      if (node.children) {
        for (const child of node.children) {
          links.push({ source: node, target: child });
          collectLevels(child, depth + 1);
        }
      }
    }

    collectLevels(root, 0);

    const centerX = 400;
    const centerY = 320;
    root.gx = centerX;
    root.gy = centerY;

    const radii = [0, 190, 360, 520, 680, 840];

    for (let d = 1; d < levels.length; d++) {
      const levelNodes = levels[d];
      const r = radii[d] || (d * 160);
      const angleStep = (2 * Math.PI) / Math.max(1, levelNodes.length);
      const startAngle = -Math.PI / 2;

      levelNodes.forEach((node, idx) => {
        const angle = startAngle + idx * angleStep;
        node.gx = centerX + r * Math.cos(angle);
        node.gy = centerY + r * Math.sin(angle);
      });
    }

    const defsSvg = `
      <defs>
        <marker id="graph-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(148, 163, 184, 0.7)" />
        </marker>
        <radialGradient id="root-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </radialGradient>
      </defs>
    `;

    let linksSvg = '';
    for (const link of links) {
      const s = link.source;
      const t = link.target;
      linksSvg += `
        <line class="graph-link" x1="${s.gx}" y1="${s.gy}" x2="${t.gx}" y2="${t.gy}"
              stroke="rgba(148, 163, 184, 0.35)" stroke-width="1.6" marker-end="url(#graph-arrow)" />
      `;
    }

    let nodesSvg = '';
    for (const n of nodes) {
      let r = 18;
      let strokeColor = '#10b981';
      let fillColor = '#064e3b';

      if (n.depth === 0) {
        r = 28;
        strokeColor = '#3b82f6';
        fillColor = '#1e3a8a';
      } else if (n.depth === 1) {
        r = 22;
        strokeColor = '#8b5cf6';
        fillColor = '#2e1065';
      } else if (n.children && n.children.length > 0) {
        r = 18;
        strokeColor = '#06b6d4';
        fillColor = '#164e63';
      } else {
        r = 14;
        strokeColor = '#f59e0b';
        fillColor = '#78350f';
      }

      const label = n.name || 'node';
      const subLabel = n.inlineText ? truncate(n.inlineText, 16) : '';

      nodesSvg += `
        <g class="graph-node" data-id="${escapeXml(n._id)}" transform="translate(${n.gx}, ${n.gy})">
          ${n.depth === 0 ? `<circle r="46" fill="url(#root-halo)" />` : ''}
          <circle r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" class="graph-circle" />
          <text text-anchor="middle" dy="4" fill="#ffffff" font-size="${r > 16 ? 11 : 9}" font-weight="600" class="graph-node-label">
            ${escapeXml(truncate(label, r > 20 ? 8 : 5))}
          </text>
          <text text-anchor="middle" dy="${r + 14}" fill="#cbd5e1" font-size="11" font-family="ui-monospace, monospace" class="graph-sublabel">
            ${escapeXml(label)}${subLabel ? `: ${escapeXml(subLabel)}` : ''}
          </text>
        </g>
      `;
    }

    this.viewportGroup.innerHTML = `
      ${defsSvg}
      <g class="graph-links-group">${linksSvg}</g>
      <g class="graph-nodes-group">${nodesSvg}</g>
    `;

    this.updateViewportTransform();
  }

  renderFrequencyBarChart(tags) {
    if (!tags || tags.length === 0) {
      this.renderEmptyState('No elements found to chart.');
      return;
    }

    const maxCount = Math.max(...tags.map(t => t.count), 1);
    const barHeight = 26;
    const gap = 12;
    const chartLeft = 160;
    const chartWidth = 500;

    let bars = '';
    const colors = ['#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#ec4899', '#f87171', '#f59e0b', '#10b981'];

    tags.forEach((item, idx) => {
      const y = idx * (barHeight + gap);
      const w = Math.max(6, (item.count / maxCount) * chartWidth);
      const color = colors[idx % colors.length];

      bars += `
        <g transform="translate(0, ${y})">
          <text x="${chartLeft - 12}" y="${barHeight / 2 + 4}" text-anchor="end" class="tree-node-tag-text">&lt;${escapeXml(item.tag)}&gt;</text>
          <rect x="${chartLeft}" y="0" width="${w}" height="${barHeight}" rx="4" fill="${color}" opacity="0.85"/>
          <text x="${chartLeft + w + 10}" y="${barHeight / 2 + 4}" class="tree-node-attr-text">${item.count} (${item.percent}%)</text>
        </g>
      `;
    });

    this.viewportGroup.innerHTML = `<g transform="translate(40, 40)">${bars}</g>`;
    this.fitToView();
  }

  renderDepthChart(depthDistribution) {
    if (!depthDistribution || depthDistribution.length === 0) {
      this.renderEmptyState('No depth data available.');
      return;
    }

    const width = 600;
    const height = 240;
    const pad = 40;
    const maxCount = Math.max(...depthDistribution.map(d => d.count), 1);
    const colWidth = (width - pad * 2) / depthDistribution.length;

    let bars = '';
    depthDistribution.forEach((d, idx) => {
      const h = (d.count / maxCount) * (height - pad * 2);
      const x = pad + idx * colWidth + 8;
      const y = height - pad - h;
      const barW = Math.max(14, colWidth - 16);

      bars += `
        <g>
          <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="#2dd4bf" opacity="0.85"/>
          <text x="${x + barW / 2}" y="${height - pad + 18}" text-anchor="middle" class="tree-node-attr-text">Lvl ${d.depth}</text>
          <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" class="tree-node-tag-text">${d.count}</text>
        </g>
      `;
    });

    this.viewportGroup.innerHTML = `
      <g transform="translate(40, 40)">
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#334155" stroke-width="1.5"/>
        ${bars}
      </g>
    `;
    this.fitToView();
  }

  exportSvg() {
    try {
      const svgClone = this.svgRoot.cloneNode(true);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.style.backgroundColor = this.activeChartType === 'card-flow' ? '#000000' : '#0b0f19';

      if (this.viewportGroup && typeof this.viewportGroup.getBBox === 'function') {
        const bbox = this.viewportGroup.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          const pad = 36;
          const cloneViewport = svgClone.querySelector('#tree-viewport');
          if (cloneViewport) {
            cloneViewport.removeAttribute('transform');
          }
          svgClone.setAttribute('viewBox', `${Math.round(bbox.x - pad)} ${Math.round(bbox.y - pad)} ${Math.round(bbox.width + pad * 2)} ${Math.round(bbox.height + pad * 2)}`);
          svgClone.setAttribute('width', `${Math.round(bbox.width + pad * 2)}`);
          svgClone.setAttribute('height', `${Math.round(bbox.height + pad * 2)}`);
        }
      }

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgClone);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `xml-chart-${this.activeChartType}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Chart exported as SVG', 'success');
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    }
  }
}

function truncate(str, maxLen = 30) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Interactive Horizontal Tree Chart Visualizer
 * Matches modern node-link tree UI with smooth bezier curves, colored nodes,
 * attribute subtitles, pan & zoom, collapsible branches, and export.
 */

import { xmlToChartData } from '../core/converter.js';
import { showToast } from './toast.js';

export class XmlChartView {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeChartType = 'hierarchy'; // 'hierarchy' (default) | 'frequency' | 'depth'
    this.currentData = null;

    // Pan & Zoom state
    this.panX = 140;
    this.panY = 120;
    this.scale = 1.0;
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
            <button type="button" class="tab-btn active" data-chart="hierarchy">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/>
              </svg>
              Hierarchy Tree
            </button>
            <button type="button" class="tab-btn" data-chart="frequency">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
              Tag Frequency
            </button>
            <button type="button" class="tab-btn" data-chart="depth">
              <svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L9.586 10l1.293 1.293a1 1 0 001.414 0l3-3z" clip-rule="evenodd"/>
              </svg>
              Depth Distribution
            </button>
          </div>
          <div class="chart-actions">
            <button type="button" id="btn-chart-expand-all" class="btn-sm" title="Expand all nodes">Expand All</button>
            <button type="button" id="btn-chart-collapse-all" class="btn-sm" title="Collapse all nodes">Collapse All</button>
            <button type="button" id="btn-export-svg" class="btn-sm" title="Export as SVG image">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              Export SVG
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
      // Ignore if clicking on a node circle
      if (e.target.closest('.tree-node-interactive')) return;

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
      this.fitToView();
    });

    this.container.querySelector('#btn-chart-expand-all').addEventListener('click', () => {
      this.collapsedNodeIds.clear();
      this.refreshChart();
      showToast('Expanded all nodes', 'info');
    });

    this.container.querySelector('#btn-chart-collapse-all').addEventListener('click', () => {
      if (this.currentData && this.currentData.hierarchy) {
        this.collapseAllExceptRoot(this.currentData.hierarchy);
        this.refreshChart();
        showToast('Collapsed all subtrees', 'info');
      }
    });

    this.container.querySelector('#btn-export-svg').addEventListener('click', () => {
      this.exportSvg();
    });
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
      this.renderEmptyState('No XML loaded to visualize. Enter XML to generate charts.');
      return;
    }

    try {
      this.currentData = xmlToChartData(xmlString);
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

    if (this.activeChartType === 'hierarchy') {
      this.renderHorizontalHierarchy(this.currentData.hierarchy);
    } else if (this.activeChartType === 'frequency') {
      this.renderFrequencyBarChart(this.currentData.tagFrequency);
    } else if (this.activeChartType === 'depth') {
      this.renderDepthChart(this.currentData.depthDistribution);
    }
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

  fitToView() {
    this.panX = 140;
    this.panY = 120;
    this.scale = 1.0;
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
    const svgClone = this.svgRoot.cloneNode(true);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.style.backgroundColor = '#0b0f19';

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

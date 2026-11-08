/**
 * Chart Visualizer Component
 * Generates SVG-based structural diagrams, tag frequency bar charts, and depth distributions.
 */

import { xmlToChartData } from '../core/converter.js';
import { showToast } from './toast.js';

export class XmlChartView {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeChartType = 'frequency'; // 'frequency' | 'hierarchy' | 'depth'
    this.currentData = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="chart-wrapper">
        <div class="chart-toolbar">
          <div class="chart-type-tabs">
            <button type="button" class="tab-btn active" data-chart="frequency">Tag Frequency</button>
            <button type="button" class="tab-btn" data-chart="hierarchy">Hierarchy Tree</button>
            <button type="button" class="tab-btn" data-chart="depth">Depth Distribution</button>
          </div>
          <div class="chart-actions">
            <button type="button" id="btn-export-svg" class="btn-sm" title="Export as SVG image">
              <svg class="icon-sm" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              Export SVG
            </button>
          </div>
        </div>
        <div class="chart-container" id="chart-svg-container">
          <div class="chart-empty-state">No XML loaded to visualize. Enter XML to generate charts.</div>
        </div>
      </div>
    `;

    this.svgContainer = this.container.querySelector('#chart-svg-container');

    const tabs = this.container.querySelectorAll('.chart-type-tabs .tab-btn');
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeChartType = tab.dataset.chart;
        this.refreshChart();
      });
    }

    this.container.querySelector('#btn-export-svg').addEventListener('click', () => {
      this.exportSvg();
    });
  }

  loadXml(xmlString) {
    if (!xmlString || !xmlString.trim()) {
      this.currentData = null;
      this.svgContainer.innerHTML = `<div class="chart-empty-state">No XML loaded to visualize. Enter XML to generate charts.</div>`;
      return;
    }

    try {
      this.currentData = xmlToChartData(xmlString);
      this.refreshChart();
    } catch (err) {
      this.svgContainer.innerHTML = `<div class="chart-empty-state error">Chart generation error: ${err.message}</div>`;
    }
  }

  refreshChart() {
    if (!this.currentData || !this.currentData.hierarchy) {
      this.svgContainer.innerHTML = `<div class="chart-empty-state">No XML loaded to visualize.</div>`;
      return;
    }

    if (this.activeChartType === 'frequency') {
      this.svgContainer.innerHTML = this.renderFrequencyBarChart(this.currentData.tagFrequency, this.currentData.totalElements);
    } else if (this.activeChartType === 'hierarchy') {
      this.svgContainer.innerHTML = this.renderHierarchyChart(this.currentData.hierarchy);
    } else if (this.activeChartType === 'depth') {
      this.svgContainer.innerHTML = this.renderDepthChart(this.currentData.depthDistribution);
    }
  }

  renderFrequencyBarChart(tags, total) {
    if (!tags || tags.length === 0) {
      return `<div class="chart-empty-state">No elements found to chart.</div>`;
    }

    const width = 800;
    const barHeight = 28;
    const gap = 12;
    const height = Math.max(300, tags.length * (barHeight + gap) + 60);
    const maxCount = Math.max(...tags.map(t => t.count), 1);
    const chartLeft = 140;
    const chartRight = width - 80;
    const chartWidth = chartRight - chartLeft;

    let barsSvg = '';
    const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4'];

    tags.forEach((item, idx) => {
      const y = 30 + idx * (barHeight + gap);
      const w = Math.max(4, (item.count / maxCount) * chartWidth);
      const color = colors[idx % colors.length];

      barsSvg += `
        <g class="chart-bar-group" transform="translate(0, ${y})">
          <text x="${chartLeft - 10}" y="${barHeight / 2 + 5}" text-anchor="end" class="chart-label">&lt;${escapeXml(item.tag)}&gt;</text>
          <rect x="${chartLeft}" y="0" width="${w}" height="${barHeight}" rx="4" fill="${color}" class="chart-bar">
            <title>&lt;${escapeXml(item.tag)}&gt;: ${item.count} occurrences (${item.percent}%)</title>
          </rect>
          <text x="${chartLeft + w + 8}" y="${barHeight / 2 + 5}" class="chart-value">${item.count} (${item.percent}%)</text>
        </g>
      `;
    });

    return `
      <div class="chart-scroll-box">
        <svg viewBox="0 0 ${width} ${height}" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
          <style>
            .chart-label { font-size: 13px; fill: var(--text-muted, #94a3b8); font-family: monospace; }
            .chart-value { font-size: 12px; fill: var(--text-normal, #f8fafc); font-family: sans-serif; font-weight: 500; }
            .chart-bar { transition: opacity 0.2s; cursor: pointer; }
            .chart-bar:hover { opacity: 0.85; }
          </style>
          ${barsSvg}
        </svg>
      </div>
    `;
  }

  renderHierarchyChart(root) {
    if (!root) return '';
    // Build an SVG tree diagram
    const width = 850;
    const levelHeight = 70;
    const levels = [];

    function collectLevels(node, depth = 0) {
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(node);
      if (node.children) {
        node.children.forEach(c => collectLevels(c, depth + 1));
      }
    }
    collectLevels(root, 0);

    const totalDepth = levels.length;
    const height = Math.max(350, totalDepth * levelHeight + 80);

    // Compute positions
    const nodeCoords = new Map();
    levels.forEach((nodesInLevel, depth) => {
      const y = 50 + depth * levelHeight;
      const spacing = width / (nodesInLevel.length + 1);
      nodesInLevel.forEach((n, idx) => {
        const x = spacing * (idx + 1);
        nodeCoords.set(n, { x, y });
      });
    });

    let linesSvg = '';
    let nodesSvg = '';

    function renderBranch(node) {
      const parentPos = nodeCoords.get(node);
      if (!parentPos) return;

      if (node.children) {
        node.children.forEach(child => {
          const childPos = nodeCoords.get(child);
          if (childPos) {
            linesSvg += `<path d="M${parentPos.x},${parentPos.y + 14} C${parentPos.x},${(parentPos.y + childPos.y) / 2} ${childPos.x},${(parentPos.y + childPos.y) / 2} ${childPos.x},${childPos.y - 14}" fill="none" stroke="var(--border-color, #334155)" stroke-width="2"/>`;
            renderBranch(child);
          }
        });
      }

      nodesSvg += `
        <g transform="translate(${parentPos.x}, ${parentPos.y})" class="tree-node-group">
          <rect x="-55" y="-14" width="110" height="28" rx="14" fill="var(--bg-card, #1e293b)" stroke="var(--primary, #3b82f6)" stroke-width="1.5"/>
          <text x="0" y="4" text-anchor="middle" font-size="11" font-family="monospace" fill="var(--text-normal, #f8fafc)">&lt;${escapeXml(node.name)}&gt;</text>
          <title>&lt;${escapeXml(node.name)}&gt; (Depth: ${node.depth}, Attributes: ${node.attrsCount})</title>
        </g>
      `;
    }

    renderBranch(root);

    return `
      <div class="chart-scroll-box">
        <svg viewBox="0 0 ${width} ${height}" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
          ${linesSvg}
          ${nodesSvg}
        </svg>
      </div>
    `;
  }

  renderDepthChart(depthDistribution) {
    if (!depthDistribution || depthDistribution.length === 0) {
      return `<div class="chart-empty-state">No depth data available.</div>`;
    }

    const width = 750;
    const height = 300;
    const pad = 50;
    const chartW = width - pad * 2;
    const chartH = height - pad * 2;

    const maxCount = Math.max(...depthDistribution.map(d => d.count), 1);
    const colWidth = chartW / depthDistribution.length;

    let bars = '';
    depthDistribution.forEach((d, idx) => {
      const h = (d.count / maxCount) * chartH;
      const x = pad + idx * colWidth + 10;
      const y = pad + chartH - h;
      const barW = Math.max(15, colWidth - 20);

      bars += `
        <g>
          <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="#3b82f6" class="chart-bar">
            <title>Depth Level ${d.depth}: ${d.count} elements</title>
          </rect>
          <text x="${x + barW / 2}" y="${pad + chartH + 20}" text-anchor="middle" font-size="11" fill="var(--text-muted, #94a3b8)">Lvl ${d.depth}</text>
          <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="bold" fill="var(--text-normal, #f8fafc)">${d.count}</text>
        </g>
      `;
    });

    return `
      <div class="chart-scroll-box">
        <svg viewBox="0 0 ${width} ${height}" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
          <line x1="${pad}" y1="${pad + chartH}" x2="${width - pad}" y2="${pad + chartH}" stroke="var(--border-color, #334155)" stroke-width="1.5"/>
          ${bars}
        </svg>
      </div>
    `;
  }

  exportSvg() {
    const svgEl = this.svgContainer.querySelector('svg');
    if (!svgEl) {
      showToast('No chart to export', 'warning');
      return;
    }

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
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

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


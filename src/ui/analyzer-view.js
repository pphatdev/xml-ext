/**
 * Analyzer Dashboard View
 */

import { analyzeXml } from '../core/analyzer.js';

export class XmlAnalyzerView {
  constructor(containerEl) {
    this.container = containerEl;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="analyzer-wrapper">
        <div class="analyzer-kpis" id="analyzer-kpis">
          <div class="kpi-card">
            <div class="kpi-label">Total Elements</div>
            <div class="kpi-value" id="kpi-elements">0</div>
            <div class="kpi-sub" id="kpi-unique-elements">0 unique tags</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Attributes</div>
            <div class="kpi-value" id="kpi-attributes">0</div>
            <div class="kpi-sub" id="kpi-unique-attributes">0 unique names</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Max Depth</div>
            <div class="kpi-value" id="kpi-depth">0</div>
            <div class="kpi-sub" id="kpi-avg-depth">Avg: 0.0</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Complexity Score</div>
            <div class="kpi-value" id="kpi-complexity">0</div>
            <div class="kpi-sub" id="kpi-complexity-grade">Simple</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Minify Potential</div>
            <div class="kpi-value" id="kpi-savings">0%</div>
            <div class="kpi-sub" id="kpi-saved-bytes">0 B savings</div>
          </div>
        </div>

        <div class="analyzer-sections">
          <div class="analyzer-section">
            <h3 class="section-title">Document Metadata & Namespaces</h3>
            <div class="metadata-grid" id="metadata-grid">
              <div class="meta-item"><span class="meta-key">Root Element:</span> <span class="meta-val" id="meta-root">-</span></div>
              <div class="meta-item"><span class="meta-key">XML Version:</span> <span class="meta-val" id="meta-version">-</span></div>
              <div class="meta-item"><span class="meta-key">Encoding:</span> <span class="meta-val" id="meta-encoding">-</span></div>
              <div class="meta-item"><span class="meta-key">Leaf Nodes:</span> <span class="meta-val" id="meta-leaves">-</span></div>
              <div class="meta-item"><span class="meta-key">Comments:</span> <span class="meta-val" id="meta-comments">0</span></div>
              <div class="meta-item"><span class="meta-key">CDATA Sections:</span> <span class="meta-val" id="meta-cdata">0</span></div>
            </div>
            <div class="namespaces-wrap" id="namespaces-wrap"></div>
          </div>

          <div class="analyzer-section">
            <h3 class="section-title">Element Frequency Ranking</h3>
            <div class="table-responsive">
              <table class="analyzer-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Count</th>
                    <th>Share</th>
                    <th>Depth Range</th>
                    <th>Avg Attrs</th>
                  </tr>
                </thead>
                <tbody id="element-frequency-tbody">
                  <tr><td colspan="5" class="text-center text-muted">No elements found</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="analyzer-section">
            <h3 class="section-title">Attribute Analysis</h3>
            <div class="table-responsive">
              <table class="analyzer-table">
                <thead>
                  <tr>
                    <th>Attribute Name</th>
                    <th>Count</th>
                    <th>Found In Tags</th>
                  </tr>
                </thead>
                <tbody id="attribute-frequency-tbody">
                  <tr><td colspan="3" class="text-center text-muted">No attributes found</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.kpiElements = this.container.querySelector('#kpi-elements');
    this.kpiUniqueElements = this.container.querySelector('#kpi-unique-elements');
    this.kpiAttributes = this.container.querySelector('#kpi-attributes');
    this.kpiUniqueAttributes = this.container.querySelector('#kpi-unique-attributes');
    this.kpiDepth = this.container.querySelector('#kpi-depth');
    this.kpiAvgDepth = this.container.querySelector('#kpi-avg-depth');
    this.kpiComplexity = this.container.querySelector('#kpi-complexity');
    this.kpiComplexityGrade = this.container.querySelector('#kpi-complexity-grade');
    this.kpiSavings = this.container.querySelector('#kpi-savings');
    this.kpiSavedBytes = this.container.querySelector('#kpi-saved-bytes');

    this.metaRoot = this.container.querySelector('#meta-root');
    this.metaVersion = this.container.querySelector('#meta-version');
    this.metaEncoding = this.container.querySelector('#meta-encoding');
    this.metaLeaves = this.container.querySelector('#meta-leaves');
    this.metaComments = this.container.querySelector('#meta-comments');
    this.metaCdata = this.container.querySelector('#meta-cdata');
    this.namespacesWrap = this.container.querySelector('#namespaces-wrap');

    this.elemTbody = this.container.querySelector('#element-frequency-tbody');
    this.attrTbody = this.container.querySelector('#attribute-frequency-tbody');
  }

  analyze(xmlString) {
    const data = analyzeXml(xmlString);

    // KPIs
    this.kpiElements.textContent = data.general.elementCount.toLocaleString();
    this.kpiUniqueElements.textContent = `${data.general.uniqueElementsCount} unique tags`;

    this.kpiAttributes.textContent = data.general.attributeCount.toLocaleString();
    this.kpiUniqueAttributes.textContent = `${data.general.uniqueAttributesCount} unique names`;

    this.kpiDepth.textContent = data.structure.maxDepth;
    this.kpiAvgDepth.textContent = `Avg: ${data.structure.avgDepth}`;

    this.kpiComplexity.textContent = `${data.complexity.score}/100`;
    this.kpiComplexityGrade.textContent = data.complexity.grade;

    this.kpiSavings.textContent = `${data.compression.savingsPercent}%`;
    this.kpiSavedBytes.textContent = `${data.compression.savedBytes.toLocaleString()} B saved`;

    // Metadata
    this.metaRoot.textContent = data.general.rootTag ? `<${data.general.rootTag}>` : 'None';
    this.metaVersion.textContent = (data.general.declaration && data.general.declaration.version) || '1.0';
    this.metaEncoding.textContent = (data.general.declaration && data.general.declaration.encoding) || 'UTF-8';
    this.metaLeaves.textContent = `${data.structure.leafNodesCount} leaf / ${data.structure.branchNodesCount} branch`;
    this.metaComments.textContent = data.general.commentCount;
    this.metaCdata.textContent = data.general.cdataCount;

    // Namespaces
    if (data.namespaces && data.namespaces.length > 0) {
      this.namespacesWrap.innerHTML = `
        <div class="ns-label">Detected Namespaces:</div>
        <div class="ns-badges">${data.namespaces.map(ns => `<span class="ns-pill">${escapeHtml(ns)}</span>`).join('')}</div>
      `;
    } else {
      this.namespacesWrap.innerHTML = '';
    }

    // Element table
    if (data.elementFrequency.length > 0) {
      this.elemTbody.innerHTML = data.elementFrequency.map(e => `
        <tr>
          <td><code class="tag-code">&lt;${escapeHtml(e.tag)}&gt;</code></td>
          <td><strong>${e.count}</strong></td>
          <td>
            <div class="share-bar-wrap">
              <div class="share-bar" style="width: ${e.percentage}%"></div>
              <span>${e.percentage}%</span>
            </div>
          </td>
          <td>${e.depthRange}</td>
          <td>${e.avgAttrs}</td>
        </tr>
      `).join('');
    } else {
      this.elemTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No elements found</td></tr>`;
    }

    // Attribute table
    if (data.attributeFrequency.length > 0) {
      this.attrTbody.innerHTML = data.attributeFrequency.map(a => `
        <tr>
          <td><code class="attr-code">${escapeHtml(a.name)}</code></td>
          <td><strong>${a.count}</strong></td>
          <td><span class="text-muted">${escapeHtml(a.exampleTags)}</span></td>
        </tr>
      `).join('');
    } else {
      this.attrTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No attributes found</td></tr>`;
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

/**
 * Edge Classes - Separated Data Model and Rendering
 * 
 * This file contains three classes:
 * 1. EdgeData - Pure data model for edge information and business logic
 * 2. EdgeRenderer - SVG rendering and visual interaction management
 * 3. Edge - Legacy wrapper for backward compatibility
 * 
 * NEW USAGE (Recommended):
 * ```javascript
 * import { EdgeData, EdgeRenderer } from './Edge.js';
 * 
 * // Create edge data
 * const edgeData = new EdgeData({ from: 'node1', to: 'node2', class: 'connection' });
 * 
 * // Create renderer
 * const renderer = EdgeRenderer.createEdgeRenderer(edgeData, svg);
 * 
 * // Update visualization
 * renderer.updatePath(fromNode, toNode);
 * 
 * // Manage state separately
 * edgeData.setInteractionMode('select');
 * renderer.select();
 * ```
 * 
 * LEGACY USAGE (Still supported):
 * ```javascript
 * import { Edge } from './Edge.js';
 * const edge = new Edge(data, element); // Works as before
 * ```
 */

/**
 * EdgeData class - Manages edge data and business logic
 */
export class EdgeData {
  constructor(data) {
    this.from = data.from;
    this.to = data.to;
    this.class = data.class;
    this.id = data.id || `${data.from}_to_${data.to}`;
    
    // Interaction state
    this.isSelected = false;
    this.isHovering = false;
    this.interactionMode = null; // Future: 'select', 'edit', 'delete', etc.
    this.previousMode = null;
  }

  // Check if this edge connects to a specific node
  connectsToNode(nodeId) {
    return this.from === nodeId || this.to === nodeId;
  }

  // Get the other node ID that this edge connects to
  getOtherNodeId(nodeId) {
    if (this.from === nodeId) return this.to;
    if (this.to === nodeId) return this.from;
    return null;
  }

  // Set interaction mode (for future edge editing features)
  setInteractionMode(mode) {
    this.previousMode = this.interactionMode;
    this.interactionMode = mode;
  }

  // Clear interaction modes
  clearInteractionModes() {
    this.interactionMode = null;
    this.previousMode = null;
    this.isSelected = false;
    this.isHovering = false;
  }

  // Get edge data for serialization
  toData() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      class: this.class
    };
  }

  // Check if two edges are equivalent (same connection, regardless of direction)
  isEquivalentTo(otherEdge) {
    return (this.from === otherEdge.from && this.to === otherEdge.to) ||
           (this.from === otherEdge.to && this.to === otherEdge.from);
  }
}

/**
 * EdgeRenderer class - Manages SVG rendering and visual updates
 */
export class EdgeRenderer {
  constructor(edgeData, element) {
    this.edgeData = edgeData;
    this.element = element;
  }

  // Update the visual path between two nodes
  updatePath(fromNode, toNode) {
    if (!fromNode || !toNode) return false;
    
    const p1 = fromNode.getTransformedCenter();
    const p2 = toNode.getTransformedCenter();
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy) || 1;
    const x1 = p1.x + dx * (p1.radius / distance);
    const y1 = p1.y + dy * (p1.radius / distance);
    const x2 = p2.x - dx * (p2.radius / distance);
    const y2 = p2.y - dy * (p2.radius / distance);
    this.element.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
    return true;
  }

  // Visual interaction methods
  select() {
    this.edgeData.isSelected = true;
    this.element.classList.add('selected');
  }
  
  deselect() {
    this.edgeData.isSelected = false;
    this.element.classList.remove('selected', 'hovering');
  }
  
  setHovering(isHovering) {
    this.edgeData.isHovering = isHovering;
    if (isHovering) {
      this.element.classList.add('hovering');
    } else {
      this.element.classList.remove('hovering');
    }
  }

  // Clear visual interaction states
  clearVisualStates() {
    this.element.classList.remove('selected', 'hovering');
  }

  // Remove this edge from the DOM
  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  // Update visual style based on edge class
  updateStyle() {
    this.element.setAttribute('class', this.edgeData.class);
  }

  // Static method to create an edge element and EdgeRenderer instance
  static createEdgeRenderer(edgeData, svg) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', edgeData.class);
    path.setAttribute('marker-end', 'url(#arrow-end)');
    path.setAttribute('data-edge-id', edgeData.id);
    svg.appendChild(path);
    return new EdgeRenderer(edgeData, path);
  }

  // Static method to redraw all edge renderers
  static redrawAllEdgeRenderers(edgeRenderers, nodeMap) {
    for (const renderer of edgeRenderers) {
      const fromNode = nodeMap.get(renderer.edgeData.from);
      const toNode = nodeMap.get(renderer.edgeData.to);
      renderer.updatePath(fromNode, toNode);
    }
  }

  // Static method to create edge renderers from layout data
  static createEdgeRenderersFromLayout(edgeDataList, svg) {
    const edgeRenderers = [];
    for (const data of edgeDataList) {
      const edgeData = new EdgeData(data);
      const renderer = EdgeRenderer.createEdgeRenderer(edgeData, svg);
      edgeRenderers.push(renderer);
    }
    return edgeRenderers;
  }
}

/**
 * Legacy Edge class for backward compatibility
 * @deprecated Use EdgeData and EdgeRenderer instead
 */
export class Edge {
  constructor(data, element) {
    console.warn('Edge class is deprecated. Use EdgeData and EdgeRenderer instead.');
    this.edgeData = new EdgeData(data);
    this.renderer = new EdgeRenderer(this.edgeData, element);
    
    // Proxy properties for backward compatibility
    this.from = this.edgeData.from;
    this.to = this.edgeData.to;
    this.class = this.edgeData.class;
    this.element = this.renderer.element;
  }

  // Proxy methods for backward compatibility
  updatePath(fromNode, toNode) {
    return this.renderer.updatePath(fromNode, toNode);
  }

  connectsToNode(nodeId) {
    return this.edgeData.connectsToNode(nodeId);
  }

  getOtherNodeId(nodeId) {
    return this.edgeData.getOtherNodeId(nodeId);
  }

  remove() {
    this.renderer.remove();
  }

  select() {
    this.renderer.select();
  }

  deselect() {
    this.renderer.deselect();
  }

  setHovering(isHovering) {
    this.renderer.setHovering(isHovering);
  }

  setInteractionMode(mode) {
    this.edgeData.setInteractionMode(mode);
  }

  clearInteractionModes() {
    this.edgeData.clearInteractionModes();
    this.renderer.clearVisualStates();
  }

  toData() {
    return this.edgeData.toData();
  }

  // Static methods for backward compatibility
  static createEdge(edgeData, svg) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', edgeData.class);
    path.setAttribute('marker-end', 'url(#arrow-end)');
    svg.appendChild(path);
    return new Edge(edgeData, path);
  }

  static redrawAllEdges(edgeList, nodeMap) {
    for (const edge of edgeList) {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      edge.updatePath(fromNode, toNode);
    }
  }

  static createEdgesFromLayout(edgeDataList, svg) {
    const edgeList = [];
    for (const edgeData of edgeDataList) {
      const edge = Edge.createEdge(edgeData, svg);
      edgeList.push(edge);
    }
    return edgeList;
  }
}
// Version 011 - Added wider invisible stroke for better edge click detection
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

import { generateGuid, ensureUniqueId, registerExistingId, unregisterId, isIdInUse } from './GuidManager.js';

// Default node dimensions (used for fallback calculations)
const DEFAULT_NODE_RADIUS = 25;

/**
 * EdgeData class - Manages edge data and business logic
 */
export class EdgeData {
  constructor(data) {
    console.log('EdgeData constructor called with data:', data);

    this.from = data.from;
    this.to = data.to;
    this.class = data.class;

    // Debugging log for data.id
    console.log('EdgeData received id:', data.id);

    // Handle ID assignment differently for existing vs new edges
    if (data.id && isIdInUse(data.id)) {
        console.log('Using existing ID:', data.id);
        this.id = data.id;
    } else if (data.id) {
        console.log('Ensuring unique ID for:', data.id);
        this.id = ensureUniqueId(data.id);
    } else {
        console.log('Generating new GUID for edge');
        this.id = generateGuid('edge');
    }

    console.log('Assigned edge ID:', this.id);

    // Register this ID if it's not already registered
    if (!isIdInUse(this.id)) {
      console.log('Registering new ID:', this.id);
      registerExistingId(this.id, 'edge');
    }

    // Debugging log for registration confirmation
    console.log('Edge ID registration status:', isIdInUse(this.id));

    // Interaction state
    this.isSelected = false;
    this.isHovering = false;
    this.interactionMode = null; // Future: 'select', 'edit', 'delete', etc.
    this.previousMode = null;

    // Debugging log for final EdgeData state
    console.debug('Final EdgeData state:', this);
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

  // Create a duplicate of this edge with a new GUID
  duplicate() {
    const duplicateData = this.toData();
    // Remove the existing ID so a new GUID will be generated
    delete duplicateData.id;
    
    // Create new edge with new GUID
    const duplicatedEdge = new EdgeData(duplicateData);
    
    return duplicatedEdge;
  }

  // Destroy this edge data (unregister GUID)
  destroy() {
    unregisterId(this.id);
  }
}

/**
 * EdgeRenderer class - Manages SVG rendering and visual updates
 */
export class EdgeRenderer {
  constructor(edgeData, element, visiblePath = null, clickPath = null) {
    console.log('EdgeRenderer constructor called with edgeData:', edgeData);
    this.edgeData = edgeData;
    this.id = edgeData.id; // Assign the edge ID
    this.element = element; // The group element
    this.visiblePath = visiblePath || element; // The visible path
    this.clickPath = clickPath; // The invisible wider path for click detection
  }

  // Update the visual path between two nodes
  updatePath(fromNode, toNode) {
    console.log('=== EdgeRenderer.updatePath DEBUG ===');
    console.log('fromNode:', fromNode);
    console.log('toNode:', toNode);
    
    if (!fromNode || !toNode) {
      console.warn('EdgeRenderer.updatePath: Missing fromNode or toNode:', { fromNode: fromNode?.id, toNode: toNode?.id });
      return false;
    }
    
    // Get center coordinates for both nodes in viewport coordinates
    // Simple approach: ask each node for its center position in viewport coordinates
    let p1, p2;
    
    // For fromNode: get center in viewport coordinates
    if (typeof fromNode.getViewportCenter === 'function') {
      p1 = fromNode.getViewportCenter();
      console.log('fromNode viewport center:', p1);
    } else if (typeof fromNode.getLocalCenter === 'function' && fromNode.nodeData) {
      // Fallback: calculate viewport center from local center + node position
      const localCenter = fromNode.getLocalCenter();
      p1 = { 
        x: fromNode.nodeData.x + localCenter.x, 
        y: fromNode.nodeData.y + localCenter.y, 
        radius: localCenter.radius 
      };
      console.log('fromNode calculated center:', p1);
    } else if (fromNode.nodeData) {
      // Ultimate fallback: use node position directly
      p1 = { 
        x: fromNode.nodeData.x, 
        y: fromNode.nodeData.y, 
        radius: DEFAULT_NODE_RADIUS 
      };
      console.log('fromNode fallback center:', p1);
    } else {
      console.error('EdgeRenderer.updatePath: Cannot get position from fromNode:', fromNode);
      return false;
    }
    
    // For toNode: get center in viewport coordinates
    if (typeof toNode.getViewportCenter === 'function') {
      p2 = toNode.getViewportCenter();
      console.log('toNode viewport center:', p2);
    } else if (typeof toNode.getLocalCenter === 'function' && toNode.nodeData) {
      // Fallback: calculate viewport center from local center + node position
      const localCenter = toNode.getLocalCenter();
      p2 = { 
        x: toNode.nodeData.x + localCenter.x, 
        y: toNode.nodeData.y + localCenter.y, 
        radius: localCenter.radius 
      };
      console.log('toNode calculated center:', p2);
    } else if (toNode.nodeData) {
      // Ultimate fallback: use node position directly
      p2 = { 
        x: toNode.nodeData.x, 
        y: toNode.nodeData.y, 
        radius: DEFAULT_NODE_RADIUS 
      };
      console.log('toNode fallback center:', p2);
    } else {
      console.error('EdgeRenderer.updatePath: Cannot get position from toNode:', toNode);
      return false;
    }
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy) || 1;
    const x1 = p1.x + dx * (p1.radius / distance);
    const y1 = p1.y + dy * (p1.radius / distance);
    const x2 = p2.x - dx * (p2.radius / distance);
    const y2 = p2.y - dy * (p2.radius / distance);
    
    console.log('Edge calculation:');
    console.log('  dx:', dx, 'dy:', dy, 'distance:', distance);
    console.log('  from endpoint:', x1, y1);
    console.log('  to endpoint:', x2, y2);
    
    const pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
    console.log('  pathData:', pathData);
    
    // Update both the visible path and the invisible click path
    this.visiblePath.setAttribute('d', pathData);
    if (this.clickPath) {
      this.clickPath.setAttribute('d', pathData);
    }
    
    console.log('=== End EdgeRenderer.updatePath DEBUG ===');
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

  // Destroy this edge renderer (remove from DOM and clean up)
  destroy() {
    this.remove();
    
    // Clean up any references
    this.element = null;
    
    // Also destroy the associated data
    if (this.edgeData) {
      this.edgeData.destroy();
    }
  }

  // Update visual style based on edge class
  updateStyle() {
    // Set both the specific type class AND the general 'edge' class on the group
    this.element.setAttribute('class', `edge ${this.edgeData.class}`);
    
    // Apply CSS class to the visible path as well for proper styling
    if (this.visiblePath && this.visiblePath !== this.element) {
      this.visiblePath.setAttribute('class', this.edgeData.class);
    }
  }

  // Static method to create an edge element and EdgeRenderer instance
  static createEdgeRenderer(edgeData, svg) {
    console.log('Creating EdgeRenderer with edgeData:', edgeData);
    console.log('edgeData.id:', edgeData.id);

    // Create a group to hold both the visible path and invisible wider path
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `edge ${edgeData.class}`);
    group.setAttribute('data-edge-id', edgeData.id);
    console.log('Assigned data-edge-id:', group.getAttribute('data-edge-id'));

    // Create the invisible wider path for better click detection
    const clickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    clickPath.setAttribute('stroke', 'transparent');
    clickPath.setAttribute('stroke-width', '12'); // Much wider for easier clicking
    clickPath.setAttribute('fill', 'none');
    clickPath.setAttribute('stroke-linecap', 'round');
    clickPath.setAttribute('stroke-linejoin', 'round');
    clickPath.setAttribute('pointer-events', 'stroke');
    
    // Create the visible path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('marker-end', 'url(#arrow-end)');
    path.setAttribute('pointer-events', 'none'); // Don't interfere with click detection
    
    // Add both paths to the group
    group.appendChild(clickPath);
    group.appendChild(path);
    window.layerManager.addToLayer('edges', group);
    
    return new EdgeRenderer(edgeData, group, path, clickPath);
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
    console.debug('Initializing edgeDataList in createEdgeRenderersFromLayout:', edgeDataList);
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
    
    // Handle new group structure with multiple paths
    let visiblePath = null;
    let clickPath = null;
    
    if (element.tagName === 'g') {
      // New structure with group containing multiple paths
      const paths = element.querySelectorAll('path');
      if (paths.length >= 2) {
        clickPath = paths[0]; // First path is the invisible click path
        visiblePath = paths[1]; // Second path is the visible path
      } else if (paths.length === 1) {
        visiblePath = paths[0]; // Fallback to single path
      }
    } else {
      // Legacy structure with single path
      visiblePath = element;
    }
    
    this.renderer = new EdgeRenderer(this.edgeData, element, visiblePath, clickPath);
    
    // Proxy properties for backward compatibility
    this.from = this.edgeData.from;
    this.to = this.edgeData.to;
    this.class = this.edgeData.class;
    this.id = this.edgeData.id;
    this.element = this.renderer.element;
  }

  // Proxy methods for backward compatibility
  updatePath(fromNode, toNode) {
    return this.renderer.updatePath(fromNode, toNode);
  }
  
  toData() {
    return this.edgeData.toData();
  }
  
  select() {
    return this.renderer.select();
  }
  
  deselect() {
    return this.renderer.deselect();
  }
  
  setHovering(isHovering) {
    return this.renderer.setHovering(isHovering);
  }
  
  clearVisualStates() {
    return this.renderer.clearVisualStates();
  }
  
  updateStyle() {
    return this.renderer.updateStyle();
  }
  
  // Static methods for backward compatibility
  static createEdge(edgeData, svg, layerManager) {
    console.log('Creating edge with edgeData:', edgeData);

    // Ensure edgeData.id is defined
    if (!edgeData.id) {
      edgeData.id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated unique edgeData.id:', edgeData.id);
    }

    // Debugging log for edgeData.id
    console.log('edgeData.id before assignment to group:', edgeData.id);

    // Create a group to hold both the visible path and invisible wider path
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `edge ${edgeData.class}`);
    group.setAttribute('data-edge-id', edgeData.id);

    // Debugging log for assigned data-edge-id
    console.log('Assigned data-edge-id:', group.getAttribute('data-edge-id'));

    // Create the invisible wider path for better click detection
    const clickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    clickPath.setAttribute('stroke', 'transparent');
    clickPath.setAttribute('stroke-width', '12'); // Much wider for easier clicking
    clickPath.setAttribute('fill', 'none');
    clickPath.setAttribute('stroke-linecap', 'round');
    clickPath.setAttribute('stroke-linejoin', 'round');
    clickPath.setAttribute('pointer-events', 'stroke');

    // Create the visible path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', edgeData.class);
    path.setAttribute('marker-end', 'url(#arrowhead)');
    path.setAttribute('pointer-events', 'none'); // Don't interfere with click detection

    // Add both paths to the group
    group.appendChild(clickPath);
    group.appendChild(path);
    
    // Use the passed layerManager or fallback to window.layerManager
    const manager = layerManager || window.layerManager;
    if (manager) {
      manager.addToLayer('edges', group);
    } else {
      console.error('No layerManager available for edge creation');
      // Fallback: add to edges layer directly
      const edgesLayer = svg.querySelector('#edges-layer');
      if (edgesLayer) {
        edgesLayer.appendChild(group);
      }
    }
    
    // Replace legacy Edge class with EdgeRenderer
    const renderer = new EdgeRenderer(edgeData, group, path, clickPath);
    return renderer; // Return the renderer instead of the legacy Edge class
  }

  static redrawAllEdges(edgeList, nodeMap) {
    console.log('redrawAllEdges called with edgeList:', edgeList);
    console.log('redrawAllEdges called with nodeMap:', Array.from(nodeMap.entries()));

    for (const edge of edgeList) {
      const fromNode = nodeMap.get(edge.edgeData.from);
      const toNode = nodeMap.get(edge.edgeData.to);

      if (!fromNode || !toNode) {
        console.warn(`Edge ${edge.edgeData.id}: Missing nodes - from: ${edge.edgeData.from} (${fromNode?.id || 'undefined'}), to: ${edge.edgeData.to} (${toNode?.id || 'undefined'})`);
        continue;
      }

      edge.updatePath(fromNode, toNode);
    }
  }

  static createEdgesFromLayout(edgeDataList, svg, layerManager) {
    console.debug('Initializing edgeDataList in createEdgesFromLayout:', edgeDataList);
    const edgeList = [];
    for (const edgeData of edgeDataList) {
      // Validate edge data before creating edge
      if (!edgeData.from || !edgeData.to) {
        console.warn('Skipping invalid edge data - missing from or to:', edgeData);
        continue;
      }
      
      if (edgeData.from === edgeData.to) {
        console.warn('Skipping self-referencing edge:', edgeData);
        continue;
      }
      
      const edge = Edge.createEdge(edgeData, svg, layerManager);
      edgeList.push(edge);
    }
    return edgeList;
  }
}
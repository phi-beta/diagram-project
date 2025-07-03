/**
 * Node Classes - Separated Data Model and Rendering
 * 
 * This file contains three classes:
 * 1. NodeData - Pure data model for node information and business logic
 * 2. NodeRenderer - SVG rendering and interaction management
 * 3. Node - Legacy wrapper for backward compatibility
 * 
 * NEW USAGE (Recommended):
 * ```javascript
 * import { NodeData, NodeRenderer } from './Node.js';
 * import { GuidManager } from './GuidManager.js';
 * 
 * // Create node data with GUID
 * const nodeData = new NodeData({ x: 100, y: 100, label: 'My Node' });
 * 
 * // Create renderer
 * const renderer = NodeRenderer.createNodeRenderer(nodeData, svg);
 * 
 * // Update position
 * nodeData.setPosition(200, 150);
 * renderer.updateTransform();
 * ```
 * 
 * LEGACY USAGE (Still supported):
 * ```javascript
 * import { Node } from './Node.js';
 * const node = new Node(data, element); // Works as before
 * ```
 */

import { GuidManager } from './GuidManager.js';

// Default node dimensions (used for fallback calculations)
const DEFAULT_NODE_SIZE = 50;
const DEFAULT_NODE_RADIUS = DEFAULT_NODE_SIZE / 2;

/**
 * NodeData class - Manages node data and business logic
 */
export class NodeData {
  constructor(data) {
    // Generate GUID for this node using GuidManager
    this.id = data.id ? GuidManager.ensureUniqueId(data.id) : GuidManager.generateGuid('node');
    
    // Register this ID in the global registry
    GuidManager.registerGuid(this.id, 'node');
    
    // Basic properties
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.svg = data.svg || '';
    this.label = data.label || '';
    this.class = data.class || '';
    this.scale = data.scale ?? 1;
    
    // Interaction state
    this.isSelected = false;
    this.isHovering = false;
    this.interactionMode = null; // 'move', 'scale', or null
    this.previousMode = null;
    this.justCreated = false; // Flag to track if this node was just created/duplicated
  }

  // Set position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // Set scale
  setScale(scale) {
    this.scale = Math.max(0.1, scale);
  }

  // Set interaction mode
  setInteractionMode(mode) {
    this.previousMode = this.interactionMode;
    this.interactionMode = mode;
  }

  // Check if interaction mode has changed
  hasInteractionModeChanged() {
    return this.previousMode !== null && this.previousMode !== this.interactionMode;
  }

  // Clear interaction modes
  clearInteractionModes() {
    this.interactionMode = null;
    this.previousMode = null;
    this.isSelected = false;
    this.isHovering = false;
    this.justCreated = false;
  }

  // Get node data for serialization
  toData() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      svg: this.svg,
      label: this.label,
      class: this.class,
      scale: this.scale
    };
  }

  // Create a duplicate of this node with a new GUID
  duplicate() {
    const duplicateData = this.toData();
    // Remove the existing ID so a new GUID will be generated
    delete duplicateData.id;
    
    // Create new node with new GUID
    const duplicatedNode = new NodeData(duplicateData);
    duplicatedNode.justCreated = true;
    
    return duplicatedNode;
  }

  // Destroy this node data (unregister GUID)
  destroy() {
    GuidManager.unregisterGuid(this.id);
  }
}

/**
 * NodeRenderer class - Manages SVG rendering and interaction
 */
export class NodeRenderer {
  constructor(nodeData, element) {
    this.nodeData = nodeData;
    this.element = element;
    
    // Interaction state for rendering
    this.isDragging = false;
    this.isScaling = false;
    this.hasStartedDragging = false;
    this.clickStartX = 0;
    this.clickStartY = 0;
    this.clickStartTime = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.startDistance = 0;
    this.startScale = 1;
    this.dragStartMousePos = null;
    this.dragStartNodePos = null;
    
    // External dependencies (set by renderer.js)
    this.coordinateSystem = null;
    this.dragManager = null;
  }

  // Static factory method to create a node renderer
  static createNodeRenderer(nodeData, svg) {
    // Create SVG element for the node
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', nodeData.class);
    g.innerHTML = nodeData.svg;
    svg.appendChild(g);
    
    const renderer = new NodeRenderer(nodeData, g);
    renderer.updateTransform();
    
    return renderer;
  }

  // Get the node's ID (from data)
  get id() {
    return this.nodeData.id;
  }

  // Get/set position (delegates to data)
  get x() { return this.nodeData.x; }
  set x(value) { this.nodeData.x = value; }
  
  get y() { return this.nodeData.y; }
  set y(value) { this.nodeData.y = value; }
  
  get scale() { return this.nodeData.scale; }
  set scale(value) { this.nodeData.scale = value; }

  // Legacy property accessors for compatibility
  get label() { return this.nodeData.label; }
  get class() { return this.nodeData.class; }
  get svg() { return this.nodeData.svg; }
  get justCreated() { return this.nodeData.justCreated; }
  set justCreated(value) { this.nodeData.justCreated = value; }
  get interactionMode() { return this.nodeData.interactionMode; }
  get previousMode() { return this.nodeData.previousMode; }

  // Set position (updates both data and rendering)
  setPosition(x, y) {
    this.nodeData.setPosition(x, y);
    this.updateTransform();
  }

  // Update the SVG transform based on current position and scale
  updateTransform() {
    if (this.element) {
      this.element.setAttribute('transform', `translate(${this.nodeData.x}, ${this.nodeData.y}) scale(${this.nodeData.scale})`);
    }
  }

  // Get the center and radius in the node's local coordinate space
  getLocalCenter() {
    if (this.coordinateSystem) {
      return this.coordinateSystem.getNodeCenter(this.element, 'local');
    }
    
    // Fallback to original implementation
    try {
      const bbox = this.element.getBBox();
      return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
        radius: Math.min(bbox.width, bbox.height) / 2
      };
    } catch (error) {
      console.error('Error in getLocalCenter:', error);
      return {
        x: 0,
        y: 0,
        radius: DEFAULT_NODE_RADIUS
      };
    }
  }

  // Get the center and radius in the global coordinate space
  getGlobalCenter() {
    if (this.coordinateSystem) {
      return this.coordinateSystem.getNodeCenter(this.element, 'global');
    }
    
    // Fallback to original implementation
    try {
      const bbox = this.element.getBBox();
      const matrix = this.element.getCTM();
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      
      if (matrix) {
        return {
          x: matrix.a * centerX + matrix.c * centerY + matrix.e,
          y: matrix.b * centerX + matrix.d * centerY + matrix.f,
          radius: Math.min(bbox.width, bbox.height) / 2 * Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b)
        };
      } else {
        return {
          x: centerX,
          y: centerY,
          radius: Math.min(bbox.width, bbox.height) / 2
        };
      }
    } catch (error) {
      console.error('Error in getGlobalCenter:', error);
      return {
        x: this.nodeData.x,
        y: this.nodeData.y,
        radius: DEFAULT_NODE_RADIUS
      };
    }
  }

  // Selection methods
  select() {
    this.nodeData.isSelected = true;
    if (this.element) {
      this.element.classList.add('selected');
    }
  }

  deselect() {
    this.nodeData.isSelected = false;
    if (this.element) {
      this.element.classList.remove('selected');
    }
  }

  // Visual state methods
  setDraggingState() {
    if (this.element) {
      this.element.classList.add('dragging');
      this.element.classList.remove('scaling');
    }
  }

  setScalingState() {
    if (this.element) {
      this.element.classList.add('scaling');
      this.element.classList.remove('dragging');
    }
  }

  clearInteractionStates() {
    this.nodeData.clearInteractionModes();
    this.isDragging = false;
    this.isScaling = false;
    this.hasStartedDragging = false;
    
    if (this.element) {
      this.element.classList.remove('dragging', 'scaling');
    }
  }

  // Check if interaction mode has changed
  hasInteractionModeChanged() {
    return this.nodeData.hasInteractionModeChanged();
  }

  // Mouse interaction methods
  onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    e.stopPropagation();
    
    const mousePos = getMousePositionInViewBox(e);
    this.clickStartX = mousePos.x;
    this.clickStartY = mousePos.y;
    this.clickStartTime = Date.now();
    this.hasStartedDragging = false;
    
    // Get node center using coordinate system or fallback
    const center = this.coordinateSystem 
      ? this.coordinateSystem.getNodeCenter(this.element, 'global')
      : this.getGlobalCenter();
    
    this.centerX = center.x;
    this.centerY = center.y;
    this.startDistance = Math.hypot(mousePos.x - this.centerX, mousePos.y - this.centerY);
    this.startScale = this.nodeData.scale ?? 1;
    this.isDragging = true;
    this.isScaling = getShiftDown();
    this.nodeData.setInteractionMode(getShiftDown() ? 'scale' : 'move');

    // Cancel edge creation if we start dragging/scaling
    if (cancelEdgeCreationCallback) {
      cancelEdgeCreationCallback();
    }

    if (this.isScaling) {
      // For scaling, recalculate center using the proper coordinate system
      const scalingCenter = this.coordinateSystem 
        ? this.coordinateSystem.getNodeCenter(this.element, 'global')
        : this.getGlobalCenter();
      this.centerX = scalingCenter.x;
      this.centerY = scalingCenter.y;
      this.startDistance = Math.hypot(mousePos.x - this.centerX, mousePos.y - this.centerY);
      this.startScale = this.nodeData.scale ?? 1;
    } else {
      // Use DragManager for movement operations
      if (this.dragManager) {
        this.dragManager.startDrag(this, mousePos.x, mousePos.y);
      } else {
        // Fallback to old method if dragManager not available
        this.dragStartMousePos = { x: mousePos.x, y: mousePos.y };
        this.dragStartNodePos = { x: this.nodeData.x, y: this.nodeData.y };
      }
    }
  }

  onMouseMove(e, svg, getShiftDown, scheduleRedrawCallback, selectCallback, getMousePositionInViewBox) {
    if (!this.isDragging) return;
    
    // Store previous mode and determine current mode
    this.nodeData.setInteractionMode(getShiftDown() ? 'scale' : 'move');
    this.isScaling = (this.nodeData.interactionMode === 'scale');
    
    // Convert mouse coordinates to viewBox coordinates
    const mousePos = getMousePositionInViewBox(e);
    const mouseXInSvg = mousePos.x;
    const mouseYInSvg = mousePos.y;
    
    // Detect mode transition and recalculate parameters
    if (this.hasInteractionModeChanged()) {
      if (this.nodeData.interactionMode === 'scale') {
        // Switching to scale mode - recalculate scaling parameters based on current state
        const center = this.coordinateSystem 
          ? this.coordinateSystem.getNodeCenter(this.element, 'global')
          : this.getGlobalCenter();
        this.centerX = center.x;
        this.centerY = center.y;
        this.startDistance = Math.hypot(mouseXInSvg - this.centerX, mouseYInSvg - this.centerY);
        this.startScale = this.nodeData.scale ?? 1; // Use current scale as new baseline
      } else {
        // Switching to move mode - start new drag operation with DragManager
        if (this.dragManager) {
          // Stop current drag and start new one
          this.dragManager.stopDrag(this);
          this.dragManager.startDrag(this, mouseXInSvg, mouseYInSvg);
        } else {
          // Fallback to old method
          this.dragStartMousePos = { x: mouseXInSvg, y: mouseYInSvg };
          this.dragStartNodePos = { x: this.nodeData.x, y: this.nodeData.y };
        }
      }
    }
    
    // Check if we've actually started dragging (moved more than a few pixels)
    const distanceMoved = Math.hypot(mouseXInSvg - this.clickStartX, mouseYInSvg - this.clickStartY);
    if (distanceMoved > 5 && !this.hasStartedDragging) {
      // We've started actually dragging, so select this node and set appropriate visual state
      this.hasStartedDragging = true;
      selectCallback(this);
      
      // Set the appropriate visual state based on interaction mode
      if (this.nodeData.interactionMode === 'scale') {
        this.setScalingState();
      } else {
        this.setDraggingState();
      }
    } else if (this.hasStartedDragging) {
      // Update visual state if interaction mode changed during drag
      if (this.nodeData.interactionMode === 'scale') {
        this.setScalingState();
      } else {
        this.setDraggingState();
      }
    }

    if (this.nodeData.interactionMode === 'scale') {
      const currentDistance = Math.hypot(mouseXInSvg - this.centerX, mouseYInSvg - this.centerY);
      const scaleFactor = currentDistance / (this.startDistance || 1);
      this.nodeData.setScale(this.startScale * scaleFactor);
    } else {
      // Use DragManager for movement operations
      if (this.dragManager) {
        this.dragManager.updateDrag(this, mouseXInSvg, mouseYInSvg);
      } else {
        // Fallback to old method
        const deltaX = mouseXInSvg - this.dragStartMousePos.x;
        const deltaY = mouseYInSvg - this.dragStartMousePos.y;
        this.nodeData.setPosition(this.dragStartNodePos.x + deltaX, this.dragStartNodePos.y + deltaY);
      }
    }

    this.updateTransform();
    scheduleRedrawCallback();
  }

  onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox) {
    // Handle clicks during edge creation mode
    if (isEdgeCreationMode && isEdgeCreationMode()) {
      const mousePos = getMousePositionInViewBox(e);
      const timeDiff = Date.now() - this.clickStartTime;
      const distanceMoved = Math.hypot(mousePos.x - this.clickStartX, mousePos.y - this.clickStartY);
      
      // Only trigger selection if this was a quick click (not a drag attempt)
      if (timeDiff < 200 && distanceMoved < 5) {
        console.log(`Click detected on node ${this.nodeData.id} during edge creation`);
        selectCallback(this);
      }
      return;
    }
    
    if (this.isDragging) {
      // Check if this was a click (not a drag)
      const mousePos = getMousePositionInViewBox(e);
      const timeDiff = Date.now() - this.clickStartTime;
      const distanceMoved = Math.hypot(mousePos.x - this.clickStartX, mousePos.y - this.clickStartY);
      
      console.log(`Mouse up on node ${this.nodeData.id}: timeDiff=${timeDiff}, distanceMoved=${distanceMoved}, hasStartedDragging=${this.hasStartedDragging}, justCreated=${this.nodeData.justCreated}`);
      
      if (timeDiff < 200 && distanceMoved < 5) {
        // This was a click - toggle selection
        console.log(`Click detected on node ${this.nodeData.id}`);
        this.clearInteractionStates();
        selectCallback(this);
      } else {
        // This was a drag - just clear states and mark as no longer just created
        this.clearInteractionStates();
        this.nodeData.justCreated = false;
      }
    }
  }

  // Animation methods
  moveTo(x, y, animate = false) {
    if (animate) {
      // Simple animation using requestAnimationFrame
      const startX = this.nodeData.x;
      const startY = this.nodeData.y;
      const deltaX = x - startX;
      const deltaY = y - startY;
      const duration = 300; // ms
      const startTime = performance.now();
      
      const animateFrame = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        this.nodeData.setPosition(startX + deltaX * easeProgress, startY + deltaY * easeProgress);
        this.updateTransform();
        
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      };
      
      requestAnimationFrame(animateFrame);
    } else {
      this.setPosition(x, y);
    }
  }

  scaleTo(newScale, animate = false) {
    if (animate) {
      const startScale = this.nodeData.scale;
      const deltaScale = newScale - startScale;
      const duration = 300; // ms
      const startTime = performance.now();
      
      const animateFrame = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        this.nodeData.setScale(startScale + deltaScale * easeProgress);
        this.updateTransform();
        
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      };
      
      requestAnimationFrame(animateFrame);
    } else {
      this.nodeData.setScale(newScale);
      this.updateTransform();
    }
  }

  // Event listener setup
  setupEventListeners(svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    this.element.addEventListener('mousedown', (e) => 
      this.onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox)
    );
    
    svg.addEventListener('mousemove', (e) => 
      this.onMouseMove(e, svg, getShiftDown, scheduleRedrawCallback, selectCallback, getMousePositionInViewBox)
    );
    
    window.addEventListener('mouseup', (e) => 
      this.onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox)
    );
  }

  // Destroy this node renderer
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Clean up any references
    this.element = null;
    this.coordinateSystem = null;
    this.dragManager = null;
    
    // Also destroy the associated data
    if (this.nodeData) {
      this.nodeData.destroy();
    }
  }
}

/**
 * Legacy Node class - Wrapper for backward compatibility
 * 
 * This class maintains the same API as before but uses NodeData and NodeRenderer internally
 */
export class Node {
  constructor(data, element) {
    // Create NodeData and NodeRenderer internally
    this.nodeData = new NodeData(data);
    this.nodeRenderer = new NodeRenderer(this.nodeData, element);
    
    // External dependencies (set by renderer.js)
    this._coordinateSystem = null;
    this._dragManager = null;
  }

  // Delegate all properties to nodeData or nodeRenderer
  get id() { return this.nodeData.id; }
  get x() { return this.nodeData.x; }
  set x(value) { this.nodeData.x = value; }
  get y() { return this.nodeData.y; }
  set y(value) { this.nodeData.y = value; }
  get svg() { return this.nodeData.svg; }
  get label() { return this.nodeData.label; }
  get class() { return this.nodeData.class; }
  get scale() { return this.nodeData.scale; }
  set scale(value) { this.nodeData.scale = value; }
  get element() { return this.nodeRenderer.element; }
  set element(value) { this.nodeRenderer.element = value; }
  
  // Interaction state properties
  get isDragging() { return this.nodeRenderer.isDragging; }
  set isDragging(value) { this.nodeRenderer.isDragging = value; }
  get isScaling() { return this.nodeRenderer.isScaling; }
  set isScaling(value) { this.nodeRenderer.isScaling = value; }
  get interactionMode() { return this.nodeData.interactionMode; }
  set interactionMode(value) { this.nodeData.interactionMode = value; }
  get previousMode() { return this.nodeData.previousMode; }
  set previousMode(value) { this.nodeData.previousMode = value; }
  get justCreated() { return this.nodeData.justCreated; }
  set justCreated(value) { this.nodeData.justCreated = value; }
  
  // Drag state properties
  get clickStartX() { return this.nodeRenderer.clickStartX; }
  set clickStartX(value) { this.nodeRenderer.clickStartX = value; }
  get clickStartY() { return this.nodeRenderer.clickStartY; }
  set clickStartY(value) { this.nodeRenderer.clickStartY = value; }
  get clickStartTime() { return this.nodeRenderer.clickStartTime; }
  set clickStartTime(value) { this.nodeRenderer.clickStartTime = value; }
  get dragOffsetX() { return this.nodeRenderer.dragOffsetX; }
  set dragOffsetX(value) { this.nodeRenderer.dragOffsetX = value; }
  get dragOffsetY() { return this.nodeRenderer.dragOffsetY; }
  set dragOffsetY(value) { this.nodeRenderer.dragOffsetY = value; }
  get centerX() { return this.nodeRenderer.centerX; }
  set centerX(value) { this.nodeRenderer.centerX = value; }
  get centerY() { return this.nodeRenderer.centerY; }
  set centerY(value) { this.nodeRenderer.centerY = value; }
  get startDistance() { return this.nodeRenderer.startDistance; }
  set startDistance(value) { this.nodeRenderer.startDistance = value; }
  get startScale() { return this.nodeRenderer.startScale; }
  set startScale(value) { this.nodeRenderer.startScale = value; }

  // External dependencies - forward to nodeRenderer
  get coordinateSystem() { return this._coordinateSystem; }
  set coordinateSystem(value) { 
    this._coordinateSystem = value;
    this.nodeRenderer.coordinateSystem = value; 
  }
  get dragManager() { return this._dragManager; }
  set dragManager(value) { 
    this._dragManager = value;
    this.nodeRenderer.dragManager = value; 
  }

  // Delegate all methods to nodeRenderer
  getLocalCenter() { return this.nodeRenderer.getLocalCenter(); }
  getGlobalCenter() { return this.nodeRenderer.getGlobalCenter(); }
  select() { return this.nodeRenderer.select(); }
  deselect() { return this.nodeRenderer.deselect(); }
  setDraggingState() { return this.nodeRenderer.setDraggingState(); }
  setScalingState() { return this.nodeRenderer.setScalingState(); }
  clearInteractionStates() { return this.nodeRenderer.clearInteractionStates(); }
  hasInteractionModeChanged() { return this.nodeRenderer.hasInteractionModeChanged(); }
  updateTransform() { return this.nodeRenderer.updateTransform(); }
  setPosition(x, y) { return this.nodeRenderer.setPosition(x, y); }
  moveTo(x, y, animate = false) { return this.nodeRenderer.moveTo(x, y, animate); }
  scaleTo(newScale, animate = false) { return this.nodeRenderer.scaleTo(newScale, animate); }
  destroy() { return this.nodeRenderer.destroy(); }
  
  // Mouse event methods
  onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    return this.nodeRenderer.onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox);
  }
  
  onMouseMove(e, svg, getShiftDown, scheduleRedrawCallback, selectCallback, getMousePositionInViewBox) {
    return this.nodeRenderer.onMouseMove(e, svg, getShiftDown, scheduleRedrawCallback, selectCallback, getMousePositionInViewBox);
  }
  
  onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox) {
    return this.nodeRenderer.onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox);
  }
  
  setupEventListeners(svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    return this.nodeRenderer.setupEventListeners(svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox);
  }

  // Duplication method with GUID
  duplicate() {
    const duplicatedNodeData = this.nodeData.duplicate();
    // Note: The element will need to be created separately by the caller
    return duplicatedNodeData;
  }

  // Get node data for serialization
  toData() {
    return this.nodeData.toData();
  }
}

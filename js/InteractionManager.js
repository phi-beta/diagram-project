/**
 * Manages all user interactions with the diagram including
 * node selection, dragging, scaling, and edge creation
 */
export class InteractionManager {
  constructor(svg, viewBoxManager, dragManager) {
    this.svg = svg;
    this.viewBoxManager = viewBoxManager;
    this.dragManager = dragManager;
    this.coordinateSystem = viewBoxManager.coordinateSystem;
    
    // State management
    this.selectedNode = null;
    this.shiftDown = false;
    this.ctrlDown = false;
    
    // Edge creation state
    this.isCreatingEdge = false;
    this.edgeStartNode = null;
    this.temporaryEdge = null;
    
    // Mouse tracking
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // Callbacks
    this.nodeSelectCallback = null;
    this.edgeCreateCallback = null;
    this.redrawCallback = null;
    
    this.setupEventListeners();
  }
  
  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse events
    this.svg.addEventListener('click', (e) => this.handleSvgClick(e));
    this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.svg.addEventListener('wheel', (e) => this.handleWheel(e));
    this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }
  
  /**
   * Set callbacks for external interactions
   */
  setCallbacks(nodeSelectCallback, edgeCreateCallback, redrawCallback) {
    this.nodeSelectCallback = nodeSelectCallback;
    this.edgeCreateCallback = edgeCreateCallback;
    this.redrawCallback = redrawCallback;
  }
  
  /**
   * Handle keyboard key down events
   */
  handleKeyDown(e) {
    if (e.key === 'Shift') {
      this.shiftDown = true;
      // Start edge creation if a node is selected and mouse is not over that node
      if (this.selectedNode && !this.isCreatingEdge && 
          !this.dragManager.isAnyNodeDragging() && !this.isMouseOverSelectedNode()) {
        this.startEdgeCreation(this.selectedNode);
      }
    }
    if (e.key === 'Control') {
      this.ctrlDown = true;
    }
    
    // Note: Ctrl+D for duplication is handled by the main renderer
  }
  
  /**
   * Handle keyboard key up events
   */
  handleKeyUp(e) {
    if (e.key === 'Shift') {
      this.shiftDown = false;
      this.cancelEdgeCreation();
    }
    if (e.key === 'Control') {
      this.ctrlDown = false;
    }
  }
  
  /**
   * Handle SVG click events
   */
  handleSvgClick(e) {
    // Only deselect if the click target is the svg itself (background)
    if (e.target === this.svg) {
      if (this.selectedNode) {
        this.selectedNode.deselect();
        this.selectedNode = null;
      }
      this.cancelEdgeCreation();
    }
  }
  
  /**
   * Handle mouse move events
   */
  handleMouseMove(e) {
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    // Check if any node is being interacted with and cancel edge creation if so
    this.checkForNodeInteractions();
    
    // If Shift is held and we have a selected node, manage edge creation based on mouse position
    if (this.shiftDown && this.selectedNode && !this.dragManager.isAnyNodeDragging()) {
      const mouseOverSelectedNode = this.isMouseOverSelectedNode();
      
      if (this.isCreatingEdge && mouseOverSelectedNode) {
        // Cancel edge creation when mouse moves over the selected node
        this.cancelEdgeCreation();
      } else if (!this.isCreatingEdge && !mouseOverSelectedNode) {
        // Start edge creation when mouse moves away from the selected node
        this.startEdgeCreation(this.selectedNode);
      }
    }
    
    if (this.isCreatingEdge) {
      this.updateTemporaryEdge();
    }
    
    // Handle panning
    this.viewBoxManager.updatePanning(e.clientX, e.clientY);
  }
  
  /**
   * Handle wheel events for zooming
   */
  handleWheel(e) {
    e.preventDefault();
    const mousePos = this.viewBoxManager.screenToViewBox(e.clientX, e.clientY);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    this.viewBoxManager.zoom(zoomFactor, mousePos.x - this.viewBoxManager.viewBoxX, mousePos.y - this.viewBoxManager.viewBoxY);
  }
  
  /**
   * Handle mouse down events
   */
  handleMouseDown(e) {
    // Only start panning on middle mouse button or Ctrl + left mouse button
    if (e.button === 1 || (e.button === 0 && e.ctrlKey && !e.shiftKey)) {
      e.preventDefault();
      this.viewBoxManager.startPanning(e.clientX, e.clientY);
    }
  }
  
  /**
   * Handle mouse up events
   */
  handleMouseUp(e) {
    this.viewBoxManager.stopPanning();
  }
  
  /**
   * Select a node
   */
  selectNode(node) {
    // Clear previous selection
    if (this.selectedNode) {
      this.selectedNode.deselect();
    }
    
    // Handle deselection (when node is null)
    if (node === null) {
      this.selectedNode = null;
      this.cancelEdgeCreation();
      return;
    }
    
    // Check if we're in edge creation mode and this is a different node
    if (this.isCreatingEdge && this.edgeStartNode && node !== this.edgeStartNode) {
      this.completeEdgeCreation(this.edgeStartNode, node);
      return;
    }
    
    // Set new selection
    if (this.selectedNode === node) {
      // Clicking the same node deselects it
      this.selectedNode = null;
      this.cancelEdgeCreation();
    } else {
      this.selectedNode = node;
      node.select();
    }
  }
  
  /**
   * Start edge creation from a node
   */
  startEdgeCreation(fromNode) {
    this.isCreatingEdge = true;
    this.edgeStartNode = fromNode;
    
    // Change cursor to indicate edge creation mode
    this.svg.style.cursor = 'crosshair';
    
    // Create temporary edge element with CSS class
    this.temporaryEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.temporaryEdge.setAttribute('class', 'temporary-edge');
    
    this.svg.appendChild(this.temporaryEdge);
    
    // Update the temporary edge position
    this.updateTemporaryEdge();
  }
  
  /**
   * Update the temporary edge during creation
   */
  updateTemporaryEdge() {
    if (!this.isCreatingEdge || !this.temporaryEdge || !this.edgeStartNode) return;
    
    // Cancel edge creation if any node is being interacted with
    if (this.dragManager.isAnyNodeDragging()) {
      this.cancelEdgeCreation();
      return;
    }
    
    // Get the current mouse position in viewBox coordinates
    const mousePos = this.viewBoxManager.screenToViewBox(this.lastMouseX, this.lastMouseY);
    const mouseX = mousePos.x;
    const mouseY = mousePos.y;
    
    // Get the start node's center and radius
    const startCenter = this.edgeStartNode.getTransformedCenter();
    
    // Calculate direction vector from node center to mouse
    const dx = mouseX - startCenter.x;
    const dy = mouseY - startCenter.y;
    const distance = Math.hypot(dx, dy) || 1; // Avoid division by zero
    
    // Calculate the start point at the edge of the node (not the center)
    const startX = startCenter.x + dx * (startCenter.radius / distance);
    const startY = startCenter.y + dy * (startCenter.radius / distance);
    
    // Create path from node edge to mouse position
    const pathData = `M ${startX} ${startY} L ${mouseX} ${mouseY}`;
    this.temporaryEdge.setAttribute('d', pathData);
  }
  
  /**
   * Complete edge creation between two nodes
   */
  completeEdgeCreation(fromNode, toNode) {
    if (!this.isCreatingEdge || !fromNode || !toNode) return;
    
    // Call the external callback to create the edge
    if (this.edgeCreateCallback) {
      this.edgeCreateCallback(fromNode, toNode);
    }
    
    // Clean up
    this.cancelEdgeCreation();
  }
  
  /**
   * Cancel edge creation
   */
  cancelEdgeCreation() {
    if (!this.isCreatingEdge) return;
    
    this.isCreatingEdge = false;
    this.edgeStartNode = null;
    
    // Reset cursor
    this.svg.style.cursor = 'default';
    
    // Remove temporary edge
    if (this.temporaryEdge) {
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
    }
  }
  
  /**
   * Check if mouse is over the selected node
   */
  isMouseOverSelectedNode() {
    if (!this.selectedNode) return false;
    
    const mousePos = this.viewBoxManager.screenToViewBox(this.lastMouseX, this.lastMouseY);
    
    return this.selectedNode.containsGlobalPoint(mousePos.x, mousePos.y);
  }
  
  /**
   * Check if we're in edge creation mode
   */
  getIsCreatingEdge() {
    return this.isCreatingEdge;
  }
  
  /**
   * Check for node interactions and cancel edge creation if needed
   */
  checkForNodeInteractions() {
    // Cancel edge creation if any node is being interacted with
    if (this.dragManager.isAnyNodeDragging() && this.isCreatingEdge) {
      this.cancelEdgeCreation();
    }
  }
  
  /**
   * Duplicate the currently selected node
   */
  duplicateSelectedNode() {
    // This should be handled by the external duplication function
    // The keyboard event handler will call duplicateSelectedNode directly from renderer
  }
}

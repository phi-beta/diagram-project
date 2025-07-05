// Version 055 - Added cursor debug logging
/**
 * Interaction Manager - Handles user interactions with the diagram
 */
import { debugInteraction, debugEdgeCreation, debugKeyboard, debugMouse } from './debug.js';
import { nodeStateManager } from './NodeStateManager.js?v=012';

export class InteractionManager {
  constructor(svg, viewBoxManager, dragManager) {
    debugInteraction('🚀 InteractionManager constructor called');
    debugInteraction('  svg:', svg);
    debugInteraction('  viewBoxManager:', viewBoxManager);
    debugInteraction('  dragManager:', dragManager);
    
    this.svg = svg;
    this.viewBoxManager = viewBoxManager;
    this.dragManager = dragManager;
    this.coordinateSystem = viewBoxManager.coordinateSystem;
    
    // State management
    this.selectedNode = null;
    this.shiftDown = false;
    this.ctrlDown = false;
    this.justCompletedEdge = false;
    this.lastEdgeTargetNode = null;
    
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
    debugInteraction('✅ InteractionManager constructor complete');
  }
  
  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    debugInteraction('🎯 Setting up InteractionManager event listeners');
    
    // Keyboard events - simplified approach
    const keyDownHandler = (e) => {
      debugKeyboard('🎯 InteractionManager keydown:', e.key, 'target:', e.target.tagName);
      this.handleKeyDown(e);
    };
    
    const keyUpHandler = (e) => {
      debugKeyboard('🎯 InteractionManager keyup:', e.key, 'target:', e.target.tagName);
      this.handleKeyUp(e);
    };
    
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    debugInteraction('✅ Keyboard event listeners attached');
    
    // Mouse events
    this.svg.addEventListener('click', (e) => this.handleSvgClick(e));
    this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.svg.addEventListener('wheel', (e) => this.handleWheel(e));
    this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
    debugInteraction('✅ Mouse event listeners attached');
    
    // Ensure the document can receive focus for keyboard events
    if (document.activeElement !== document.body) {
      document.body.focus();
      debugInteraction('✅ Document body focused for keyboard events');
    }
    
    debugInteraction('✅ InteractionManager event listeners setup complete');
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
    // Prevent key repeat and multiple triggers
    if (e.repeat) return;
    
    if (e.key === 'Shift') {
      // Prevent multiple shift key triggers
      if (this.shiftDown) {
        return;
      }
      
      console.log(`⌨️ SHIFT KEY DOWN: selectedNode=${this.selectedNode?.id || 'null'}, isCreating=${this.isCreatingEdge}, dragging=${this.dragManager.isAnyNodeDragging()}`);
      this.shiftDown = true;
      
      // Start edge creation if a node is selected and mouse is not over that node
      if (this.selectedNode && !this.isCreatingEdge && 
          !this.dragManager.isAnyNodeDragging() && !this.isMouseOverSelectedNode()) {
        console.log(`🚀 SHIFT KEY EDGE CREATION: Starting edge creation from ${this.selectedNode.id}`);
        debugEdgeCreation('🚀 Starting edge creation from:', this.selectedNode.id);
        this.startEdgeCreation(this.selectedNode);
      }
    }
    if (e.key === 'Control') {
      this.ctrlDown = true;
    }
    if (e.key === 'Escape') {
      debugEdgeCreation('Escape pressed - canceling edge creation');
      this.cancelEdgeCreation();
    }
    
    // Note: Ctrl+D for duplication is handled by the main renderer
  }
  
  /**
   * Handle keyboard key up events
   */
  handleKeyUp(e) {
    if (e.key === 'Shift') {
      console.log(`⌨️ SHIFT KEY UP: was creating edge=${this.isCreatingEdge}, from=${this.edgeStartNode?.id || 'null'}`);
      this.shiftDown = false;
      
      // Cancel edge creation if Shift key is released during edge creation
      if (this.isCreatingEdge) {
        console.log(`🚫 Canceling edge creation due to Shift key release`);
        this.cancelEdgeCreation();
      }
      
      debugKeyboard('Shift released - edge creation canceled if active');
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
    // Update mouse position
    const oldMouseX = this.lastMouseX;
    const oldMouseY = this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    // Debug mouse tracking occasionally
    if (this.shiftDown && Math.random() < 0.05) { // 5% of the time when shift is down
      debugMouse('Mouse move - shift down:', this.shiftDown, 'pos:', this.lastMouseX, this.lastMouseY);
    }
    
    // Check if any node is being interacted with and cancel edge creation if so
    this.checkForNodeInteractions();
    
    // If Shift is held and we have a selected node, manage edge creation based on mouse position
    if (this.shiftDown && this.selectedNode && !this.dragManager.isAnyNodeDragging()) {
      const mouseOverSelectedNode = this.isMouseOverSelectedNode();
      
      // Debug the conditions
      if (Math.random() < 0.05) { // 5% of the time
        console.log(`🔍 EDGE CREATION CONDITIONS: shift=${this.shiftDown}, selectedNode=${this.selectedNode?.id || 'null'}, dragging=${this.dragManager.isAnyNodeDragging()}, mouseOver=${mouseOverSelectedNode}, isCreating=${this.isCreatingEdge}`);
      }
      
      if (this.isCreatingEdge && mouseOverSelectedNode) {
        // Cancel edge creation when mouse moves over the selected node
        debugEdgeCreation('🛑 Canceling edge creation - mouse over selected node');
        this.cancelEdgeCreation();
      } else if (!this.isCreatingEdge && !mouseOverSelectedNode) {
        // Start edge creation when mouse moves away from the selected node
        console.log(`🚀 MOUSE MOVE EDGE CREATION: Starting edge creation from ${this.selectedNode?.id} - mouse moved away from node`);
        debugEdgeCreation('🚀 STARTING EDGE CREATION - mouse away from selected node');
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
    debugInteraction('🎯 InteractionManager.selectNode called:', node ? node.id : 'null');
    debugInteraction('  isCreatingEdge:', this.isCreatingEdge);
    debugInteraction('  edgeStartNode:', this.edgeStartNode ? this.edgeStartNode.id : 'null');
    
    // PRIORITY: Handle edge completion first if we're creating an edge
    if (this.isCreatingEdge && this.edgeStartNode && node && node !== this.edgeStartNode) {
      debugEdgeCreation('🎯 COMPLETING EDGE:', this.edgeStartNode.id, '->', node.id);
      console.log(`🎯 Edge completion: ${this.edgeStartNode.id} → ${node.id}, avoiding selection of target node ${node.id}`);
      console.log(`🔍 Target node ${node.id} current state before edge completion:`, nodeStateManager?.getStateMachine(node.id)?.getCurrentState());
      this.completeEdgeCreation(this.edgeStartNode, node);
      console.log(`🔍 Target node ${node.id} current state after edge completion:`, nodeStateManager?.getStateMachine(node.id)?.getCurrentState());
      return; // Return early - don't select the target node
    }
    
    // Prevent selection of the node that was just the target of an edge completion
    if (this.justCompletedEdge && this.lastEdgeTargetNode && node) {
      const isSameNode = node === this.lastEdgeTargetNode || node.id === this.lastEdgeTargetNode.id;
      
      if (isSameNode) {
        debugInteraction('🚫 Ignoring selection of edge target node:', node.id);
        return;
      }
    }
    
    // Check if node is in cooldown state and prevent selection
    if (node && nodeStateManager) {
      const currentState = nodeStateManager.getStateMachine(node.id)?.getCurrentState();
      if (currentState === 'cooldown') {
        console.log(`🚫 Ignoring selection of node ${node.id} in cooldown state`);
        return;
      }
    }
    
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
    debugEdgeCreation('🚀 InteractionManager.startEdgeCreation called with:', fromNode ? fromNode.id : 'null');
    debugEdgeCreation('Starting edge creation from:', fromNode ? fromNode.id : 'null');
    
    // Cancel any existing edge creation before starting a new one
    if (this.isCreatingEdge) {
      console.log(`🔄 Canceling existing edge creation from ${this.edgeStartNode?.id} to start new one from ${fromNode?.id}`);
      this.cancelEdgeCreation();
    }
    
    // Debug: Check if any nodes are dragging at start
    const anyDragging = this.dragManager.isAnyNodeDragging();
    debugEdgeCreation(`Drag state check: anyDragging=${anyDragging}, fromNode.isDragging=${fromNode?.isDragging}`);
    
    console.log(`🚀 EDGE CREATION STARTING: Setting isCreatingEdge to true for node ${fromNode?.id}`);
    this.isCreatingEdge = true;
    this.edgeStartNode = fromNode;
    console.log(`🚀 EDGE CREATION STATE SET: isCreatingEdge=${this.isCreatingEdge}, edgeStartNode=${this.edgeStartNode?.id}`);
    console.log(`📝 INSTRUCTION: Now click on a DIFFERENT node to complete the edge from ${fromNode?.id}`);
    
    // Change cursor to indicate edge creation mode
    this.svg.style.cursor = 'crosshair';
    
    // Create temporary edge element with CSS class
    this.temporaryEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.temporaryEdge.setAttribute('class', 'temporary-edge');
    this.temporaryEdge.setAttribute('stroke', '#ff6b6b');
    this.temporaryEdge.setAttribute('stroke-width', '2');
    this.temporaryEdge.setAttribute('stroke-dasharray', '5,5');
    this.temporaryEdge.setAttribute('fill', 'none');
    this.temporaryEdge.setAttribute('pointer-events', 'none');
    
    this.svg.appendChild(this.temporaryEdge);
    
    console.log('🎯 TEMPORARY EDGE CREATED:', this.temporaryEdge);
    
    // Delay the temporary edge update to allow drag state to clear
    setTimeout(() => {
      if (this.isCreatingEdge) {
        console.log('🎯 UPDATING TEMPORARY EDGE via timeout');
        this.updateTemporaryEdge();
      }
    }, 0);
  }
  
  /**
   * Update the temporary edge during creation
   */
  updateTemporaryEdge() {
    if (!this.isCreatingEdge || !this.temporaryEdge || !this.edgeStartNode) {
      debugEdgeCreation('updateTemporaryEdge: early return', {
        isCreatingEdge: this.isCreatingEdge,
        hasTemporaryEdge: !!this.temporaryEdge,
        hasEdgeStartNode: !!this.edgeStartNode
      });
      return;
    }
    
    // Cancel edge creation if any node is being interacted with
    const anyDragging = this.dragManager.isAnyNodeDragging();
    debugEdgeCreation(`updateTemporaryEdge: checking drag state - anyDragging=${anyDragging}`);
    if (anyDragging) {
      console.log('🚫 Canceling edge creation - node is dragging');
      this.cancelEdgeCreation();
      return;
    }
    
    // Get the current mouse position in viewBox coordinates
    const mousePos = this.viewBoxManager.screenToViewBox(this.lastMouseX, this.lastMouseY);
    const mouseX = mousePos.x;
    const mouseY = mousePos.y;
    
    // Get the start node's center and radius - handle both Node and NodeRenderer
    let startCenter;
    if (typeof this.edgeStartNode.getGlobalCenter === 'function') {
      startCenter = this.edgeStartNode.getGlobalCenter();
    } else if (typeof this.edgeStartNode.getTransformedCenter === 'function') {
      startCenter = this.edgeStartNode.getTransformedCenter();
    } else {
      console.error('edgeStartNode does not have getGlobalCenter or getTransformedCenter method:', this.edgeStartNode);
      return;
    }
    
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
    
    // Force a visual update
    if (this.temporaryEdge.parentNode) {
      this.temporaryEdge.parentNode.appendChild(this.temporaryEdge); // Move to end to ensure it's on top
    }
  }
  
  /**
   * Complete edge creation between two nodes
   */
  completeEdgeCreation(fromNode, toNode) {
    debugEdgeCreation('🎯 InteractionManager.completeEdgeCreation called:', fromNode?.id, '->', toNode?.id);
    debugEdgeCreation('  isCreatingEdge:', this.isCreatingEdge);
    debugEdgeCreation('  edgeCreateCallback:', typeof this.edgeCreateCallback);
    
    if (!this.isCreatingEdge || !fromNode || !toNode) {
      debugEdgeCreation('🚫 Early return - missing requirements');
      return;
    }
    
    // Mark that we just completed an edge to prevent shift key up from interfering
    this.justCompletedEdge = true;
    
    // Store the target node to prevent immediate re-selection
    this.lastEdgeTargetNode = toNode;
    
    // Trigger state machine transitions for both nodes if available
    if (nodeStateManager) {
      // Complete edge on source node (edgeSource -> selected)
      const sourceHandled = nodeStateManager.handleEvent(fromNode.id, 'completeEdge', {
        targetNodeId: toNode.id,
        isEdgeCompletion: true
      });
      console.log(`🔄 Source node ${fromNode.id} edge completion handled: ${sourceHandled}`);
      
      // Complete edge on target node (edgeTarget -> cooldown)
      const targetHandled = nodeStateManager.handleEvent(toNode.id, 'completeEdge', {
        sourceNodeId: fromNode.id,
        isEdgeCompletion: true
      });
      console.log(`🔄 Target node ${toNode.id} edge completion handled: ${targetHandled}`);
    }
    
    // Call the external callback to create the edge
    if (this.edgeCreateCallback) {
      this.edgeCreateCallback(fromNode, toNode);
    }
    
    // Clean up edge creation state
    this.cancelEdgeCreation();
    
    // Clean up any outstanding mousemove listeners on the target node
    if (toNode && toNode.svgElement && toNode.mouseMoveHandler) {
      toNode.svgElement.removeEventListener('mousemove', toNode.mouseMoveHandler);
      console.log(`🧹 Cleaned up mousemove listener for target node: ${toNode.id}`);
    }
    
    // Keep the origin node selected after edge completion
    if (this.selectedNode && this.selectedNode !== fromNode) {
      this.selectedNode.deselect();
    }
    this.selectedNode = fromNode;
    fromNode.select();
    
    console.log(`✅ Edge creation completed: ${fromNode.id} -> ${toNode.id}, origin node ${fromNode.id} remains selected`);
    console.log(`🔍 After edge completion - Origin ${fromNode.id} selected: ${fromNode.nodeData?.isSelected}, Target ${toNode.id} selected: ${toNode.nodeData?.isSelected}`);
    
    // Clear the flag after a longer delay to ensure subsequent mouse events are ignored
    setTimeout(() => {
      this.justCompletedEdge = false;
      this.lastEdgeTargetNode = null;
    }, 500);
  }
  
  /**
   * Cancel edge creation
   */
  cancelEdgeCreation() {
    if (!this.isCreatingEdge) {
      return;
    }
    
    console.log(`🚫 CANCELING EDGE CREATION: was creating edge from ${this.edgeStartNode?.id}`);
    debugEdgeCreation('🚫 Canceling edge creation');
    
    this.isCreatingEdge = false;
    this.edgeStartNode = null;
    
    // Reset cursor
    console.log(`🖱️ CURSOR: Resetting cursor to default in cancelEdgeCreation`);
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
    
    // Handle both Node (legacy) and NodeRenderer objects
    let result;
    if (typeof this.selectedNode.containsGlobalPoint === 'function') {
      // Legacy Node object
      result = this.selectedNode.containsGlobalPoint(mousePos.x, mousePos.y);
    } else if (this.selectedNode.nodeData && this.selectedNode.element) {
      // NodeRenderer object - calculate manually
      const center = this.selectedNode.getGlobalCenter();
      const distance = Math.hypot(mousePos.x - center.x, mousePos.y - center.y);
      result = distance <= center.radius;
    } else {
      console.error('Unknown selectedNode type:', this.selectedNode);
      return false;
    }
    
    return result;
  }
  
  /**
   * Check if we're in edge creation mode
   */
  getIsCreatingEdge() {
    console.log(`🔍 getIsCreatingEdge called: isCreatingEdge=${this.isCreatingEdge}, edgeStartNode=${this.edgeStartNode?.id || 'null'}`);
    return this.isCreatingEdge;
  }
  
  /**
   * Check for node interactions and cancel edge creation if needed
   */
  checkForNodeInteractions() {
    // Cancel edge creation if any node OTHER than the edge source is being dragged
    if (this.dragManager.isAnyNodeDragging() && this.isCreatingEdge) {
      // Check if the dragging node is the edge source node
      const draggingNodeIds = this.dragManager.getDraggingNodeIds();
      const isSourceNodeDragging = this.edgeStartNode && draggingNodeIds.includes(this.edgeStartNode.id);
      
      // Only cancel if a different node is dragging
      if (!isSourceNodeDragging) {
        debugEdgeCreation(`🚫 Canceling edge creation - different node is dragging: ${draggingNodeIds.join(', ')}`);
        this.cancelEdgeCreation();
      }
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

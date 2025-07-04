/**
 * Example integration of NodeStateManager with existing Node class
 * 
 * This shows how to modify the Node class to use the state machine
 * for cleaner state management and elimination of timing issues.
 */

import { nodeStateManager } from './NodeStateManager.js';
import { debugNodeEvents } from './debug.js';

/**
 * Modified NodeRenderer class with state machine integration
 */
export class NodeRendererWithStateMachine {
  constructor(nodeData, element) {
    this.nodeData = nodeData;
    this.element = element;
    this.stateMachine = null;
    
    // Mouse tracking for drag detection
    this.clickStartTime = 0;
    this.clickStartX = 0;
    this.clickStartY = 0;
    this.isDragging = false;
    this.isScaling = false;
    this.hasStartedDragging = false;
  }
  
  /**
   * Initialize with state machine
   */
  async initializeStateMachine() {
    this.stateMachine = await nodeStateManager.registerNode(this.nodeData.id, this.element);
    debugNodeEvents(`✅ State machine initialized for node: ${this.nodeData.id}`);
  }
  
  /**
   * Modified onMouseDown with state machine integration
   */
  onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    e.preventDefault();
    e.stopPropagation();
    
    const mousePos = getMousePositionInViewBox(e);
    this.clickStartTime = Date.now();
    this.clickStartX = mousePos.x;
    this.clickStartY = mousePos.y;
    
    // Let state machine handle the mouse down event
    const handled = nodeStateManager.handleNodeMouseDown(this.nodeData.id, e, {
      shiftKey: getShiftDown(),
      mousePos: mousePos
    });
    
    if (handled) {
      debugNodeEvents(`✅ Mouse down handled by state machine for: ${this.nodeData.id}`);
      return;
    }
    
    // Fall back to original logic if not handled by state machine
    this.originalOnMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox);
  }
  
  /**
   * Modified onMouseUp with state machine integration
   */
  onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox, getJustCompletedEdge) {
    const mousePos = getMousePositionInViewBox(e);
    const timeDiff = Date.now() - this.clickStartTime;
    const distanceMoved = Math.hypot(mousePos.x - this.clickStartX, mousePos.y - this.clickStartY);
    const isClick = timeDiff < 200 && distanceMoved < 5;
    
    debugNodeEvents(`🖱️ Mouse up on ${this.nodeData.id}: timeDiff=${timeDiff}, distanceMoved=${distanceMoved}, isClick=${isClick}`);
    
    // Handle edge creation mode first
    if (isEdgeCreationMode && isEdgeCreationMode()) {
      if (isClick && nodeStateManager.canCompleteEdge(this.nodeData.id)) {
        debugNodeEvents(`🎯 Edge completion allowed for: ${this.nodeData.id}`);
        selectCallback(this);
      }
      return;
    }
    
    // Let state machine handle the mouse up event
    const handled = nodeStateManager.handleNodeMouseUp(this.nodeData.id, e, {
      isClick: isClick,
      timeDiff: timeDiff,
      distanceMoved: distanceMoved,
      mousePos: mousePos
    });
    
    if (handled) {
      debugNodeEvents(`✅ Mouse up handled by state machine for: ${this.nodeData.id}`);
      return;
    }
    
    // Check if click should be prevented
    if (isClick && nodeStateManager.shouldPreventClick(this.nodeData.id)) {
      debugNodeEvents(`🚫 Click prevented by state machine for: ${this.nodeData.id}`);
      this.clearInteractionStates();
      return;
    }
    
    // Fall back to original logic
    this.originalOnMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox, getJustCompletedEdge);
  }
  
  /**
   * Original mouse down logic (preserved for fallback)
   */
  originalOnMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    // ... existing mouse down logic ...
  }
  
  /**
   * Original mouse up logic (preserved for fallback)
   */
  originalOnMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox, getJustCompletedEdge) {
    // ... existing mouse up logic ...
  }
  
  /**
   * Select this node (integrates with state machine)
   */
  select() {
    const stateMachine = nodeStateManager.getStateMachine(this.nodeData.id);
    if (stateMachine) {
      stateMachine.transition('select');
    } else {
      // Fallback to direct DOM manipulation
      this.element.classList.add('selected');
    }
  }
  
  /**
   * Deselect this node (integrates with state machine)
   */
  deselect() {
    const stateMachine = nodeStateManager.getStateMachine(this.nodeData.id);
    if (stateMachine) {
      stateMachine.transition('deselect');
    } else {
      // Fallback to direct DOM manipulation
      this.element.classList.remove('selected');
    }
  }
  
  /**
   * Start edge creation from this node
   */
  startEdgeCreation() {
    const stateMachine = nodeStateManager.getStateMachine(this.nodeData.id);
    if (stateMachine) {
      return stateMachine.transition('startEdgeCreation');
    }
    return false;
  }
  
  /**
   * Cancel edge creation
   */
  cancelEdgeCreation() {
    const stateMachine = nodeStateManager.getStateMachine(this.nodeData.id);
    if (stateMachine) {
      return stateMachine.transition('cancelEdgeCreation');
    }
    return false;
  }
  
  /**
   * Clear interaction states
   */
  clearInteractionStates() {
    this.isDragging = false;
    this.isScaling = false;
    this.hasStartedDragging = false;
    this.nodeData.setInteractionMode('default');
  }
  
  /**
   * Get current state from state machine
   */
  getState() {
    const stateMachine = nodeStateManager.getStateMachine(this.nodeData.id);
    return stateMachine ? stateMachine.getCurrentState() : 'unknown';
  }
  
  /**
   * Check if node is in a specific state
   */
  isInState(...states) {
    const stateMachine = nodeStateManager.getStateMachine(this.nodeData.id);
    return stateMachine ? stateMachine.isInState(...states) : false;
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    nodeStateManager.unregisterNode(this.nodeData.id);
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    debugNodeEvents(`🗑️ NodeRenderer destroyed: ${this.nodeData.id}`);
  }
}

/**
 * Modified InteractionManager integration
 */
export class InteractionManagerWithStateManager {
  constructor(svg, viewBoxManager, dragManager) {
    // ... existing constructor logic ...
    
    // Initialize state manager
    this.initializeStateManager();
  }
  
  async initializeStateManager() {
    try {
      await nodeStateManager.initialize(this);
      debugNodeEvents('✅ InteractionManager integrated with NodeStateManager');
    } catch (error) {
      console.error('Failed to initialize state manager:', error);
    }
  }
  
  /**
   * Modified selectNode with state machine integration
   */
  selectNode(node) {
    if (!node) {
      this.clearSelectedNode();
      return;
    }
    
    // Check if selection should be prevented
    if (nodeStateManager.shouldPreventSelection(node.id)) {
      debugNodeEvents(`🚫 Selection prevented by state machine for: ${node.id}`);
      return;
    }
    
    // Handle edge completion first
    if (this.isCreatingEdge && this.edgeStartNode && node !== this.edgeStartNode) {
      debugNodeEvents('🎯 Completing edge via state manager');
      nodeStateManager.handleEdgeCompletion(this.edgeStartNode.id, node.id);
      this.completeEdgeCreation(this.edgeStartNode, node);
      return;
    }
    
    // Clear previous selection
    if (this.selectedNode) {
      this.selectedNode.deselect();
    }
    
    // Select new node
    this.selectedNode = node;
    node.select();
  }
  
  /**
   * Start edge creation with state machine
   */
  startEdgeCreation(fromNode) {
    if (nodeStateManager.handleEdgeCreationStart(fromNode.id)) {
      // State machine handled it
      this.isCreatingEdge = true;
      this.edgeStartNode = fromNode;
      this.createTemporaryEdge();
    }
  }
  
  /**
   * Handle escape key with state manager
   */
  handleEscapeKey() {
    if (nodeStateManager.handleEscapeKey()) {
      // State machine handled it
      this.cancelEdgeCreation();
    }
  }
  
  /**
   * Clear selected node
   */
  clearSelectedNode() {
    if (this.selectedNode) {
      this.selectedNode.deselect();
      this.selectedNode = null;
    }
  }
  
  /**
   * Set selected node (called by state manager)
   */
  setSelectedNode(nodeId) {
    // Find node by ID and select it
    // This would need to integrate with your existing node lookup system
  }
}

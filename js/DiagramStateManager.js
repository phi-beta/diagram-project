/**
 * DiagramStateManager - Manages diagram-wide states and coordinates multi-component interactions
 * 
 * This class orchestrates global diagram states like edge creation, multi-selection, etc.
 * It uses the generic state management system and coordinates with other managers.
 */
import { StateManager } from './StateManager.js?v=001';
import { debugInteraction, debugEdgeCreation } from './debug.js';

export class DiagramStateManager {
  constructor() {
    // Core state management
    this.stateManager = null;
    this.config = null;
    this.customActionHandlers = new Map();
    
    // Component references - set by initialization
    this.interactionManager = null;
    this.nodeStateManager = null;
    this.dragManager = null;
    this.viewBoxManager = null;
    this.svg = null;
    
    // Edge creation state
    this.edgeSourceNode = null;
    this.temporaryEdge = null;
    
    // Setup custom action handlers
    this.setupCustomActionHandlers();
    
    debugInteraction('🎯 DiagramStateManager constructor complete');
  }
  
  /**
   * Initialize the diagram state manager with configuration and component references
   */
  async initialize(components = {}) {
    try {
      // Store component references
      this.interactionManager = components.interactionManager;
      this.nodeStateManager = components.nodeStateManager;
      this.dragManager = components.dragManager;
      this.viewBoxManager = components.viewBoxManager;
      this.svg = components.svg;
      
      // Load configuration
      const response = await fetch('/config/diagram-state-machine.json');
      if (!response.ok) {
        throw new Error(`Failed to load diagram state machine config: ${response.status}`);
      }
      this.config = await response.json();
      
      debugInteraction('📁 DiagramStateManager config loaded:', this.config.name);
      
      // Create state manager instance
      this.stateManager = new StateManager(
        'DiagramStateMachine',
        this.config,
        { components },
        'DIAGRAM_STATE'
      );
      
      // Listen for state changes
      this.stateManager.addEventListener('stateChange', (data) => {
        this.handleStateChange(data.from, data.to, data.action, data.context);
      });
      
      debugInteraction('✅ DiagramStateManager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize DiagramStateManager:', error);
      debugInteraction('❌ DiagramStateManager initialization failed, will use legacy behavior');
      return false;
    }
  }
  
  /**
   * Set up custom action handlers for diagram-specific operations
   */
  setupCustomActionHandlers() {
    // Cursor management
    this.customActionHandlers.set('setCrosshairCursor', (context) => {
      if (this.svg) {
        this.svg.style.cursor = 'crosshair';
        debugEdgeCreation('🎯 Diagram cursor set to crosshair');
      }
    });
    
    this.customActionHandlers.set('resetCursor', (context) => {
      if (this.svg) {
        this.svg.style.cursor = 'default';
        debugEdgeCreation('🎯 Diagram cursor reset to default');
      }
    });
    
    this.customActionHandlers.set('setSelectionCursor', (context) => {
      if (this.svg) {
        this.svg.style.cursor = 'crosshair';
        debugInteraction('🎯 Diagram cursor set to selection mode');
      }
    });
    
    // Temporary edge management
    this.customActionHandlers.set('createTemporaryEdge', (context) => {
      this.createTemporaryEdge(context);
    });
    
    this.customActionHandlers.set('removeTemporaryEdge', (context) => {
      this.removeTemporaryEdge();
    });
    
    this.customActionHandlers.set('removeTemporaryElements', (context) => {
      this.removeTemporaryEdge();
      // Add other temporary element cleanup here
    });
    
    // Edge target highlighting
    this.customActionHandlers.set('enableEdgeTargetHighlighting', (context) => {
      this.enableEdgeTargetHighlighting();
    });
    
    this.customActionHandlers.set('disableEdgeTargetHighlighting', (context) => {
      this.disableEdgeTargetHighlighting();
    });
    
    // Future: Multi-selection handlers
    this.customActionHandlers.set('enableSelectionBox', (context) => {
      debugInteraction('🎯 Selection box enabled (future feature)');
    });
    
    this.customActionHandlers.set('removeSelectionBox', (context) => {
      debugInteraction('🎯 Selection box removed (future feature)');
    });
  }
  
  /**
   * Handle state changes in the diagram state machine
   */
  handleStateChange(oldState, newState, event, context) {
    debugInteraction(`🔄 Diagram state change: ${oldState} → ${newState} (event: ${event})`);
    
    // Handle specific state transitions
    switch (newState) {
      case 'edgeCreation':
        this.onEnterEdgeCreation(context);
        break;
      case 'idle':
        if (oldState === 'edgeCreation') {
          this.onExitEdgeCreation(context);
        }
        break;
    }
    
    // Notify other components of diagram state change
    this.notifyStateChange(oldState, newState, event, context);
  }
  
  /**
   * Handle entering edge creation mode
   */
  onEnterEdgeCreation(context) {
    this.edgeSourceNode = context.sourceNode;
    debugEdgeCreation(`🚀 Diagram entering edge creation mode from node: ${this.edgeSourceNode?.id}`);
    
    // Coordinate with InteractionManager
    if (this.interactionManager) {
      this.interactionManager.isCreatingEdge = true;
      this.interactionManager.edgeStartNode = this.edgeSourceNode;
    }
  }
  
  /**
   * Handle exiting edge creation mode
   */
  onExitEdgeCreation(context) {
    debugEdgeCreation('🛑 Diagram exiting edge creation mode');
    
    this.edgeSourceNode = null;
    
    // Coordinate with InteractionManager
    if (this.interactionManager) {
      this.interactionManager.isCreatingEdge = false;
      this.interactionManager.edgeStartNode = null;
    }
  }
  
  /**
   * Create temporary edge for visual feedback
   */
  createTemporaryEdge(context) {
    if (!this.svg || !this.edgeSourceNode) return;
    
    // Remove any existing temporary edge
    this.removeTemporaryEdge();
    
    // Create new temporary edge
    this.temporaryEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.temporaryEdge.setAttribute('class', 'temporary-edge');
    this.temporaryEdge.setAttribute('stroke', '#ff6b6b');
    this.temporaryEdge.setAttribute('stroke-width', '2');
    this.temporaryEdge.setAttribute('stroke-dasharray', '5,5');
    this.temporaryEdge.setAttribute('fill', 'none');
    this.temporaryEdge.setAttribute('pointer-events', 'none');
    
    this.svg.appendChild(this.temporaryEdge);
    
    debugEdgeCreation('🎯 Temporary edge created');
  }
  
  /**
   * Remove temporary edge
   */
  removeTemporaryEdge() {
    if (this.temporaryEdge) {
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
      debugEdgeCreation('🧹 Temporary edge removed');
    }
  }
  
  /**
   * Update temporary edge position to follow mouse
   */
  updateTemporaryEdge(mouseX, mouseY) {
    if (!this.temporaryEdge || !this.edgeSourceNode) return;
    
    // Get the source node's center and radius
    let startCenter;
    if (typeof this.edgeSourceNode.getGlobalCenter === 'function') {
      startCenter = this.edgeSourceNode.getGlobalCenter();
    } else if (typeof this.edgeSourceNode.getTransformedCenter === 'function') {
      startCenter = this.edgeSourceNode.getTransformedCenter();
    } else {
      console.warn('Edge source node missing center calculation method');
      return;
    }
    
    // Calculate direction vector from node center to mouse
    const dx = mouseX - startCenter.x;
    const dy = mouseY - startCenter.y;
    const distance = Math.hypot(dx, dy) || 1;
    
    // Calculate start point at the edge of the node
    const startX = startCenter.x + dx * (startCenter.radius / distance);
    const startY = startCenter.y + dy * (startCenter.radius / distance);
    
    // Create path from node edge to mouse position
    const pathData = `M ${startX} ${startY} L ${mouseX} ${mouseY}`;
    this.temporaryEdge.setAttribute('d', pathData);
  }
  
  /**
   * Enable edge target highlighting for all nodes
   */
  enableEdgeTargetHighlighting() {
    if (!this.svg) return;
    
    const allNodes = this.svg.querySelectorAll('.node');
    allNodes.forEach(nodeElement => {
      if (nodeElement !== this.edgeSourceNode?.element) {
        nodeElement.classList.add('edge-target-available');
      }
    });
    
    debugEdgeCreation('🔆 Edge target highlighting enabled');
  }
  
  /**
   * Disable edge target highlighting
   */
  disableEdgeTargetHighlighting() {
    if (!this.svg) return;
    
    const allNodes = this.svg.querySelectorAll('.node');
    allNodes.forEach(nodeElement => {
      nodeElement.classList.remove('edge-target-available');
      nodeElement.classList.remove('edge-target-highlight');
    });
    
    debugEdgeCreation('🔆 Edge target highlighting disabled');
  }
  
  /**
   * Notify other components of diagram state changes
   */
  notifyStateChange(oldState, newState, event, context) {
    // Future: Could emit events or call specific component methods
    // For now, direct coordination in handleStateChange is sufficient
  }
  
  /**
   * Handle diagram-level events
   */
  handleEvent(eventType, eventData = {}) {
    if (!this.stateManager) {
      debugInteraction(`⚠️ DiagramStateManager not initialized, cannot handle event: ${eventType}`);
      return false;
    }
    
    return this.stateManager.handleEvent(eventType, eventData);
  }
  
  /**
   * Start edge creation from a node
   */
  startEdgeCreation(sourceNode, reason = 'manual') {
    debugEdgeCreation(`🚀 DiagramStateManager.startEdgeCreation called from ${sourceNode?.id} (${reason})`);
    
    return this.handleEvent('nodeSelectedForEdge', {
      sourceNode,
      reason,
      shiftKeyDown: true,
      mouseMovedAwayFromNode: reason === 'mouseMoved'
    });
  }
  
  /**
   * Complete edge creation to a target node
   */
  completeEdgeCreation(targetNode) {
    debugEdgeCreation(`🎯 DiagramStateManager.completeEdgeCreation to ${targetNode?.id}`);
    
    return this.handleEvent('edgeTargetClicked', {
      targetNode,
      sourceNode: this.edgeSourceNode,
      validTarget: targetNode && targetNode !== this.edgeSourceNode
    });
  }
  
  /**
   * Cancel edge creation
   */
  cancelEdgeCreation(reason = 'manual') {
    debugEdgeCreation(`🚫 DiagramStateManager.cancelEdgeCreation (${reason})`);
    
    return this.handleEvent('cancelEdgeCreation', { reason });
  }
  
  /**
   * Handle escape key press
   */
  handleEscapeKey() {
    return this.handleEvent('escapeKey');
  }
  
  /**
   * Handle background click
   */
  handleBackgroundClick() {
    return this.handleEvent('backgroundClicked');
  }
  
  /**
   * Handle node starting to drag
   */
  handleNodeStartedDragging(node) {
    return this.handleEvent('nodeStartedDragging', {
      node,
      isSourceNode: node === this.edgeSourceNode
    });
  }
  
  /**
   * Handle shift key release
   */
  handleShiftKeyReleased() {
    return this.handleEvent('shiftKeyReleased');
  }
  
  /**
   * Get current diagram state
   */
  getCurrentState() {
    return this.stateManager?.getCurrentState() || 'unknown';
  }
  
  /**
   * Check if diagram is in edge creation mode
   */
  isInEdgeCreationMode() {
    return this.getCurrentState() === 'edgeCreation';
  }
  
  /**
   * Get edge source node
   */
  getEdgeSourceNode() {
    return this.edgeSourceNode;
  }
  
  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      currentState: this.getCurrentState(),
      edgeSourceNode: this.edgeSourceNode?.id || null,
      hasTemporaryEdge: !!this.temporaryEdge,
      componentReferences: {
        interactionManager: !!this.interactionManager,
        nodeStateManager: !!this.nodeStateManager,
        dragManager: !!this.dragManager,
        viewBoxManager: !!this.viewBoxManager,
        svg: !!this.svg
      }
    };
  }
}

// Create singleton instance
export const diagramStateManager = new DiagramStateManager();

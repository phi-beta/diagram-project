// Version 011 - Removed marker fallback and enforced inline arrowhead approach
/**
 * DiagramStateManager - Manages diagram-wide states and coordinates multi-component interactions
 * 
 * This class orchestrates global diagram states like edge creation, multi-selection, etc.
 * It uses the generic state management system and coordinates with other managers.
 */
import { StateManager } from './StateManager.js?v=001';
import { debugInteraction, debugEdgeCreation } from './debug.js';

/**
 * DiagramStateManager - Version 009 - Added handleBackgroundClick method for proper state machine integration
 */

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
    this.nodeMap = null;
    this.layerManager = null;
    
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
      this.nodeMap = components.nodeMap;
      this.layerManager = components.layerManager;
      
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
      
      // Register custom action handlers with the ActionExecutor
      this.registerCustomActionHandlers();
      
      // Add arrowhead marker definition to SVG
      this.ensureArrowheadMarker();
      
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
    // Test action to verify registration works
    this.customActionHandlers.set('testAction', (context) => {
      console.log('🧪 TEST ACTION EXECUTED - custom handlers are working!');
    });
    
    // Cursor management
    this.customActionHandlers.set('setCrosshairCursor', (context) => {
      console.log('🎯 setCrosshairCursor action executed');
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
      console.log('🔧 EXPLICIT createTemporaryEdge action handler called', context);
      debugEdgeCreation('🔧 createTemporaryEdge action handler called', context);
      
      // Try to get source node from different possible locations
      let sourceNode = null;
      
      // First, try to get from InteractionManager's selected node
      if (this.interactionManager?.selectedNode) {
        sourceNode = this.interactionManager.selectedNode;
        console.log('🔍 Source node found from InteractionManager.selectedNode:', sourceNode);
      }
      // Then try context locations
      else if (context?.eventData?.sourceNode) {
        sourceNode = context.eventData.sourceNode;
        console.log('🔍 Source node found in context.eventData.sourceNode:', sourceNode);
      } else if (context?.sourceNode) {
        sourceNode = context.sourceNode;
        console.log('🔍 Source node found in context.sourceNode:', sourceNode);
      } else if (context?.components?.sourceNode) {
        sourceNode = context.components.sourceNode;
        console.log('🔍 Source node found in context.components.sourceNode:', sourceNode);
      } else {
        console.log('🔍 Context structure:', Object.keys(context || {}));
        console.log('🔍 InteractionManager selectedNode:', this.interactionManager?.selectedNode);
        console.log('🔍 Full context:', context);
      }
      
      if (sourceNode) {
        console.log('🔍 Source node type:', sourceNode.constructor.name);
        console.log('🔍 Source node ID:', sourceNode.id);
        debugEdgeCreation('🔍 Source node found:', sourceNode);
        
        // Handle both Node objects and DOM elements
        // If it's a Node object, get its DOM element
        let sourceElement;
        if (sourceNode.element) {
          sourceElement = sourceNode.element;
          console.log('🔍 Source element from Node.element:', sourceElement);
        } else if (sourceNode.tagName) {
          sourceElement = sourceNode;
          console.log('🔍 Source element is already DOM element:', sourceElement);
        } else {
          console.log('⚠️ Source node is neither Node object nor DOM element:', sourceNode);
          return;
        }
        
        console.log('🔍 Source element tagName:', sourceElement?.tagName);
        debugEdgeCreation('🔍 Source element:', sourceElement);
        
        this.setEdgeSourceNode(sourceElement);
      } else {
        console.log('⚠️ No source node found anywhere');
        debugEdgeCreation('⚠️ No source node found');
      }
      
      console.log('🔧 About to call createTemporaryEdge method');
      this.createTemporaryEdge(context);
    });
    
    this.customActionHandlers.set('removeTemporaryEdge', (context) => {
      this.removeTemporaryEdge();
      // Don't clear edge source node here - let onExitEdgeCreation handle it
    });
    
    this.customActionHandlers.set('removeTemporaryElements', (context) => {
      this.removeTemporaryEdge();
      // Don't clear edge source node here - let onExitEdgeCreation handle it
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
   * Register custom action handlers with the ActionExecutor
   */
  registerCustomActionHandlers() {
    if (!this.stateManager?.actionExecutor) {
      debugInteraction('❌ Cannot register custom actions - ActionExecutor not available');
      return;
    }
    
    console.log('🔧 DiagramStateManager registering custom actions...');
    console.log('🔍 Available custom actions:', Array.from(this.customActionHandlers.keys()));
    
    // Register all custom action handlers
    for (const [actionName, handler] of this.customActionHandlers) {
      this.stateManager.actionExecutor.registerActionHandler(actionName, handler);
      console.log(`📝 Registered custom action: ${actionName}`);
      debugInteraction(`📝 Registered custom action handler: ${actionName}`);
    }
    
    console.log(`✅ Registered ${this.customActionHandlers.size} custom action handlers`);
    debugInteraction(`✅ Registered ${this.customActionHandlers.size} custom action handlers`);
  }
  
  /**
   * Handle state changes in the diagram state machine
   */
  handleStateChange(oldState, newState, event, context) {
    console.log(`🔄 EXPLICIT Diagram state change: ${oldState} → ${newState} (event: ${event})`);
    debugInteraction(`🔄 Diagram state change: ${oldState} → ${newState} (event: ${event})`);
    
    // Handle specific state transitions
    switch (newState) {
      case 'edgeCreation':
        console.log('🚀 EXPLICIT Entering edge creation mode');
        this.onEnterEdgeCreation(context);
        break;
      case 'idle':
        if (oldState === 'edgeCreation') {
          console.log('🛑 EXPLICIT Exiting edge creation mode (edgeCreation → idle)');
          this.onExitEdgeCreation(context);
        } else {
          console.log(`ℹ️ EXPLICIT Entering idle from ${oldState} (not from edgeCreation)`);
        }
        break;
      default:
        console.log(`ℹ️ EXPLICIT Other state transition: ${oldState} → ${newState}`);
        break;
    }
    
    // Notify other components of diagram state change
    this.notifyStateChange(oldState, newState, event, context);
  }
  
  /**
   * Handle entering edge creation mode
   */
  onEnterEdgeCreation(context) {
    console.log('🔧 EXPLICIT onEnterEdgeCreation context:', context);
    
    // Get both the Node object and DOM element
    let sourceNodeObject = context.sourceNode;
    let sourceElement = context.sourceNode;
    
    if (sourceNodeObject && sourceNodeObject.element) {
      // If it's a Node object, get its DOM element
      sourceElement = sourceNodeObject.element;
      console.log('🔍 EXPLICIT Got DOM element from Node object:', sourceElement);
    } else if (sourceNodeObject && !sourceNodeObject.element) {
      // If it's already a DOM element, we need to find the Node object
      sourceElement = sourceNodeObject;
      console.log('🔍 EXPLICIT Already have DOM element:', sourceElement);
      
      // Try to find the Node object from the DOM element
      if (sourceElement && sourceElement.getAttribute) {
        const nodeId = sourceElement.getAttribute('data-node-id');
        console.log('🔍 EXPLICIT Looking for Node object with ID:', nodeId);
        if (nodeId && this.nodeMap) {
          console.log('🔍 EXPLICIT nodeMap has', this.nodeMap.size, 'entries');
          console.log('🔍 EXPLICIT Available node IDs:', Array.from(this.nodeMap.keys()));
          const nodeInstance = this.nodeMap.get(nodeId);
          if (nodeInstance) {
            sourceNodeObject = nodeInstance;
            console.log('🔍 EXPLICIT Found Node object from DOM element:', sourceNodeObject);
            console.log('🔍 EXPLICIT Node object type:', sourceNodeObject.constructor.name);
            console.log('🔍 EXPLICIT Node object has getGlobalCenter:', typeof sourceNodeObject.getGlobalCenter);
            console.log('🔍 EXPLICIT Node object has getTransformedCenter:', typeof sourceNodeObject.getTransformedCenter);
          } else {
            console.warn('⚠️ Could not find Node object in nodeMap for ID:', nodeId);
          }
        } else {
          console.warn('⚠️ No nodeMap available or no nodeId found');
        }
      }
    }
    
    this.edgeSourceNode = sourceElement;
    debugEdgeCreation(`🚀 Diagram entering edge creation mode from node: ${sourceElement?.id || sourceElement?.getAttribute?.('data-node-id') || 'unknown'}`);
    
    // Coordinate with InteractionManager
    if (this.interactionManager) {
      this.interactionManager.isCreatingEdge = true;
      // Always pass the Node object to InteractionManager for legacy compatibility
      this.interactionManager.edgeStartNode = sourceNodeObject;
      console.log('🔍 EXPLICIT Set InteractionManager edgeStartNode to:', sourceNodeObject);
    }
  }
  
  /**
   * Handle exiting edge creation mode
   */
  onExitEdgeCreation(context) {
    console.log('🛑 EXPLICIT DiagramStateManager.onExitEdgeCreation called');
    debugEdgeCreation('🛑 Diagram exiting edge creation mode');
    
    // Store the source node before clearing it
    const sourceNode = this.edgeSourceNode;
    
    // Transition the source node back to selected state
    console.log('🔍 EXPLICIT edgeSourceNode:', sourceNode);
    console.log('🔍 EXPLICIT nodeStateManager:', this.nodeStateManager);
    
    if (sourceNode && this.nodeStateManager) {
      const nodeId = sourceNode.getAttribute('data-node-id');
      console.log('🔍 EXPLICIT nodeId from edgeSourceNode:', nodeId);
      
      if (nodeId) {
        console.log(`🔄 EXPLICIT Transitioning source node ${nodeId} back to selected state`);
        debugEdgeCreation(`🔄 Transitioning source node ${nodeId} back to selected state`);
        
        // Check current state before transition
        const currentState = this.nodeStateManager.getNodeState(nodeId);
        console.log(`🔍 EXPLICIT Current state of ${nodeId}: ${currentState}`);
        
        const handled = this.nodeStateManager.handleNodeEvent(nodeId, 'cancelEdgeCreation', {
          reason: context?.reason || 'diagram-exit'
        });
        console.log(`🔄 EXPLICIT Source node ${nodeId} transition to selected: ${handled}`);
        
        // If the event mapping failed, try a direct state transition as fallback
        if (!handled) {
          console.log(`⚠️ EXPLICIT Event mapping failed, trying direct transition for ${nodeId}`);
          const nodeStateMgr = this.nodeStateManager.nodeStateManagers.get(nodeId);
          if (nodeStateMgr && nodeStateMgr.stateMachine) {
            const currentState = nodeStateMgr.stateMachine.getCurrentState();
            console.log(`🔧 EXPLICIT Current state before direct transition: ${currentState}`);
            
            // Try direct transition from edgeSource to selected
            if (currentState === 'edgeSource') {
              const directResult = nodeStateMgr.stateMachine.transition('cancelEdgeCreation');
              console.log(`🔧 EXPLICIT Direct transition result: ${directResult}`);
              
              const newState = nodeStateMgr.stateMachine.getCurrentState();
              console.log(`🔧 EXPLICIT State after direct transition: ${newState}`);
            }
          }
        }
        
        // Check state after transition
        const newState = this.nodeStateManager.getNodeState(nodeId);
        console.log(`🔍 EXPLICIT New state of ${nodeId}: ${newState}`);
      } else {
        console.log('⚠️ EXPLICIT No nodeId found on edgeSourceNode');
      }
    } else {
      if (!sourceNode) {
        console.log('⚠️ EXPLICIT No edgeSourceNode available');
      }
      if (!this.nodeStateManager) {
        console.log('⚠️ EXPLICIT No nodeStateManager available');
      }
    }
    
    // Clear references after handling the state transition
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
    console.log('🔧 EXPLICIT createTemporaryEdge called', context);
    debugEdgeCreation('🔧 createTemporaryEdge called', context);
    
    if (!this.svg) {
      console.log('❌ EXPLICIT Cannot create temporary edge - no SVG element');
      debugEdgeCreation('❌ Cannot create temporary edge - no SVG element');
      return;
    }
    
    if (!this.edgeSourceNode) {
      console.log('❌ EXPLICIT Cannot create temporary edge - no source node');
      debugEdgeCreation('❌ Cannot create temporary edge - no source node');
      return;
    }
    
    console.log('✅ EXPLICIT SVG and source node available, creating temporary edge');
    debugEdgeCreation('✅ SVG and source node available, creating temporary edge');
    
    // Remove any existing temporary edge
    this.removeTemporaryEdge();
    
    // Use InteractionManager's inline arrowhead method if available
    if (this.interactionManager && typeof this.interactionManager.createTemporaryEdgeWithInlineArrowhead === 'function') {
      // Get start position (use default if we can't get the actual position)
      let startX = 100, startY = 100;
      
      // Try to get actual source node position
      if (this.edgeSourceNode) {
        try {
          // Try different methods to get position
          if (typeof this.edgeSourceNode.getGlobalCenter === 'function') {
            const center = this.edgeSourceNode.getGlobalCenter();
            startX = center.x;
            startY = center.y;
          } else if (typeof this.edgeSourceNode.getTransformedCenter === 'function') {
            const center = this.edgeSourceNode.getTransformedCenter();
            startX = center.x;
            startY = center.y;
          } else if (this.edgeSourceNode.element) {
            // Try to get center from DOM element
            const rect = this.edgeSourceNode.element.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
          }
        } catch (e) {
          console.warn('Could not get source node position, using default:', e);
        }
      }
      
      // Create with inline arrowhead approach
      this.interactionManager.createTemporaryEdgeWithInlineArrowhead(startX, startY, startX + 100, startY + 100);
      console.log('✅ EXPLICIT Created temporary edge with inline arrowhead');
      return;
    }
    
    // ERROR: No inline arrowhead method available
    console.error('❌ EXPLICIT No inline arrowhead method available - cannot create temporary edge');
    console.error('❌ This should not happen - InteractionManager should always have createTemporaryEdgeWithInlineArrowhead');
    return;
  }
  
  /**
   * Remove temporary edge
   */
  removeTemporaryEdge() {
    debugEdgeCreation('🔧 removeTemporaryEdge called');
    if (this.temporaryEdge) {
      debugEdgeCreation('🗑️ Removing existing temporary edge');
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
      debugEdgeCreation('✅ Temporary edge removed');
    } else {
      debugEdgeCreation('ℹ️ No temporary edge to remove');
    }
  }
  
  /**
   * Update temporary edge position to follow mouse
   */
  updateTemporaryEdge(mouseX, mouseY) {
    // Use InteractionManager's inline arrowhead method if available
    if (this.interactionManager && typeof this.interactionManager.createTemporaryEdgeWithInlineArrowhead === 'function' && this.edgeSourceNode) {
      // Get source node center and radius using the same method as legacy system
      let startCenter;
      try {
        // Ensure edgeSourceNode is a DOM element
        let sourceElement = this.edgeSourceNode;
        if (!sourceElement.getAttribute) {
          console.log('⚠️ edgeSourceNode is not a DOM element:', sourceElement);
          return;
        }
        
        // Try to get the center using getBBox and getCTM (like the legacy system)
        const bbox = sourceElement.getBBox();
        const matrix = sourceElement.getCTM();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        
        if (matrix) {
          startCenter = {
            x: matrix.a * centerX + matrix.c * centerY + matrix.e,
            y: matrix.b * centerX + matrix.d * centerY + matrix.f,
            radius: Math.min(bbox.width, bbox.height) / 2 * Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b)
          };
        } else {
          startCenter = {
            x: centerX,
            y: centerY,
            radius: Math.min(bbox.width, bbox.height) / 2
          };
        }
      } catch (error) {
        console.error('Error calculating node center:', error);
        // Fallback to transform-based calculation
        const transform = this.edgeSourceNode.getAttribute('transform');
        let sourceX = 0, sourceY = 0;
        
        if (transform) {
          const matches = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (matches) {
            sourceX = parseFloat(matches[1]);
            sourceY = parseFloat(matches[2]);
          }
        }
        
        startCenter = { x: sourceX, y: sourceY, radius: 30 }; // Default radius
      }
      
      // Convert mouse coordinates to SVG coordinates
      let targetX, targetY;
      if (this.viewBoxManager) {
        const mousePos = this.viewBoxManager.screenToViewBox(mouseX, mouseY);
        targetX = mousePos.x;
        targetY = mousePos.y;
      } else {
        // Fallback: direct conversion
        const svgRect = this.svg.getBoundingClientRect();
        targetX = mouseX - svgRect.left;
        targetY = mouseY - svgRect.top;
        
        // Apply viewBox transformation if present
        const viewBox = this.svg.getAttribute('viewBox');
        if (viewBox) {
          const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number);
          const scaleX = vbWidth / svgRect.width;
          const scaleY = vbHeight / svgRect.height;
          targetX = vbX + targetX * scaleX;
          targetY = vbY + targetY * scaleY;
        }
      }
      
      // Calculate direction vector from node center to mouse
      const dx = targetX - startCenter.x;
      const dy = targetY - startCenter.y;
      const distance = Math.hypot(dx, dy) || 1; // Avoid division by zero
      
      // Calculate the start point at the edge of the node (not the center)
      const startX = startCenter.x + dx * (startCenter.radius / distance);
      const startY = startCenter.y + dy * (startCenter.radius / distance);
      
      // Update using inline arrowhead approach
      this.interactionManager.createTemporaryEdgeWithInlineArrowhead(startX, startY, targetX, targetY);
      return;
    }
    
    // ERROR: No inline arrowhead method available
    console.error('❌ updateTemporaryEdge: No inline arrowhead method available');
    return;
  }
  
  /**
   * Enable edge target highlighting
   */
  enableEdgeTargetHighlighting() {
    // Add class to all nodes (except source) to enable target highlighting
    if (!this.svg) return;
    
    const nodes = this.svg.querySelectorAll('.node');
    nodes.forEach(node => {
      if (node !== this.edgeSourceNode) {
        node.classList.add('edge-target-available');
      }
    });
    
    debugEdgeCreation('✅ Edge target highlighting enabled');
  }
  
  /**
   * Disable edge target highlighting
   */
  disableEdgeTargetHighlighting() {
    if (!this.svg) return;
    
    const nodes = this.svg.querySelectorAll('.node');
    nodes.forEach(node => {
      node.classList.remove('edge-target-available', 'edge-target-highlight');
    });
    
    debugEdgeCreation('🗑️ Edge target highlighting disabled');
  }
  
  /**
   * Ensure arrowhead marker is defined in SVG
   */
  ensureArrowheadMarker() {
    if (!this.svg) return;
    
    // Check if arrowhead marker already exists
    let defs = this.svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.svg.insertBefore(defs, this.svg.firstChild);
    }
    
    // Check if arrowhead marker already exists
    if (!defs.querySelector('#arrowhead')) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrowhead');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '7');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '3.5');
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('fill', '#ff6b6b');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
      polygon.setAttribute('fill', '#ff6b6b');
      
      marker.appendChild(polygon);
      defs.appendChild(marker);
      
      debugEdgeCreation('✅ Arrowhead marker added to SVG');
    }
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

    // Get the actual shift key state from InteractionManager
    const shiftKeyDown = this.interactionManager ? this.interactionManager.shiftDown : false;

    return this.handleEvent('nodeSelectedForEdge', {
      sourceNode,
      reason,
      shiftKeyDown,
      mouseMovedAwayFromNode: reason === 'mouseMoved',
      clickedDifferentNode: reason === 'nodeClicked'
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
    console.log(`🚫 EXPLICIT DiagramStateManager.cancelEdgeCreation (${reason})`);
    debugEdgeCreation(`🚫 DiagramStateManager.cancelEdgeCreation (${reason})`);

    // Transition the source node back to selected state BEFORE handling the diagram event
    if (this.edgeSourceNode && this.nodeStateManager) {
      const nodeId = this.edgeSourceNode.getAttribute('data-node-id');
      console.log('🔍 EXPLICIT Cancelling - nodeId from edgeSourceNode:', nodeId);

      if (nodeId) {
        console.log(`🔄 EXPLICIT CANCEL: Transitioning source node ${nodeId} back to selected state`);

        // Add a small delay to allow the diagram state to change first
        setTimeout(() => {
          const handled = this.nodeStateManager.handleNodeEvent(nodeId, 'cancelEdgeCreation', { reason });
          console.log(`🔄 EXPLICIT CANCEL: Node ${nodeId} cancelEdgeCreation handled: ${handled}`);
        }, 0);
      }
    }

    // Also clean up InteractionManager state
    if (this.interactionManager && this.interactionManager.cleanupLocalEdgeState) {
      console.log('🧹 EXPLICIT Cleaning up InteractionManager edge state');
      this.interactionManager.cleanupLocalEdgeState();
    }

    return this.handleEvent('cancelEdgeCreation', {
      reason,
      sourceNode: this.edgeSourceNode
    });
  }

  /**
   * Check if currently in edge creation mode
   */
  isInEdgeCreationMode() {
    return this.getCurrentState() === 'edgeCreation';
  }

  /**
   * Get the current edge source node
   */
  getEdgeSourceNode() {
    return this.edgeSourceNode;
  }

  /**
   * Set edge source node
   */
  setEdgeSourceNode(node) {
    console.log('🎯 EXPLICIT setEdgeSourceNode called with:', node);
    debugEdgeCreation(`🎯 setEdgeSourceNode called with:`, node);
    this.edgeSourceNode = node;
    console.log(`✅ EXPLICIT Edge source node set: ${node?.id || node?.tagName || 'unknown'}`);
    debugEdgeCreation(`✅ Edge source node set: ${node?.id || node?.tagName || 'unknown'}`);
  }

  /**
   * Clear edge source node
   */
  clearEdgeSourceNode() {
    this.edgeSourceNode = null;
    debugEdgeCreation('🗑️ Edge source node cleared');
  }

  /**
   * Get current state from the state manager
   */
  getCurrentState() {
    if (!this.stateManager) {
      return 'unknown';
    }
    return this.stateManager.getCurrentState();
  }

  /**
   * Handle event through the state manager
   */
  handleEvent(event, context = {}) {
    if (!this.stateManager) {
      console.warn('⚠️ DiagramStateManager not initialized, cannot handle event:', event);
      return false;
    }
    return this.stateManager.handleEvent(event, context);
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
        svg: !!this.svg,
        nodeMap: !!this.nodeMap
      }
    };
  }

  /**
   * Handle background click events
   */
  handleBackgroundClick() {
    debugInteraction('🖱️ DiagramStateManager handling background click');
    
    if (!this.stateManager) {
      debugInteraction('⚠️ No state manager available, falling back to legacy');
      return false;
    }

    // Use the generic event handler to process background click
    return this.handleEvent('backgroundClicked', {
      timestamp: Date.now()
    });
  }

  /**
   * Handle shift key released during edge creation
   */
  handleShiftKeyReleased() {
    console.log('🚫 EXPLICIT DiagramStateManager.handleShiftKeyReleased');
    debugEdgeCreation('🚫 DiagramStateManager.handleShiftKeyReleased');
    
    if (!this.isInEdgeCreationMode()) {
      console.log('⚠️ Not in edge creation mode, ignoring shift key release');
      return false;
    }
    
    // Clean up InteractionManager state when shift key is released
    if (this.interactionManager && this.interactionManager.cleanupLocalEdgeState) {
      console.log('🧹 EXPLICIT Cleaning up InteractionManager edge state (shift key released)');
      this.interactionManager.cleanupLocalEdgeState();
    }
    
    return this.handleEvent('shiftKeyReleased', {
      reason: 'shiftKeyReleased',
      sourceNode: this.edgeSourceNode
    });
  }
}

// Create and export singleton instance
export const diagramStateManager = new DiagramStateManager();
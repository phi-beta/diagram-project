/**
 * Node State Manager - Uses generic state management system
 * v025 - Fixed config caching and visual action sequencing for edge creation cancellation
 * 
 * This class extends the generic StateManager to provide node-specific functionality:
 * - Custom action handlers for node selection, dragging, and edge highlighting
 * - Node-specific event handling and state callbacks
 * - Integration with the InteractionManager and visual systems
 */

import { StateManager } from './StateManager.js?v=001';
import { debugInteraction, debugNodeEvents } from './debug.js';

export class NodeStateManager {
  constructor() {
    // Node-specific properties
    this.nodeElements = new Map(); // nodeId -> DOM element
    this.interactionManager = null;
    this.nodeStateManagers = new Map(); // nodeId -> individual StateManager instances
    this.config = null;
    
    // We'll create action handlers after initialization
    this.customActionHandlers = new Map();
    this.setupCustomActionHandlers();
  }
  
  /**
   * Set up custom action handlers for node-specific operations
   */
  setupCustomActionHandlers() {
    // Visual selection actions
    this.customActionHandlers.set('selectNode', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('selected');
        debugNodeEvents(`✅ Node ${nodeId} selected visually`);
      }
    });
    
    this.customActionHandlers.set('deselectNode', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('selected');
        debugNodeEvents(`❌ Node ${nodeId} deselected visually`);
      }
    });
    
    // Drag visual feedback
    this.customActionHandlers.set('startDragFeedback', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('dragging');
        debugNodeEvents(`🚀 Node ${nodeId} drag feedback started`);
      }
    });
    
    this.customActionHandlers.set('stopDragFeedback', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('dragging');
        debugNodeEvents(`⏹️ Node ${nodeId} drag feedback stopped`);
      }
    });
    
    // Edge highlighting for edge creation
    this.customActionHandlers.set('highlightEdgeTarget', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('edge-target-highlight');
        debugNodeEvents(`🔆 Node ${nodeId} highlighted as edge target`);
      }
    });
    
    this.customActionHandlers.set('unhighlightEdgeTarget', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('edge-target-highlight');
        debugNodeEvents(`💡 Node ${nodeId} edge target highlight removed`);
      }
    });
    
    // Timeout actions
    this.customActionHandlers.set('startHoverTimeout', (context) => {
      const { nodeId } = context;
      const timeoutId = setTimeout(() => {
        this.handleNodeEvent(nodeId, 'timeout', { type: 'hover' });
      }, 1500); // 1.5 second hover timeout
      
      // Store timeout ID for potential cancellation
      if (!context.timeouts) context.timeouts = {};
      context.timeouts.hover = timeoutId;
      debugNodeEvents(`⏰ Started hover timeout for node ${nodeId}`);
    });
    
    this.customActionHandlers.set('cancelHoverTimeout', (context) => {
      const { nodeId } = context;
      if (context.timeouts && context.timeouts.hover) {
        clearTimeout(context.timeouts.hover);
        delete context.timeouts.hover;
        debugNodeEvents(`❌ Cancelled hover timeout for node ${nodeId}`);
      }
    });
    
    // Action handlers that match the state machine configuration names
    this.customActionHandlers.set('addHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        console.log(`🔍 VISUAL: Adding 'selected' class to ${nodeId}, current classes:`, nodeElement.className);
        nodeElement.classList.add('selected');
        console.log(`🔍 VISUAL: After adding 'selected' to ${nodeId}, classes:`, nodeElement.className);
        debugNodeEvents(`✅ Node ${nodeId} selected visually`);
      }
    });
    
    this.customActionHandlers.set('removeHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('selected');
        debugNodeEvents(`❌ Node ${nodeId} deselected visually`);
      }
    });
    
    this.customActionHandlers.set('addDragHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('dragging');
        debugNodeEvents(`🚀 Node ${nodeId} drag feedback started`);
      }
    });
    
    this.customActionHandlers.set('removeDragHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('dragging');
        debugNodeEvents(`⏹️ Node ${nodeId} drag feedback stopped`);
      }
    });
    
    this.customActionHandlers.set('addEdgeTargetHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('edge-target-highlight');
        debugNodeEvents(`🔆 Node ${nodeId} highlighted as edge target`);
      }
    });
    
    this.customActionHandlers.set('removeEdgeTargetHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('edge-target-highlight');
        debugNodeEvents(`💡 Node ${nodeId} edge target highlight removed`);
      }
    });
    
    this.customActionHandlers.set('addScaleHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('scaling');
        debugNodeEvents(`📏 Node ${nodeId} scale feedback started`);
      }
    });
    
    this.customActionHandlers.set('removeScaleHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('scaling');
        debugNodeEvents(`📐 Node ${nodeId} scale feedback stopped`);
      }
    });
    
    this.customActionHandlers.set('addEdgeSourceHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.add('edge-source');
        debugNodeEvents(`🎯 Node ${nodeId} marked as edge source`);
      }
    });
    
    this.customActionHandlers.set('removeEdgeSourceHighlight', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        console.log(`🔍 VISUAL: Removing 'edge-source' class from ${nodeId}, current classes:`, nodeElement.className);
        nodeElement.classList.remove('edge-source');
        console.log(`🔍 VISUAL: After removing 'edge-source' from ${nodeId}, classes:`, nodeElement.className);
        debugNodeEvents(`🎯 Node ${nodeId} edge source marking removed`);
      }
    });
    
    this.customActionHandlers.set('clearDragState', (context) => {
      const { nodeId, nodeElement } = context;
      if (nodeElement) {
        nodeElement.classList.remove('dragging', 'scaling');
        debugNodeEvents(`🧹 Node ${nodeId} drag state cleared`);
      }
    });
  }
  
  /**
   * Initialize the node state manager with configuration
   */
  async initialize(interactionManager, configPath = 'config/node-state-machine.json') {
    this.interactionManager = interactionManager;
    
    // Add cache buster to force fresh config reload
    const cacheBuster = Date.now();
    const configPathWithCache = `${configPath}?v=${cacheBuster}`;
    
    console.log(`🔧 NodeStateManager initializing with config path: ${configPathWithCache}`);
    
    try {
      const response = await fetch(configPathWithCache);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const config = await response.json();
      
      console.log('📋 Config loaded successfully:', config);
      
      // Validate the configuration
      if (!config.stateMachine) {
        throw new Error('Configuration missing stateMachine section');
      }
      if (!config.eventMapping) {
        throw new Error('Configuration missing eventMapping section');
      }
      
      // Store the configuration
      this.config = config;
      
      // Debug: log available events for troubleshooting
      if (config.eventMapping && config.eventMapping.rules) {
        const eventNames = config.eventMapping.rules.map(rule => rule.event);
        console.log('🔧 NodeStateManager loaded events:', eventNames);
        
        // Specifically check for cancelEdgeCreation
        const cancelEvent = config.eventMapping.rules.find(rule => rule.event === 'cancelEdgeCreation');
        if (cancelEvent) {
          console.log('✅ Found cancelEdgeCreation event mapping:', cancelEvent);
        } else {
          console.log('❌ Missing cancelEdgeCreation event mapping');
        }
      }
      
      console.log('✅ NodeStateManager initialized successfully with generic state management system');
      debugInteraction('📋 NodeStateManager initialized with generic state management system');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize NodeStateManager:', error);
      console.error('Config path attempted:', configPath);
      throw error;
    }
  }
  
  /**
   * Register a node with the state manager
   */
  async registerNode(nodeId, nodeElement) {
    if (this.nodeStateManagers.has(nodeId)) {
      debugNodeEvents(`⚠️ Node ${nodeId} already registered`);
      return this.nodeStateManagers.get(nodeId);
    }
    
    // Check if NodeStateManager was properly initialized
    if (!this.config) {
      console.error(`❌ NodeStateManager not initialized - config is null. Cannot register node ${nodeId}`);
      console.error('Make sure NodeStateManager.initialize() was called successfully');
      throw new Error(`NodeStateManager not initialized - config is null`);
    }
    
    console.log(`📝 Registering node ${nodeId} with config:`, this.config);
    
    // Store the node element
    this.nodeElements.set(nodeId, nodeElement);
    
    // Create a state manager instance for this specific node
    const nodeStateManager = new StateManager(nodeId, this.config, { nodeId, nodeElement }, 'NODE_STATE');
    
    // Copy our custom action handlers to the node's state manager
    for (const [actionName, handler] of this.customActionHandlers.entries()) {
      nodeStateManager.actionExecutor.registerActionHandler(actionName, handler);
    }
    
    // Set up state change callbacks for this node
    nodeStateManager.addEventListener('stateChange', (data) => {
      this.handleNodeStateChange(nodeId, data.from, data.to, data.action, data.context);
    });
    
    // Store the node's state manager
    this.nodeStateManagers.set(nodeId, nodeStateManager);
    
    debugNodeEvents(`✅ Node ${nodeId} registered with generic state management system`);
    return nodeStateManager;
  }
  
  /**
   * Unregister a node from the state manager
   */
  unregisterNode(nodeId) {
    const nodeStateManager = this.nodeStateManagers.get(nodeId);
    
    if (nodeStateManager) {
      nodeStateManager.destroy();
      this.nodeStateManagers.delete(nodeId);
    }
    
    this.nodeElements.delete(nodeId);
    debugNodeEvents(`🗑️ Node ${nodeId} unregistered from state manager`);
  }
  
  /**
   * Get the state manager for a specific node
   */
  getStateMachine(nodeId) {
    const nodeStateManager = this.nodeStateManagers.get(nodeId);
    return nodeStateManager ? nodeStateManager.stateMachine : null;
  }
  
  /**
   * Handle a node-specific event
   */
  handleNodeEvent(nodeId, eventType, eventData = {}) {
    const nodeStateManager = this.nodeStateManagers.get(nodeId);
    const nodeElement = this.nodeElements.get(nodeId);
    
    if (!nodeStateManager) {
      debugNodeEvents(`⚠️ No state manager found for node: ${nodeId}`);
      return false;
    }
    
    // Add node context to event data
    const contextualEventData = {
      ...eventData,
      nodeId,
      nodeElement,
      interactionManager: this.interactionManager
    };
    
    return nodeStateManager.handleEvent(eventType, contextualEventData);
  }
  
  /**
   * Handle mouse down event on a node
   */
  handleNodeMouseDown(nodeId, event, context = {}) {
    const eventData = {
      shiftKey: event.shiftKey || context.shiftKey,
      ctrlKey: event.ctrlKey || context.ctrlKey,
      ...context
    };
    
    return this.handleNodeEvent(nodeId, 'mouseDown', eventData);
  }
  
  /**
   * Handle mouse up event on a node
   */
  handleNodeMouseUp(nodeId, event, context = {}) {
    const eventData = {
      isClick: context.isClick || false,
      timeDiff: context.timeDiff || 0,
      distanceMoved: context.distanceMoved || 0,
      inEdgeCreationMode: context.inEdgeCreationMode || false,
      ...context
    };
    
    return this.handleNodeEvent(nodeId, 'mouseUp', eventData);
  }
  
  /**
   * Handle edge creation start
   */
  handleEdgeCreationStart(sourceNodeId) {
    return this.handleNodeEvent(sourceNodeId, 'edgeCreationStarted');
  }
  
  /**
   * Handle edge creation start via Shift key for selected nodes
   */
  handleShiftKeyEdgeCreation() {
    let handled = false;
    
    // Find nodes in selected state and transition them to edgeSource
    for (const [nodeId, nodeStateManager] of this.nodeStateManagers) {
      const currentState = nodeStateManager.stateMachine.getCurrentState();
      if (currentState === 'selected') {
        console.log(`🚀 Transitioning selected node ${nodeId} to edgeSource via Shift key`);
        if (this.handleNodeEvent(nodeId, 'startEdgeCreation')) {
          handled = true;
        }
      }
    }
    
    return handled;
  }
  
  /**
   * Handle edge target hover
   */
  handleEdgeTargetHover(targetNodeId) {
    return this.handleNodeEvent(targetNodeId, 'edgeTargetHover');
  }
  
  /**
   * Handle edge target leave
   */
  handleEdgeTargetLeave(targetNodeId) {
    return this.handleNodeEvent(targetNodeId, 'edgeTargetLeave');
  }
  
  /**
   * Handle edge completion
   */
  handleEdgeCompletion(sourceNodeId, targetNodeId) {
    // For edge completion, we need to handle both nodes
    let handled = false;
    
    if (sourceNodeId) {
      handled = this.handleNodeEvent(sourceNodeId, 'mouseUp', { inEdgeCreationMode: true }) || handled;
    }
    
    if (targetNodeId) {
      handled = this.handleNodeEvent(targetNodeId, 'mouseUp', { inEdgeCreationMode: true }) || handled;
    }
    
    return handled;
  }
  
  /**
   * Handle escape key press
   */
  handleEscapeKey() {
    let handled = false;
    
    for (const nodeId of this.nodeStateManagers.keys()) {
      if (this.handleNodeEvent(nodeId, 'escapeKey')) {
        handled = true;
      }
    }
    
    return handled;
  }
  
  /**
   * Handle state change for a specific node
   */
  handleNodeStateChange(nodeId, oldState, newState, event, context) {
    debugNodeEvents(`🔄 State change for ${nodeId}: ${oldState} → ${newState}`);
    
    const nodeObject = this.nodeElements.get(nodeId);
    if (!nodeObject) {
      debugNodeEvents(`⚠️ Node object not found for ${nodeId}`);
      return;
    }
    
    // Update InteractionManager state when needed
    if (this.interactionManager) {
      switch (newState) {
        case 'selected':
          // Only update InteractionManager's selectedNode reference, don't call selectNode
          if (nodeObject && this.interactionManager.selectedNode !== nodeObject) {
            debugNodeEvents(`🎯 State machine updating InteractionManager selectedNode: ${nodeId}`);
            this.interactionManager.selectedNode = nodeObject;
          }
          break;
        case 'idle':
          if (oldState === 'selected' && this.interactionManager.selectedNode === nodeObject) {
            debugNodeEvents(`🚫 State machine clearing InteractionManager selectedNode: ${nodeId}`);
            this.interactionManager.selectedNode = null;
          }
          break;
      }
    }
  }
  
  /**
   * Get the current state of a specific node
   */
  getNodeState(nodeId) {
    const nodeStateManager = this.nodeStateManagers.get(nodeId);
    if (nodeStateManager) {
      return nodeStateManager.stateMachine.getCurrentState();
    }
    return null;
  }

  /**
   * Get debug information for all nodes
   */
  getDebugInfo() {
    const info = {};
    for (const [nodeId, nodeStateManager] of this.nodeStateManagers) {
      info[nodeId] = {
        currentState: nodeStateManager.stateMachine.getCurrentState(),
        history: nodeStateManager.stateMachine.getHistory(),
        isValid: nodeStateManager.stateMachine.isValidTransition.bind(nodeStateManager.stateMachine)
      };
    }
    return info;
  }
  
  /**
   * Reset all nodes to initial state
   */
  resetAllNodes() {
    for (const nodeStateManager of this.nodeStateManagers.values()) {
      nodeStateManager.stateMachine.reset();
    }
  }
  
  /**
   * Destroy the state manager and clean up resources
   */
  destroy() {
    for (const nodeStateManager of this.nodeStateManagers.values()) {
      nodeStateManager.destroy();
    }
    
    this.nodeStateManagers.clear();
    this.nodeElements.clear();
    this.interactionManager = null;
    this.config = null;
    this.customActionHandlers.clear();
    
    debugInteraction('🗑️ NodeStateManager destroyed');
  }
}

// Global instance
export const nodeStateManager = new NodeStateManager();

/**
 * Node State Manager - Coordinates the three-layer architecture
 * v011 - Refactored to use separated layers: StateMachine, EventMapper, and VisualActions
 * 
 * This class coordinates:
 * 1. Pure logical state machine (NodeStateMachine)
 * 2. Event mapping layer (NodeEventMapper) 
 * 3. Visual actions layer (NodeVisualActions)
 * 
 * It provides the bridge between technical events and logical state management.
 */

import { NodeStateMachine } from './NodeStateMachine.js';
import { NodeEventMapper } from './NodeEventMapper.js?v=003';
import { NodeVisualActions } from './NodeVisualActions.js';
import { debugInteraction, debugNodeEvents } from './debug.js';

export class NodeStateManager {
  constructor() {
    this.nodeStateMachines = new Map(); // nodeId -> NodeStateMachine
    this.nodeEventMappers = new Map(); // nodeId -> NodeEventMapper
    this.nodeVisualActions = new Map(); // nodeId -> NodeVisualActions
    this.nodeElements = new Map(); // nodeId -> DOM element
    this.interactionManager = null;
    this.config = null;
    this.eventMapper = null; // Shared event mapper instance
  }
  
  /**
   * Initialize the state manager with configuration
   */
  async initialize(interactionManager, configPath = '/config/node-state-machine.json') {
    this.interactionManager = interactionManager;
    
    try {
      console.log(`🔧 Loading NodeStateManager config from: ${configPath}`);
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.config = await response.json();
      
      // Create shared event mapper
      this.eventMapper = new NodeEventMapper(this.config.eventMapping);
      
      debugInteraction('📋 NodeStateManager initialized with separated layers');
      console.log('📋 NodeStateManager initialized with config:', this.config);
      return true;
    } catch (error) {
      console.error('Failed to initialize NodeStateManager:', error);
      throw error;
    }
  }
  
  /**
   * Register a node with the state manager
   */
  async registerNode(nodeId, nodeObject) {
    if (this.nodeStateMachines.has(nodeId)) {
      debugNodeEvents(`⚠️ Node ${nodeId} already registered`);
      return this.nodeStateMachines.get(nodeId);
    }
    
    // Debug check for config
    if (!this.config) {
      debugNodeEvents(`❌ No config available when registering node ${nodeId}`);
      throw new Error(`NodeStateManager config is not initialized`);
    }
    
    debugNodeEvents(`🔧 Creating separated layers for ${nodeId}`);
    
    // Create the three layers
    
    // 1. Pure logical state machine
    const stateMachine = new NodeStateMachine(nodeId, this.config);
    
    // 2. Visual actions layer
    const visualActions = new NodeVisualActions(this.config.visualActions, nodeObject);
    
    // Set up communication between layers
    
    // State machine notifies visual actions of state changes
    stateMachine.addListener('stateChange', (data) => {
      this.handleStateChange(nodeId, data);
      visualActions.executeTransition(data.newState, data.oldState, data.trigger, data.context);
    });
    
    // Visual actions can trigger logical transitions (e.g., timeouts)
    visualActions.onCallback('timeout', (data) => {
      console.log(`⏰ Timeout callback for ${nodeId}, triggering timeout transition`);
      stateMachine.transition('timeout', data);
    });
    
    // Store all components
    this.nodeStateMachines.set(nodeId, stateMachine);
    this.nodeVisualActions.set(nodeId, visualActions);
    this.nodeElements.set(nodeId, nodeObject);
    
    debugNodeEvents(`✅ Node ${nodeId} registered with separated layers`);
    return stateMachine;
  }
  
  /**
   * Unregister a node from the state manager
   */
  unregisterNode(nodeId) {
    const stateMachine = this.nodeStateMachines.get(nodeId);
    const visualActions = this.nodeVisualActions.get(nodeId);
    
    if (stateMachine) {
      stateMachine.destroy();
      this.nodeStateMachines.delete(nodeId);
    }
    
    if (visualActions) {
      visualActions.destroy();
      this.nodeVisualActions.delete(nodeId);
    }
    
    this.nodeElements.delete(nodeId);
    debugNodeEvents(`🗑️ Node ${nodeId} unregistered from state manager`);
  }
  
  /**
   * Get the state machine for a specific node
   */
  getStateMachine(nodeId) {
    return this.nodeStateMachines.get(nodeId);
  }

  /**
   * Handle a technical event and map it to logical actions
   */
  handleEvent(nodeId, eventType, eventData = {}) {
    const stateMachine = this.nodeStateMachines.get(nodeId);
    if (!stateMachine) {
      debugNodeEvents(`⚠️ No state machine found for node: ${nodeId}`);
      return false;
    }
    
    if (!this.eventMapper) {
      debugNodeEvents(`⚠️ No event mapper available`);
      return false;
    }
    
    const currentState = stateMachine.getCurrentState();
    
    // Use event mapper to determine logical action
    const action = this.eventMapper.mapEventToAction(eventType, currentState, eventData);
    
    if (action) {
      console.log(`🎯 Event mapping for ${nodeId}: ${eventType} (${currentState}) → ${action}`);
      return stateMachine.transition(action, eventData);
    }
    
    debugNodeEvents(`❌ No action mapped for event '${eventType}' in state '${currentState}'`);
    return false;
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
    
    return this.handleEvent(nodeId, 'mouseDown', eventData);
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
    
    // Debug logging for mouse up events
    console.log(`🔍 NodeStateManager.handleNodeMouseUp for ${nodeId}:`, eventData);
    
    return this.handleEvent(nodeId, 'mouseUp', eventData);
  }
  
  /**
   * Handle edge creation start
   */
  handleEdgeCreationStart(sourceNodeId) {
    return this.handleEvent(sourceNodeId, 'edgeCreationStarted');
  }
  
  /**
   * Handle edge target hover
   */
  handleEdgeTargetHover(targetNodeId) {
    return this.handleEvent(targetNodeId, 'edgeTargetHover');
  }
  
  /**
   * Handle edge target leave
   */
  handleEdgeTargetLeave(targetNodeId) {
    return this.handleEvent(targetNodeId, 'edgeTargetLeave');
  }
  
  /**
   * Handle edge completion
   */
  handleEdgeCompletion(sourceNodeId, targetNodeId) {
    // For edge completion, we need to handle both nodes
    let handled = false;
    
    if (sourceNodeId) {
      handled = this.handleEvent(sourceNodeId, 'mouseUp', { inEdgeCreationMode: true }) || handled;
    }
    
    if (targetNodeId) {
      handled = this.handleEvent(targetNodeId, 'mouseUp', { inEdgeCreationMode: true }) || handled;
    }
    
    return handled;
  }
  
  /**
   * Handle escape key press
   */
  handleEscapeKey() {
    let handled = false;
    
    for (const [nodeId, stateMachine] of this.nodeStateMachines.entries()) {
      if (this.handleEvent(nodeId, 'escapeKey')) {
        handled = true;
      }
    }
    
    return handled;
  }
  
  /**
   * Handle state change event from a state machine
   */
  handleStateChange(nodeId, data) {
    debugNodeEvents(`🔄 State change for ${nodeId}: ${data.oldState} → ${data.newState}`);
    
    const nodeObject = this.nodeElements.get(nodeId);
    if (!nodeObject) {
      debugNodeEvents(`⚠️ Node object not found for ${nodeId}`);
      return;
    }
    
    // Visual changes are now handled by NodeVisualActions
    // This method can focus on coordination with other systems
    
    // Update InteractionManager state when needed (minimal coordination)
    if (this.interactionManager) {
      switch (data.newState) {
        case 'selected':
          // Only update InteractionManager's selectedNode reference, don't call selectNode
          if (nodeObject && this.interactionManager.selectedNode !== nodeObject) {
            debugNodeEvents(`🎯 State machine updating InteractionManager selectedNode: ${nodeId}`);
            this.interactionManager.selectedNode = nodeObject;
          }
          break;
        case 'idle':
          if (data.oldState === 'selected' && this.interactionManager.selectedNode === nodeObject) {
            debugNodeEvents(`🚫 State machine clearing InteractionManager selectedNode: ${nodeId}`);
            this.interactionManager.selectedNode = null;
          }
          break;
      }
    }
  }
  
  /**
   * Get debug information for all nodes
   */
  getDebugInfo() {
    const info = {};
    for (const [nodeId, stateMachine] of this.nodeStateMachines) {
      info[nodeId] = stateMachine.getDebugInfo();
    }
    return info;
  }
  
  /**
   * Reset all nodes to initial state
   */
  resetAllNodes() {
    for (const stateMachine of this.nodeStateMachines.values()) {
      stateMachine.reset();
    }
  }
  
  /**
   * Destroy the state manager and clean up resources
   */
  destroy() {
    for (const stateMachine of this.nodeStateMachines.values()) {
      stateMachine.destroy();
    }
    
    for (const visualActions of this.nodeVisualActions.values()) {
      visualActions.destroy();
    }
    
    this.nodeStateMachines.clear();
    this.nodeVisualActions.clear();
    this.nodeElements.clear();
    this.interactionManager = null;
    this.config = null;
    this.eventMapper = null;
    
    debugInteraction('🗑️ NodeStateManager destroyed');
  }
}

// Global instance
export const nodeStateManager = new NodeStateManager();

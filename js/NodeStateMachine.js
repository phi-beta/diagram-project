/**
 * Node State Machine - Pure logical state machine for node interactions
 * 
 * This class implements a PURE finite state machine that only handles
 * logical states and transitions. It does NOT handle:
 * - Event mapping (technical events → logical transitions)
 * - Visual actions (DOM manipulation, cursor changes)
 * - Side effects
 * 
 * Those concerns are handled by separate layers.
 */

import { debugInteraction, debugNodeEvents } from './debug.js';

export class NodeStateMachine {
  constructor(nodeId, stateMachineConfig) {
    this.nodeId = nodeId;
    
    if (!stateMachineConfig?.stateMachine) {
      throw new Error(`NodeStateMachine: Invalid config for node ${nodeId}`);
    }
    
    this.config = stateMachineConfig.stateMachine;
    this.currentState = this.config.initialState;
    this.previousState = null;
    this.listeners = new Map(); // Event listeners for state changes
    
    debugNodeEvents(`🔧 Pure NodeStateMachine created for ${nodeId}, initial state: ${this.currentState}`);
  }
  
  /**
   * Get current state
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Get previous state
   */
  getPreviousState() {
    return this.previousState;
  }
  
  /**
   * Check if an action is allowed in the current state
   */
  isActionAllowed(action) {
    const transitions = this.config.transitions[this.currentState];
    return transitions && transitions.hasOwnProperty(action);
  }
  
  /**
   * Check if the current state matches any of the given states
   */
  isInState(...states) {
    return states.includes(this.currentState);
  }
  
  /**
   * Attempt to transition to a new state via a logical action
   * This is the ONLY way to change state - through logical transitions
   */
  transition(action, context = {}) {
    console.log(`🔀 ${this.nodeId}: Attempting logical transition '${action}' from state '${this.currentState}'`);
    
    const transitions = this.config.transitions[this.currentState];
    
    if (!transitions) {
      debugNodeEvents(`⚠️ No transitions defined for state: ${this.currentState}`);
      console.log(`❌ ${this.nodeId}: No transitions defined for state: ${this.currentState}`);
      return false;
    }
    
    const targetState = transitions[action];
    if (!targetState) {
      debugNodeEvents(`⚠️ No transition for action '${action}' from state '${this.currentState}'`);
      console.log(`❌ ${this.nodeId}: No transition '${action}' from state '${this.currentState}'. Available: ${Object.keys(transitions)}`);
      return false;
    }
    
    console.log(`✅ ${this.nodeId}: Logical transition found: ${this.currentState} --${action}--> ${targetState}`);
    return this.changeState(targetState, action, context);
  }
  
  /**
   * Change state (internal method) - Pure state management only
   */
  changeState(newState, trigger, context = {}) {
    if (!this.config.states[newState]) {
      debugNodeEvents(`❌ Invalid state: ${newState}`);
      return false;
    }
    
    if (newState === this.currentState) {
      debugNodeEvents(`⚠️ Already in state: ${newState}`);
      return true;
    }
    
    const oldState = this.currentState;
    
    debugNodeEvents(`🔄 ${this.nodeId}: ${oldState} → ${newState} (trigger: ${trigger})`);
    console.log(`🔄 Pure state transition for ${this.nodeId}: ${oldState} → ${newState} (trigger: ${trigger})`);
    
    // Update state (pure logical change)
    this.previousState = this.currentState;
    this.currentState = newState;
    
    // Notify listeners (allows external layers to handle visual/side effects)
    this.notifyListeners('stateChange', {
      oldState,
      newState,
      trigger,
      context
    });
    
    return true;
  }
  
  /**
   * Add a listener for state machine events
   */
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }
  
  /**
   * Remove a listener
   */
  removeListener(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Notify all listeners of an event
   */
  notifyListeners(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in state machine listener:`, error);
        }
      });
    }
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    debugNodeEvents(`🔄 Resetting ${this.nodeId} to initial state`);
    this.changeState(this.config.initialState, 'reset');
  }
  
  /**
   * Force state to a specific state (for debugging or special cases)
   */
  forceState(state) {
    if (!this.config.states[state]) {
      debugNodeEvents(`❌ Cannot force invalid state: ${state}`);
      return false;
    }
    debugNodeEvents(`🔧 Forcing ${this.nodeId} to state: ${state}`);
    console.log(`🔧 Forcing ${this.nodeId} to state: ${state}`);
    return this.changeState(state, 'force');
  }
  
  /**
   * Get state information for debugging
   */
  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      currentState: this.currentState,
      previousState: this.previousState,
      availableTransitions: Object.keys(this.config.transitions[this.currentState] || {})
    };
  }
  
  /**
   * Destroy the state machine and clean up resources
   */
  destroy() {
    this.listeners.clear();
    debugNodeEvents(`🗑️ Pure NodeStateMachine destroyed for ${this.nodeId}`);
  }
}

/**
 * Static factory method to create a NodeStateMachine from JSON config
 */
export async function createNodeStateMachine(nodeId, configPath = '/config/node-state-machine.json') {
  try {
    const response = await fetch(configPath);
    const config = await response.json();
    return new NodeStateMachine(nodeId, config);
  } catch (error) {
    console.error('Failed to load state machine configuration:', error);
    throw error;
  }
}

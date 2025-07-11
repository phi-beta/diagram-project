/**
 * Generic State Machine - Pure logical state machine for any domain
 * 
 * This class implements a PURE finite state machine that only handles
 * logical states and transitions. It does NOT handle:
 * - Event mapping (technical events → logical transitions)
 * - Visual actions (DOM manipulation, side effects)
 * - Domain-specific logic
 * 
 * Those concerns are handled by separate layers.
 */

import { debugInteraction } from './debug.js';

export class StateMachine {
  constructor(id, stateMachineConfig, debugCategory = 'STATE_MACHINE') {
    this.id = id;
    this.debugCategory = debugCategory;
    
    if (!stateMachineConfig?.stateMachine) {
      throw new Error(`StateMachine: Invalid config for ${id}`);
    }
    
    this.config = stateMachineConfig.stateMachine;
    this.currentState = this.config.initialState;
    this.previousState = null;
    this.listeners = new Map(); // Event listeners for state changes
    this.transitionHistory = []; // Track transition history for debugging
    
    this.debug(`🔧 StateMachine created for ${id}, initial state: ${this.currentState}`);
  }
  
  /**
   * Debug logging with category
   */
  debug(message) {
    console.log(`[${this.debugCategory}] ${message}`);
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
   * Get transition history
   */
  getTransitionHistory() {
    return [...this.transitionHistory];
  }
  
  /**
   * Check if an action is allowed in the current state
   */
  isActionAllowed(action) {
    const transitions = this.config.transitions[this.currentState];
    return transitions && transitions.hasOwnProperty(action);
  }
  
  /**
   * Get the target state for an action from the current state
   */
  getTargetState(action) {
    const transitions = this.config.transitions[this.currentState];
    return transitions ? transitions[action] : null;
  }
  
  /**
   * Check if a state exists in the configuration
   */
  isValidState(state) {
    return this.config.states.hasOwnProperty(state);
  }
  
  /**
   * Attempt a logical transition
   * Returns true if successful, false if invalid
   */
  transition(action, context = {}) {
    this.debug(`🔀 ${this.id}: Attempting logical transition '${action}' from state '${this.currentState}'`);
    
    // Check if the action is allowed in current state
    if (!this.isActionAllowed(action)) {
      this.debug(`❌ ${this.id}: Action '${action}' not allowed in state '${this.currentState}'`);
      return false;
    }
    
    const targetState = this.getTargetState(action);
    
    if (!targetState) {
      this.debug(`❌ ${this.id}: No target state defined for action '${action}' in state '${this.currentState}'`);
      return false;
    }
    
    if (!this.isValidState(targetState)) {
      this.debug(`❌ ${this.id}: Target state '${targetState}' is not defined in configuration`);
      return false;
    }
    
    // Record the transition
    const transition = {
      from: this.currentState,
      to: targetState,
      action: action,
      timestamp: Date.now(),
      context: context
    };
    
    this.transitionHistory.push(transition);
    
    // Keep only last 50 transitions to prevent memory leaks
    if (this.transitionHistory.length > 50) {
      this.transitionHistory.shift();
    }
    
    this.debug(`✅ ${this.id}: Logical transition found: ${this.currentState} --${action}--> ${targetState}`);
    
    // Perform the state change
    this.previousState = this.currentState;
    this.currentState = targetState;
    
    this.debug(`🔄 Pure state transition for ${this.id}: ${this.previousState} → ${this.currentState} (trigger: ${action})`);
    
    // Notify listeners
    this.notifyListeners('stateChange', {
      from: this.previousState,
      to: this.currentState,
      action: action,
      context: context
    });
    
    return true;
  }
  
  /**
   * Force set state (use with caution - bypasses transition rules)
   */
  setState(state, reason = 'forced') {
    if (!this.isValidState(state)) {
      this.debug(`❌ ${this.id}: Cannot force set to invalid state '${state}'`);
      return false;
    }
    
    this.debug(`⚠️ ${this.id}: Force setting state from '${this.currentState}' to '${state}' (reason: ${reason})`);
    
    this.previousState = this.currentState;
    this.currentState = state;
    
    // Record forced transition
    this.transitionHistory.push({
      from: this.previousState,
      to: this.currentState,
      action: `FORCE_SET:${reason}`,
      timestamp: Date.now(),
      context: { forced: true, reason }
    });
    
    this.notifyListeners('stateChange', {
      from: this.previousState,
      to: this.currentState,
      action: `FORCE_SET:${reason}`,
      context: { forced: true, reason }
    });
    
    return true;
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.debug(`🔄 ${this.id}: Resetting to initial state '${this.config.initialState}'`);
    this.setState(this.config.initialState, 'reset');
  }
  
  /**
   * Add event listener for state machine events
   */
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    
    this.debug(`👂 ${this.id}: Added ${eventType} listener`);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
      this.debug(`🚫 ${this.id}: Removed ${eventType} listener`);
    }
  }
  
  /**
   * Notify event listeners
   */
  notifyListeners(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.debug(`❌ ${this.id}: Error in ${eventType} listener: ${error.message}`);
        }
      });
    }
  }
  
  /**
   * Get state machine configuration
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Get available actions from current state
   */
  getAvailableActions() {
    const transitions = this.config.transitions[this.currentState];
    return transitions ? Object.keys(transitions) : [];
  }
  
  /**
   * Get state description
   */
  getStateDescription(state = null) {
    const targetState = state || this.currentState;
    return this.config.states[targetState]?.description || 'No description available';
  }
  
  /**
   * Validate the state machine configuration
   */
  static validateConfig(config) {
    const errors = [];
    
    if (!config?.stateMachine) {
      errors.push('Missing stateMachine configuration');
      return errors;
    }
    
    const sm = config.stateMachine;
    
    // Check required fields
    if (!sm.initialState) {
      errors.push('Missing initialState');
    }
    
    if (!sm.states || typeof sm.states !== 'object') {
      errors.push('Missing or invalid states configuration');
    }
    
    if (!sm.transitions || typeof sm.transitions !== 'object') {
      errors.push('Missing or invalid transitions configuration');
    }
    
    // Check if initial state exists
    if (sm.initialState && sm.states && !sm.states[sm.initialState]) {
      errors.push(`Initial state '${sm.initialState}' not defined in states`);
    }
    
    // Check transition references
    if (sm.transitions && sm.states) {
      for (const [fromState, transitions] of Object.entries(sm.transitions)) {
        if (!sm.states[fromState]) {
          errors.push(`Transition from undefined state '${fromState}'`);
        }
        
        for (const [action, toState] of Object.entries(transitions)) {
          if (!sm.states[toState]) {
            errors.push(`Transition '${fromState}' --${action}--> '${toState}': target state '${toState}' not defined`);
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.debug(`🧹 ${this.id}: Destroying state machine`);
    this.listeners.clear();
    this.transitionHistory = [];
  }
}

/**
 * Generic State Manager - Orchestrates state machine, event mapping, and action execution
 * 
 * This class brings together the state machine, event mapper, and action executor
 * to provide a complete state management solution for any domain.
 */

import { StateMachine } from './StateMachine.js';
import { EventMapper } from './EventMapper.js';
import { ActionExecutor } from './ActionExecutor.js';

export class StateManager {
  constructor(id, config, context = null, debugCategory = 'STATE_MANAGER') {
    this.id = id;
    this.context = context;
    this.debugCategory = debugCategory;
    
    // Validate configuration
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`StateManager config validation failed for ${id}: ${errors.join(', ')}`);
    }
    
    // Initialize components
    this.stateMachine = new StateMachine(id, config, debugCategory + ':SM');
    this.eventMapper = new EventMapper(config, debugCategory + ':EM');
    this.actionExecutor = new ActionExecutor(config, context, debugCategory + ':AE');
    
    // Listen for state changes to execute actions
    this.stateMachine.addEventListener('stateChange', (data) => {
      this.actionExecutor.executeTransition(data.to, data.from, data.action, data.context);
    });
    
    this.debug(`🔧 StateManager initialized for ${id}`);
  }
  
  /**
   * Debug logging with category
   */
  debug(message) {
    console.log(`[${this.debugCategory}] ${message}`);
  }
  
  /**
   * Handle an event by mapping it to an action and executing the transition
   */
  handleEvent(eventName, eventData = {}) {
    this.debug(`🎯 Handling event: ${eventName}`);
    
    const currentState = this.stateMachine.getCurrentState();
    const action = this.eventMapper.mapEvent(eventName, currentState, eventData);
    
    if (!action) {
      this.debug(`❌ No action mapped for event '${eventName}' in state '${currentState}'`);
      return false;
    }
    
    return this.stateMachine.transition(action, eventData);
  }
  
  /**
   * Get current state
   */
  getCurrentState() {
    return this.stateMachine.getCurrentState();
  }
  
  /**
   * Get previous state
   */
  getPreviousState() {
    return this.stateMachine.getPreviousState();
  }
  
  /**
   * Check if an action is allowed in current state
   */
  isActionAllowed(action) {
    return this.stateMachine.isActionAllowed(action);
  }
  
  /**
   * Execute a transition directly (bypassing event mapping)
   */
  transition(action, context = {}) {
    return this.stateMachine.transition(action, context);
  }
  
  /**
   * Force set state (use with caution)
   */
  setState(state, reason = 'forced') {
    return this.stateMachine.setState(state, reason);
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.stateMachine.reset();
  }
  
  /**
   * Get available actions from current state
   */
  getAvailableActions() {
    return this.stateMachine.getAvailableActions();
  }
  
  /**
   * Get state description
   */
  getStateDescription(state = null) {
    return this.stateMachine.getStateDescription(state);
  }
  
  /**
   * Get transition history
   */
  getTransitionHistory() {
    return this.stateMachine.getTransitionHistory();
  }
  
  /**
   * Register a custom action handler
   */
  registerActionHandler(actionName, handler) {
    this.actionExecutor.registerActionHandler(actionName, handler);
  }
  
  /**
   * Register a callback for external communication
   */
  registerCallback(name, callback) {
    this.actionExecutor.registerCallback(name, callback);
  }
  
  /**
   * Register a custom condition evaluator
   */
  registerConditionEvaluator(name, evaluator) {
    this.eventMapper.registerConditionEvaluator(name, evaluator);
  }
  
  /**
   * Add state change listener
   */
  addEventListener(eventType, callback) {
    this.stateMachine.addEventListener(eventType, callback);
  }
  
  /**
   * Remove state change listener
   */
  removeEventListener(eventType, callback) {
    this.stateMachine.removeEventListener(eventType, callback);
  }
  
  /**
   * Update the context object
   */
  setContext(newContext) {
    this.context = newContext;
    this.actionExecutor.setContext(newContext);
  }
  
  /**
   * Get the context object
   */
  getContext() {
    return this.context;
  }
  
  /**
   * Validate the complete configuration
   */
  validateConfig(config) {
    const errors = [];
    
    // Validate state machine config
    errors.push(...StateMachine.validateConfig(config));
    
    // Validate event mapping config
    errors.push(...EventMapper.validateConfig(config));
    
    // Validate action executor config
    errors.push(...ActionExecutor.validateConfig(config));
    
    return errors;
  }
  
  /**
   * Get complete state information for debugging
   */
  getDebugInfo() {
    return {
      id: this.id,
      currentState: this.getCurrentState(),
      previousState: this.getPreviousState(),
      availableActions: this.getAvailableActions(),
      stateDescription: this.getStateDescription(),
      transitionHistory: this.getTransitionHistory().slice(-10), // Last 10 transitions
      config: this.stateMachine.getConfig()
    };
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.debug(`🧹 Destroying StateManager for ${this.id}`);
    this.stateMachine.destroy();
    this.actionExecutor.destroy();
  }
}

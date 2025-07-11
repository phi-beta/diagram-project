/**
 * Generic Action Executor - Handles side effects and visual actions
 * 
 * This class manages the execution of actions that have side effects,
 * such as DOM manipulation, API calls, timeouts, etc. It's designed
 * to be extensible and configurable.
 */

export class ActionExecutor {
  constructor(visualActionsConfig, context, debugCategory = 'ACTION_EXECUTOR') {
    this.config = visualActionsConfig;
    this.context = context; // The object/element this executor acts upon
    this.debugCategory = debugCategory;
    this.timeoutHandle = null;
    this.callbacks = new Map(); // For external callbacks
    this.actionHandlers = new Map();
    
    // Register default action handlers
    this.registerDefaultActionHandlers();
    
    this.debug('🎨 ActionExecutor initialized');
  }
  
  /**
   * Debug logging with category
   */
  debug(message) {
    console.log(`[${this.debugCategory}] ${message}`);
  }
  
  /**
   * Register default action handlers
   */
  registerDefaultActionHandlers() {
    this.registerActionHandler('highlight', this.handleHighlight.bind(this));
    this.registerActionHandler('unhighlight', this.handleUnhighlight.bind(this));
    this.registerActionHandler('addClass', this.handleAddClass.bind(this));
    this.registerActionHandler('removeClass', this.handleRemoveClass.bind(this));
    this.registerActionHandler('setAttribute', this.handleSetAttribute.bind(this));
    this.registerActionHandler('removeAttribute', this.handleRemoveAttribute.bind(this));
    this.registerActionHandler('setTimeout', this.handleSetTimeout.bind(this));
    this.registerActionHandler('clearTimeout', this.handleClearTimeout.bind(this));
    this.registerActionHandler('callback', this.handleCallback.bind(this));
    this.registerActionHandler('log', this.handleLog.bind(this));
  }
  
  /**
   * Register a custom action handler
   */
  registerActionHandler(actionName, handler) {
    this.actionHandlers.set(actionName, handler);
    this.debug(`📝 Registered action handler: ${actionName}`);
  }
  
  /**
   * Register a callback for external communication
   */
  registerCallback(name, callback) {
    this.callbacks.set(name, callback);
    this.debug(`📞 Registered callback: ${name}`);
  }
  
  /**
   * Execute actions for a state transition
   */
  executeTransition(newState, oldState, trigger, context = {}) {
    this.debug(`🎨 Executing actions for transition: ${oldState} → ${newState} (${trigger})`);
    
    // Execute exit actions for old state
    if (oldState && this.config.visualActions?.states?.[oldState]?.onExit) {
      this.executeActions(this.config.visualActions.states[oldState].onExit, 'exit', oldState, context);
    }
    
    // Clear any existing timeout
    this.clearTimeout();
    
    // Execute enter actions for new state
    if (this.config.visualActions?.states?.[newState]?.onEnter) {
      this.executeActions(this.config.visualActions.states[newState].onEnter, 'enter', newState, context);
    }
  }
  
  /**
   * Execute a list of actions
   */
  executeActions(actions, phase, state, context = {}) {
    if (!Array.isArray(actions)) {
      this.debug(`⚠️ Actions for ${phase} ${state} is not an array:`, actions);
      return;
    }
    
    this.debug(`🎬 Executing ${actions.length} ${phase} actions for state ${state}`);
    
    actions.forEach((action, index) => {
      try {
        this.executeAction(action, { phase, state, index, ...context });
      } catch (error) {
        this.debug(`❌ Error executing action ${index} in ${phase} ${state}: ${error.message}`);
      }
    });
  }
  
  /**
   * Execute a single action
   */
  executeAction(actionName, context = {}) {
    this.debug(`🎯 Executing action: ${actionName}`);
    
    const handler = this.actionHandlers.get(actionName);
    if (handler) {
      handler(context);
    } else {
      this.debug(`❌ Unknown action: ${actionName}`);
    }
  }
  
  // Default action handlers
  
  handleHighlight(context) {
    if (this.context && this.context.classList) {
      this.context.classList.add('highlighted');
      this.debug('✨ Added highlight');
    }
  }
  
  handleUnhighlight(context) {
    if (this.context && this.context.classList) {
      this.context.classList.remove('highlighted');
      this.debug('🔹 Removed highlight');
    }
  }
  
  handleAddClass(context) {
    const className = context.className || context.class;
    if (this.context && this.context.classList && className) {
      this.context.classList.add(className);
      this.debug(`📎 Added class: ${className}`);
    }
  }
  
  handleRemoveClass(context) {
    const className = context.className || context.class;
    if (this.context && this.context.classList && className) {
      this.context.classList.remove(className);
      this.debug(`🗑️ Removed class: ${className}`);
    }
  }
  
  handleSetAttribute(context) {
    const { attribute, value } = context;
    if (this.context && this.context.setAttribute && attribute) {
      this.context.setAttribute(attribute, value || '');
      this.debug(`🏷️ Set attribute ${attribute}=${value}`);
    }
  }
  
  handleRemoveAttribute(context) {
    const { attribute } = context;
    if (this.context && this.context.removeAttribute && attribute) {
      this.context.removeAttribute(attribute);
      this.debug(`🗑️ Removed attribute: ${attribute}`);
    }
  }
  
  handleSetTimeout(context) {
    const { duration = 1000, action } = context;
    this.clearTimeout(); // Clear any existing timeout
    
    this.timeoutHandle = setTimeout(() => {
      this.debug(`⏰ Timeout fired after ${duration}ms`);
      if (action) {
        this.executeAction(action, context);
      }
      
      // Trigger timeout callback if available
      const timeoutCallback = this.callbacks.get('timeout');
      if (timeoutCallback) {
        timeoutCallback(context);
      }
    }, duration);
    
    this.debug(`⏰ Set timeout for ${duration}ms`);
  }
  
  handleClearTimeout(context) {
    this.clearTimeout();
  }
  
  handleCallback(context) {
    const { name, data } = context;
    const callback = this.callbacks.get(name);
    if (callback) {
      callback(data || context);
      this.debug(`📞 Executed callback: ${name}`);
    } else {
      this.debug(`❌ Callback not found: ${name}`);
    }
  }
  
  handleLog(context) {
    const { message, level = 'info' } = context;
    const logMessage = message || `State transition: ${context.phase} ${context.state}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, context);
        break;
      case 'warn':
        console.warn(logMessage, context);
        break;
      case 'debug':
        console.debug(logMessage, context);
        break;
      default:
        console.log(logMessage, context);
    }
  }
  
  /**
   * Clear any active timeout
   */
  clearTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
      this.debug('⏰ Cleared timeout');
    }
  }
  
  /**
   * Get the context element/object
   */
  getContext() {
    return this.context;
  }
  
  /**
   * Update the context element/object
   */
  setContext(newContext) {
    this.context = newContext;
    this.debug('🔄 Updated context');
  }
  
  /**
   * Validate visual actions configuration
   */
  static validateConfig(config) {
    const errors = [];
    
    if (!config?.visualActions) {
      // Visual actions are optional
      return errors;
    }
    
    const va = config.visualActions;
    
    if (va.states && typeof va.states !== 'object') {
      errors.push('Invalid visualActions.states - must be an object');
      return errors;
    }
    
    // Validate state actions
    if (va.states) {
      for (const [stateName, stateActions] of Object.entries(va.states)) {
        if (stateActions.onEnter && !Array.isArray(stateActions.onEnter)) {
          errors.push(`State '${stateName}' onEnter actions must be an array`);
        }
        if (stateActions.onExit && !Array.isArray(stateActions.onExit)) {
          errors.push(`State '${stateName}' onExit actions must be an array`);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.debug('🧹 Destroying ActionExecutor');
    this.clearTimeout();
    this.callbacks.clear();
    this.actionHandlers.clear();
  }
}

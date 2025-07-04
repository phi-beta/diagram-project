// Version 002 - Added cursor debug logging
/**
 * Node Visual Actions - Handles visual updates and side effects
 * 
 * This class handles all visual changes and side effects in response to
 * state machine transitions. It's responsible for DOM manipulation,
 * cursor changes, timeouts, and other visual feedback.
 */

import { debugInteraction, debugNodeEvents } from './debug.js';

export class NodeVisualActions {
  constructor(visualActionsConfig, nodeElement) {
    this.config = visualActionsConfig;
    this.nodeElement = nodeElement;
    this.timeoutHandle = null;
    this.callbacks = new Map(); // For external callbacks (e.g., to InteractionManager)
    
    debugNodeEvents(`🎨 NodeVisualActions created for node`);
  }
  
  /**
   * Execute visual actions for a state transition
   * @param {string} newState - The state being entered
   * @param {string} oldState - The state being exited
   * @param {string} trigger - What triggered the transition
   * @param {Object} context - Additional context data
   */
  executeTransition(newState, oldState, trigger, context = {}) {
    debugNodeEvents(`🎨 Executing visual transition: ${oldState} → ${newState} (${trigger})`);
    
    // Execute exit actions for old state
    if (oldState && this.config.states[oldState]?.onExit) {
      this.executeActions(this.config.states[oldState].onExit, 'exit', oldState, context);
    }
    
    // Clear any existing timeout
    this.clearTimeout();
    
    // Execute enter actions for new state
    if (this.config.states[newState]?.onEnter) {
      this.executeActions(this.config.states[newState].onEnter, 'enter', newState, context);
    }
  }
  
  /**
   * Execute a list of visual actions
   * @param {Array} actions - Array of action strings
   * @param {string} phase - 'enter' or 'exit'
   * @param {string} state - Current state
   * @param {Object} context - Context data
   */
  executeActions(actions, phase, state, context) {
    debugNodeEvents(`🎨 Executing ${phase} actions for state '${state}':`, actions);
    
    actions.forEach(action => {
      try {
        this.executeAction(action, phase, state, context);
      } catch (error) {
        console.error(`Error executing visual action '${action}':`, error);
      }
    });
  }
  
  /**
   * Execute a single visual action
   * @param {string} action - Action to execute
   * @param {string} phase - 'enter' or 'exit'
   * @param {string} state - Current state
   * @param {Object} context - Context data
   */
  executeAction(action, phase, state, context) {
    debugNodeEvents(`🎨 Executing action: ${action}`);
    
    // Handle timeout actions
    if (action.startsWith('setTimeout:')) {
      const delay = parseInt(action.split(':')[1]);
      this.setTimeout(() => {
        this.triggerCallback('timeout', { state, phase, context });
      }, delay);
      return;
    }
    
    // Handle visual actions
    switch (action) {
      case 'addHighlight':
        this.addHighlight('selected');
        break;
      case 'removeHighlight':
        this.removeHighlight();
        break;
      case 'addDragHighlight':
        this.addHighlight('dragging');
        break;
      case 'removeDragHighlight':
        this.removeHighlight('dragging');
        break;
      case 'addScaleHighlight':
        this.addHighlight('scaling');
        break;
      case 'removeScaleHighlight':
        this.removeHighlight('scaling');
        break;
      case 'addEdgeSourceHighlight':
        this.addHighlight('edge-source');
        break;
      case 'removeEdgeSourceHighlight':
        this.removeHighlight('edge-source');
        break;
      case 'addEdgeTargetHighlight':
        this.addHighlight('edge-target');
        break;
      case 'removeEdgeTargetHighlight':
        this.removeHighlight('edge-target');
        break;
      case 'setDefaultCursor':
        this.setCursor('default');
        break;
      case 'setPointerCursor':
        this.setCursor('pointer');
        break;
      case 'setGrabbingCursor':
        this.setCursor('grabbing');
        break;
      case 'setResizeCursor':
        this.setCursor('nw-resize');
        break;
      case 'setCrosshairCursor':
        this.setCursor('crosshair');
        break;
      default:
        debugNodeEvents(`⚠️ Unknown visual action: ${action}`);
    }
  }
  
  /**
   * Add highlight to node
   * @param {string} type - Type of highlight (selected, dragging, etc.)
   */
  addHighlight(type) {
    if (!this.nodeElement) return;
    
    const element = this.getNodeElement();
    if (element) {
      element.classList.add(type); // Use direct class name, not prefixed
      debugNodeEvents(`🎨 Added ${type} highlight`);
    }
  }
  
  /**
   * Remove highlight from node
   * @param {string} type - Specific type to remove, or all if not specified
   */
  removeHighlight(type = null) {
    if (!this.nodeElement) return;
    
    const element = this.getNodeElement();
    if (element) {
      if (type) {
        element.classList.remove(type); // Use direct class name, not prefixed
      } else {
        // Remove all state classes
        element.classList.remove('selected', 'dragging', 'scaling', 'edge-source', 'edge-target');
      }
      debugNodeEvents(`🎨 Removed ${type || 'all'} highlight(s)`);
    }
  }
  
  /**
   * Set cursor style
   * @param {string} cursor - CSS cursor value
   */
  setCursor(cursor) {
    if (!this.nodeElement) return;
    
    const element = this.getNodeElement();
    if (element) {
      console.log(`🖱️ CURSOR: Setting node cursor to '${cursor}' for element:`, element);
      element.style.cursor = cursor;
      debugNodeEvents(`🎨 Set cursor: ${cursor}`);
    }
  }
  
  /**
   * Get the actual DOM element to manipulate
   */
  getNodeElement() {
    // Handle different node types (Node object vs direct element)
    if (this.nodeElement?.element) {
      return this.nodeElement.element; // Node object
    } else if (this.nodeElement?.nodeType) {
      return this.nodeElement; // Direct DOM element
    } else if (this.nodeElement?.renderer?.element) {
      return this.nodeElement.renderer.element; // NodeData with renderer
    }
    
    debugNodeEvents(`⚠️ Could not find DOM element for visual actions`);
    return null;
  }
  
  /**
   * Set a timeout and store the handle
   * @param {Function} callback - Function to call
   * @param {number} delay - Delay in milliseconds
   */
  setTimeout(callback, delay) {
    this.clearTimeout();
    this.timeoutHandle = setTimeout(callback, delay);
    debugNodeEvents(`⏰ Set timeout for ${delay}ms`);
  }
  
  /**
   * Clear any existing timeout
   */
  clearTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
      debugNodeEvents(`⏰ Cleared timeout`);
    }
  }
  
  /**
   * Register a callback for external communication
   * @param {string} event - Event type (e.g., 'timeout')
   * @param {Function} callback - Callback function
   */
  onCallback(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }
  
  /**
   * Trigger a callback
   * @param {string} event - Event type
   * @param {Object} data - Data to pass to callback
   */
  triggerCallback(event, data) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in visual action callback:`, error);
        }
      });
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.clearTimeout();
    this.callbacks.clear();
    debugNodeEvents(`🗑️ NodeVisualActions destroyed`);
  }
}

/**
 * Factory function to create NodeVisualActions from full config
 */
export function createNodeVisualActions(fullConfig, nodeElement) {
  if (!fullConfig?.visualActions) {
    throw new Error('NodeVisualActions: Invalid config - missing visualActions section');
  }
  return new NodeVisualActions(fullConfig.visualActions, nodeElement);
}

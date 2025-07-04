/**
 * Debug configuration and utilities
 * Set DEBUG_MODE to true to enable debug logging
 */

// Global debug configuration
window.DEBUG_MODE = false; // Set to true to enable debug logging

// Debug logging utility
const debugLog = function(module, ...args) {
  if (window.DEBUG_MODE) {
    console.log(`[${module}]`, ...args);
  }
};

// Also attach to window for console access
window.debugLog = debugLog;

// Specific debug categories - can be individually controlled
window.DEBUG_CONFIG = {
  INTERACTION: window.DEBUG_MODE,
  EDGE_CREATION: window.DEBUG_MODE,
  NODE_EVENTS: window.DEBUG_MODE,
  DRAG_MANAGER: window.DEBUG_MODE,
  RENDERER: window.DEBUG_MODE,
  KEYBOARD: window.DEBUG_MODE,
  MOUSE: window.DEBUG_MODE
};

// Category-specific debug functions
const debugInteraction = (...args) => window.DEBUG_CONFIG.INTERACTION && console.log('[INTERACTION]', ...args);
const debugEdgeCreation = (...args) => window.DEBUG_CONFIG.EDGE_CREATION && console.log('[EDGE]', ...args);
const debugNodeEvents = (...args) => window.DEBUG_CONFIG.NODE_EVENTS && console.log('[NODE]', ...args);
const debugDragManager = (...args) => window.DEBUG_CONFIG.DRAG_MANAGER && console.log('[DRAG]', ...args);
const debugRenderer = (...args) => window.DEBUG_CONFIG.RENDERER && console.log('[RENDERER]', ...args);
const debugKeyboard = (...args) => window.DEBUG_CONFIG.KEYBOARD && console.log('[KEYBOARD]', ...args);
const debugMouse = (...args) => window.DEBUG_CONFIG.MOUSE && console.log('[MOUSE]', ...args);

// Also attach to window for console access
window.debugInteraction = debugInteraction;
window.debugEdgeCreation = debugEdgeCreation;
window.debugNodeEvents = debugNodeEvents;
window.debugDragManager = debugDragManager;
window.debugRenderer = debugRenderer;
window.debugKeyboard = debugKeyboard;
window.debugMouse = debugMouse;

// Easy way to enable debug mode from console
window.enableDebug = function(categories = null) {
  window.DEBUG_MODE = true;
  if (categories) {
    categories.forEach(cat => {
      if (window.DEBUG_CONFIG.hasOwnProperty(cat)) {
        window.DEBUG_CONFIG[cat] = true;
      }
    });
  } else {
    // Enable all categories
    Object.keys(window.DEBUG_CONFIG).forEach(key => {
      window.DEBUG_CONFIG[key] = true;
    });
  }
  console.log('Debug mode enabled:', window.DEBUG_CONFIG);
};

window.disableDebug = function() {
  window.DEBUG_MODE = false;
  Object.keys(window.DEBUG_CONFIG).forEach(key => {
    window.DEBUG_CONFIG[key] = false;
  });
  console.log('Debug mode disabled');
};

export { debugLog, debugInteraction, debugEdgeCreation, debugNodeEvents, debugDragManager, debugRenderer, debugKeyboard, debugMouse };

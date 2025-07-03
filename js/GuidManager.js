/**
 * GUID Manager - Globally Unique Identifier System
 * 
 * This module provides a robust system for generating and managing globally unique identifiers
 * for nodes and edges in the diagram editor. It includes collision detection, auto-incrementing
 * suffixes, and maintains a global registry to prevent duplicates even across different
 * sessions or data imports.
 */

/**
 * Global registry to track all used GUIDs across the application
 */
class GuidRegistry {
  constructor() {
    this.usedGuids = new Set();
    this.nodeGuids = new Set();
    this.edgeGuids = new Set();
    this.guidCounters = new Map(); // Track base GUID usage for auto-incrementing
  }

  /**
   * Register a GUID as used
   * @param {string} guid - The GUID to register
   * @param {string} type - 'node' or 'edge'
   */
  register(guid, type = 'unknown') {
    this.usedGuids.add(guid);
    if (type === 'node') {
      this.nodeGuids.add(guid);
    } else if (type === 'edge') {
      this.edgeGuids.add(guid);
    }
  }

  /**
   * Check if a GUID is already in use
   * @param {string} guid - The GUID to check
   * @returns {boolean} True if GUID is in use
   */
  isUsed(guid) {
    return this.usedGuids.has(guid);
  }

  /**
   * Remove a GUID from the registry (when deleting nodes/edges)
   * @param {string} guid - The GUID to remove
   * @param {string} type - 'node' or 'edge'
   */
  unregister(guid, type = 'unknown') {
    this.usedGuids.delete(guid);
    if (type === 'node') {
      this.nodeGuids.delete(guid);
    } else if (type === 'edge') {
      this.edgeGuids.delete(guid);
    }
  }

  /**
   * Get all registered GUIDs of a specific type
   * @param {string} type - 'node', 'edge', or 'all'
   * @returns {Set} Set of GUIDs
   */
  getGuids(type = 'all') {
    switch (type) {
      case 'node':
        return new Set(this.nodeGuids);
      case 'edge':
        return new Set(this.edgeGuids);
      default:
        return new Set(this.usedGuids);
    }
  }

  /**
   * Clear all registered GUIDs (for testing or complete reset)
   */
  clear() {
    this.usedGuids.clear();
    this.nodeGuids.clear();
    this.edgeGuids.clear();
    this.guidCounters.clear();
  }

  /**
   * Get statistics about GUID usage
   */
  getStats() {
    return {
      total: this.usedGuids.size,
      nodes: this.nodeGuids.size,
      edges: this.edgeGuids.size
    };
  }
}

// Global registry instance
const guidRegistry = new GuidRegistry();

/**
 * Generate a random GUID-like string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (UUID v4 style)
 */
function generateRandomGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a timestamp-based GUID
 * Format: prefix_timestamp_random
 */
function generateTimestampGuid(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Main GUID generation function with collision detection and auto-incrementing
 * @param {string} type - 'node' or 'edge'
 * @param {string} baseId - Optional base ID for human-readable GUIDs
 * @param {string} method - 'random', 'timestamp', or 'readable'
 * @returns {string} A unique GUID
 */
export function generateGuid(type = 'node', baseId = null, method = 'timestamp') {
  let guid;
  let attempts = 0;
  const maxAttempts = 1000; // Prevent infinite loops

  do {
    switch (method) {
      case 'random':
        guid = generateRandomGuid();
        break;
      case 'timestamp':
        guid = generateTimestampGuid(baseId || type);
        break;
      case 'readable':
        if (baseId) {
          guid = baseId;
        } else {
          guid = `${type}_${generateTimestampGuid()}`;
        }
        break;
      default:
        guid = generateTimestampGuid(baseId || type);
    }

    // If collision detected, add auto-incrementing suffix
    if (guidRegistry.isUsed(guid)) {
      const baseGuid = guid;
      const counter = (guidRegistry.guidCounters.get(baseGuid) || 0) + 1;
      guidRegistry.guidCounters.set(baseGuid, counter);
      guid = `${baseGuid}_${counter}`;
    }

    attempts++;
  } while (guidRegistry.isUsed(guid) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    console.error('Failed to generate unique GUID after maximum attempts');
    // Fallback to guaranteed unique GUID
    guid = `${type}_emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Register the new GUID
  guidRegistry.register(guid, type);
  
  return guid;
}

/**
 * Ensure a given ID is unique by adding suffixes if needed
 * @param {string} proposedId - The ID we want to use
 * @param {string} type - 'node' or 'edge'
 * @returns {string} A guaranteed unique ID
 */
export function ensureUniqueId(proposedId, type = 'node') {
  if (!guidRegistry.isUsed(proposedId)) {
    guidRegistry.register(proposedId, type);
    return proposedId;
  }

  // Find a unique suffix
  let counter = 1;
  let uniqueId;
  do {
    uniqueId = `${proposedId}_${counter}`;
    counter++;
  } while (guidRegistry.isUsed(uniqueId) && counter < 10000);

  if (counter >= 10000) {
    console.error('Could not ensure unique ID for:', proposedId);
    // Fallback to timestamp-based ID
    uniqueId = generateGuid(type, proposedId, 'timestamp');
  } else {
    guidRegistry.register(uniqueId, type);
  }

  return uniqueId;
}

/**
 * Register an existing ID (for loading from saved data)
 * @param {string} id - The ID to register
 * @param {string} type - 'node' or 'edge'
 * @returns {boolean} True if successfully registered, false if collision
 */
export function registerExistingId(id, type = 'node') {
  if (guidRegistry.isUsed(id)) {
    console.warn(`ID collision detected for existing ID: ${id}`);
    return false;
  }
  
  guidRegistry.register(id, type);
  return true;
}

/**
 * Remove an ID from the registry (when deleting nodes/edges)
 * @param {string} id - The ID to remove
 * @param {string} type - 'node' or 'edge'
 */
export function unregisterId(id, type = 'node') {
  guidRegistry.unregister(id, type);
}

/**
 * Check if an ID is in use
 * @param {string} id - The ID to check
 * @returns {boolean} True if ID is in use
 */
export function isIdInUse(id) {
  return guidRegistry.isUsed(id);
}

/**
 * Get all registered IDs
 * @param {string} type - 'node', 'edge', or 'all'
 * @returns {Array<string>} Array of registered IDs
 */
export function getAllIds(type = 'all') {
  return Array.from(guidRegistry.getGuids(type));
}

/**
 * Initialize the GUID registry with existing nodes and edges
 * @param {Array} nodes - Array of existing nodes
 * @param {Array} edges - Array of existing edges
 */
export function initializeFromExisting(nodes = [], edges = []) {
  guidRegistry.clear();
  
  // Register existing node IDs
  nodes.forEach(node => {
    if (node.id) {
      guidRegistry.register(node.id, 'node');
    }
  });
  
  // Register existing edge IDs
  edges.forEach(edge => {
    if (edge.id) {
      guidRegistry.register(edge.id, 'edge');
    }
  });
  
  console.log('GUID Registry initialized:', guidRegistry.getStats());
}

/**
 * Get GUID system statistics
 * @returns {Object} Statistics object
 */
export function getGuidStats() {
  return guidRegistry.getStats();
}

/**
 * Clear the GUID registry (mainly for testing)
 */
export function clearGuidRegistry() {
  guidRegistry.clear();
}

/**
 * Validate GUID format (basic validation)
 * @param {string} guid - The GUID to validate
 * @returns {boolean} True if GUID appears valid
 */
export function validateGuid(guid) {
  if (!guid || typeof guid !== 'string') {
    return false;
  }
  
  // Basic validation - at least 3 characters, no spaces, valid characters
  const isValid = guid.length >= 3 && 
                  !/\s/.test(guid) && 
                  /^[a-zA-Z0-9_-]+$/.test(guid);
  
  return isValid;
}

// Export the registry for advanced usage
export { guidRegistry };

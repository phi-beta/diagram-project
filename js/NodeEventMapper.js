/**
 * Node Event Mapper - Maps technical events to logical transitions
 * 
 * This class handles the mapping between technical DOM events and logical
 * state machine transitions. It evaluates conditions and determines which
 * logical action should be triggered based on the event and current context.
 */

import { debugInteraction, debugNodeEvents } from './debug.js';

export class NodeEventMapper {
  constructor(eventMappingConfig) {
    this.config = eventMappingConfig;
    debugNodeEvents(`🗺️ NodeEventMapper created with config`);
  }
  
  /**
   * Map a technical event to a logical action
   * @param {string} eventType - Technical event type (mouseDown, mouseUp, etc.)
   * @param {string} currentState - Current state of the state machine
   * @param {Object} eventData - Event data for condition evaluation
   * @returns {string|null} - Logical action to trigger, or null if no mapping
   */
  mapEventToAction(eventType, currentState, eventData = {}) {
    debugNodeEvents(`🗺️ Mapping event '${eventType}' in state '${currentState}' with data:`, eventData);
    
    // Find the event mapping rule
    const eventRule = this.config.rules.find(rule => rule.event === eventType);
    if (!eventRule) {
      debugNodeEvents(`⚠️ No mapping rule found for event: ${eventType}`);
      return null;
    }
    
    // Find all conditions that match current state
    const stateConditions = eventRule.conditions.filter(condition => 
      condition.state === currentState
    );
    
    if (stateConditions.length === 0) {
      debugNodeEvents(`⚠️ No condition found for event '${eventType}' in state '${currentState}'`);
      return null;
    }
    
    // Find the first condition that evaluates to true (or has no condition)
    let matchingCondition = null;
    for (const condition of stateConditions) {
      console.log(`🧪 DEBUG: Testing condition for state '${currentState}':`, condition);
      if (!condition.condition) {
        // No condition means it always matches
        console.log(`✅ DEBUG: No condition - auto-match`);
        matchingCondition = condition;
        break;
      } else {
        const conditionResult = this.evaluateCondition(condition.condition, eventData);
        console.log(`🔍 DEBUG: Evaluating condition '${condition.condition}' with eventData:`, eventData, `result=${conditionResult}`);
        if (conditionResult) {
          console.log(`✅ DEBUG: Condition matched - selecting action '${condition.action}'`);
          matchingCondition = condition;
          break;
        } else {
          console.log(`❌ DEBUG: Condition failed - trying next`);
        }
      }
    }
    
    if (!matchingCondition) {
      debugNodeEvents(`❌ No matching condition found for event '${eventType}' in state '${currentState}'`);
      return null;
    }
    
    const action = matchingCondition.action;
    debugNodeEvents(`✅ Event '${eventType}' mapped to action '${action}' in state '${currentState}'`);
    console.log(`🗺️ Event mapping: ${eventType} (${currentState}) → ${action}`);
    
    return action;
  }
  
  /**
   * Evaluate a condition against event data
   * @param {string} condition - Condition string (e.g., "shiftKey", "!shiftKey", "isClick")
   * @param {Object} eventData - Event data to evaluate against
   * @returns {boolean} - Whether condition is met
   */
  evaluateCondition(condition, eventData) {
    // Handle negation
    if (condition.startsWith('!')) {
      const property = condition.slice(1);
      return !eventData[property];
    }
    
    // Handle direct property check
    return !!eventData[condition];
  }
  
  /**
   * Get all possible actions for an event in a given state
   * @param {string} eventType - Technical event type
   * @param {string} currentState - Current state
   * @returns {Array} - Array of possible actions
   */
  getPossibleActions(eventType, currentState) {
    const eventRule = this.config.rules.find(rule => rule.event === eventType);
    if (!eventRule) return [];
    
    return eventRule.conditions
      .filter(condition => condition.state === currentState)
      .map(condition => condition.action);
  }
  
  /**
   * Get debug information about event mappings
   */
  getDebugInfo() {
    return {
      totalRules: this.config.rules.length,
      eventTypes: [...new Set(this.config.rules.map(rule => rule.event))],
      states: [...new Set(this.config.rules.flatMap(rule => 
        rule.conditions.map(condition => condition.state)
      ))]
    };
  }
}

/**
 * Factory function to create NodeEventMapper from full config
 */
export function createNodeEventMapper(fullConfig) {
  if (!fullConfig?.eventMapping) {
    throw new Error('NodeEventMapper: Invalid config - missing eventMapping section');
  }
  return new NodeEventMapper(fullConfig.eventMapping);
}

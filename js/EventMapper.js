/**
 * Generic Event Mapper - Maps domain events to state machine actions
 * 
 * This class handles the mapping between technical/domain events and
 * logical state machine transitions. It evaluates conditions and
 * determines which action should be triggered.
 */

export class EventMapper {
  constructor(eventMappingConfig, debugCategory = 'EVENT_MAPPER') {
    this.config = eventMappingConfig;
    this.debugCategory = debugCategory;
    this.conditionEvaluators = new Map();
    
    // Register default condition evaluators
    this.registerConditionEvaluator('default', this.defaultConditionEvaluator.bind(this));
    
    this.debug('🗺️ EventMapper initialized');
  }
  
  /**
   * Debug logging with category
   */
  debug(message) {
    console.log(`[${this.debugCategory}] ${message}`);
  }
  
  /**
   * Register a custom condition evaluator
   */
  registerConditionEvaluator(name, evaluator) {
    this.conditionEvaluators.set(name, evaluator);
    this.debug(`📝 Registered condition evaluator: ${name}`);
  }
  
  /**
   * Default condition evaluator - handles basic conditions
   */
  defaultConditionEvaluator(condition, eventData) {
    // Handle logical operators (&&, ||)
    if (condition.includes('&&') || condition.includes('||')) {
      return this.evaluateLogicalCondition(condition, eventData);
    }
    
    // Handle negation
    if (condition.startsWith('!')) {
      const innerCondition = condition.substring(1);
      return !this.evaluateCondition(innerCondition, eventData);
    }
    
    // Handle direct property access
    if (eventData.hasOwnProperty(condition)) {
      return !!eventData[condition];
    }
    
    // Handle dot notation (e.g., "user.isAdmin")
    if (condition.includes('.')) {
      const parts = condition.split('.');
      let value = eventData;
      for (const part of parts) {
        if (value && value.hasOwnProperty(part)) {
          value = value[part];
        } else {
          return false;
        }
      }
      return !!value;
    }
    
    // Handle comparison operators (e.g., "count > 5")
    const comparisonMatch = condition.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, operator, right] = comparisonMatch;
      const leftValue = this.resolveValue(left.trim(), eventData);
      const rightValue = this.resolveValue(right.trim(), eventData);
      
      switch (operator) {
        case '===': return leftValue === rightValue;
        case '!==': return leftValue !== rightValue;
        case '==': return leftValue == rightValue;
        case '!=': return leftValue != rightValue;
        case '>=': return leftValue >= rightValue;
        case '<=': return leftValue <= rightValue;
        case '>': return leftValue > rightValue;
        case '<': return leftValue < rightValue;
        default: return false;
      }
    }
    
    return false;
  }
  
  /**
   * Evaluate logical conditions with && and || operators
   */
  evaluateLogicalCondition(condition, eventData) {
    this.debug(`🔍 Evaluating logical condition: '${condition}' with data:`, eventData);
    
    // Split on || first (lowest precedence)
    const orParts = condition.split('||').map(part => part.trim());
    this.debug(`🔍 OR parts: ${orParts.join(' || ')}`);
    
    for (const orPart of orParts) {
      // Split on && (higher precedence)
      const andParts = orPart.split('&&').map(part => part.trim());
      this.debug(`🔍 AND parts: ${andParts.join(' && ')}`);
      
      // All AND parts must be true
      const andResult = andParts.every(andPart => {
        const result = this.evaluateSingleCondition(andPart, eventData);
        this.debug(`🔍 Evaluating '${andPart}' = ${result}`);
        return result;
      });
      
      this.debug(`🔍 AND result for '${orPart}': ${andResult}`);
      
      // If any OR part is true, return true
      if (andResult) {
        this.debug(`✅ Logical condition passed: '${condition}'`);
        return true;
      }
    }
    
    this.debug(`❌ Logical condition failed: '${condition}'`);
    return false;
  }
  
  /**
   * Evaluate a single condition (no logical operators)
   */
  evaluateSingleCondition(condition, eventData) {
    // Handle negation
    if (condition.startsWith('!')) {
      const innerCondition = condition.substring(1);
      return !this.evaluateSingleCondition(innerCondition, eventData);
    }
    
    // Handle direct property access
    if (eventData.hasOwnProperty(condition)) {
      return !!eventData[condition];
    }
    
    // Handle dot notation (e.g., "user.isAdmin")
    if (condition.includes('.')) {
      const parts = condition.split('.');
      let value = eventData;
      for (const part of parts) {
        if (value && value.hasOwnProperty(part)) {
          value = value[part];
        } else {
          return false;
        }
      }
      return !!value;
    }
    
    // Handle comparison operators (e.g., "count > 5")
    const comparisonMatch = condition.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, operator, right] = comparisonMatch;
      const leftValue = this.resolveValue(left.trim(), eventData);
      const rightValue = this.resolveValue(right.trim(), eventData);
      
      switch (operator) {
        case '===': return leftValue === rightValue;
        case '!==': return leftValue !== rightValue;
        case '==': return leftValue == rightValue;
        case '!=': return leftValue != rightValue;
        case '>=': return leftValue >= rightValue;
        case '<=': return leftValue <= rightValue;
        case '>': return leftValue > rightValue;
        case '<': return leftValue < rightValue;
        default: return false;
      }
    }
    
    return false;
  }
  
  /**
   * Resolve a value from a string (could be a literal or property reference)
   */
  resolveValue(valueStr, eventData) {
    // Handle string literals
    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
      return valueStr.slice(1, -1);
    }
    
    // Handle number literals
    if (!isNaN(valueStr)) {
      return Number(valueStr);
    }
    
    // Handle boolean literals
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if (valueStr === 'null') return null;
    if (valueStr === 'undefined') return undefined;
    
    // Handle property references
    if (eventData.hasOwnProperty(valueStr)) {
      return eventData[valueStr];
    }
    
    // Handle dot notation
    if (valueStr.includes('.')) {
      const parts = valueStr.split('.');
      let value = eventData;
      for (const part of parts) {
        if (value && value.hasOwnProperty(part)) {
          value = value[part];
        } else {
          return undefined;
        }
      }
      return value;
    }
    
    return valueStr; // Return as string if nothing else matches
  }
  
  /**
   * Evaluate a condition against event data
   */
  evaluateCondition(condition, eventData, evaluatorName = 'default') {
    const evaluator = this.conditionEvaluators.get(evaluatorName);
    if (!evaluator) {
      this.debug(`❌ Unknown condition evaluator: ${evaluatorName}`);
      return false;
    }
    
    try {
      return evaluator(condition, eventData);
    } catch (error) {
      this.debug(`❌ Error evaluating condition '${condition}': ${error.message}`);
      return false;
    }
  }
  
  /**
   * Map an event to an action based on current state and conditions
   */
  mapEvent(eventName, currentState, eventData = {}) {
    this.debug(`🎯 Mapping event '${eventName}' in state '${currentState}'`);
    
    // Special debug for cancelEdgeCreation
    if (eventName === 'cancelEdgeCreation') {
      console.log('🔍 EXPLICIT DEBUG - cancelEdgeCreation event mapping');
      console.log('🔍 Config:', this.config);
      console.log('🔍 EventMapping rules:', this.config.eventMapping?.rules);
      console.log('🔍 Rules for cancelEdgeCreation:', this.config.eventMapping?.rules?.filter(rule => rule.event === 'cancelEdgeCreation'));
    }
    
    // Find rules for this event
    const eventRules = this.config.eventMapping?.rules?.filter(rule => rule.event === eventName) || [];
    
    if (eventRules.length === 0) {
      this.debug(`❌ No mapping rules found for event '${eventName}'`);
      return null;
    }
    
    // Process each rule for this event
    for (const rule of eventRules) {
      if (!rule.conditions) {
        this.debug(`⚠️ Rule for event '${eventName}' has no conditions`);
        continue;
      }
      
      // Find matching condition for current state
      for (const conditionRule of rule.conditions) {
        this.debug(`🧪 Testing condition for state '${currentState}':`, conditionRule);
        
        // Check if this condition applies to current state
        if (conditionRule.state !== currentState) {
          continue;
        }
        
        // If no condition specified, auto-match
        if (!conditionRule.condition) {
          this.debug(`✅ No condition - auto-match`);
          this.debug(`🗺️ Event mapping: ${eventName} (${currentState}) → ${conditionRule.action}`);
          return conditionRule.action;
        }
        
        // Evaluate the condition
        const conditionResult = this.evaluateCondition(conditionRule.condition, eventData);
        this.debug(`🔍 Evaluating condition '${conditionRule.condition}' with eventData:`, eventData);
        this.debug(`🔍 Condition result: ${conditionResult}`);
        
        if (conditionResult) {
          this.debug(`✅ Condition matched - selecting action '${conditionRule.action}'`);
          this.debug(`🗺️ Event mapping: ${eventName} (${currentState}) → ${conditionRule.action}`);
          return conditionRule.action;
        } else {
          this.debug(`❌ Condition failed - trying next`);
        }
      }
    }
    
    this.debug(`❌ No matching condition found for event '${eventName}' in state '${currentState}'`);
    return null;
  }
  
  /**
   * Get all possible actions for an event in a given state
   */
  getPossibleActions(eventName, currentState) {
    const eventRules = this.config.eventMapping?.rules?.filter(rule => rule.event === eventName) || [];
    const actions = new Set();
    
    for (const rule of eventRules) {
      if (rule.conditions) {
        for (const conditionRule of rule.conditions) {
          if (conditionRule.state === currentState) {
            actions.add(conditionRule.action);
          }
        }
      }
    }
    
    return Array.from(actions);
  }
  
  /**
   * Validate event mapping configuration
   */
  static validateConfig(config) {
    const errors = [];
    
    if (!config?.eventMapping) {
      errors.push('Missing eventMapping configuration');
      return errors;
    }
    
    const em = config.eventMapping;
    
    if (!em.rules || !Array.isArray(em.rules)) {
      errors.push('Missing or invalid eventMapping.rules array');
      return errors;
    }
    
    // Validate each rule
    em.rules.forEach((rule, index) => {
      if (!rule.event) {
        errors.push(`Rule ${index}: Missing event name`);
      }
      
      if (!rule.conditions || !Array.isArray(rule.conditions)) {
        errors.push(`Rule ${index}: Missing or invalid conditions array`);
      } else {
        rule.conditions.forEach((condition, condIndex) => {
          if (!condition.state) {
            errors.push(`Rule ${index}, condition ${condIndex}: Missing state`);
          }
          if (!condition.action) {
            errors.push(`Rule ${index}, condition ${condIndex}: Missing action`);
          }
        });
      }
    });
    
    return errors;
  }
}

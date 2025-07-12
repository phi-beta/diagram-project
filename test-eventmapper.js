// Test the EventMapper logical condition evaluation directly
import { EventMapper } from './js/EventMapper.js';

console.log('🧪 Testing EventMapper logical conditions...');

// Test data that should match the real scenario
const testData = {
  sourceNode: { id: 'server1' },
  reason: 'mouseMoved',
  shiftKeyDown: true,
  mouseMovedAwayFromNode: true
};

// Test config from the diagram state machine
const config = {
  eventMapping: {
    rules: [
      {
        event: 'nodeSelectedForEdge',
        conditions: [
          {
            state: 'idle',
            condition: 'shiftKeyDown && mouseMovedAwayFromNode',
            action: 'startEdgeCreation'
          },
          {
            state: 'idle',
            condition: 'shiftKeyDown && clickedDifferentNode',
            action: 'startEdgeCreation'
          }
        ]
      }
    ]
  }
};

console.log('🔍 Test data:', testData);

const mapper = new EventMapper(config, 'TEST_EVENT_MAPPER');

// Test the exact condition that's failing
console.log('\n🎯 Testing condition: shiftKeyDown && mouseMovedAwayFromNode');
const result = mapper.mapEvent('nodeSelectedForEdge', 'idle', testData);
console.log('🔍 Result:', result);

// Test individual conditions
console.log('\n🔍 Testing individual conditions:');
console.log('shiftKeyDown:', mapper.evaluateCondition('shiftKeyDown', testData));
console.log('mouseMovedAwayFromNode:', mapper.evaluateCondition('mouseMovedAwayFromNode', testData));
console.log('shiftKeyDown && mouseMovedAwayFromNode:', mapper.evaluateCondition('shiftKeyDown && mouseMovedAwayFromNode', testData));

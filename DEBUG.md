# Debug System Documentation

The diagram project includes a comprehensive debug logging system that allows you to selectively enable debugging for different components without cluttering the console during normal operation.

## Quick Start

### Enable All Debug Logging
```javascript
// In browser console
window.enableDebug();
```

### Enable Specific Categories
```javascript
// Enable only edge creation debugging
window.enableDebug(['EDGE_CREATION']);

// Enable multiple categories
window.enableDebug(['EDGE_CREATION', 'INTERACTION', 'KEYBOARD']);
```

### Disable All Debug Logging
```javascript
window.disableDebug();
```

## Debug Categories

| Category | Description | Key Events |
|----------|-------------|------------|
| `INTERACTION` | General interaction manager events | Node selection, event listener setup |
| `EDGE_CREATION` | Edge creation workflow | Starting edges, completing edges, canceling |
| `NODE_EVENTS` | Node mouse/interaction events | Mouse up/down, click detection |
| `DRAG_MANAGER` | Node dragging operations | Drag start/stop, position updates |
| `RENDERER` | Rendering and initialization | Manager creation, node creation |
| `KEYBOARD` | Keyboard event handling | Key down/up, shift detection |
| `MOUSE` | Mouse movement tracking | Mouse position, movement during edge creation |

## Usage Examples

### Debug Edge Creation Issues
```javascript
// Enable edge creation and interaction debugging
window.enableDebug(['EDGE_CREATION', 'INTERACTION']);

// Now try creating an edge:
// 1. Select a node
// 2. Hold Shift and drag to another node
// 3. Watch console for detailed edge creation flow
```

### Debug Keyboard Issues
```javascript
// Enable keyboard debugging
window.enableDebug(['KEYBOARD']);

// Press keys to see detection in console
```

### Debug Node Interactions
```javascript
// Enable node event debugging
window.enableDebug(['NODE_EVENTS']);

// Click and drag nodes to see event flow
```

## Implementation Details

### Adding Debug Logging to New Code

```javascript
// Import debug functions
import { debugEdgeCreation, debugInteraction } from './debug.js';

// Use in your code
debugEdgeCreation('Edge creation started:', nodeId);
debugInteraction('Node selected:', node);
```

### Available Debug Functions

- `debugInteraction()` - General interaction events
- `debugEdgeCreation()` - Edge creation workflow
- `debugNodeEvents()` - Node-specific events  
- `debugDragManager()` - Drag operations
- `debugRenderer()` - Rendering operations
- `debugKeyboard()` - Keyboard events
- `debugMouse()` - Mouse events

### Configuration

The debug system is controlled by:
- `window.DEBUG_MODE` - Global debug toggle
- `window.DEBUG_CONFIG` - Category-specific toggles

```javascript
// Check current debug status
console.log('Debug mode:', window.DEBUG_MODE);
console.log('Debug config:', window.DEBUG_CONFIG);
```

## Demo Page

Open `debug-demo.html` for a visual interface to control debug settings and test edge creation with live debug output.

## Best Practices

1. **Use appropriate categories** - Don't log everything to the same category
2. **Include context** - Log relevant object IDs and state information  
3. **Use consistent formatting** - Follow existing emoji and format patterns
4. **Test with debug disabled** - Ensure code works with debugging off
5. **Clean up temporary debug** - Use the debug system instead of console.log

## Troubleshooting Edge Creation

Common edge creation issues and their debug categories:

| Issue | Debug Categories | What to Look For |
|-------|------------------|------------------|
| Edge not starting | `EDGE_CREATION`, `KEYBOARD` | Shift key detection, startEdgeCreation calls |
| Temporary edge not showing | `EDGE_CREATION`, `MOUSE` | updateTemporaryEdge calls, mouse tracking |
| Edge not completing | `EDGE_CREATION`, `NODE_EVENTS` | selectNode calls, edge completion logic |
| Edge canceled unexpectedly | `EDGE_CREATION`, `INTERACTION` | cancelEdgeCreation calls and reasons |

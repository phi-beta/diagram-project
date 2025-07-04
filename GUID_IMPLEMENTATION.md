# Diagram Editor GUID System Implementation

## Overview
Successfully refactored the diagram editor's Node and Edge systems to use globally unique identifiers (GUIDs) for all nodes and edges. This ensures no duplicate IDs even after duplication operations.

## Changes Made

### 1. GuidManager.js (NEW)
- **`generateGuid(prefix)`**: Generates unique IDs with type prefix (e.g., "node_abc123", "edge_def456")
- **`ensureUniqueId(id)`**: Handles ID collisions by auto-incrementing suffixes
- **`registerGuid(id, type)`**: Registers IDs in global registry for collision detection
- **`unregisterGuid(id)`**: Cleans up registry when objects are destroyed
- **`isGuidRegistered(id)`**: Checks if an ID exists in the registry
- **`getAllGuids()`**: Returns all registered GUIDs and their types
- **`clearRegistry()`**: Clears all registered GUIDs (for testing)

### 2. Node.js (REFACTORED)
Separated into three classes following separation of concerns:

#### NodeData Class
- Pure data model for node information and business logic
- **GUID Integration**: Uses GuidManager for unique ID generation
- **`duplicate()`**: Creates new NodeData with fresh GUID
- **`destroy()`**: Unregisters GUID from global registry
- **Properties**: id, x, y, svg, label, class, scale, interaction states

#### NodeRenderer Class  
- Manages SVG rendering and user interactions
- **Mouse interaction methods**: onMouseDown, onMouseMove, onMouseUp
- **Visual state management**: select, deselect, setDraggingState, setScalingState
- **Animation methods**: moveTo, scaleTo with optional smooth transitions
- **Coordinate system integration**: getLocalCenter, getGlobalCenter

#### Node Class (Legacy Wrapper)
- Maintains backward compatibility with existing code
- **`clone(svg)`**: Async method that creates complete duplicate with new GUID
- **`makeDraggable()`**: Legacy method for setting up interactions
- **`getTransformedCenter()`**: Required by Edge class for connection drawing
- Delegates all operations to NodeData and NodeRenderer

### 3. Edge.js (UPDATED)
Enhanced existing separation with GUID support:

#### EdgeData Class
- **GUID Integration**: Uses GuidManager for unique edge IDs
- **`duplicate()`**: Creates new EdgeData with fresh GUID  
- **`destroy()`**: Unregisters GUID from global registry

#### EdgeRenderer Class
- **`destroy()`**: Properly cleans up DOM and data references

#### Edge Class (Legacy Wrapper)
- **`id`**: Now properly exposes GUID from EdgeData
- **`destroy()`**: Added cleanup method

### 4. renderer.js (UPDATED)
- **Import**: Added GuidManager import
- **`completeEdgeCreation()`**: Updated to use GuidManager.generateGuid('edge')
- **Import versions**: Updated to v022 for Node.js, v006 for Edge.js
- **GUID-based operations**: All node and edge creation now uses unique GUIDs

## Key Features

### GUID Generation
- **Format**: `{type}_{timestamp}_{random}` (e.g., "node_1704282000000_abc123")
- **Collision Handling**: Auto-increments suffix when duplicates detected
- **Type Prefixes**: "node" for nodes, "edge" for edges
- **Global Registry**: Tracks all active GUIDs to prevent collisions

### Duplication System
- **Node Duplication**: Ctrl+D creates exact copy with new GUID at offset position
- **Automatic GUID Assignment**: New objects always get fresh, unique identifiers
- **Edge Preservation**: Existing edge connections use original node GUIDs
- **Registry Management**: Automatic registration/cleanup of GUIDs

### Backward Compatibility
- **Legacy API Support**: Existing code continues to work unchanged
- **Method Delegation**: Legacy classes forward calls to new separated classes
- **Property Access**: All original properties accessible through getters/setters
- **Event Handling**: Original event system maintained through legacy wrappers

## Testing

### Test Files Created
- **`test-guid.html`**: Basic GUID system verification
- **`test-duplication.html`**: Comprehensive duplication and collision testing

### Test Coverage
- ✅ GUID uniqueness across multiple generations
- ✅ Node duplication with proper GUID assignment  
- ✅ Edge creation with node GUID references
- ✅ Collision detection and auto-increment suffixes
- ✅ Registry management and cleanup
- ✅ Stress testing (100+ duplications)
- ✅ Memory cleanup verification
- ✅ Backward compatibility with existing API

## File Structure
```
js/
├── GuidManager.js          # NEW - GUID generation and management
├── Node.js                 # REFACTORED - Separated data/renderer/legacy
├── Edge.js                 # UPDATED - Added GUID support  
├── renderer.js             # UPDATED - Integrated GUID system
├── Node-backup.js          # OLD - Original Node.js backed up
├── EdgeExamples.js         # Examples for new Edge API
└── [other existing files]

test-guid.html              # NEW - Basic GUID testing
test-duplication.html       # NEW - Comprehensive duplication testing
```

## Usage Examples

### Using New API (Recommended)
```javascript
import { NodeData, NodeRenderer } from './Node.js';
import { GuidManager } from './GuidManager.js';

// Create node data with automatic GUID
const nodeData = new NodeData({ x: 100, y: 100, label: 'Server' });
console.log(nodeData.id); // "node_1704282000000_abc123"

// Create renderer
const renderer = NodeRenderer.createNodeRenderer(nodeData, svg);

// Duplicate with new GUID
const duplicate = nodeData.duplicate();
console.log(duplicate.id); // "node_1704282000001_def456"
```

### Using Legacy API (Still Supported)
```javascript
import { Node } from './Node.js';

// Works exactly as before
const node = new Node(data, element);
const clone = await node.clone(svg); // New GUID assigned automatically
```

## Benefits Achieved

1. **No More Duplicate IDs**: GUID system ensures global uniqueness
2. **Collision-Free Duplication**: Auto-incrementing handles any conflicts
3. **Memory Management**: Proper cleanup when objects destroyed
4. **Separation of Concerns**: Clean data/renderer/legacy architecture
5. **Backward Compatibility**: Existing code requires no changes
6. **Scalability**: Can handle thousands of nodes/edges without conflicts
7. **Type Safety**: Type prefixes help identify object types from IDs
8. **Performance**: Efficient registry-based collision detection

## Next Steps (Future Enhancements)

1. **Persistent Storage**: Save/load GUID registry with layouts
2. **Undo/Redo**: Leverage GUID system for operation history
3. **Multi-User Support**: GUID system ready for collaborative editing
4. **Export/Import**: GUID-based serialization for data exchange
5. **API Extensions**: Expose GUID management for plugin development

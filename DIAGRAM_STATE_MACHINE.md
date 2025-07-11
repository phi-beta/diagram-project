# Diagram-Level State Machine Implementation

## Overview

The diagram-level state machine is a significant architectural enhancement that provides centralized coordination for global/diagram-wide interactions. This addresses the complexity of edge creation logic that was previously distributed across multiple components.

## Problem Addressed

**Before**: Edge creation logic was complex and distributed:
- InteractionManager tracked `isCreatingEdge`, `edgeStartNode`, `temporaryEdge`
- NodeStateManager managed individual node states (`edgeSource`, `edgeTarget`)
- Cursor management scattered across components
- Multiple cancellation code paths
- State synchronization challenges between components

**After**: Centralized diagram-level coordination:
- Single source of truth for diagram-wide states
- Centralized temporary element management
- Unified cursor management
- Simplified cancellation logic
- Clear separation between diagram-level and node-level concerns

## Architecture

### DiagramStateManager (`js/DiagramStateManager.js`)

**Core Responsibilities:**
- Manage diagram-wide states (`idle`, `edgeCreation`, `multiSelection`)
- Coordinate temporary visual elements (temporary edges, highlighting)
- Handle diagram-level cursor changes
- Provide fallback to legacy behavior

**Key Methods:**
- `startEdgeCreation(sourceNode, reason)` - Initiate edge creation
- `completeEdgeCreation(targetNode)` - Complete edge to target
- `cancelEdgeCreation(reason)` - Cancel with reason tracking
- `updateTemporaryEdge(mouseX, mouseY)` - Update visual feedback
- `isInEdgeCreationMode()` - Check current state

### State Machine Configuration (`config/diagram-state-machine.json`)

**States:**
- `idle` - Default state, no diagram-wide interactions
- `edgeCreation` - Active edge creation with temporary visual feedback
- `multiSelection` - Reserved for future multi-selection feature

**Event Mapping:**
- `nodeSelectedForEdge` - Shift+click or Shift+mouse movement
- `edgeTargetClicked` - Complete edge to target node
- `escapeKey` - Cancel via keyboard
- `backgroundClicked` - Cancel via background click
- `nodeStartedDragging` - Cancel if non-source node drags
- `shiftKeyReleased` - Cancel on Shift release

### Integration with InteractionManager

The InteractionManager has been updated to use the DiagramStateManager as the primary coordinator:

```javascript
// Try DiagramStateManager first, fall back to legacy
if (diagramStateManager.isInEdgeCreationMode()) {
  diagramStateManager.completeEdgeCreation(targetNode);
} else {
  this.legacyCompleteEdgeCreation(fromNode, toNode);
}
```

**Benefits:**
- **Graceful Migration**: Legacy methods preserved for fallback
- **Progressive Enhancement**: New features use state machine, existing code unchanged
- **Debugging**: Clear separation makes debugging easier
- **Testing**: Can test new and legacy paths independently

## Edge Creation Flow (New Architecture)

### 1. Initiation
**Trigger:** User holds Shift and moves mouse away from selected node
**Action:** `DiagramStateManager.startEdgeCreation()`
**State Transition:** `idle` → `edgeCreation`
**Visual Changes:**
- Cursor changes to crosshair
- Temporary edge element created
- Node highlighting enabled

### 2. Active Edge Creation
**State:** `edgeCreation`
**Behavior:**
- Temporary edge follows mouse cursor
- Target nodes show highlighting on hover
- Source node remains in `edgeSource` state
- Multiple cancellation methods available

### 3. Completion
**Trigger:** Click on valid target node
**Action:** `DiagramStateManager.completeEdgeCreation(targetNode)`
**State Transition:** `edgeCreation` → `idle`
**Result:**
- Permanent edge created via callback
- Temporary edge removed
- Cursor reset to default
- Source node remains selected

### 4. Cancellation
**Triggers:**
- Escape key press
- Background click
- Shift key release
- Node drag (except source node)
- Mouse over source node

**Action:** `DiagramStateManager.cancelEdgeCreation(reason)`
**State Transition:** `edgeCreation` → `idle`
**Cleanup:**
- Temporary edge removed
- Node highlighting disabled
- Cursor reset
- All nodes return to appropriate states

## Component Coordination

### DiagramStateManager ↔ InteractionManager
- DiagramStateManager handles diagram-wide state
- InteractionManager handles user input events
- Clear delegation with fallback mechanisms

### DiagramStateManager ↔ NodeStateManager
- DiagramStateManager coordinates global modes
- NodeStateManager handles individual node states
- Both work together for edge creation (source/target states)

### DiagramStateManager ↔ Visual Elements
- Centralized management of temporary edges
- Consistent cursor management
- Node highlighting coordination

## Implementation Benefits

### 1. Simplified Logic
**Before:** Edge creation logic scattered across multiple methods and components
**After:** Single, clear state machine with defined transitions

### 2. Better Debugging
**Before:** State inconsistencies hard to track across components
**After:** Clear state inspection with `getDebugInfo()` method

### 3. Robust Cancellation
**Before:** Multiple cancellation paths, potential for missed cleanup
**After:** Single cancellation method handles all triggers consistently

### 4. Future Extensibility
**Before:** Adding new diagram-wide interactions required complex coordination
**After:** Framework in place for multi-selection, tool modes, etc.

### 5. Performance
**Before:** Multiple event listeners and state checks across components
**After:** Centralized event handling with efficient state machine

## Testing Strategy

### Manual Testing
- Use `test-diagram-state-machine.html` for interactive testing
- Verify all UX requirements checklist items
- Test edge cases and error conditions

### Automated Testing
- Unit tests for state machine transitions
- Integration tests for component coordination
- Performance tests for state change overhead

### Debugging Tools
- Real-time state inspection in test page
- Console logging for state transitions
- Debug information via `getDebugInfo()`

## Migration and Compatibility

### Backward Compatibility
- All existing UX behaviors preserved
- Legacy methods maintained as fallbacks
- Gradual adoption of new architecture

### Error Handling
- Graceful degradation when state machine unavailable
- Clear error messages for debugging
- Fallback to proven legacy behavior

### Performance Impact
- Minimal overhead from state machine
- Efficient event delegation
- No breaking changes to existing performance characteristics

## Future Enhancements

### Multi-Selection Support
The state machine framework is ready for multi-selection:
- `multiSelection` state already defined
- Event mapping structure supports selection events
- Visual action framework ready for selection box

### Tool Modes
Framework supports additional diagram-wide modes:
- Drawing tools
- Annotation modes
- Layout algorithms
- Export/import states

### Advanced Edge Creation
Future edge creation enhancements:
- Multiple edge types
- Curved edges with control points
- Edge routing algorithms
- Smart connection points

## Conclusion

The diagram-level state machine provides a solid foundation for coordinating complex multi-component interactions. By centralizing diagram-wide state management, we've significantly simplified the edge creation logic while maintaining full backward compatibility and creating a framework for future enhancements.

The architecture successfully addresses the original problem of distributed, complex edge creation logic while providing a clear path forward for additional diagram-wide features.

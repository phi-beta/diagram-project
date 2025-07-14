# Node Z-Order Management Implementation

## Overview
Implemented PgUp/PgDown functionality to move selected nodes up or down in the z-order (layering) relative to other nodes. This feature is particularly useful for resolving overlapping node issues.

## Features Implemented

### 1. **Keyboard Controls**
- **PgUp**: Move selected node up in z-order (in front of overlapping nodes)
- **PgDown**: Move selected node down in z-order (behind overlapping nodes)
- **Escape**: Deselect current node

### 2. **Smart Z-Order Management**
- **Overlap Detection**: Automatically detects which nodes are overlapping with the selected node
- **Boundary Checking**: Prevents moving nodes beyond the top or bottom of the z-order
- **Enhanced Feedback**: Shows number of overlapping nodes when moving

### 3. **Visual Feedback System**
- **Success Messages**: Green feedback when nodes are moved successfully
- **Warning Messages**: Yellow feedback when nodes are already at the limit
- **Info Messages**: Blue feedback showing current z-order position and available actions
- **Contextual Help**: Automatically shows z-order info when nodes are selected

### 4. **Automatic Help System**
- **Selection Feedback**: Shows layer position (e.g., "Layer: 3/5") when a node is selected
- **Overlap Count**: Displays number of overlapping nodes (e.g., "2 overlaps")
- **Available Actions**: Shows which keyboard keys are available based on current position

### 5. **Configurable Help & Feedback System** (NEW)
- **Auto-Help Toggle**: Z-order help display on node selection is now configurable
- **Feedback Toggle**: Z-order feedback messages when moving nodes are now configurable
- **Default Settings**: 
  - Auto-help is disabled by default to reduce visual clutter
  - Feedback messages are disabled by default to reduce visual clutter
- **Configuration Methods**: 
  - Help: `setShowZOrderHelpOnSelection()`, `getShowZOrderHelpOnSelection()`, `toggleShowZOrderHelpOnSelection()`
  - Feedback: `setShowZOrderFeedback()`, `getShowZOrderFeedback()`, `toggleShowZOrderFeedback()`
- **Manual Trigger**: Help can still be displayed manually using `showZOrderHelp(node)`
- **Independent Control**: Both systems can be configured independently

## Implementation Details

### Key Methods Added to InteractionManager.js:

#### `moveNodeInZOrder(node, direction)`
- Moves a node up or down in the DOM order within the nodes layer
- Handles boundary conditions (top/bottom of z-order)
- Provides enhanced feedback with overlap information

#### `findOverlappingNodes(targetNode)`
- Detects which nodes are overlapping with a given node
- Returns array of overlapping node objects
- Uses bounding box collision detection

#### `getNodeBounds(node)` & `doNodesOverlap(bounds1, bounds2)`
- Utility methods for geometric overlap detection
- Handles both getBBox() and fallback position calculations

#### `showZOrderFeedback(node, direction, message, type, duration)`
- Enhanced visual feedback system with colored messages
- Supports multiple feedback types (success, warning, error, info)
- Automatically fades out after specified duration

#### `getNodeZOrderInfo(node)` & `showZOrderHelp(node)`
- Provides comprehensive z-order information
- Shows current position, total nodes, overlap count
- Displays contextual help based on current state

#### `setShowZOrderHelpOnSelection(enabled)` (NEW)
- Configures whether z-order help is shown automatically on node selection
- **Parameters**: `enabled` (Boolean) - `true` to enable, `false` to disable
- **Usage**: `interactionManager.setShowZOrderHelpOnSelection(true);`

#### `getShowZOrderHelpOnSelection()` (NEW)
- Returns the current setting for auto-help on selection
- **Returns**: Boolean - `true` if enabled, `false` if disabled
- **Usage**: `const isEnabled = interactionManager.getShowZOrderHelpOnSelection();`

#### `toggleShowZOrderHelpOnSelection()` (NEW)
- Toggles the current setting for auto-help on selection
- **Usage**: `interactionManager.toggleShowZOrderHelpOnSelection();`

### Integration Points:

#### Keyboard Event Handling
```javascript
// Added to handleKeyDown() in InteractionManager.js
if (e.key === 'PageUp' || e.key === 'PageDown') {
  if (this.selectedNode) {
    const direction = e.key === 'PageUp' ? 'up' : 'down';
    this.moveNodeInZOrder(this.selectedNode, direction);
    e.preventDefault(); // Prevent page scrolling
  }
}
```

#### Node Selection Integration
```javascript
// Added to selectNode() in InteractionManager.js
// Show z-order help for the selected node
setTimeout(() => {
  if (this.selectedNode === node) { // Only show if still selected
    this.showZOrderHelp(node);
  }
}, 500); // Small delay to let selection visual settle
```

## User Experience

### Workflow:
1. **Select a node** by clicking on it
2. **View z-order info** automatically displayed above the node
3. **Use PgUp/PgDown** to move the node up or down in the layering
4. **See immediate feedback** with success/warning messages
5. **Understand overlaps** through overlap count display

### Feedback Messages:
- **"Layer: 3/5 (2 overlaps) • PgUp/PgDown to move"** - Shows position and available actions
- **"Moved up (2 overlaps)"** - Confirms successful movement with overlap context
- **"Node already at top of z-order"** - Warns when at boundary
- **"Moved down"** - Simple success message when no overlaps

## Configuration System (v082)

### Z-Order Help Display Configuration

The automatic display of z-order help when nodes are selected is now configurable:

```javascript
// Enable automatic help display
interactionManager.setShowZOrderHelpOnSelection(true);

// Disable automatic help display (default)
interactionManager.setShowZOrderHelpOnSelection(false);

// Toggle the setting
const newValue = interactionManager.toggleShowZOrderHelpOnSelection();
```

### Z-Order Feedback Messages Configuration

The feedback messages shown when moving nodes are now configurable:

```javascript
// Enable feedback messages
interactionManager.setShowZOrderFeedback(true);

// Disable feedback messages (default)
interactionManager.setShowZOrderFeedback(false);

// Toggle the setting
const newValue = interactionManager.toggleShowZOrderFeedback();
```

**Default Behavior**: 
- Auto-help is disabled by default to reduce visual clutter
- Feedback messages are disabled by default to reduce visual clutter

**Related Documentation**: See `Z_ORDER_HELP_CONFIGURATION.md` for detailed configuration options.

## Files Modified

1. **`js/InteractionManager.js`**
   - Added keyboard event handling for PgUp/PgDown
   - Added z-order management methods
   - Added overlap detection system
   - Added enhanced feedback system
   - Updated version to v081

2. **`js/renderer.js`**
   - Updated InteractionManager import to v081

## Test File

**`test-node-z-order.html`** - Comprehensive test page featuring:
- Interactive node creation and manipulation
- Visual z-order demonstration
- Keyboard controls testing
- Overlap detection validation
- Feedback system verification

## Benefits

- **Resolves Overlapping Issues**: Easy way to bring nodes to front or send to back
- **Intuitive Controls**: Standard PgUp/PgDown keys that users expect
- **Visual Feedback**: Clear indication of current state and available actions
- **Smart Detection**: Automatically identifies overlapping nodes
- **Non-Destructive**: Only changes display order, not node data
- **Contextual Help**: Shows relevant information based on current selection

## Future Enhancements

- **Ctrl+PgUp/PgDown**: Move to very top/bottom of z-order
- **Layer Groups**: Organize nodes into logical z-order groups
- **Undo/Redo**: Support for z-order change history
- **Keyboard Shortcuts**: Additional shortcuts for z-order operations

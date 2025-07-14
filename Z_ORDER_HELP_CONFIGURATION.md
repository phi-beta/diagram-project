# Z-Order Help Configuration

## Overview

This document describes the configuration system for the z-order help display feature in the diagram editor. The automatic display of z-order/layer information when nodes are selected is now configurable.

## Changes Made

### 1. Configuration System Added

Added a settings object to the `InteractionManager` class:
```javascript
this.settings = {
  showZOrderHelpOnSelection: false  // Make z-order help configurable
};
```

### 2. Conditional Help Display

Modified the node selection logic in `selectNode()` to check the configuration:
```javascript
// Show z-order help for the selected node (if enabled)
if (this.settings.showZOrderHelpOnSelection) {
  setTimeout(() => {
    if (this.selectedNode === node) { // Only show if still selected
      this.showZOrderHelp(node);
    }
  }, 500); // Small delay to let selection visual settle
}
```

### 3. Configuration Methods

Added three new methods to the `InteractionManager` class:

#### `setShowZOrderHelpOnSelection(enabled)`
- **Purpose**: Enable or disable automatic z-order help display
- **Parameters**: `enabled` (boolean) - Whether to show help on selection
- **Usage**: `interactionManager.setShowZOrderHelpOnSelection(true);`

#### `getShowZOrderHelpOnSelection()`
- **Purpose**: Get current configuration setting
- **Returns**: boolean - Current setting value
- **Usage**: `const isEnabled = interactionManager.getShowZOrderHelpOnSelection();`

#### `toggleShowZOrderHelpOnSelection()`
- **Purpose**: Toggle the setting and return new value
- **Returns**: boolean - New setting value
- **Usage**: `const newValue = interactionManager.toggleShowZOrderHelpOnSelection();`

## Default Behavior

**By default, automatic z-order help is DISABLED** (`showZOrderHelpOnSelection: false`).

This means:
- When a node is selected, z-order help will NOT be shown automatically
- Users can still manually trigger z-order help using keyboard shortcuts (PgUp/PgDown/Home/End)
- The z-order help can be shown manually by calling `showZOrderHelp(node)` directly

## Usage Examples

### Basic Configuration
```javascript
// Enable automatic help display
interactionManager.setShowZOrderHelpOnSelection(true);

// Disable automatic help display  
interactionManager.setShowZOrderHelpOnSelection(false);

// Toggle the setting
const newValue = interactionManager.toggleShowZOrderHelpOnSelection();
console.log(`Auto-help is now ${newValue ? 'enabled' : 'disabled'}`);
```

### Manual Help Display
```javascript
// Show help for currently selected node (regardless of auto-help setting)
if (interactionManager.selectedNode) {
  interactionManager.showZOrderHelp(interactionManager.selectedNode);
}
```

### Checking Current Setting
```javascript
const autoHelpEnabled = interactionManager.getShowZOrderHelpOnSelection();
console.log(`Auto-help is ${autoHelpEnabled ? 'enabled' : 'disabled'}`);
```

## Test Implementation

The test file (`test-node-z-order.html`) includes new controls:

- **Toggle Auto-Help**: Toggles the automatic help display setting
- **Enable Auto-Help**: Explicitly enables automatic help display
- **Disable Auto-Help**: Explicitly disables automatic help display  
- **Show Help (Manual)**: Manually displays help for the selected node

## Benefits

1. **Reduced Visual Clutter**: Help information is not shown by default
2. **User Control**: Users can enable/disable the feature as needed
3. **Backward Compatibility**: Existing functionality remains unchanged
4. **Flexibility**: Help can still be triggered manually when needed

## Migration Notes

For existing code that expects automatic z-order help display:
- Call `interactionManager.setShowZOrderHelpOnSelection(true)` during initialization
- Or use the manual trigger approach when needed

## Files Modified

- `js/InteractionManager.js`: Added configuration system and methods
- `test-node-z-order.html`: Added configuration controls and test functions
- `Z_ORDER_HELP_CONFIGURATION.md`: This documentation file

## Related Features

- Z-Order Management (PgUp/PgDown/Home/End keyboard shortcuts)
- Node Selection System
- Visual Feedback System
- Help Display System

The z-order help is still available through keyboard shortcuts regardless of the auto-display setting.

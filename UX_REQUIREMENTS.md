# User Experience Requirements - Diagram Editor ⚡

## Overview
This document captures the comprehensive user experience requirements for the diagram editor's node, edge, and interaction systems. It serves as a reference to ensure no intended functionality is broken during development and refactoring.

---

## 🎯 **NODE INTERACTION REQUIREMENTS**

### **Selection Behavior**
- **Single Click** → Select node (visual highlight, border changes)
- **Click Selected Node** → Deselect node (toggle behavior)
- **Click Different Node** → Deselect previous, select new node
- **Click Background** → Deselect all nodes
- **Node Selection Visual**: `.selected` class, border highlight, possible scale effect

### **Drag & Drop Behavior**
- **Click + Drag Unselected Node** → Auto-select then drag immediately
- **Click + Drag Selected Node** → Drag without re-selection
- **Drag Threshold**: ~5 pixels movement before drag starts
- **Drag Visual Feedback**: `.dragging` class, cursor changes to `grabbing`
- **Multi-node Selection**: Not currently implemented (single selection only)
- **Drag Completion** → Node remains selected

### **Scaling Behavior**
- **Shift + Drag Selected Node** → Scale node from center
- **Shift + Drag Unselected Node** → Select first, then scale
- **Scaling Visual**: `.scaling` class, cursor changes
- **Scale Calculation**: Based on distance from node center
- **Scale Completion** → Node remains selected

### **State Management**
- **States**: `idle`, `selected`, `dragging`, `scaling`, `edgeSource`, `edgeTarget`, `cooldown`
- **State Persistence**: Nodes remember state between interactions
- **State Transitions**: Validated through state machine configuration
- **Debug Information**: Available via `getDebugInfo()` method

---

## 🔗 **EDGE CREATION REQUIREMENTS**

### **Edge Creation Workflow**
1. **Select Source Node** → Click node to select
2. **Initiate Edge Creation** → Hold Shift + move mouse away from node OR Hold Shift + click different node
3. **Temporary Edge Display** → Dashed line follows mouse cursor
4. **Target Selection** → Click destination node to complete edge
5. **Edge Completion** → Permanent edge created, source node remains selected

### **Edge Creation Modes**
- **Shift + Mouse Movement**: Start edge creation when mouse moves away from selected node
- **Shift + Node Click**: Direct edge creation to clicked node
- **Visual Feedback**: Temporary dashed edge (`stroke-dasharray: '5,5'`)
- **Cursor Changes**: `crosshair` during edge creation mode
- **Edge Highlighting**: Target nodes show `.edge-target-highlight` class

### **Edge Creation Cancellation**
- **Escape Key** → Cancel edge creation
- **Click Background** → Cancel edge creation  
- **Drag Any Node** → Cancel edge creation (except source node)
- **Mouse Over Source Node** → Cancel edge creation
- **Multiple Cancellation Methods**: Ensure robust cancellation

### **Edge Creation States**
- **Source Node State**: `edgeSource` during creation
- **Target Node State**: `edgeTarget` when hovering/targeting
- **Cooldown State**: Brief cooldown after edge completion
- **State Coordination**: Between InteractionManager and NodeStateManager

---

## ⌨️ **KEYBOARD INTERACTION REQUIREMENTS**

### **Primary Shortcuts**
- **Shift Key**: Edge creation trigger + scaling modifier
- **Escape Key**: Cancel edge creation, reset states
- **Ctrl+D**: Duplicate selected node
- **Key Repeat Prevention**: Prevent multiple triggers of same key

### **Shift Key Behavior**
- **Shift + Node Selected + Mouse Move Away** → Start edge creation
- **Shift + Drag** → Scale mode (instead of move)
- **Shift Release During Interaction** → Mode can switch (scale ↔ move)
- **Edge Creation Priority**: Takes precedence over scaling

### **Modifier Key Coordination**
- **Shift State Tracking**: Global state in InteractionManager
- **Ctrl State Tracking**: For duplication and other features
- **Key Event Handling**: Proper keydown/keyup event management
- **Interaction Mode Switching**: Dynamic based on modifier keys

---

## 🖱️ **MOUSE INTERACTION REQUIREMENTS**

### **Click Detection**
- **Click Threshold**: < 200ms time + < 5px movement
- **Click vs Drag**: Distinguish based on time and distance
- **Double Click**: Currently not implemented
- **Click Timing**: Precise timing for interaction detection

### **Cursor Behavior**
- **Default**: `pointer` when hovering over nodes
- **Dragging**: `grabbing` during drag operations
- **Edge Creation**: `crosshair` during edge creation mode
- **Scaling**: Appropriate cursor during scale operations
- **Background**: Default cursor when not over interactive elements

### **Mouse Event Coordination**
- **Event Propagation**: Proper `stopPropagation()` usage
- **Event Cleanup**: Remove event listeners appropriately
- **Mouse Position Tracking**: Accurate coordinate system conversion
- **ViewBox Coordinates**: Screen-to-ViewBox coordinate transformation

---

## 🎨 **VISUAL FEEDBACK REQUIREMENTS**

### **Selection Visual States**
- **Selected Node**: `.selected` class → border highlight, possible scale
- **Unselected Node**: Remove all selection classes
- **Selection Consistency**: Visual state matches logical state

### **Interaction Visual States**
- **Dragging**: `.dragging` class → visual feedback during drag
- **Scaling**: `.scaling` class → visual feedback during scale  
- **Edge Target**: `.edge-target-highlight` class → highlight potential targets
- **Edge Source**: Visual indication of source node during creation

### **Edge Visual States**
- **Permanent Edges**: Solid lines with arrow markers
- **Temporary Edges**: Dashed lines (`stroke-dasharray: '5,5'`)
- **Edge Colors**: Consistent color scheme
- **Edge Positioning**: From node edge (not center) to target

### **Cursor Feedback**
- **Hover**: `pointer` cursor on nodes
- **Drag**: `grabbing` cursor during drag
- **Edge Creation**: `crosshair` cursor
- **Background**: Default system cursor

---

## 🔄 **STATE SYNCHRONIZATION REQUIREMENTS**

### **Component Coordination**
- **InteractionManager**: Global interaction state
- **NodeStateManager**: Per-node state management
- **DragManager**: Drag-specific state tracking
- **ViewBoxManager**: Coordinate system management
- **State Consistency**: All components reflect same logical state

### **Event Flow**
1. **User Input** → DOM events (mouse, keyboard)
2. **Event Mapping** → Technical events → Logical actions
3. **State Transition** → State machine validates and transitions
4. **Action Execution** → Visual updates and side effects
5. **State Propagation** → All components updated

### **Legacy Compatibility**
- **Fallback Behavior**: Legacy interaction when state machine unavailable
- **Gradual Migration**: New and old systems coexist
- **Debug Information**: Comprehensive logging for troubleshooting
- **Error Handling**: Graceful degradation on errors

---

## 🧪 **TESTING & VALIDATION REQUIREMENTS**

### **Core Interaction Tests**
- **Click Selection**: Single click selects/deselects nodes
- **Drag Behavior**: Drag selected and unselected nodes
- **Scale Behavior**: Shift+drag scaling functionality
- **Edge Creation**: Complete workflow from selection to completion
- **Edge Cancellation**: All cancellation methods work

### **Edge Cases**
- **Rapid Clicking**: Handle rapid mouse events
- **Simultaneous Inputs**: Keyboard + mouse combinations
- **State Machine Errors**: Fallback to legacy behavior
- **Coordinate System**: Accurate transformations at all zoom levels
- **Event Cleanup**: No memory leaks from event listeners

### **Performance Requirements**
- **Smooth Interactions**: 60fps during drag/scale operations
- **Responsive Feel**: < 100ms response to user input
- **Memory Management**: Proper cleanup of event listeners and state
- **Scaling**: Performance maintained with many nodes/edges

---

## 🚦 **ERROR HANDLING & RECOVERY**

### **State Machine Failures**
- **Validation Errors**: Graceful fallback to legacy behavior
- **Configuration Issues**: Load defaults if config unavailable
- **Invalid Transitions**: Log errors but continue operation
- **State Corruption**: Recovery mechanisms in place

### **Interaction Conflicts**
- **Multiple Inputs**: Handle conflicting user inputs gracefully
- **Race Conditions**: Prevent state inconsistencies
- **Event Ordering**: Ensure proper event sequence handling
- **Cleanup on Errors**: Reset state on unexpected errors

### **Debug & Monitoring**
- **Comprehensive Logging**: All state transitions and user actions
- **Debug Information**: Accessible via developer tools
- **State Inspection**: Real-time state viewing capabilities
- **Performance Monitoring**: Track interaction timing and performance

---

## 📋 **COMPATIBILITY & INTEGRATION**

### **Browser Support**
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mouse Events**: Standard mouse event handling
- **Keyboard Events**: Cross-browser keyboard event support
- **SVG Support**: Proper SVG interaction and rendering

### **Framework Integration**
- **Modular Design**: Components can be used independently
- **Event System**: Clean event interfaces between components
- **Configuration**: JSON-driven configuration system
- **Extensibility**: Easy to add new interaction types

### **Future Enhancements**
- **Multi-selection**: Foundation for future multi-node selection
- **Touch Support**: Extensible to touch/mobile interfaces
- **Accessibility**: Keyboard navigation and screen reader support
- **Custom Interactions**: Framework for domain-specific interactions

---

## 🏗️ **DIAGRAM-LEVEL STATE COORDINATION**

### **DiagramStateManager Overview**
- **Purpose**: Coordinates global/diagram-wide interactions that involve multiple nodes
- **Primary Use Cases**: Edge creation, multi-selection (future), global modes
- **Integration**: Works alongside NodeStateManager for comprehensive state management
- **Fallback**: Graceful degradation to legacy behavior if state machine unavailable

### **Diagram States**
- **idle**: Default state - no diagram-wide interaction active
- **edgeCreation**: Edge creation mode - temporary edge follows cursor, target highlighting enabled
- **multiSelection**: Multi-selection mode (future implementation)

### **Edge Creation Coordination**
- **Simplified Logic**: Single source of truth for edge creation state
- **Centralized Cursor Management**: Diagram-level cursor changes (crosshair mode)
- **Automatic Cleanup**: Temporary elements managed centrally
- **Multi-Component Sync**: Coordinates InteractionManager, NodeStateManager, DragManager

### **Benefits of Diagram-Level State Management**
- **Reduced Complexity**: Edge creation logic no longer distributed across multiple components
- **Better Coordination**: Single state machine handles multi-node interactions
- **Cleaner Cancellation**: Centralized cancellation logic with multiple trigger methods
- **Visual Consistency**: Diagram-wide visual feedback (cursor, highlighting) managed centrally
- **Future Extensibility**: Framework for additional diagram-wide interactions

### **State Coordination Flow**
1. **User Action** → Triggers diagram-level event (e.g., Shift+mouse move)
2. **Diagram State Machine** → Validates and transitions to appropriate state
3. **Visual Actions** → Centralized cursor changes, temporary element creation
4. **Component Coordination** → Updates InteractionManager and NodeStateManager states
5. **Event Propagation** → Node-level state machines handle local state changes

---

## ✅ **VALIDATION CHECKLIST**

Before any changes to interaction systems, verify:

- [ ] **Selection works**: Click to select/deselect nodes
- [ ] **Drag works**: Immediate drag on selected and unselected nodes  
- [ ] **Scale works**: Shift+drag for scaling operations
- [ ] **Edge creation works**: Shift+move or Shift+click edge creation
- [ ] **Edge cancellation works**: Escape, background click, node drag
- [ ] **Visual feedback works**: Proper CSS classes and cursor changes
- [ ] **State consistency**: All components show same logical state
- [ ] **Diagram state coordination**: DiagramStateManager properly coordinates multi-node interactions
- [ ] **Edge creation state**: Diagram state machine handles edge creation mode correctly
- [ ] **Cursor management**: Diagram-level cursor changes work (crosshair during edge creation)
- [ ] **Temporary elements**: Temporary edges and highlighting managed properly
- [ ] **Keyboard shortcuts work**: Shift, Escape, Ctrl+D functionality
- [ ] **Performance acceptable**: Smooth 60fps interactions
- [ ] **Error handling works**: Graceful degradation on failures
- [ ] **Debug information available**: State inspection and logging
- [ ] **Event cleanup works**: No memory leaks or hanging listeners
- [ ] **Fallback behavior**: Legacy interaction when state machine unavailable

This document serves as the definitive reference for maintaining the intended user experience during all development activities.

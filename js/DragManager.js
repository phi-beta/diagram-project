// Version 052 - Fixed drag jumping issue by pre-calculating click offset
/**
 * Manages drag operations and coordinate transformations for nodes
 * Handles the complex interactions between dragging and viewBox changes
 */
export class DragManager {
  constructor(viewBoxManager) {
    this.viewBoxManager = viewBoxManager;
    this.draggingNodes = new Map(); // nodeId -> drag state
    
    // Add unique ID for debugging
    this.id = `DragManager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 DragManager constructor called - ID: ${this.id}`);
    
    // Listen for viewBox changes to update drag coordinates
    this.viewBoxManager.onViewBoxChange((oldViewBox, newViewBox) => {
      console.log(`🔄 ViewBox change detected in ${this.id}`);
      this.handleViewBoxChange(oldViewBox, newViewBox);
    });
  }
  
  /**
   * Start a drag operation for a node
   * @param {Object} node - The node being dragged
   * @param {number} mouseX - Already transformed viewBox X coordinate
   * @param {number} mouseY - Already transformed viewBox Y coordinate
   * @param {Event} mouseEvent - The original mouse event (for getting raw coordinates)
   */
  startDrag(node, mouseX, mouseY, mouseEvent = null) {
    console.log(`🚀 DragManager ${this.id} startDrag called for ${node.id}, current size: ${this.draggingNodes.size}`);
    
    // If we have the raw mouse event, use it for more accurate tracking
    if (mouseEvent) {
      // Store the raw screen coordinates for precise tracking
      const dragState = {
        node: node,
        startMousePos: { x: mouseX, y: mouseY },
        startNodePos: { x: node.x, y: node.y },
        currentMousePos: { x: mouseX, y: mouseY },
        // Store raw screen coordinates
        startScreenX: mouseEvent.clientX,
        startScreenY: mouseEvent.clientY,
        // Calculate the offset from the initial click position to the node position
        initialNodeX: node.x,
        initialNodeY: node.y,
        // Pre-calculate the click offset to prevent jumping
        clickOffsetX: node.x - mouseX,
        clickOffsetY: node.y - mouseY
      };
      
      console.log(`📍 Screen coordinate tracking enabled for ${node.id} - Screen: (${mouseEvent.clientX}, ${mouseEvent.clientY}), Node: (${node.x}, ${node.y}), Offset: (${dragState.clickOffsetX}, ${dragState.clickOffsetY})`);
      
      this.draggingNodes.set(node.id, dragState);
    } else {
      // Fallback to the viewBox coordinate approach
      const offsetX = node.x - mouseX;
      const offsetY = node.y - mouseY;
      
      const dragState = {
        node: node,
        startMousePos: { x: mouseX, y: mouseY },
        startNodePos: { x: node.x, y: node.y },
        currentMousePos: { x: mouseX, y: mouseY },
        clickOffsetX: offsetX,
        clickOffsetY: offsetY
      };
      
      console.log(`📍 Offset tracking enabled for ${node.id} - Offset: (${offsetX}, ${offsetY})`);
      
      this.draggingNodes.set(node.id, dragState);
    }
    
    node.isDragging = true;
    console.log(`🚀 DragManager.startDrag completed for ${node.id}, new size: ${this.draggingNodes.size}`);
  }
  
  /**
   * Update a drag operation for a node
   * @param {Object} node - The node being dragged
   * @param {number} mouseX - Already transformed viewBox X coordinate
   * @param {number} mouseY - Already transformed viewBox Y coordinate
   * @param {Event} mouseEvent - The original mouse event (for getting raw coordinates)
   */
  updateDrag(node, mouseX, mouseY, mouseEvent = null) {
    const dragState = this.draggingNodes.get(node.id);
    if (!dragState) return;
    
    // Update current mouse position
    dragState.currentMousePos.x = mouseX;
    dragState.currentMousePos.y = mouseY;
    
    // Debug: Check if we have mouse event and screen coordinates
    const hasMouseEvent = mouseEvent !== null;
    const hasScreenCoords = dragState.startScreenX !== undefined;
    
    if (Math.random() < 0.05) { // 5% of the time
      console.log(`🐛 updateDrag ${node.id}: hasMouseEvent=${hasMouseEvent}, hasScreenCoords=${hasScreenCoords}`);
    }
    
    // If we have raw screen coordinates, use them for more accurate positioning
    if (mouseEvent && dragState.startScreenX !== undefined) {
      // Get the current mouse position in viewBox coordinates
      const currentMouseViewBox = this.viewBoxManager.coordinateSystem.screenToViewBox(mouseEvent.clientX, mouseEvent.clientY);
      
      // Use the pre-calculated click offset to maintain relative position
      node.x = currentMouseViewBox.x + dragState.clickOffsetX;
      node.y = currentMouseViewBox.y + dragState.clickOffsetY;
      
      // Enhanced debug logging
      if (Math.random() < 0.05) {
        console.log(`🐛 Pre-calculated Offset Position for ${node.id}:`);
        console.log(`  Screen: (${mouseEvent.clientX}, ${mouseEvent.clientY})`);
        console.log(`  ViewBox Mouse: (${currentMouseViewBox.x.toFixed(1)}, ${currentMouseViewBox.y.toFixed(1)})`);
        console.log(`  Click Offset: (${dragState.clickOffsetX.toFixed(1)}, ${dragState.clickOffsetY.toFixed(1)})`);
        console.log(`  Final Node: (${node.x.toFixed(1)}, ${node.y.toFixed(1)})`);
      }
    } else {
      // Fallback to offset-based approach
      if (dragState.clickOffsetX !== undefined) {
        node.x = mouseX + dragState.clickOffsetX;
        node.y = mouseY + dragState.clickOffsetY;
        
        // Debug logging
        if (Math.random() < 0.02) {
          console.log(`🐛 Offset-based Drag for ${node.id}:`);
          console.log(`  Mouse: (${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`);
          console.log(`  Offset: (${dragState.clickOffsetX.toFixed(1)}, ${dragState.clickOffsetY.toFixed(1)})`);
          console.log(`  Node: (${node.x.toFixed(1)}, ${node.y.toFixed(1)})`);
        }
      } else {
        // If we don't have either screen coordinates or offset, this is a problem
        console.warn(`⚠️ updateDrag ${node.id}: No screen coordinates or offset available! hasMouseEvent=${hasMouseEvent}, hasScreenCoords=${hasScreenCoords}`);
      }
    }
  }
  
  /**
   * Stop a drag operation for a node
   */
  stopDrag(node) {
    console.log(`🛑 DragManager.stopDrag called for ${node.id}, current size: ${this.draggingNodes.size}`);
    this.draggingNodes.delete(node.id);
    node.isDragging = false;
    console.log(`🛑 DragManager.stopDrag completed for ${node.id}, new size: ${this.draggingNodes.size}`);
  }
  
  /**
   * Check if any nodes are currently being dragged
   */
  isAnyNodeDragging() {
    const result = this.draggingNodes.size > 0;
    // Reduce logging spam - only log occasionally
    if (Math.random() < 0.01) { // 1% of the time
      const nodeIds = Array.from(this.draggingNodes.keys());
      console.log(`🔍 DragManager.isAnyNodeDragging: ${result} (size: ${this.draggingNodes.size}, nodes: [${nodeIds.join(', ')}])`);
    }
    return result;
  }
  
  /**
   * Get list of currently dragging node IDs
   */
  getDraggingNodeIds() {
    return Array.from(this.draggingNodes.keys());
  }

  /**
   * Handle viewBox changes by transforming drag coordinates
   */
  handleViewBoxChange(oldViewBox, newViewBox) {
    console.log(`🔄 ${this.id} handleViewBoxChange: ${this.draggingNodes.size} nodes dragging`);
    
    this.draggingNodes.forEach((dragState, nodeId) => {
      console.log(`🔄 Processing node ${nodeId}: startScreenX=${dragState.startScreenX}, clickOffsetX=${dragState.clickOffsetX}`);
      
      // If we're using screen coordinate tracking, no need to transform
      if (dragState.startScreenX !== undefined) {
        // Screen coordinates are zoom-independent, so we don't need to transform them
        // The next updateDrag call will handle the coordinate transformation correctly
        console.log(`🔄 ViewBox change for screen-tracked node ${nodeId}: no transformation needed`);
        return;
      }
      
      // For nodes using viewBox coordinate tracking, transform the coordinates
      if (dragState.clickOffsetX !== undefined) {
        console.log(`🔄 ViewBox change for offset-tracked node ${nodeId}: transforming coordinates`);
        
        // Transform current mouse position to new coordinate system
        const newCurrentMousePos = this.viewBoxManager.transformCoordinates(
          dragState.currentMousePos.x,
          dragState.currentMousePos.y,
          oldViewBox
        );
        
        // Update drag state with transformed coordinates
        dragState.currentMousePos = newCurrentMousePos;
        
        // Reposition the node using the offset-based approach
        dragState.node.x = newCurrentMousePos.x + dragState.clickOffsetX;
        dragState.node.y = newCurrentMousePos.y + dragState.clickOffsetY;
        
        // Update the node's visual representation
        dragState.node.updateTransform();
        
        console.log(`🔄 ViewBox change for offset-tracked node ${nodeId}: transformed coordinates`);
      } else {
        console.warn(`⚠️ Node ${nodeId} has neither screen coordinates nor offset! This should not happen.`);
      }
    });
  }
  
  /**
   * Get drag state for a specific node
   */
  getDragState(node) {
    return this.draggingNodes.get(node.id);
  }
  
  /**
   * Clear all drag states - useful for resetting before edge creation
   */
  clearAllDragStates() {
    const nodeIds = Array.from(this.draggingNodes.keys());
    console.log(`🧹 DragManager.clearAllDragStates: clearing ${nodeIds.length} dragging nodes: [${nodeIds.join(', ')}]`);
    
    // Clear each node's drag state
    for (const [nodeId, dragState] of this.draggingNodes) {
      if (dragState.node) {
        dragState.node.isDragging = false;
      }
    }
    
    // Clear the map
    this.draggingNodes.clear();
    console.log(`🧹 DragManager.clearAllDragStates: completed, new size: ${this.draggingNodes.size}`);
  }
}

/**
 * Manages drag operations and coordinate transformations for nodes
 * Handles the complex interactions between dragging and viewBox changes
 */
export class DragManager {
  constructor(viewBoxManager) {
    this.viewBoxManager = viewBoxManager;
    this.draggingNodes = new Map(); // nodeId -> drag state
    
    // Listen for viewBox changes to update drag coordinates
    this.viewBoxManager.onViewBoxChange((oldViewBox, newViewBox) => {
      this.handleViewBoxChange(oldViewBox, newViewBox);
    });
  }
  
  /**
   * Start a drag operation for a node
   */
  startDrag(node, mouseX, mouseY) {
    const dragState = {
      node: node,
      startMousePos: { x: mouseX, y: mouseY },
      startNodePos: { x: node.x, y: node.y },
      currentMousePos: { x: mouseX, y: mouseY }
    };
    
    this.draggingNodes.set(node.id, dragState);
    node.isDragging = true;
  }
  
  /**
   * Update a drag operation for a node
   */
  updateDrag(node, mouseX, mouseY) {
    const dragState = this.draggingNodes.get(node.id);
    if (!dragState) return;
    
    // Update current mouse position
    dragState.currentMousePos.x = mouseX;
    dragState.currentMousePos.y = mouseY;
    
    // Calculate new position using delta from drag start
    const deltaX = mouseX - dragState.startMousePos.x;
    const deltaY = mouseY - dragState.startMousePos.y;
    
    node.x = dragState.startNodePos.x + deltaX;
    node.y = dragState.startNodePos.y + deltaY;
  }
  
  /**
   * Stop a drag operation for a node
   */
  stopDrag(node) {
    this.draggingNodes.delete(node.id);
    node.isDragging = false;
  }
  
  /**
   * Check if any nodes are currently being dragged
   */
  isAnyNodeDragging() {
    return this.draggingNodes.size > 0;
  }
  
  /**
   * Handle viewBox changes by transforming drag coordinates
   */
  handleViewBoxChange(oldViewBox, newViewBox) {
    this.draggingNodes.forEach((dragState, nodeId) => {
      // Transform start mouse position to new coordinate system
      const newStartMousePos = this.viewBoxManager.transformCoordinates(
        dragState.startMousePos.x,
        dragState.startMousePos.y,
        oldViewBox
      );
      
      // Transform current mouse position to new coordinate system
      const newCurrentMousePos = this.viewBoxManager.transformCoordinates(
        dragState.currentMousePos.x,
        dragState.currentMousePos.y,
        oldViewBox
      );
      
      // Update drag state with transformed coordinates
      dragState.startMousePos = newStartMousePos;
      dragState.currentMousePos = newCurrentMousePos;
      
      // Recalculate node position based on new coordinates
      const deltaX = newCurrentMousePos.x - newStartMousePos.x;
      const deltaY = newCurrentMousePos.y - newStartMousePos.y;
      
      dragState.node.x = dragState.startNodePos.x + deltaX;
      dragState.node.y = dragState.startNodePos.y + deltaY;
      
      // Update the node's visual representation
      dragState.node.updateTransform();
    });
  }
  
  /**
   * Get drag state for a specific node
   */
  getDragState(node) {
    return this.draggingNodes.get(node.id);
  }
}

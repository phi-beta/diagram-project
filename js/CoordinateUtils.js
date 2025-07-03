/**
 * Utility class that provides high-level coordinate operations
 * using the CoordinateSystem abstraction
 */
export class CoordinateUtils {
  constructor(coordinateSystem) {
    this.coordinateSystem = coordinateSystem;
  }
  
  /**
   * Get the distance between two nodes in global coordinates
   */
  getNodeDistance(node1, node2) {
    const center1 = this.coordinateSystem.getNodeCenter(node1.element, 'global');
    const center2 = this.coordinateSystem.getNodeCenter(node2.element, 'global');
    return this.coordinateSystem.getDistance(center1.x, center1.y, center2.x, center2.y);
  }
  
  /**
   * Check if two nodes are overlapping
   */
  areNodesOverlapping(node1, node2) {
    const center1 = this.coordinateSystem.getNodeCenter(node1.element, 'global');
    const center2 = this.coordinateSystem.getNodeCenter(node2.element, 'global');
    const distance = this.coordinateSystem.getDistance(center1.x, center1.y, center2.x, center2.y);
    return distance < (center1.radius + center2.radius);
  }
  
  /**
   * Find the closest node to a given point
   */
  findClosestNode(x, y, coordinateSpace, nodes, element = null) {
    let closestNode = null;
    let minDistance = Infinity;
    
    // Convert point to global coordinates if needed
    let globalPoint;
    if (coordinateSpace === 'global') {
      globalPoint = { x, y };
    } else {
      globalPoint = this.coordinateSystem.convertPoint({ x, y }, coordinateSpace, 'global', element);
    }
    
    for (const node of nodes) {
      const nodeCenter = this.coordinateSystem.getNodeCenter(node.element, 'global');
      const distance = this.coordinateSystem.getDistance(globalPoint.x, globalPoint.y, nodeCenter.x, nodeCenter.y);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }
    
    return { node: closestNode, distance: minDistance };
  }
  
  /**
   * Find all nodes within a given radius of a point
   */
  findNodesInRadius(x, y, radius, coordinateSpace, nodes, element = null) {
    const nodesInRadius = [];
    
    // Convert point to global coordinates if needed
    let globalPoint;
    if (coordinateSpace === 'global') {
      globalPoint = { x, y };
    } else {
      globalPoint = this.coordinateSystem.convertPoint({ x, y }, coordinateSpace, 'global', element);
    }
    
    for (const node of nodes) {
      const nodeCenter = this.coordinateSystem.getNodeCenter(node.element, 'global');
      const distance = this.coordinateSystem.getDistance(globalPoint.x, globalPoint.y, nodeCenter.x, nodeCenter.y);
      
      if (distance <= radius) {
        nodesInRadius.push({ node, distance });
      }
    }
    
    // Sort by distance
    return nodesInRadius.sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * Get the bounding box that contains all nodes
   */
  getNodesBoundingBox(nodes) {
    if (nodes.length === 0) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const node of nodes) {
      const center = this.coordinateSystem.getNodeCenter(node.element, 'global');
      
      minX = Math.min(minX, center.x - center.radius);
      minY = Math.min(minY, center.y - center.radius);
      maxX = Math.max(maxX, center.x + center.radius);
      maxY = Math.max(maxY, center.y + center.radius);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }
  
  /**
   * Check if a point is inside a rectangular area
   */
  isPointInRectangle(x, y, rect, coordinateSpace = 'global', element = null) {
    // Convert point to global coordinates if needed
    let globalPoint;
    if (coordinateSpace === 'global') {
      globalPoint = { x, y };
    } else {
      globalPoint = this.coordinateSystem.convertPoint({ x, y }, coordinateSpace, 'global', element);
    }
    
    return globalPoint.x >= rect.x && 
           globalPoint.x <= rect.x + rect.width &&
           globalPoint.y >= rect.y && 
           globalPoint.y <= rect.y + rect.height;
  }
  
  /**
   * Get the optimal edge connection points between two nodes
   */
  getEdgeConnectionPoints(fromNode, toNode) {
    const fromCenter = this.coordinateSystem.getNodeCenter(fromNode.element, 'global');
    const toCenter = this.coordinateSystem.getNodeCenter(toNode.element, 'global');
    
    // Calculate direction vector
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const distance = Math.hypot(dx, dy) || 1; // Avoid division by zero
    
    // Calculate connection points at the edge of each node
    const fromPoint = {
      x: fromCenter.x + (dx / distance) * fromCenter.radius,
      y: fromCenter.y + (dy / distance) * fromCenter.radius
    };
    
    const toPoint = {
      x: toCenter.x - (dx / distance) * toCenter.radius,
      y: toCenter.y - (dy / distance) * toCenter.radius
    };
    
    return { from: fromPoint, to: toPoint };
  }
  
  /**
   * Calculate the angle between two nodes
   */
  getAngleBetweenNodes(fromNode, toNode) {
    const fromCenter = this.coordinateSystem.getNodeCenter(fromNode.element, 'global');
    const toCenter = this.coordinateSystem.getNodeCenter(toNode.element, 'global');
    
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    
    return Math.atan2(dy, dx);
  }
  
  /**
   * Convert a mouse event to any coordinate space
   */
  mouseEventToCoordinates(event, targetSpace, element = null) {
    return this.coordinateSystem.convertPoint(
      { x: event.clientX, y: event.clientY },
      'screen',
      targetSpace,
      element
    );
  }
  
  /**
   * Create a selection rectangle in global coordinates
   */
  createSelectionRectangle(startEvent, endEvent) {
    const startGlobal = this.coordinateSystem.screenToGlobal(startEvent.clientX, startEvent.clientY);
    const endGlobal = this.coordinateSystem.screenToGlobal(endEvent.clientX, endEvent.clientY);
    
    const minX = Math.min(startGlobal.x, endGlobal.x);
    const minY = Math.min(startGlobal.y, endGlobal.y);
    const maxX = Math.max(startGlobal.x, endGlobal.x);
    const maxY = Math.max(startGlobal.y, endGlobal.y);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}

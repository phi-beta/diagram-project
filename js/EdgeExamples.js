/**
 * Example usage of the new EdgeData and EdgeRenderer classes
 * This file demonstrates how to use the separated edge architecture
 */

import { EdgeData, EdgeRenderer } from './Edge.js';

// Example 1: Basic edge creation with new pattern
function createEdgeWithNewPattern(svg, fromNodeId, toNodeId) {
  // Create the data model
  const edgeData = new EdgeData({
    from: fromNodeId,
    to: toNodeId,
    class: 'connection'
  });
  
  // Create the renderer
  const renderer = EdgeRenderer.createEdgeRenderer(edgeData, svg);
  
  return { edgeData, renderer };
}

// Example 2: Managing multiple edges with separation of concerns
class EdgeManager {
  constructor(svg) {
    this.svg = svg;
    this.edgeDataMap = new Map(); // id -> EdgeData
    this.edgeRenderers = new Map(); // id -> EdgeRenderer
  }
  
  createEdge(fromNodeId, toNodeId, edgeClass = 'connection') {
    const edgeData = new EdgeData({
      from: fromNodeId,
      to: toNodeId,
      class: edgeClass
    });
    
    const renderer = EdgeRenderer.createEdgeRenderer(edgeData, this.svg);
    
    this.edgeDataMap.set(edgeData.id, edgeData);
    this.edgeRenderers.set(edgeData.id, renderer);
    
    return edgeData.id;
  }
  
  updateEdgePath(edgeId, fromNode, toNode) {
    const renderer = this.edgeRenderers.get(edgeId);
    if (renderer) {
      renderer.updatePath(fromNode, toNode);
    }
  }
  
  selectEdge(edgeId) {
    const edgeData = this.edgeDataMap.get(edgeId);
    const renderer = this.edgeRenderers.get(edgeId);
    
    if (edgeData && renderer) {
      edgeData.setInteractionMode('select');
      renderer.select();
    }
  }
  
  removeEdge(edgeId) {
    const renderer = this.edgeRenderers.get(edgeId);
    if (renderer) {
      renderer.remove();
    }
    
    this.edgeDataMap.delete(edgeId);
    this.edgeRenderers.delete(edgeId);
  }
  
  // Get all edge data for serialization
  exportEdgeData() {
    return Array.from(this.edgeDataMap.values()).map(edge => edge.toData());
  }
  
  // Update all edge visuals
  redrawAllEdges(nodeMap) {
    for (const renderer of this.edgeRenderers.values()) {
      const fromNode = nodeMap.get(renderer.edgeData.from);
      const toNode = nodeMap.get(renderer.edgeData.to);
      renderer.updatePath(fromNode, toNode);
    }
  }
}

// Example 3: Edge data operations without rendering
function analyzeEdgeConnections(edgeDataList) {
  const nodeConnections = new Map();
  
  for (const edgeData of edgeDataList) {
    // Count connections per node
    const from = edgeData.from;
    const to = edgeData.to;
    
    nodeConnections.set(from, (nodeConnections.get(from) || 0) + 1);
    nodeConnections.set(to, (nodeConnections.get(to) || 0) + 1);
  }
  
  return nodeConnections;
}

// Example 4: Batch operations on edge data
function findEdgesByNode(edgeDataList, nodeId) {
  return edgeDataList.filter(edge => edge.connectsToNode(nodeId));
}

function findShortestPath(edgeDataList, startNodeId, endNodeId) {
  // Simple pathfinding example using edge data
  const adjacencyList = new Map();
  
  // Build adjacency list from edge data
  for (const edge of edgeDataList) {
    if (!adjacencyList.has(edge.from)) {
      adjacencyList.set(edge.from, []);
    }
    if (!adjacencyList.has(edge.to)) {
      adjacencyList.set(edge.to, []);
    }
    
    adjacencyList.get(edge.from).push(edge.to);
    adjacencyList.get(edge.to).push(edge.from); // Assuming undirected
  }
  
  // Simple BFS implementation
  const queue = [startNodeId];
  const visited = new Set([startNodeId]);
  const parent = new Map();
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (current === endNodeId) {
      // Reconstruct path
      const path = [];
      let node = endNodeId;
      while (node !== undefined) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }
    
    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  
  return null; // No path found
}

export { EdgeManager, createEdgeWithNewPattern, analyzeEdgeConnections, findEdgesByNode, findShortestPath };

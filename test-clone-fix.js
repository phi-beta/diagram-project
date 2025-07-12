// Version 064 - Test script for cloned node edge creation fix
// Test to verify that cloned nodes have the required methods for edge creation

import { Node } from './js/Node.js?v=064';
import { CoordinateSystem } from './js/CoordinateSystem.js?v=064';
import { DragManager } from './js/DragManager.js?v=064';

// Test function to verify clone functionality
async function testClonedNodeEdgeCreation() {
  console.log('🧪 Testing cloned node edge creation...');
  
  // Create a test SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '600');
  svg.setAttribute('viewBox', '0 0 800 600');
  document.body.appendChild(svg);
  
  // Create coordinate system and drag manager
  const coordinateSystem = new CoordinateSystem();
  const dragManager = new DragManager();
  
  try {
    // Create original node
    const originalNodeData = {
      id: 'test-original',
      x: 100,
      y: 100,
      svg: 'database.svg',
      label: 'Original',
      class: 'database'
    };
    
    // Create node element
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node database');
    g.setAttribute('transform', `translate(${originalNodeData.x}, ${originalNodeData.y})`);
    svg.appendChild(g);
    
    // Create original node instance
    const originalNode = new Node(originalNodeData, g);
    originalNode.coordinateSystem = coordinateSystem;
    originalNode.dragManager = dragManager;
    
    console.log('✅ Original node created:', originalNode.id);
    
    // Test original node methods
    console.log('🔍 Testing original node methods:');
    console.log('- Has getGlobalCenter:', typeof originalNode.getGlobalCenter === 'function');
    console.log('- Has getTransformedCenter:', typeof originalNode.getTransformedCenter === 'function');
    
    try {
      const originalCenter = originalNode.getGlobalCenter();
      console.log('- getGlobalCenter() works:', originalCenter);
    } catch (error) {
      console.error('- getGlobalCenter() failed:', error.message);
    }
    
    try {
      const originalTransformedCenter = originalNode.getTransformedCenter();
      console.log('- getTransformedCenter() works:', originalTransformedCenter);
    } catch (error) {
      console.error('- getTransformedCenter() failed:', error.message);
    }
    
    // Clone the node
    console.log('📋 Cloning node...');
    const clonedNode = await originalNode.clone(svg, coordinateSystem, dragManager);
    
    console.log('✅ Cloned node created:', clonedNode.id);
    
    // Test cloned node methods
    console.log('🔍 Testing cloned node methods:');
    console.log('- Has getGlobalCenter:', typeof clonedNode.getGlobalCenter === 'function');
    console.log('- Has getTransformedCenter:', typeof clonedNode.getTransformedCenter === 'function');
    console.log('- Has coordinateSystem:', !!clonedNode.coordinateSystem);
    console.log('- Has dragManager:', !!clonedNode.dragManager);
    
    try {
      const clonedCenter = clonedNode.getGlobalCenter();
      console.log('- getGlobalCenter() works:', clonedCenter);
    } catch (error) {
      console.error('- getGlobalCenter() failed:', error.message);
      return false;
    }
    
    try {
      const clonedTransformedCenter = clonedNode.getTransformedCenter();
      console.log('- getTransformedCenter() works:', clonedTransformedCenter);
    } catch (error) {
      console.error('- getTransformedCenter() failed:', error.message);
      return false;
    }
    
    // Test edge creation method simulation
    console.log('🔗 Testing edge creation method simulation...');
    try {
      // This is what the DiagramStateManager.createTemporaryEdge method does
      const edgeStartNode = clonedNode;
      
      // This should not throw an error anymore
      const startCenter = edgeStartNode.getGlobalCenter
        ? edgeStartNode.getGlobalCenter()
        : edgeStartNode.getTransformedCenter();
      
      console.log('✅ Edge creation simulation successful! Start center:', startCenter);
      
      // Clean up
      svg.remove();
      
      return true;
    } catch (error) {
      console.error('❌ Edge creation simulation failed:', error.message);
      svg.remove();
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error stack:', error.stack);
    svg.remove();
    return false;
  }
}

// Run the test
testClonedNodeEdgeCreation().then(success => {
  if (success) {
    console.log('🎉 All tests passed! Cloned node edge creation should work.');
  } else {
    console.log('❌ Tests failed. There may still be issues with cloned node edge creation.');
  }
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});

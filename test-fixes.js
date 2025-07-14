// Test script to verify edge creation and node duplication fixes
console.log('🧪 Starting edge creation and node duplication tests...');

// Test 1: Check if edge creation works
function testEdgeCreation() {
    console.log('📍 Test 1: Edge Creation');
    
    if (typeof window.layerManager === 'undefined') {
        console.error('❌ LayerManager not available globally');
        return false;
    }
    
    if (typeof window.nodeMap === 'undefined') {
        console.error('❌ NodeMap not available globally');
        return false;
    }
    
    if (typeof window.edgeList === 'undefined') {
        console.error('❌ EdgeList not available globally');
        return false;
    }
    
    const svg = document.getElementById('diagram');
    if (!svg) {
        console.error('❌ SVG diagram not found');
        return false;
    }
    
    const edgesLayer = svg.querySelector('#edges-layer');
    if (!edgesLayer) {
        console.error('❌ Edges layer not found');
        return false;
    }
    
    const edgeElements = edgesLayer.querySelectorAll('g.edge');
    console.log(`✅ Found ${edgeElements.length} edge elements in edges layer`);
    
    console.log(`✅ NodeMap has ${window.nodeMap.size} nodes`);
    console.log(`✅ EdgeList has ${window.edgeList.length} edges`);
    
    return true;
}

// Test 2: Check if node duplication works
async function testNodeDuplication() {
    console.log('📍 Test 2: Node Duplication');
    
    if (!window.nodeMap || window.nodeMap.size === 0) {
        console.error('❌ No nodes available for duplication');
        return false;
    }
    
    const firstNode = Array.from(window.nodeMap.values())[0];
    console.log(`🔄 Attempting to duplicate node: ${firstNode.id}`);
    
    try {
        const svg = document.getElementById('diagram');
        const clonedNode = await firstNode.clone(
            svg, 
            window.viewBoxManager.coordinateSystem, 
            window.dragManager, 
            window.layerManager
        );
        
        if (clonedNode) {
            console.log(`✅ Node duplicated successfully: ${clonedNode.id}`);
            return true;
        } else {
            console.error('❌ Node duplication returned null');
            return false;
        }
    } catch (error) {
        console.error(`❌ Node duplication failed: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Test 3: Test edge creation from scratch
async function testEdgeCreationFromScratch() {
    console.log('📍 Test 3: Edge Creation from Scratch');
    
    if (!window.nodeMap || window.nodeMap.size < 2) {
        console.error('❌ Need at least 2 nodes for edge creation');
        return false;
    }
    
    const nodes = Array.from(window.nodeMap.values());
    const fromNode = nodes[0];
    const toNode = nodes[1];
    
    console.log(`🔄 Creating edge from ${fromNode.id} to ${toNode.id}`);
    
    try {
        // Import Edge class
        const { Edge } = await import('./js/Edge.js');
        
        const edgeData = {
            id: 'test-edge-' + Date.now(),
            from: fromNode.id,
            to: toNode.id,
            class: 'test-connection'
        };
        
        const svg = document.getElementById('diagram');
        const edge = Edge.createEdge(edgeData, svg, window.layerManager);
        
        if (edge) {
            console.log(`✅ Edge created successfully: ${edge.id}`);
            
            // Update edge path
            const updateResult = edge.updatePath(fromNode, toNode);
            if (updateResult !== false) {
                console.log('✅ Edge path updated successfully');
            } else {
                console.error('❌ Edge path update failed');
            }
            
            return true;
        } else {
            console.error('❌ Edge creation returned null');
            return false;
        }
    } catch (error) {
        console.error(`❌ Edge creation failed: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running all tests...');
    
    let results = {
        edgeCreation: false,
        nodeDuplication: false,
        edgeCreationFromScratch: false
    };
    
    // Wait for application to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.edgeCreation = testEdgeCreation();
    results.nodeDuplication = await testNodeDuplication();
    results.edgeCreationFromScratch = await testEdgeCreationFromScratch();
    
    console.log('📊 Test Results:');
    console.log(`  Edge Creation: ${results.edgeCreation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Node Duplication: ${results.nodeDuplication ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Edge Creation from Scratch: ${results.edgeCreationFromScratch ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log(`🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return results;
}

// Export functions for manual testing
window.testEdgeCreation = testEdgeCreation;
window.testNodeDuplication = testNodeDuplication;
window.testEdgeCreationFromScratch = testEdgeCreationFromScratch;
window.runAllTests = runAllTests;

// Auto-run tests when page loads - DISABLED for normal usage
// Uncomment the lines below if you want to run tests automatically
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runAllTests, 3000);
    });
} else {
    setTimeout(runAllTests, 3000);
}
*/

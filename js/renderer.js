import { Node } from './Node.js?v=040';
import { Edge } from './Edge.js?v=009';
import { ViewBoxManager } from './ViewBoxManager.js?v=002';
import { DragManager } from './DragManager.js?v=002';
import { InteractionManager } from './InteractionManager.js?v=003';
import { generateGuid, clearGuidRegistry, initializeFromExisting } from './GuidManager.js';
import { nodeStateManager } from './NodeStateManager.js?v=010';

// Global variables for diagram state
let nodeMap = new Map();
let edgeList = [];
let svg = null;
let layout = null;

// Managers
let viewBoxManager = null;
let dragManager = null;
let interactionManager = null;

function selectNode(node) {
  interactionManager.selectNode(node);
}

async function duplicateSelectedNode() {
  if (!interactionManager.selectedNode) {
    console.log('No node selected for duplication');
    return;
  }

  const selectedNode = interactionManager.selectedNode;
  console.log('Selected node for duplication:', selectedNode);
  console.log('Selected node type:', selectedNode.constructor.name);
  console.log('Has clone method:', typeof selectedNode.clone);

  try {
    // Check if selectedNode is a Node instance or find it in nodeMap
    let nodeToClone = selectedNode;
    
    // If selectedNode is not a Node instance (e.g., NodeRenderer), find the corresponding Node
    if (!selectedNode.clone) {
      console.log('Selected node does not have clone method, searching in nodeMap');
      // Try to find the node in nodeMap by ID
      const nodeId = selectedNode.id || selectedNode.nodeData?.id;
      console.log('Looking for node ID:', nodeId);
      
      if (nodeId && nodeMap.has(nodeId)) {
        nodeToClone = nodeMap.get(nodeId);
        console.log('Found node in nodeMap:', nodeToClone);
      } else {
        console.error('Could not find node to clone in nodeMap');
        console.log('Available nodes in nodeMap:', Array.from(nodeMap.keys()));
        return;
      }
    }
    
    // Use the node's clone method to create a duplicate
    const clonedNode = await nodeToClone.clone(svg);
    
    // Add to node map
    nodeMap.set(clonedNode.id, clonedNode);
    
    // Make the cloned node draggable with all the same configurations
    clonedNode.makeDraggable(
      svg, 
      () => interactionManager.shiftDown, 
      selectNode, 
      scheduleRedrawEdges, 
      () => interactionManager.getIsCreatingEdge(), 
      () => interactionManager.cancelEdgeCreation(), 
      (fromNode) => interactionManager.startEdgeCreation(fromNode), 
      (e) => viewBoxManager.screenToViewBox(e.clientX, e.clientY),
      dragManager,
      viewBoxManager.coordinateSystem,
      () => interactionManager.justCompletedEdge
    );
    
    console.log('Node cloned successfully:', clonedNode);
  } catch (error) {
    console.error('Error cloning node:', error);
    console.error('Error details:', error.stack);
  }
}

function completeEdgeCreation(fromNode, toNode) {
  // Prevent duplicate edges between the same nodes
  const existingEdge = edgeList.find(edge => 
    (edge.from === fromNode.id && edge.to === toNode.id) ||
    (edge.from === toNode.id && edge.to === fromNode.id)
  );
  
  if (existingEdge) {
    console.log('Edge already exists between nodes:', fromNode.id, 'and', toNode.id);
    return;
  }
  
  // Create a unique edge ID using GuidManager
  const edgeId = generateGuid('edge');
  
  // Create the edge data
  const edgeData = {
    id: edgeId,
    from: fromNode.id,
    to: toNode.id,
    class: 'connection'
  };
  
  console.log('Creating new edge:', edgeData);
  
  // Create the permanent edge
  const edgeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  edgeElement.setAttribute('class', edgeData.class);
  
  svg.appendChild(edgeElement);
  
  const edge = new Edge(edgeData, edgeElement);
  edgeList.push(edge);
  
  console.log('Number of edges:', edgeList.length);
  
  // Update the new edge
  edge.updatePath(fromNode, toNode);
}

// Throttle redrawEdges to 1 per animation frame
let redrawPending = false;
function scheduleRedrawEdges() {
  if (!redrawPending) {
    redrawPending = true;
    requestAnimationFrame(() => {
      redrawEdges();
      redrawPending = false;
    });
  }
}

function redrawEdges() {
  Edge.redrawAllEdges(edgeList, nodeMap);
}

async function loadLayout() {
  const layoutRes = await fetch('layout/layout.json');
  layout = await layoutRes.json();

  svg = document.getElementById('diagram');
  
  // Initialize managers
  console.log('🏗️ Initializing managers...');
  viewBoxManager = new ViewBoxManager(svg);
  console.log('✅ ViewBoxManager created');
  dragManager = new DragManager(viewBoxManager);
  console.log('✅ DragManager created');
  interactionManager = new InteractionManager(svg, viewBoxManager, dragManager);
  console.log('✅ InteractionManager created');
  
  // Initialize NodeStateManager
  try {
    await nodeStateManager.initialize(interactionManager, '/config/node-state-machine.json');
    console.log('✅ NodeStateManager initialized');
  } catch (error) {
    console.warn('⚠️ NodeStateManager initialization failed, falling back to legacy behavior:', error);
  }
  
  // Set up callbacks
  interactionManager.setCallbacks(
    selectNode,
    completeEdgeCreation,
    scheduleRedrawEdges
  );
  console.log('✅ InteractionManager callbacks set');
  
  // Test keyboard event detection
  console.log('🔑 Testing InteractionManager keyboard detection...');
  setTimeout(() => {
    console.log('InteractionManager instance:', interactionManager);
    console.log('InteractionManager.shiftDown:', interactionManager.shiftDown);
    console.log('Please press Shift key now to test...');
  }, 1000);
  
  // Add global escape key handler to reset stuck states
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      console.log('🔄 Escape pressed - resetting all node states');
      nodeStateManager.resetAllNodes();
    }
  });
  
  const saveButton = document.createElement('button');
  saveButton.textContent = '💾 Save Layout';
  saveButton.style.position = 'absolute';
  saveButton.style.top = '10px';
  saveButton.style.left = '120px';
  document.body.appendChild(saveButton);

  // Add event listener to the theme toggle button
  const themeToggleButton = document.getElementById('theme-toggle');
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleTheme);
  }

  // Add marker definitions for edges
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="10" refY="5"
      orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,5 L0,10 Z" class="arrow-marker"/>
    </marker>
    <marker id="temp-arrow-end" markerWidth="10" markerHeight="10" refX="10" refY="5"
      orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,5 L0,10 Z" class="temp-arrow-marker"/>
    </marker>
  `;
  svg.appendChild(defs);

  // Add reset view button handler
  const resetViewButton = document.getElementById('reset-view');
  if (resetViewButton) {
    resetViewButton.addEventListener('click', () => viewBoxManager.resetView());
  }

  // Initialize GUID registry with existing data to avoid collisions
  console.log('Initializing GUID registry with existing layout data');
  initializeFromExisting(layout.nodes, layout.edges);

  // Create nodes
  for (const nodeData of layout.nodes) {
    await createNode(nodeData);
  }

  // Create edges as <path> with marker-end
  edgeList = Edge.createEdgesFromLayout(layout.edges, svg);

  redrawEdges();

  saveButton.addEventListener('click', () => {
    const updatedNodes = Array.from(nodeMap.values()).map(n => n.toData());

    const updatedEdges = edgeList.map(e => e.toData());

    const output = {
      nodes: updatedNodes,
      edges: updatedEdges
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "layout-updated.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Utility function to create and setup a node
async function createNode(nodeData) {
  console.log('Creating node with data:', nodeData);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', nodeData.class);
  const scale = nodeData.scale ?? 1;
  g.setAttribute('transform', `translate(${nodeData.x}, ${nodeData.y}) scale(${scale})`);

  const svgRes = await fetch(`assets/icons/${nodeData.svg}`);
  const svgText = await svgRes.text();
  const parser = new DOMParser();
  const svgNode = parser.parseFromString(svgText, 'image/svg+xml').documentElement;

  g.appendChild(svgNode);
  svg.appendChild(g);

  const node = new Node(nodeData, g);
  console.log(`Node created with original ID: ${nodeData.id}, final ID: ${node.id}`);
  nodeMap.set(node.id, node);
  
  // Initialize state machine for the node
  try {
    await node.initializeStateMachine();
    console.log(`✅ State machine initialized for node: ${node.id}`);
  } catch (error) {
    console.warn(`⚠️ State machine initialization failed for node ${node.id}, using legacy behavior:`, error);
  }
  
  node.makeDraggable(
    svg, 
    () => interactionManager.shiftDown, 
    selectNode, 
    scheduleRedrawEdges, 
    () => interactionManager.getIsCreatingEdge(), 
    () => interactionManager.cancelEdgeCreation(), 
    (fromNode) => interactionManager.startEdgeCreation(fromNode), 
    (e) => viewBoxManager.screenToViewBox(e.clientX, e.clientY),
    dragManager,
    viewBoxManager.coordinateSystem,
    () => interactionManager.justCompletedEdge
  );
  
  return node;
}

function toggleTheme() {
  const link = document.getElementById('theme-link');
  const currentHref = link.href;
  if (currentHref.includes('default.css')) {
    link.href = 'themes/dark.css?v=009';
  } else {
    link.href = 'themes/default.css?v=006';
  }
}

// Add duplication handler
document.addEventListener('keydown', e => {
  // Handle Ctrl+D for duplication
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault(); // Prevent browser's bookmark dialog
    duplicateSelectedNode();
  }
});

window.onload = loadLayout;
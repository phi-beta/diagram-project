import { Node } from './Node.js?v=021';
import { Edge } from './Edge.js?v=005';
import { ViewBoxManager } from './ViewBoxManager.js?v=002';
import { DragManager } from './DragManager.js?v=002';
import { InteractionManager } from './InteractionManager.js?v=002';

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
    return;
  }

  const selectedNode = interactionManager.selectedNode;

  try {
    // Use the node's clone method to create a duplicate
    const clonedNode = await selectedNode.clone(svg);
    
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
      viewBoxManager.coordinateSystem
    );
    
    console.log('Node cloned successfully:', clonedNode);
  } catch (error) {
    console.error('Error cloning node:', error);
  }
}

function completeEdgeCreation(fromNode, toNode) {
  // Create a unique edge ID
  const edgeId = `${fromNode.id}_to_${toNode.id}_${Date.now()}`;
  
  // Create the edge data
  const edgeData = {
    id: edgeId,
    from: fromNode.id,
    to: toNode.id,
    class: 'connection'
  };
  
  // Create the permanent edge
  const edgeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  edgeElement.setAttribute('class', edgeData.class);
  
  svg.appendChild(edgeElement);
  
  const edge = new Edge(edgeData, edgeElement);
  edgeList.push(edge);
  
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
  viewBoxManager = new ViewBoxManager(svg);
  dragManager = new DragManager(viewBoxManager);
  interactionManager = new InteractionManager(svg, viewBoxManager, dragManager);
  
  // Set up callbacks
  interactionManager.setCallbacks(
    selectNode,
    completeEdgeCreation,
    scheduleRedrawEdges
  );
  
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
  console.log('Creating node:', nodeData);
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
  nodeMap.set(node.id, node);
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
    viewBoxManager.coordinateSystem
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
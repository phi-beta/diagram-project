// Version 112 - Updated GridManager to v002 for background rectangle management
import { Node } from './Node.js?v=065';
import { Edge } from './Edge.js?v=011';
import { ViewBoxManager } from './ViewBoxManager.js?v=002';
import { DragManager } from './DragManager.js?v=051';
import { InteractionManager } from './InteractionManager.js?v=079';
import { LayerManager } from './LayerManager.js?v=001';
import { GridManager } from './GridManager.js?v=002';
import { generateGuid, clearGuidRegistry, initializeFromExisting } from './GuidManager.js';
import { nodeStateManager } from './NodeStateManager.js?v=025';
import { ContextMenu } from './ContextMenu.js?v=008';
import { DiagramStateManager, diagramStateManager } from './DiagramStateManager.js?v=010';

// Global variables for diagram state
let nodeMap = new Map();
let edgeList = [];
let svg = null;
let layout = null;

// Managers
let viewBoxManager = null;
let dragManager = null;
let layerManager = null;
let gridManager = null;
let interactionManager = null;
// Use singleton instance instead of creating new one
// let diagramStateManager = null;

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
    
    // If selectedNode is not a Node instance (e.g., SVG element), find the corresponding Node
    if (!selectedNode.clone) {
      console.log('Selected node does not have clone method, searching in nodeMap');
      
      // Try to get the node ID from different possible sources
      let nodeId = selectedNode.id || selectedNode.nodeData?.id;
      
      // If it's an SVG element, get the ID from the data-node-id attribute
      if (!nodeId && selectedNode.getAttribute) {
        nodeId = selectedNode.getAttribute('data-node-id');
        console.log('Got node ID from data-node-id attribute:', nodeId);
      }
      
      // If it's a Node instance with nodeData
      if (!nodeId && selectedNode.nodeData) {
        nodeId = selectedNode.nodeData.id;
        console.log('Got node ID from nodeData:', nodeId);
      }
      
      console.log('Looking for node ID:', nodeId);
      
      if (nodeId && nodeMap.has(nodeId)) {
        nodeToClone = nodeMap.get(nodeId);
        console.log('Found node in nodeMap:', nodeToClone);
      } else {
        console.error('Could not find node to clone in nodeMap');
        console.log('Available nodes in nodeMap:', Array.from(nodeMap.keys()));
        console.log('Selected node details:', {
          type: selectedNode.constructor.name,
          id: selectedNode.id,
          dataNodeId: selectedNode.getAttribute ? selectedNode.getAttribute('data-node-id') : 'N/A',
          nodeData: selectedNode.nodeData
        });
        return;
      }
    }
    
    // Use the node's clone method to create a duplicate
    const clonedNode = await nodeToClone.clone(svg, viewBoxManager.coordinateSystem, dragManager);
    
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
  console.log('🎯 completeEdgeCreation called with:', fromNode?.id, '->', toNode?.id);
  
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
  // Set both the specific type class AND the general 'edge' class
  edgeElement.setAttribute('class', `edge ${edgeData.class}`);
  
  // Add to edges layer instead of directly to SVG
  layerManager.addToLayer('edges', edgeElement);
  
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
  try {
    const layoutRes = await fetch('layout/layout.json');
    layout = await layoutRes.json();

    svg = document.getElementById('diagram');
    
    if (!svg) {
      console.error('❌ SVG element not found!');
      return;
    }
  
  // Initialize managers
  viewBoxManager = new ViewBoxManager(svg);
  dragManager = new DragManager(viewBoxManager);
  layerManager = new LayerManager(svg);
  gridManager = new GridManager(svg, layerManager);
  interactionManager = new InteractionManager(svg, viewBoxManager, dragManager, nodeMap, layerManager);
  
  // Connect GridManager to ViewBoxManager for automatic grid updates
  viewBoxManager.onViewBoxChange((oldViewBox, newViewBox) => {
    gridManager.updateGrid(newViewBox.x, newViewBox.y, newViewBox.width, newViewBox.height);
  });
  
  // Initialize grid with current viewBox
  const currentViewBox = viewBoxManager.getCurrentViewBox();
  gridManager.updateGrid(currentViewBox.x, currentViewBox.y, currentViewBox.width, currentViewBox.height);
  
  // Initialize NodeStateManager
  console.log('🔧 About to initialize NodeStateManager...');
  try {
    console.log('🔧 Calling nodeStateManager.initialize()...');
    await nodeStateManager.initialize(interactionManager, 'config/node-state-machine.json');
    console.log('✅ NodeStateManager initialized successfully');
    console.log('🔧 NodeStateManager config check:', nodeStateManager.config ? 'Config loaded' : 'Config is null');
  } catch (error) {
    console.error('❌ NodeStateManager initialization failed:', error);
    console.warn('⚠️ NodeStateManager initialization failed, falling back to legacy behavior:', error);
  }
  console.log('🔧 NodeStateManager initialization complete, proceeding...');
  
  // Initialize DiagramStateManager (singleton)
  console.log('🔧 About to initialize DiagramStateManager (singleton)...');
  try {
    const diagramComponents = {
      interactionManager,
      nodeStateManager,
      dragManager,
      viewBoxManager,
      svg,
      nodeMap,
      layerManager
    };
    console.log('🔧 Calling diagramStateManager.initialize()...');
    await diagramStateManager.initialize(diagramComponents);
    console.log('✅ DiagramStateManager initialized successfully');
  } catch (error) {
    console.error('❌ DiagramStateManager initialization failed:', error);
    console.warn('⚠️ DiagramStateManager initialization failed, falling back to legacy behavior:', error);
  }
  console.log('🔧 DiagramStateManager initialization complete, proceeding...');
  
  // Set up callbacks
  interactionManager.setCallbacks(
    selectNode,
    completeEdgeCreation,
    scheduleRedrawEdges
  );
  
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

  // Add download SVG button handler
  const downloadSvgButton = document.getElementById('download-svg');
  if (downloadSvgButton) {
    downloadSvgButton.addEventListener('click', downloadSVG);
  }

  const downloadPngButton = document.getElementById('download-png');
  if (downloadPngButton) {
    downloadPngButton.addEventListener('click', downloadPNG);
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
  } catch (error) {
    console.error('❌ Error in loadLayout:', error);
  }
}

// Utility function to create and setup a node
async function createNode(nodeData) {
  console.log('Creating node with data:', nodeData);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  // Set both the specific type class AND the general 'node' class
  const className = `node ${nodeData.class}`;
  g.setAttribute('class', className);
  console.log('✅ Node created with class:', className);
  const scale = nodeData.scale ?? 1;
  g.setAttribute('transform', `translate(${nodeData.x}, ${nodeData.y}) scale(${scale})`);

  const svgRes = await fetch(`assets/icons/${nodeData.svg}`);
  const svgText = await svgRes.text();
  const parser = new DOMParser();
  const svgNode = parser.parseFromString(svgText, 'image/svg+xml').documentElement;

  g.appendChild(svgNode);
  // Add to nodes layer instead of directly to SVG
  layerManager.addToLayer('nodes', g);

  const node = new Node(nodeData, g);
  console.log(`Node created with original ID: ${nodeData.id}, final ID: ${node.id}`);
  console.log(`🔧 About to initialize state machine for node ${node.id}...`);
  console.log(`🔧 NodeStateManager config status:`, nodeStateManager.config ? 'Available' : 'NULL');
  
  // Add data attribute for easier testing and debugging
  g.setAttribute('data-node-id', node.id);
  
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

/**
 * Download the current diagram as an SVG file
 */
function downloadSVG() {
  const svg = document.getElementById('diagram');
  if (!svg) {
    console.error('SVG diagram not found');
    return;
  }

  try {
    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true);
    
    // Add XML namespace for proper SVG file format
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // Get the current viewBox to preserve the current view
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      svgClone.setAttribute('viewBox', viewBox);
    }
    
    // Get the currently active CSS styles and embed them into the SVG
    const styleElement = document.createElement('style');
    let allStyles = '';
    
    // Extract styles from all active stylesheets
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const styleSheet = document.styleSheets[i];
        // Skip external stylesheets that might cause CORS issues
        if (styleSheet.href && !styleSheet.href.includes(window.location.origin)) {
          continue;
        }
        
        const rules = styleSheet.cssRules || styleSheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule.cssText) {
              allStyles += rule.cssText + '\n';
            }
          }
        }
      } catch (e) {
        // Skip stylesheets that can't be accessed (CORS restrictions)
        console.warn('Could not access stylesheet:', e);
      }
    }
    
    // Add essential SVG-specific styles that might not be in CSS
    allStyles += `
      /* Essential SVG styles for export */
      svg { background-color: inherit; }
      .node { cursor: default; } /* Remove cursor pointer for static SVG */
      .edge { marker-end: url(#arrow-end); }
      .temporary-edge { marker-end: url(#temp-arrow-end); }
      .connection { marker-end: url(#arrow-end); }
      .access-link { marker-end: url(#arrow-end); }
    `;
    
    styleElement.textContent = allStyles;
    svgClone.insertBefore(styleElement, svgClone.firstChild);
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `diagram-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.svg`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    console.log('📁 SVG diagram downloaded successfully with active theme styles');
    
  } catch (error) {
    console.error('Error downloading SVG:', error);
    alert('Failed to download SVG. Please try again.');
  }
}

/**
 * Download the current diagram as a PNG file with active styles
 */
function downloadPNG() {
  const svg = document.getElementById('diagram');
  if (!svg) {
    console.error('SVG diagram not found');
    return;
  }

  try {
    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true);
    
    // Add XML namespace for proper SVG file format
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // Get the current viewBox to preserve the current view
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      svgClone.setAttribute('viewBox', viewBox);
    }
    
    // Get the currently active CSS styles and embed them into the SVG
    const styleElement = document.createElement('style');
    let allStyles = '';
    
    // Extract styles from all active stylesheets
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const styleSheet = document.styleSheets[i];
        // Skip external stylesheets that might cause CORS issues
        if (styleSheet.href && !styleSheet.href.includes(window.location.origin)) {
          continue;
        }
        
        const rules = styleSheet.cssRules || styleSheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule.cssText) {
              allStyles += rule.cssText + '\n';
            }
          }
        }
      } catch (e) {
        // Skip stylesheets that can't be accessed (CORS restrictions)
        console.warn('Could not access stylesheet:', e);
      }
    }
    
    // Add essential SVG-specific styles that might not be in CSS
    allStyles += `
      /* Essential SVG styles for export */
      svg { background-color: inherit; }
      .node { cursor: default; } /* Remove cursor pointer for static image */
      .edge { marker-end: url(#arrow-end); }
      .temporary-edge { marker-end: url(#temp-arrow-end); }
      .connection { marker-end: url(#arrow-end); }
      .access-link { marker-end: url(#arrow-end); }
    `;
    
    styleElement.textContent = allStyles;
    svgClone.insertBefore(styleElement, svgClone.firstChild);
    
    // Get SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    const svgWidth = svgRect.width || 800;
    const svgHeight = svgRect.height || 600;
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
    // Create a canvas to render the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size with higher resolution for better quality
    const scale = 2; // 2x resolution for crisp output
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;
    ctx.scale(scale, scale);
    
    // Create an image from the SVG
    const img = new Image();
    img.onload = function() {
      // Clear canvas with background color
      const computedStyle = window.getComputedStyle(svg);
      const backgroundColor = computedStyle.backgroundColor || '#ffffff';
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, svgWidth, svgHeight);
      
      // Draw the SVG image onto the canvas
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      
      // Convert canvas to PNG blob and download
      canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `diagram-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        console.log('🖼️ PNG diagram downloaded successfully with active theme styles');
      }, 'image/png', 1.0);
    };
    
    img.onerror = function(error) {
      console.error('Error loading SVG for PNG conversion:', error);
      alert('Failed to convert SVG to PNG. Please try again.');
    };
    
    // Load the SVG string as a data URL
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    img.src = svgUrl;
    
  } catch (error) {
    console.error('Error downloading PNG:', error);
    alert('Failed to download PNG. Please try again.');
  }
}

window.onload = loadLayout;

// Export renderer functions for testing
export const renderer = {
  initialize: async function() {
    // Initialize all components
    svg = document.getElementById('svg');
    if (!svg) {
      throw new Error('SVG element not found');
    }
    
    // Initialize managers
    viewBoxManager = new ViewBoxManager(svg);
    dragManager = new DragManager();
    interactionManager = new InteractionManager();
    
    await nodeStateManager.initialize(interactionManager, 'config/node-state-machine.json');
    
    console.log('Renderer initialized for testing');
  },
  
  createNode: async function(nodeData) {
    if (!svg) {
      throw new Error('Renderer not initialized');
    }
    
    // Ensure node has required properties
    const fullNodeData = {
      id: nodeData.id || generateGuid('node'),
      x: nodeData.x || 0,
      y: nodeData.y || 0,
      label: nodeData.label || 'Node',
      class: nodeData.class || 'user',
      svg: nodeData.svg || (nodeData.class === 'server' ? 'server.svg' : 'user.svg'),
      scale: nodeData.scale || 1
    };
    
    return await createNode(fullNodeData);
  },
  
  getNodeMap: () => nodeMap,
  getEdgeList: () => edgeList,
  getSvg: () => svg
};
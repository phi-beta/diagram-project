// Version 061 - Fixed SVG className handling for context detection
/**
 * Interaction Manager - Handles user interactions with the diagram
 */
import { debugInteraction, debugEdgeCreation, debugKeyboard, debugMouse } from './debug.js';
import { nodeStateManager } from './NodeStateManager.js?v=019';
import { diagramStateManager } from './DiagramStateManager.js?v=001';
import { ContextMenu } from './ContextMenu.js?v=003';

export class InteractionManager {
  constructor(svg, viewBoxManager, dragManager) {
    debugInteraction('🚀 InteractionManager constructor called');
    debugInteraction('  svg:', svg);
    debugInteraction('  viewBoxManager:', viewBoxManager);
    debugInteraction('  dragManager:', dragManager);
    
    this.svg = svg;
    this.viewBoxManager = viewBoxManager;
    this.dragManager = dragManager;
    this.coordinateSystem = viewBoxManager.coordinateSystem;
    
    // State management
    this.selectedNode = null;
    this.shiftDown = false;
    this.ctrlDown = false;
    this.justCompletedEdge = false;
    this.lastEdgeTargetNode = null;
    
    // Edge creation state
    this.isCreatingEdge = false;
    this.edgeStartNode = null;
    this.temporaryEdge = null;
    
    // Mouse tracking
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // Callbacks
    this.nodeSelectCallback = null;
    this.edgeCreateCallback = null;
    this.redrawCallback = null;
    
    this.setupEventListeners();
    
    // Initialize diagram state manager
    this.initializeDiagramStateManager();
    
    // Initialize context menu
    this.contextMenu = new ContextMenu(this.svg);
    
    debugInteraction('✅ InteractionManager constructor complete');
  }
  
  /**
   * Initialize the diagram state manager
   */
  async initializeDiagramStateManager() {
    try {
      const initialized = await diagramStateManager.initialize({
        interactionManager: this,
        nodeStateManager: nodeStateManager,
        dragManager: this.dragManager,
        viewBoxManager: this.viewBoxManager,
        svg: this.svg
      });
      
      if (initialized) {
        debugInteraction('✅ DiagramStateManager integrated with InteractionManager');
      } else {
        console.warn('⚠️ DiagramStateManager initialization failed, using legacy edge creation');
      }
    } catch (error) {
      console.error('❌ DiagramStateManager integration failed:', error);
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    debugInteraction('🎯 Setting up InteractionManager event listeners');
    
    // Keyboard events - simplified approach
    const keyDownHandler = (e) => {
      debugKeyboard('🎯 InteractionManager keydown:', e.key, 'target:', e.target.tagName);
      this.handleKeyDown(e);
    };
    
    const keyUpHandler = (e) => {
      debugKeyboard('🎯 InteractionManager keyup:', e.key, 'target:', e.target.tagName);
      this.handleKeyUp(e);
    };
    
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    debugInteraction('✅ Keyboard event listeners attached');
    
    // Mouse events
    this.svg.addEventListener('click', (e) => this.handleSvgClick(e));
    this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.svg.addEventListener('wheel', (e) => this.handleWheel(e));
    this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.svg.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
    debugInteraction('✅ Mouse event listeners attached');
    
    // Ensure the document can receive focus for keyboard events
    if (document.activeElement !== document.body) {
      document.body.focus();
      debugInteraction('✅ Document body focused for keyboard events');
    }
    
    debugInteraction('✅ InteractionManager event listeners setup complete');
  }
  
  /**
   * Set callbacks for external interactions
   */
  setCallbacks(nodeSelectCallback, edgeCreateCallback, redrawCallback) {
    this.nodeSelectCallback = nodeSelectCallback;
    this.edgeCreateCallback = edgeCreateCallback;
    this.redrawCallback = redrawCallback;
  }
  
  /**
   * Handle keyboard key down events
   */
  handleKeyDown(e) {
    // Prevent key repeat and multiple triggers
    if (e.repeat) return;
    
    if (e.key === 'Shift') {
      // Prevent multiple shift key triggers
      if (this.shiftDown) {
        return;
      }
      
      console.log(`⌨️ SHIFT KEY DOWN: selectedNode=${this.selectedNode?.id || 'null'}, isCreating=${this.isCreatingEdge}, dragging=${this.dragManager.isAnyNodeDragging()}`);
      this.shiftDown = true;
      
      // Check for edge cancellation cooldown - prevent edge creation immediately after cancellation
      if (this._edgeCancelCooldown) {
        console.log(`⏳ Ignoring Shift+edge creation - edge cancellation cooldown active`);
        return;
      }
      
      // Start edge creation if a node is selected
      // Try using NodeStateManager first to transition selected nodes to edgeSource state
      if (this.selectedNode && !this.isCreatingEdge && !this.dragManager.isAnyNodeDragging()) {
        console.log(`🚀 SHIFT KEY EDGE CREATION: Starting edge creation from ${this.selectedNode.id}`);
        debugEdgeCreation('🚀 Starting edge creation from:', this.selectedNode.id);
        
        // Try to use NodeStateManager to transition selected node to edgeSource
        const handled = nodeStateManager.handleShiftKeyEdgeCreation();
        if (handled) {
          console.log(`✅ Edge creation handled by state machine for ${this.selectedNode.id}`);
        } else {
          // Fall back to legacy edge creation
          console.log(`⚠️ Falling back to legacy edge creation for ${this.selectedNode.id}`);
          this.startEdgeCreation(this.selectedNode);
        }
      }
    }
    if (e.key === 'Control') {
      this.ctrlDown = true;
    }
    if (e.key === 'Escape') {
      debugEdgeCreation('Escape pressed - canceling edge creation');
      
      // Try to use DiagramStateManager first
      if (diagramStateManager.getCurrentState() !== 'unknown') {
        const handled = diagramStateManager.handleEscapeKey();
        if (handled) {
          return;
        }
      }
      
      // Fall back to legacy cancellation
      this.cancelEdgeCreation();
    }
    
    // Note: Ctrl+D for duplication is handled by the main renderer
  }
  
  /**
   * Handle keyboard key up events
   */
  handleKeyUp(e) {
    if (e.key === 'Shift') {
      console.log(`⌨️ SHIFT KEY UP: was creating edge=${this.isCreatingEdge}, from=${this.edgeStartNode?.id || 'null'}`);
      this.shiftDown = false;
      
      // Cancel edge creation if Shift key is released during edge creation
      if (this.isCreatingEdge || diagramStateManager.isInEdgeCreationMode()) {
        console.log(`🚫 Canceling edge creation due to Shift key release`);
        
        // Try to use DiagramStateManager first
        if (diagramStateManager.isInEdgeCreationMode()) {
          diagramStateManager.handleShiftKeyReleased();
        } else {
          this.cancelEdgeCreation();
        }
      }
      
      debugKeyboard('Shift released - edge creation canceled if active');
    }
    if (e.key === 'Control') {
      this.ctrlDown = false;
    }
  }
  
  /**
   * Handle SVG click events
   */
  /**
   * Handle SVG click events
   */
  handleSvgClick(e) {
    // Check if the click was on a node element or its children
    const clickedNode = e.target.closest('g[data-node-id]');
    
    // If we didn't click on a node, this is a background click - deselect all
    if (!clickedNode) {
      console.log('🖱️ Background click detected - deselecting all nodes');
      this.deselectAllNodes();
      
      // Try to use DiagramStateManager for background click handling
      if (diagramStateManager.getCurrentState() !== 'unknown') {
        const handled = diagramStateManager.handleBackgroundClick();
        if (handled) {
          return;
        }
      }
      
      // Fall back to legacy cancellation
      this.cancelEdgeCreation();
    }
    // If we did click on a node, the node's own event handlers will handle selection
  }
  
  /**
   * Handle mouse move events
   */
  handleMouseMove(e) {
    // Update mouse position
    const oldMouseX = this.lastMouseX;
    const oldMouseY = this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    // Debug mouse tracking occasionally
    if (this.shiftDown && Math.random() < 0.05) { // 5% of the time when shift is down
      debugMouse('Mouse move - shift down:', this.shiftDown, 'pos:', this.lastMouseX, this.lastMouseY);
    }
    
    // Check if any node is being interacted with and cancel edge creation if so
    this.checkForNodeInteractions();
    
    // Check for edge cancellation cooldown - prevent edge creation immediately after cancellation
    if (this._edgeCancelCooldown) {
      return;
    }
    
    // If Shift is held and we have a selected node, manage edge creation based on mouse position
    if (this.shiftDown && this.selectedNode && !this.dragManager.isAnyNodeDragging()) {
      const mouseOverSelectedNode = this.isMouseOverSelectedNode();
      
      // Debug the conditions
      if (Math.random() < 0.05) { // 5% of the time
        console.log(`🔍 EDGE CREATION CONDITIONS: shift=${this.shiftDown}, selectedNode=${this.selectedNode?.id || 'null'}, dragging=${this.dragManager.isAnyNodeDragging()}, mouseOver=${mouseOverSelectedNode}, isCreating=${this.isCreatingEdge || diagramStateManager.isInEdgeCreationMode()}`);
      }
      
      const isCreatingEdge = this.isCreatingEdge || diagramStateManager.isInEdgeCreationMode();
      
      if (isCreatingEdge && mouseOverSelectedNode) {
        // Cancel edge creation when mouse moves over the selected node
        debugEdgeCreation('🛑 Canceling edge creation - mouse over selected node');
        if (diagramStateManager.isInEdgeCreationMode()) {
          diagramStateManager.cancelEdgeCreation('mouseOverSource');
        } else {
          this.cancelEdgeCreation();
        }
      } else if (!isCreatingEdge && !mouseOverSelectedNode) {
        // Start edge creation when mouse moves away from the selected node
        console.log(`🚀 MOUSE MOVE EDGE CREATION: Starting edge creation from ${this.selectedNode?.id} - mouse moved away from node`);
        debugEdgeCreation('🚀 STARTING EDGE CREATION - mouse away from selected node');
        
        // Try to use DiagramStateManager first
        if (diagramStateManager.getCurrentState() !== 'unknown') {
          diagramStateManager.startEdgeCreation(this.selectedNode, 'mouseMoved');
        } else {
          this.startEdgeCreation(this.selectedNode);
        }
      }
    }
    
    if (this.isCreatingEdge) {
      this.updateTemporaryEdge();
    }
    
    // Handle panning
    this.viewBoxManager.updatePanning(e.clientX, e.clientY);
  }
  
  /**
   * Handle wheel events for zooming
   */
  handleWheel(e) {
    e.preventDefault();
    const mousePos = this.viewBoxManager.screenToViewBox(e.clientX, e.clientY);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    this.viewBoxManager.zoom(zoomFactor, mousePos.x - this.viewBoxManager.viewBoxX, mousePos.y - this.viewBoxManager.viewBoxY);
  }
  
  /**
   * Handle mouse down events
   */
  handleMouseDown(e) {
    // Only start panning on middle mouse button or Ctrl + left mouse button
    if (e.button === 1 || (e.button === 0 && e.ctrlKey && !e.shiftKey)) {
      e.preventDefault();
      this.viewBoxManager.startPanning(e.clientX, e.clientY);
    }
  }
  
  /**
   * Handle mouse up events
   */
  handleMouseUp(e) {
    this.viewBoxManager.stopPanning();
  }
  
  /**
   * Handle context menu (right-click) events
   */
  handleContextMenu(e) {
    e.preventDefault(); // Prevent default browser context menu
    
    // Get mouse position relative to SVG
    const rect = this.svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Get the current viewBox to handle zoom/pan
    const viewBox = this.svg.viewBox.baseVal;
    const svgWidth = rect.width;
    const svgHeight = rect.height;
    
    // Calculate SVG coordinates considering viewBox transformation
    const svgX = (clientX / svgWidth) * viewBox.width + viewBox.x;
    const svgY = (clientY / svgHeight) * viewBox.height + viewBox.y;
    
    debugInteraction(`Context menu coordinates: client(${clientX}, ${clientY}) -> svg(${svgX}, ${svgY})`);
    debugInteraction(`ViewBox: ${viewBox.x}, ${viewBox.y}, ${viewBox.width}, ${viewBox.height}`);
    
    // Determine what was right-clicked
    const targetElement = e.target;
    let context = 'background';
    let contextTarget = null;
    
    // Helper function to get class name from SVG or HTML elements
    const getElementClass = (element) => {
      return element.getAttribute('class') || '';
    };
    
    // Debug target element and its parents
    console.log('🔍 Right-click target:', targetElement.tagName, getElementClass(targetElement));
    console.log('🔍 Parent element:', targetElement.parentElement ? targetElement.parentElement.tagName : 'none', 
               targetElement.parentElement ? getElementClass(targetElement.parentElement) : 'none');
    console.log('🔍 Grandparent element:', targetElement.parentElement?.parentElement ? targetElement.parentElement.parentElement.tagName : 'none',
               targetElement.parentElement?.parentElement ? getElementClass(targetElement.parentElement.parentElement) : 'none');
    
    // Check if right-clicked on a node
    const nodeElement = targetElement.closest('.node');
    console.log('🔍 Closest .node:', nodeElement);
    if (nodeElement) {
      context = 'node';
      contextTarget = nodeElement;
      console.log('✅ FOUND NODE:', getElementClass(nodeElement));
    }
    // Check if right-clicked on an edge
    else {
      const edgeElement = targetElement.closest('.edge');
      console.log('🔍 Closest .edge:', edgeElement);
      if (edgeElement) {
        context = 'edge';
        contextTarget = edgeElement;
        console.log('✅ FOUND EDGE:', getElementClass(edgeElement));
      }
      // Otherwise it's background
      else {
        console.log('❌ BACKGROUND - no node or edge found');
      }
    }
    
    // Show context menu
    this.contextMenu.show(svgX, svgY, context, contextTarget);
    
    debugInteraction(`Context menu shown at (${svgX}, ${svgY}) for context: ${context}`);
  }
  
  /**
   * Select a node
   */
  selectNode(node) {
    debugInteraction('🎯 InteractionManager.selectNode called:', node ? node.id : 'null');
    debugInteraction('  Current selectedNode:', this.selectedNode ? this.selectedNode.id : 'null');
    debugInteraction('  isCreatingEdge:', this.isCreatingEdge);
    debugInteraction('  edgeStartNode:', this.edgeStartNode ? this.edgeStartNode.id : 'null');
    
    // Check for edge cancellation cooldown - prevent interactions immediately after edge cancellation
    if (this._edgeCancelCooldown) {
      console.log(`⏳ Ignoring selectNode for ${node?.id} - edge cancellation cooldown active`);
      return;
    }
    
    // PRIORITY: Handle edge completion first if we're creating an edge
    const isCreatingEdge = this.isCreatingEdge || diagramStateManager.isInEdgeCreationMode();
    const edgeStartNode = this.edgeStartNode || diagramStateManager.getEdgeSourceNode();
    
    if (isCreatingEdge && edgeStartNode && node && node !== edgeStartNode) {
      debugEdgeCreation('🎯 COMPLETING EDGE:', edgeStartNode.id, '->', node.id);
      console.log(`🎯 Edge completion: ${edgeStartNode.id} → ${node.id}, avoiding selection of target node ${node.id}`);
      console.log(`🔍 Target node ${node.id} current state before edge completion:`, nodeStateManager?.getStateMachine(node.id)?.getCurrentState());
      
      // Try to use DiagramStateManager first
      if (diagramStateManager.isInEdgeCreationMode()) {
        const handled = diagramStateManager.completeEdgeCreation(node);
        if (handled && this.edgeCreateCallback) {
          this.edgeCreateCallback(edgeStartNode, node);
        }
        this.handlePostEdgeCompletion(edgeStartNode, node);
      } else {
        this.completeEdgeCreation(edgeStartNode, node);
      }
      
      console.log(`🔍 Target node ${node.id} current state after edge completion:`, nodeStateManager?.getStateMachine(node.id)?.getCurrentState());
      return; // Return early - don't select the target node
    }
    
    // Prevent selection of the node that was just the target of an edge completion
    if (this.justCompletedEdge && this.lastEdgeTargetNode && node) {
      const isSameNode = node === this.lastEdgeTargetNode || node.id === this.lastEdgeTargetNode.id;
      
      if (isSameNode) {
        debugInteraction('🚫 Ignoring selection of edge target node:', node.id);
        return;
      }
    }
    
    // Check if node is in cooldown state and prevent selection
    if (node && nodeStateManager) {
      const currentState = nodeStateManager.getStateMachine(node.id)?.getCurrentState();
      if (currentState === 'cooldown') {
        console.log(`🚫 Ignoring selection of node ${node.id} in cooldown state`);
        return;
      }
    }
    
    // Handle deselection (when node is null)
    if (node === null) {
      console.log('🧹 Deselecting all nodes (selectNode called with null)');
      this.deselectAllNodes();
      this.cancelEdgeCreation();
      return;
    }
    
    // Handle node selection logic
    console.log(`🔍 Selection logic: selectedNode=${this.selectedNode?.id}, newNode=${node.id}`);
    
    if (this.selectedNode === node) {
      // Clicking the same node deselects it
      console.log(`🔄 Same node clicked (${node.id}) - deselecting`);
      this.deselectAllNodes();
      this.cancelEdgeCreation();
    } else {
      // Selecting a different node - deselect current and select new
      console.log(`🔄 Different node clicked - deselecting current (${this.selectedNode?.id}) and selecting new (${node.id})`);
      this.deselectAllNodes();
      this.selectedNode = node;
      node.select();
      console.log(`✅ Node ${node.id} now selected`);
    }
  }
  
  /**
   * Start edge creation from a node
   */
  startEdgeCreation(fromNode) {
    debugEdgeCreation('🚀 InteractionManager.startEdgeCreation called with:', fromNode ? fromNode.id : 'null');
    
    // Try to use DiagramStateManager first
    if (diagramStateManager.getCurrentState() !== 'unknown') {
      debugEdgeCreation('🎯 Using DiagramStateManager for edge creation');
      const handled = diagramStateManager.startEdgeCreation(fromNode, 'interactionManager');
      
      if (handled) {
        debugEdgeCreation('✅ DiagramStateManager handled edge creation start');
        return;
      }
    }
    
    // Fall back to legacy edge creation
    debugEdgeCreation('⚠️ Falling back to legacy edge creation');
    this.legacyStartEdgeCreation(fromNode);
  }
  
  /**
   * Legacy edge creation method (preserved for fallback)
   */
  legacyStartEdgeCreation(fromNode) {
    debugEdgeCreation('Starting edge creation from:', fromNode ? fromNode.id : 'null');
    
    // Cancel any existing edge creation before starting a new one
    if (this.isCreatingEdge) {
      console.log(`🔄 Canceling existing edge creation from ${this.edgeStartNode?.id} to start new one from ${fromNode?.id}`);
      this.cancelEdgeCreation();
    }
    
    // Debug: Check if any nodes are dragging at start
    const anyDragging = this.dragManager.isAnyNodeDragging();
    debugEdgeCreation(`Drag state check: anyDragging=${anyDragging}, fromNode.isDragging=${fromNode?.isDragging}`);
    
    console.log(`🚀 EDGE CREATION STARTING: Setting isCreatingEdge to true for node ${fromNode?.id}`);
    this.isCreatingEdge = true;
    this.edgeStartNode = fromNode;
    console.log(`🚀 EDGE CREATION STATE SET: isCreatingEdge=${this.isCreatingEdge}, edgeStartNode=${this.edgeStartNode?.id}`);
    console.log(`📝 INSTRUCTION: Now click on a DIFFERENT node to complete the edge from ${fromNode?.id}`);
    
    // Change cursor to indicate edge creation mode
    this.svg.style.cursor = 'crosshair';
    
    // Create temporary edge element with CSS class
    this.temporaryEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.temporaryEdge.setAttribute('class', 'temporary-edge');
    this.temporaryEdge.setAttribute('stroke', '#ff6b6b');
    this.temporaryEdge.setAttribute('stroke-width', '2');
    this.temporaryEdge.setAttribute('stroke-dasharray', '5,5');
    this.temporaryEdge.setAttribute('fill', 'none');
    this.temporaryEdge.setAttribute('pointer-events', 'none');
    
    this.svg.appendChild(this.temporaryEdge);
    
    console.log('🎯 TEMPORARY EDGE CREATED:', this.temporaryEdge);
    
    // Delay the temporary edge update to allow drag state to clear
    setTimeout(() => {
      if (this.isCreatingEdge) {
        console.log('🎯 UPDATING TEMPORARY EDGE via timeout');
        this.updateTemporaryEdge();
      }
    }, 0);
  }
  
  /**
   * Update the temporary edge during creation
   */
  updateTemporaryEdge() {
    // Try to use DiagramStateManager first
    if (diagramStateManager.isInEdgeCreationMode()) {
      const mousePos = this.viewBoxManager.screenToViewBox(this.lastMouseX, this.lastMouseY);
      diagramStateManager.updateTemporaryEdge(mousePos.x, mousePos.y);
      return;
    }
    
    // Fall back to legacy method
    this.legacyUpdateTemporaryEdge();
  }
  
  /**
   * Legacy temporary edge update method
   */
  legacyUpdateTemporaryEdge() {
    if (!this.isCreatingEdge || !this.temporaryEdge || !this.edgeStartNode) {
      debugEdgeCreation('updateTemporaryEdge: early return', {
        isCreatingEdge: this.isCreatingEdge,
        hasTemporaryEdge: !!this.temporaryEdge,
        hasEdgeStartNode: !!this.edgeStartNode
      });
      return;
    }
    
    // Cancel edge creation if any node is being interacted with
    const anyDragging = this.dragManager.isAnyNodeDragging();
    debugEdgeCreation(`updateTemporaryEdge: checking drag state - anyDragging=${anyDragging}`);
    if (anyDragging) {
      console.log('🚫 Canceling edge creation - node is dragging');
      this.cancelEdgeCreation();
      return;
    }
    
    // Get the current mouse position in viewBox coordinates
    const mousePos = this.viewBoxManager.screenToViewBox(this.lastMouseX, this.lastMouseY);
    const mouseX = mousePos.x;
    const mouseY = mousePos.y;
    
    // Get the start node's center and radius - handle both Node and NodeRenderer
    let startCenter;
    if (typeof this.edgeStartNode.getGlobalCenter === 'function') {
      startCenter = this.edgeStartNode.getGlobalCenter();
    } else if (typeof this.edgeStartNode.getTransformedCenter === 'function') {
      startCenter = this.edgeStartNode.getTransformedCenter();
    } else {
      console.error('edgeStartNode does not have getGlobalCenter or getTransformedCenter method:', this.edgeStartNode);
      return;
    }
    
    // Calculate direction vector from node center to mouse
    const dx = mouseX - startCenter.x;
    const dy = mouseY - startCenter.y;
    const distance = Math.hypot(dx, dy) || 1; // Avoid division by zero
    
    // Calculate the start point at the edge of the node (not the center)
    const startX = startCenter.x + dx * (startCenter.radius / distance);
    const startY = startCenter.y + dy * (startCenter.radius / distance);
    
    // Create path from node edge to mouse position
    const pathData = `M ${startX} ${startY} L ${mouseX} ${mouseY}`;
    this.temporaryEdge.setAttribute('d', pathData);
    
    // Force a visual update
    if (this.temporaryEdge.parentNode) {
      this.temporaryEdge.parentNode.appendChild(this.temporaryEdge); // Move to end to ensure it's on top
    }
  }
  
  /**
   * Complete edge creation between two nodes
   */
  /**
   * Complete edge creation between two nodes
   */
  completeEdgeCreation(fromNode, toNode) {
    debugEdgeCreation('🎯 InteractionManager.completeEdgeCreation called:', fromNode?.id, '->', toNode?.id);
    
    // Try to use DiagramStateManager first
    if (diagramStateManager.isInEdgeCreationMode()) {
      debugEdgeCreation('🎯 Using DiagramStateManager for edge completion');
      const handled = diagramStateManager.completeEdgeCreation(toNode);
      
      if (handled) {
        // Still call the edge creation callback
        if (this.edgeCreateCallback) {
          this.edgeCreateCallback(fromNode, toNode);
        }
        
        // Handle post-completion state
        this.handlePostEdgeCompletion(fromNode, toNode);
        return;
      }
    }
    
    // Fall back to legacy edge completion
    debugEdgeCreation('⚠️ Falling back to legacy edge completion');
    this.legacyCompleteEdgeCreation(fromNode, toNode);
  }
  
  /**
   * Handle post-edge completion state management
   */
  handlePostEdgeCompletion(fromNode, toNode) {
    // Mark that we just completed an edge
    this.justCompletedEdge = true;
    this.lastEdgeTargetNode = toNode;
    
    // Keep the origin node selected after edge completion
    this.deselectAllNodes();
    this.selectedNode = fromNode;
    fromNode.select();
    
    console.log(`✅ Edge creation completed: ${fromNode.id} -> ${toNode.id}, origin node ${fromNode.id} remains selected`);
    
    // Clear the flag after a delay
    setTimeout(() => {
      this.justCompletedEdge = false;
      this.lastEdgeTargetNode = null;
    }, 500);
  }
  
  /**
   * Legacy edge completion method
   */
  legacyCompleteEdgeCreation(fromNode, toNode) {
    debugEdgeCreation('  isCreatingEdge:', this.isCreatingEdge);
    debugEdgeCreation('  edgeCreateCallback:', typeof this.edgeCreateCallback);
    
    if (!this.isCreatingEdge || !fromNode || !toNode) {
      debugEdgeCreation('🚫 Early return - missing requirements');
      return;
    }
    
    // Mark that we just completed an edge to prevent shift key up from interfering
    this.justCompletedEdge = true;
    
    // Store the target node to prevent immediate re-selection
    this.lastEdgeTargetNode = toNode;
    
    // Trigger state machine transitions for both nodes if available
    if (nodeStateManager) {
      // Complete edge on source node (edgeSource -> selected)
      const sourceHandled = nodeStateManager.handleNodeEvent(fromNode.id, 'completeEdge', {
        targetNodeId: toNode.id,
        isEdgeCompletion: true
      });
      console.log(`🔄 Source node ${fromNode.id} edge completion handled: ${sourceHandled}`);
      
      // Complete edge on target node (edgeTarget -> cooldown)
      const targetHandled = nodeStateManager.handleNodeEvent(toNode.id, 'completeEdge', {
        sourceNodeId: fromNode.id,
        isEdgeCompletion: true
      });
      console.log(`🔄 Target node ${toNode.id} edge completion handled: ${targetHandled}`);
    }
    
    // Call the external callback to create the edge
    if (this.edgeCreateCallback) {
      this.edgeCreateCallback(fromNode, toNode);
    }
    
    // Clean up edge creation state
    this.cancelEdgeCreation();
    
    // Clean up any outstanding mousemove listeners on the target node
    if (toNode && toNode.svgElement && toNode.mouseMoveHandler) {
      toNode.svgElement.removeEventListener('mousemove', toNode.mouseMoveHandler);
      console.log(`🧹 Cleaned up mousemove listener for target node: ${toNode.id}`);
    }
    
    // Keep the origin node selected after edge completion
    this.deselectAllNodes(); // Ensure all nodes are deselected first
    this.selectedNode = fromNode;
    fromNode.select();
    
    console.log(`✅ Edge creation completed: ${fromNode.id} -> ${toNode.id}, origin node ${fromNode.id} remains selected`);
    console.log(`🔍 After edge completion - Origin ${fromNode.id} selected: ${fromNode.nodeData?.isSelected}, Target ${toNode.id} selected: ${toNode.nodeData?.isSelected}`);
    
    // Clear the flag after a longer delay to ensure subsequent mouse events are ignored
    setTimeout(() => {
      this.justCompletedEdge = false;
      this.lastEdgeTargetNode = null;
    }, 500);
  }
  
  /**
   * Cancel edge creation
   */
  /**
   * Cancel edge creation
   */
  cancelEdgeCreation() {
    // Try to use DiagramStateManager first
    if (diagramStateManager.isInEdgeCreationMode()) {
      debugEdgeCreation('🎯 Using DiagramStateManager for edge cancellation');
      const handled = diagramStateManager.cancelEdgeCreation('interactionManager');
      
      if (handled) {
        // Still clean up local state
        this.cleanupLocalEdgeState();
        return;
      }
    }
    
    // Fall back to legacy cancellation
    this.legacyCancelEdgeCreation();
  }
  
  /**
   * Clean up local edge creation state
   */
  cleanupLocalEdgeState() {
    this.isCreatingEdge = false;
    this.edgeStartNode = null;
    
    // Remove temporary edge if it's managed locally
    if (this.temporaryEdge) {
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
    }
    
    // Add cooldown to prevent immediate re-interactions
    this._edgeCancelCooldown = true;
    setTimeout(() => {
      this._edgeCancelCooldown = false;
      console.log(`⏰ Edge cancellation cooldown ended`);
    }, 100);
  }
  
  /**
   * Legacy edge cancellation method
   */
  legacyCancelEdgeCreation() {
    if (!this.isCreatingEdge) {
      return;
    }
    
    console.log(`🚫 CANCELING EDGE CREATION: was creating edge from ${this.edgeStartNode?.id}`);
    debugEdgeCreation('🚫 Canceling edge creation');
    
    // Clean up any nodes that might be in edge-related states
    const allNodes = this.svg.querySelectorAll('.node');
    allNodes.forEach(nodeElement => {
      if (nodeElement.nodeRenderer && nodeElement.nodeRenderer.stateMachine) {
        const currentState = nodeElement.nodeRenderer.stateMachine.getCurrentState();
        if (currentState === 'edgeTarget') {
          console.log(`🧹 Resetting node ${nodeElement.nodeRenderer.id} from edgeTarget to idle after edge cancellation`);
          nodeElement.nodeRenderer.stateMachine.transition('cancelEdgeTarget');
        }
      }
    });
    
    // Make sure DragManager is fully cleaned up
    this.dragManager.clearAllDragStates();
    
    this.isCreatingEdge = false;
    this.edgeStartNode = null;
    
    // Reset cursor
    console.log(`🖱️ CURSOR: Resetting cursor to default in cancelEdgeCreation`);
    this.svg.style.cursor = 'default';
    
    // Remove temporary edge
    if (this.temporaryEdge) {
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
    }
    
    // Add a small delay to prevent immediate re-interactions
    this._edgeCancelCooldown = true;
    setTimeout(() => {
      this._edgeCancelCooldown = false;
      console.log(`⏰ Edge cancellation cooldown ended`);
    }, 100);
  }
  
  /**
   * Deselect all nodes in the diagram
   */
  deselectAllNodes() {
    // Method 1: Use our selectedNode reference if it exists
    if (this.selectedNode && typeof this.selectedNode.deselect === 'function') {
      this.selectedNode.deselect();
    }
    
    // Method 2: Find all selected nodes in the DOM and deselect them
    const selectedNodes = this.svg.querySelectorAll('g.selected');
    selectedNodes.forEach(nodeElement => {
      nodeElement.classList.remove('selected');
      
      // Also use state machine to deselect if available
      const nodeId = nodeElement.getAttribute('data-node-id');
      if (nodeId && nodeStateManager) {
        const stateMachine = nodeStateManager.getStateMachine(nodeId);
        if (stateMachine && stateMachine.getCurrentState() === 'selected') {
          try {
            nodeStateManager.handleNodeEvent(nodeId, 'deselect');
          } catch (error) {
            console.warn(`Could not deselect node ${nodeId} via state machine:`, error);
          }
        }
      }
    });
    
    this.selectedNode = null;
    console.log(`🧹 Deselected all nodes`);
  }

  /**
   * Check for node interactions that should cancel edge creation
   */
  checkForNodeInteractions() {
    // Cancel edge creation if any node OTHER than the edge source is being dragged
    if (this.dragManager.isAnyNodeDragging() && this.isCreatingEdge) {
      // Check if the dragging node is the edge source node
      const draggingNodeIds = this.dragManager.getDraggingNodeIds();
      const isSourceNodeDragging = this.edgeStartNode && draggingNodeIds.includes(this.edgeStartNode.id);
      
      // Only cancel if a different node is dragging
      if (!isSourceNodeDragging) {
        debugEdgeCreation(`🚫 Canceling edge creation - different node is dragging: ${draggingNodeIds.join(', ')}`);
        this.cancelEdgeCreation();
      }
    }
  }

  /**
   * Check if the mouse is currently over the selected node
   */
  isMouseOverSelectedNode() {
    if (!this.selectedNode) {
      return false;
    }
    
    // Use document.elementFromPoint to check what's under the mouse cursor
    const elementUnderMouse = document.elementFromPoint(this.lastMouseX, this.lastMouseY);
    
    if (!elementUnderMouse) {
      return false;
    }
    
    // Check if the element under mouse is the selected node or its child
    const nodeElement = elementUnderMouse.closest('g[data-node-id]');
    
    if (!nodeElement) {
      return false;
    }
    
    const nodeId = nodeElement.getAttribute('data-node-id');
    return nodeId === this.selectedNode.id;
  }

  /**
   * Get whether edge creation is currently active
   */
  getIsCreatingEdge() {
    console.log(`🔍 getIsCreatingEdge called: isCreatingEdge=${this.isCreatingEdge}, edgeStartNode=${this.edgeStartNode?.id || 'null'}`);
    return this.isCreatingEdge;
  }

  /**
   * Duplicate the currently selected node
   */
  duplicateSelectedNode() {
    // This should be handled by the external duplication function
    // The keyboard event handler will call duplicateSelectedNode directly from renderer
  }
}

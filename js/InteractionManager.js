// Version 082 - Fixed PgUp issue and added Home/End for extreme z-order positioning
/**
 * Interaction Manager - Handles user interactions with the diagram
 */
import { debugInteraction, debugEdgeCreation, debugKeyboard, debugMouse } from './debug.js';
import { nodeStateManager } from './NodeStateManager.js?v=021';
import { diagramStateManager } from './DiagramStateManager.js?v=011';
import { ContextMenu } from './ContextMenu.js?v=009';

export class InteractionManager {
  constructor(svg, viewBoxManager, dragManager, nodeMap, layerManager = null) {
    debugInteraction('🚀 InteractionManager constructor called');
    debugInteraction('  svg:', svg);
    debugInteraction('  viewBoxManager:', viewBoxManager);
    debugInteraction('  dragManager:', dragManager);
    debugInteraction('  nodeMap:', nodeMap);
    debugInteraction('  layerManager:', layerManager);
    
    this.svg = svg;
    this.viewBoxManager = viewBoxManager;
    this.dragManager = dragManager;
    this.layerManager = layerManager;
    this.nodeMap = nodeMap;
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
    
    // Settings/Configuration
    this.settings = {
      showZOrderHelpOnSelection: false,  // Make z-order help configurable
      showZOrderFeedback: false,         // Make z-order feedback configurable (disabled by default)
      enableArrowKeyFinetuning: true,    // Enable arrow key fine-tuning
      arrowKeyMovementAmount: 5          // Base movement amount for arrow keys
    };
    
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
        svg: this.svg,
        layerManager: this.layerManager
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
    
    // Add comprehensive context menu prevention
    document.addEventListener('contextmenu', (e) => {
      // Always prevent context menu when the SVG context menu is visible
      if (this.contextMenu && this.contextMenu.isVisible) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    });
    
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
        console.log(`🔍 SHIFT KEY STATE CHECK: shiftDown=${this.shiftDown}, actualShiftPressed=${e.shiftKey}`);
        debugEdgeCreation('🚀 Starting edge creation from:', this.selectedNode.id);
        
        // Double check that shift is actually pressed
        if (!e.shiftKey) {
          console.log(`⚠️ SHIFT KEY MISMATCH: event.shiftKey=${e.shiftKey}, this.shiftDown=${this.shiftDown}`);
          this.shiftDown = false; // Reset state
          return;
        }
        
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
      console.log('🚨 ESC KEY PRESSED - Resetting all states to default');
      debugEdgeCreation('Escape pressed - resetting all states');
      
      // Reset all interaction states
      this.resetAllStates();
    }
    
    // Handle PgUp/PgDown for node z-order management
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      if (this.selectedNode) {
        const direction = e.key === 'PageUp' ? 'up' : 'down';
        this.moveNodeInZOrder(this.selectedNode, direction);
        e.preventDefault(); // Prevent page scrolling
      }
    }
    
    // Handle Home/End for node z-order management
    if (e.key === 'Home' || e.key === 'End') {
      if (this.selectedNode) {
        const direction = e.key === 'Home' ? 'top' : 'bottom';
        this.moveNodeToZOrderExtreme(this.selectedNode, direction);
        e.preventDefault(); // Prevent page scrolling
      }
    }
    
    // Handle arrow keys for node fine-tuning
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (this.selectedNode) {
        this.finetuneNodePosition(this.selectedNode, e.key);
        e.preventDefault(); // Prevent page scrolling
      }
    }
    
    // Note: Ctrl+D for duplication is handled by the main renderer
  }
  
  /**
   * Handle keyboard key up events
   */
  handleKeyUp(e) {
    if (e.key === 'Shift') {
      console.log(`⌨️ SHIFT KEY UP: was creating edge=${this.isCreatingEdge}, from=${this.edgeStartNode?.id || 'null'}`);
      console.log(`🔍 SHIFT KEY STATE CHECK: shiftDown=${this.shiftDown}, actualShiftPressed=${e.shiftKey}`);
      this.shiftDown = false;
      
      // Cancel edge creation if Shift key is released during edge creation
      if (this.isCreatingEdge || diagramStateManager.isInEdgeCreationMode()) {
        console.log(`🚫 Canceling edge creation due to Shift key release`);
        
        // Try to use DiagramStateManager first
        if (diagramStateManager.isInEdgeCreationMode()) {
          // Use the specific shift key released handler
          const handled = diagramStateManager.handleShiftKeyReleased();
          
          if (!handled) {
            // Fall back to direct cancellation
            diagramStateManager.cancelEdgeCreation('shiftKeyReleased');
          }
        }
        
        // Always clean up local state regardless of DiagramStateManager success
        if (this.isCreatingEdge) {
          console.log('🧹 Force cleaning up local edge creation state');
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
      // Check if any node is currently being dragged - if so, ignore the background click
      // This prevents drag completion from triggering background clicks
      if (this.dragManager.isAnyNodeDragging()) {
        console.log('🖱️ Background click ignored - node is being dragged');
        return;
      }
      
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
      } else if (!isCreatingEdge && !mouseOverSelectedNode && this.selectedNode) {
        // Start edge creation when mouse moves away from the selected node
        console.log(`🚀 MOUSE MOVE EDGE CREATION: Starting edge creation from ${this.selectedNode.id} - mouse moved away from node`);
        console.log(`🔍 SHIFT KEY STATE: shiftDown=${this.shiftDown} (should be true for edge creation)`);
        debugEdgeCreation('🚀 STARTING EDGE CREATION - mouse away from selected node');
        
        // Double-check shift key state before starting edge creation
        if (!this.shiftDown) {
          console.log(`⚠️ SKIPPING EDGE CREATION: Shift key is not pressed`);
          return;
        }
        
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
    
    // Update DiagramStateManager temporary edge if in edge creation mode
    if (diagramStateManager.isInEdgeCreationMode()) {
      diagramStateManager.updateTemporaryEdge(e.clientX, e.clientY);
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
    e.stopPropagation(); // Stop event bubbling
    e.stopImmediatePropagation(); // Stop any other listeners
    
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
    
    // Return false to further prevent default behavior
    return false;
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
    let edgeStartNode = this.edgeStartNode || diagramStateManager.getEdgeSourceNode();
    
    // Convert DOM element to Node object if necessary
    if (edgeStartNode && edgeStartNode.tagName) {
      const nodeId = edgeStartNode.getAttribute('data-node-id');
      if (nodeId && this.nodeMap) {
        const nodeObject = this.nodeMap.get(nodeId);
        if (nodeObject) {
          console.log(`🔄 Converted DOM element to Node instance for ${nodeId}`);
          edgeStartNode = nodeObject;
        } else {
          console.warn(`⚠️ No Node object found for DOM element with ID ${nodeId}`);
          edgeStartNode = null;
        }
      } else {
        console.warn(`⚠️ DOM element has no data-node-id attribute:`, edgeStartNode);
        edgeStartNode = null;
      }
    }
    
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
      
      // Show z-order help for the selected node (if enabled)
      if (this.settings.showZOrderHelpOnSelection) {
        setTimeout(() => {
          if (this.selectedNode === node) { // Only show if still selected
            this.showZOrderHelp(node);
          }
        }, 500); // Small delay to let selection visual settle
      }
    }
  }
  
  /**
   * Start edge creation from a node
   */
  startEdgeCreation(fromNode) {
    debugEdgeCreation('🚀 InteractionManager.startEdgeCreation called with:', fromNode ? fromNode.id : 'null');
    
    // Validate input parameter
    if (!fromNode || !fromNode.id) {
      console.error('⚠️ startEdgeCreation: Invalid fromNode:', fromNode);
      return;
    }
    
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
    
    // Validate input parameter
    if (!fromNode || !fromNode.id) {
      console.error('⚠️ legacyStartEdgeCreation: Invalid fromNode:', fromNode);
      return;
    }
    
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
    
    // Use inline arrowhead approach instead of marker
    const center = fromNode.getViewportCenter();
    this.createTemporaryEdgeWithInlineArrowhead(center.x, center.y, center.x + 100, center.y + 100);
    
    console.log('🎯 LEGACY TEMPORARY EDGE CREATED WITH INLINE ARROWHEAD');
    
    // Delay the temporary edge update to allow drag state to clear
    setTimeout(() => {
      if (this.isCreatingEdge) {
        console.log('🎯 UPDATING TEMPORARY EDGE via timeout');
        this.updateTemporaryEdge();
      }
    }, 0);
  }

  /**
   * Alternative method to create temporary edge with inline arrowhead
   * This bypasses SVG marker issues by creating arrowhead as inline polygon
   */
  createTemporaryEdgeWithInlineArrowhead(startX, startY, endX, endY) {
    if (!this.svg) {
      console.error('❌ SVG not found for temporary edge creation');
      return;
    }

    // Remove existing temporary edge if any
    if (this.temporaryEdge) {
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
    }
    if (this.temporaryArrowhead) {
      this.temporaryArrowhead.remove();
      this.temporaryArrowhead = null;
    }

    // Calculate arrowhead position and angle
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    // Match original marker dimensions: markerWidth="10" markerHeight="7"
    // Scale up slightly to match visual appearance
    const arrowLength = 12;
    const arrowWidth = 9;

    // Adjust line end point to not overlap with arrowhead
    const lineEndX = endX - Math.cos(angle) * arrowLength;
    const lineEndY = endY - Math.sin(angle) * arrowLength;

    // Create the main line
    this.temporaryEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.temporaryEdge.setAttribute('d', `M ${startX} ${startY} L ${lineEndX} ${lineEndY}`);
    this.temporaryEdge.setAttribute('stroke', '#ff6b6b');
    this.temporaryEdge.setAttribute('stroke-width', '2');
    this.temporaryEdge.setAttribute('stroke-dasharray', '5,5');
    this.temporaryEdge.setAttribute('fill', 'none');
    this.temporaryEdge.setAttribute('pointer-events', 'none');
    this.temporaryEdge.setAttribute('class', 'temporary-edge');

    // Create arrowhead as inline polygon
    const arrowHalfWidth = arrowWidth / 2;
    const arrowX1 = endX - Math.cos(angle) * arrowLength;
    const arrowY1 = endY - Math.sin(angle) * arrowLength;
    const arrowX2 = arrowX1 - Math.cos(angle - Math.PI/2) * arrowHalfWidth;
    const arrowY2 = arrowY1 - Math.sin(angle - Math.PI/2) * arrowHalfWidth;
    const arrowX3 = arrowX1 - Math.cos(angle + Math.PI/2) * arrowHalfWidth;
    const arrowY3 = arrowY1 - Math.sin(angle + Math.PI/2) * arrowHalfWidth;

    this.temporaryArrowhead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    this.temporaryArrowhead.setAttribute('points', `${endX},${endY} ${arrowX2},${arrowY2} ${arrowX3},${arrowY3}`);
    this.temporaryArrowhead.setAttribute('fill', '#ff6b6b');
    this.temporaryArrowhead.setAttribute('stroke', 'none');
    this.temporaryArrowhead.setAttribute('pointer-events', 'none');
    this.temporaryArrowhead.setAttribute('class', 'temporary-arrowhead');

    // Add to temp layer if LayerManager is available, otherwise fallback to SVG root
    if (this.layerManager) {
      this.layerManager.addToLayer('temp', this.temporaryEdge);
      this.layerManager.addToLayer('temp', this.temporaryArrowhead);
    } else {
      this.svg.appendChild(this.temporaryEdge);
      this.svg.appendChild(this.temporaryArrowhead);
    }

    console.log('🎯 TEMPORARY EDGE WITH INLINE ARROWHEAD CREATED');
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
    let actualStartNode = this.edgeStartNode;
    
    // If edgeStartNode is a DOM element, convert it to a Node instance
    if (this.edgeStartNode && this.edgeStartNode.nodeType === Node.ELEMENT_NODE) {
      const nodeId = this.edgeStartNode.getAttribute('data-node-id');
      if (nodeId && this.nodeMap) {
        actualStartNode = this.nodeMap.get(nodeId);
        if (actualStartNode) {
          console.log(`🔄 Converted DOM element to Node instance for ${nodeId}`);
        } else {
          console.error(`❌ Could not find Node instance for DOM element ${nodeId}`);
          return;
        }
      } else {
        console.error('❌ DOM element does not have data-node-id attribute:', this.edgeStartNode);
        return;
      }
    }
    
    if (typeof actualStartNode.getViewportCenter === 'function') {
      startCenter = actualStartNode.getViewportCenter();
    } else if (typeof actualStartNode.getGlobalCenter === 'function') {
      startCenter = actualStartNode.getGlobalCenter();
    } else if (typeof actualStartNode.getTransformedCenter === 'function') {
      startCenter = actualStartNode.getTransformedCenter();
    } else {
      console.error('edgeStartNode does not have getViewportCenter, getGlobalCenter, or getTransformedCenter method:', this.edgeStartNode);
      return;
    }
    
    // Calculate direction vector from node center to mouse
    const dx = mouseX - startCenter.x;
    const dy = mouseY - startCenter.y;
    const distance = Math.hypot(dx, dy) || 1; // Avoid division by zero
    
    // Calculate the start point at the edge of the node (not the center)
    const startX = startCenter.x + dx * (startCenter.radius / distance);
    const startY = startCenter.y + dy * (startCenter.radius / distance);
    
    // Use inline arrowhead method instead of SVG markers
    this.createTemporaryEdgeWithInlineArrowhead(startX, startY, mouseX, mouseY);
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
    
    // Validate that fromNode has select method before calling it
    if (fromNode && typeof fromNode.select === 'function') {
      fromNode.select();
    } else {
      console.error('⚠️ fromNode does not have select method:', fromNode);
    }
    
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
    
    // Remove temporary arrowhead if it exists
    if (this.temporaryArrowhead) {
      this.temporaryArrowhead.remove();
      this.temporaryArrowhead = null;
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
    
    // Remove temporary arrowhead
    if (this.temporaryArrowhead) {
      this.temporaryArrowhead.remove();
      this.temporaryArrowhead = null;
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

  /**
   * Reset all interaction states to default (triggered by ESC key)
   */
  resetAllStates() {
    console.log('🔄 RESET ALL STATES: Resetting all interaction states to default');
    
    // 1. Cancel any ongoing edge creation
    if (this.isCreatingEdge) {
      console.log('🚫 Canceling edge creation');
      this.cancelEdgeCreation();
    }
    
    // 2. Stop all drag operations
    if (this.dragManager && this.dragManager.isAnyNodeDragging()) {
      console.log('🛑 Stopping all drag operations');
      this.dragManager.clearAllDragStates();
    }
    
    // 3. Reset keyboard modifier states
    this.shiftDown = false;
    this.ctrlDown = false;
    console.log('⌨️ Reset keyboard modifier states');
    
    // 4. Reset cursor to default
    if (this.svg) {
      this.svg.style.cursor = 'default';
      console.log('🖱️ Reset cursor to default');
    }
    
    // 5. Clear any edge completion flags
    this.justCompletedEdge = false;
    this.lastEdgeTargetNode = null;
    
    // 6. Clear any cooldown states
    if (this._edgeCancelCooldown) {
      clearTimeout(this._edgeCancelCooldown);
      this._edgeCancelCooldown = null;
      console.log('⏰ Cleared edge cancellation cooldown');
    }
    
    // 7. Try to reset all node states via NodeStateManager
    if (nodeStateManager) {
      try {
        // Reset all nodes to idle state
        this.nodeMap.forEach((node, nodeId) => {
          const stateMachine = nodeStateManager.getStateMachine(nodeId);
          if (stateMachine) {
            const currentState = stateMachine.getCurrentState();
            if (currentState !== 'idle') {
              console.log(`🔄 Resetting node ${nodeId} from ${currentState} to idle`);
              // Try to handle escape key event for each node
              nodeStateManager.handleNodeEvent(nodeId, 'escapeKey', {});
            }
          }
        });
      } catch (error) {
        console.warn('⚠️ Error resetting node states:', error);
      }
    }
    
    // 8. Try to reset DiagramStateManager
    if (diagramStateManager && diagramStateManager.getCurrentState() !== 'idle') {
      try {
        console.log('🔄 Resetting DiagramStateManager to idle');
        diagramStateManager.handleEscapeKey();
      } catch (error) {
        console.warn('⚠️ Error resetting diagram state:', error);
      }
    }
    
    // 9. Clear any temporary elements
    if (this.temporaryEdge) {
      this.temporaryEdge.remove();
      this.temporaryEdge = null;
      console.log('🗑️ Removed temporary edge');
    }
    
    // 10. Clear temp layer and remove any temporary visual elements
    if (this.layerManager) {
      const tempLayerCleared = this.layerManager.clearLayer('temp');
      if (tempLayerCleared) {
        console.log('🗑️ Cleared temp layer via LayerManager');
      }
    }
    
    // Fallback: Remove any remaining temporary visual elements
    const tempElements = this.svg.querySelectorAll('.temporary-edge, .temporary-element');
    tempElements.forEach(element => element.remove());
    if (tempElements.length > 0) {
      console.log(`🗑️ Removed ${tempElements.length} additional temporary elements`);
    }
    
    // 11. Deselect all nodes (keeping this last to avoid interfering with state resets)
    this.deselectAllNodes();
    
    console.log('✅ All states reset to default');
  }

  /**
   * Move a node up or down in z-order (layering)
   * @param {Node} node - The node to move
   * @param {string} direction - 'up' or 'down'
   */
  moveNodeInZOrder(node, direction) {
    if (!node || !node.element) {
      console.error('❌ moveNodeInZOrder: Invalid node or missing element');
      return;
    }
    
    // Get the nodes layer
    const nodesLayer = this.layerManager ? this.layerManager.getLayer('nodes') : this.svg.querySelector('#nodes-layer');
    if (!nodesLayer) {
      console.error('❌ moveNodeInZOrder: Could not find nodes layer');
      return;
    }
    
    const nodeElement = node.element;
    const allNodes = Array.from(nodesLayer.children);
    const currentIndex = allNodes.indexOf(nodeElement);
    
    if (currentIndex === -1) {
      console.error('❌ moveNodeInZOrder: Node element not found in nodes layer');
      return;
    }
    
    // Find overlapping nodes to provide better feedback
    const overlappingNodes = this.findOverlappingNodes(node);
    const hasOverlaps = overlappingNodes.length > 0;
    
    let newIndex;
    if (direction === 'up') {
      // Move up means higher z-index (later in DOM order)
      newIndex = Math.min(currentIndex + 1, allNodes.length - 1);
    } else {
      // Move down means lower z-index (earlier in DOM order)
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    // If no change needed, return early
    if (newIndex === currentIndex) {
      const message = `Node ${node.id} already at ${direction === 'up' ? 'top' : 'bottom'} of z-order`;
      console.log(`📌 ${message}`);
      this.showZOrderFeedback(node, direction, message, 'warning');
      return;
    }
    
    // Remove node from current position
    nodeElement.remove();
    
    // Get updated node list after removal
    const updatedNodes = Array.from(nodesLayer.children);
    
    if (direction === 'up') {
      // Moving up: insert at the new position (which is now currentIndex since we removed the node)
      if (currentIndex >= updatedNodes.length) {
        // Insert at the end (highest z-index)
        nodesLayer.appendChild(nodeElement);
      } else {
        // Insert before the node that's now at our target position
        const referenceNode = updatedNodes[currentIndex];
        nodesLayer.insertBefore(nodeElement, referenceNode);
      }
    } else {
      // Moving down: insert at the new position
      if (newIndex <= 0) {
        // Insert at the beginning (lowest z-index)
        nodesLayer.insertBefore(nodeElement, nodesLayer.firstChild);
      } else {
        // Insert before the node at the new position
        const referenceNode = updatedNodes[newIndex - 1];
        nodesLayer.insertBefore(nodeElement, referenceNode.nextSibling);
      }
    }
    
    console.log(`✅ Moved node ${node.id} ${direction} in z-order (from index ${currentIndex} to ${newIndex})`);
    
    // Provide enhanced visual feedback
    const message = hasOverlaps ? 
      `Moved ${direction} (${overlappingNodes.length} overlap${overlappingNodes.length > 1 ? 's' : ''})` :
      `Moved ${direction}`;
    this.showZOrderFeedback(node, direction, message, 'success');
  }
  
  /**
   * Move a node to the very top or bottom of z-order
   * @param {Node} node - The node to move
   * @param {string} direction - 'top' or 'bottom'
   */
  moveNodeToZOrderExtreme(node, direction) {
    if (!node || !node.element) {
      console.error('❌ moveNodeToZOrderExtreme: Invalid node or missing element');
      return;
    }
    
    // Get the nodes layer
    const nodesLayer = this.layerManager ? this.layerManager.getLayer('nodes') : this.svg.querySelector('#nodes-layer');
    if (!nodesLayer) {
      console.error('❌ moveNodeToZOrderExtreme: Could not find nodes layer');
      return;
    }
    
    const nodeElement = node.element;
    const allNodes = Array.from(nodesLayer.children);
    const currentIndex = allNodes.indexOf(nodeElement);
    
    if (currentIndex === -1) {
      console.error('❌ moveNodeToZOrderExtreme: Node element not found in nodes layer');
      return;
    }
    
    // Find overlapping nodes to provide better feedback
    const overlappingNodes = this.findOverlappingNodes(node);
    const hasOverlaps = overlappingNodes.length > 0;
    
    // Check if already at the extreme
    const isAtTop = currentIndex === allNodes.length - 1;
    const isAtBottom = currentIndex === 0;
    
    if ((direction === 'top' && isAtTop) || (direction === 'bottom' && isAtBottom)) {
      const message = `Node ${node.id} already at ${direction} of z-order`;
      console.log(`📌 ${message}`);
      this.showZOrderFeedback(node, direction, message, 'warning');
      return;
    }
    
    // Remove node from current position
    nodeElement.remove();
    
    if (direction === 'top') {
      // Move to top (highest z-index)
      nodesLayer.appendChild(nodeElement);
    } else {
      // Move to bottom (lowest z-index)
      nodesLayer.insertBefore(nodeElement, nodesLayer.firstChild);
    }
    
    const newIndex = direction === 'top' ? allNodes.length - 1 : 0;
    console.log(`✅ Moved node ${node.id} to ${direction} of z-order (from index ${currentIndex} to ${newIndex})`);
    
    // Provide enhanced visual feedback
    const message = hasOverlaps ? 
      `Moved to ${direction} (${overlappingNodes.length} overlap${overlappingNodes.length > 1 ? 's' : ''})` :
      `Moved to ${direction}`;
    this.showZOrderFeedback(node, direction, message, 'success');
  }
  
  /**
   * Fine-tune node position using arrow keys
   * Movement amount is proportional to current zoom level
   * @param {Node} node - The node to move
   * @param {string} key - Arrow key pressed ('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')
   */
  finetuneNodePosition(node, key) {
    // Check if arrow key fine-tuning is enabled
    if (!this.settings.enableArrowKeyFinetuning) {
      return;
    }
    
    if (!node || !node.moveTo) {
      console.error('❌ finetuneNodePosition: Invalid node or missing moveTo method');
      return;
    }
    
    // Get current zoom level from ViewBoxManager
    const currentZoom = this.viewBoxManager.currentZoom;
    
    // Base movement amount (in viewBox coordinates)
    const baseMovement = this.settings.arrowKeyMovementAmount;
    
    // Calculate movement amount proportional to zoom
    // Higher zoom = smaller movement for finer control
    // Lower zoom = larger movement for more visible changes
    const movementAmount = baseMovement / currentZoom;
    
    // Calculate new position based on arrow key
    let deltaX = 0;
    let deltaY = 0;
    
    switch (key) {
      case 'ArrowUp':
        deltaY = -movementAmount;
        break;
      case 'ArrowDown':
        deltaY = movementAmount;
        break;
      case 'ArrowLeft':
        deltaX = -movementAmount;
        break;
      case 'ArrowRight':
        deltaX = movementAmount;
        break;
      default:
        console.warn(`⚠️ Unhandled arrow key: ${key}`);
        return;
    }
    
    // Get current position
    const currentX = node.x || 0;
    const currentY = node.y || 0;
    
    // Calculate new position
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;
    
    // Move the node
    node.moveTo(newX, newY, false); // No animation for fine-tuning
    
    console.log(`🎯 Fine-tuned node ${node.id} by (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)}) at zoom ${currentZoom.toFixed(2)}`);
  }
  
  /**
   * Show visual feedback when node z-order changes
   * @param {Node} node - The node that was moved
   * @param {string} direction - 'up' or 'down'
   * @param {string} message - Custom message to display
   * @param {string} type - 'success', 'warning', or 'error'
   */
  showZOrderFeedback(node, direction, message, type = 'success', duration = 1500) {
    // Check if z-order feedback is enabled
    if (!this.settings.showZOrderFeedback) {
      return;
    }
    
    if (!node || !node.element) return;
    
    // Color based on type
    const colors = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    };
    
    const color = colors[type] || colors.success;
    
    // Create a temporary visual indicator
    const feedback = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    feedback.setAttribute('x', node.x);
    feedback.setAttribute('y', node.y - 40);
    feedback.setAttribute('text-anchor', 'middle');
    feedback.setAttribute('font-size', '12');
    feedback.setAttribute('font-weight', 'bold');
    feedback.setAttribute('fill', color);
    feedback.setAttribute('opacity', '1');
    feedback.setAttribute('pointer-events', 'none');
    feedback.textContent = message || (direction === 'up' ? '↑ Moved Up' : '↓ Moved Down');
    
    // Add background for better visibility
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const bbox = feedback.getBBox();
    background.setAttribute('x', bbox.x - 4);
    background.setAttribute('y', bbox.y - 2);
    background.setAttribute('width', bbox.width + 8);
    background.setAttribute('height', bbox.height + 4);
    background.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
    background.setAttribute('rx', '3');
    background.setAttribute('stroke', color);
    background.setAttribute('stroke-width', '1');
    background.setAttribute('opacity', '0.9');
    background.setAttribute('pointer-events', 'none');
    
    // Add to temp layer
    const tempLayer = this.layerManager ? this.layerManager.getLayer('temp') : this.svg.querySelector('#temp-layer');
    if (tempLayer) {
      tempLayer.appendChild(background);
      tempLayer.appendChild(feedback);
      
      // Fade out and remove after specified duration
      setTimeout(() => {
        background.setAttribute('opacity', '0');
        feedback.setAttribute('opacity', '0');
        background.style.transition = 'opacity 0.3s ease-out';
        feedback.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
          if (background.parentNode) {
            background.parentNode.removeChild(background);
          }
          if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
          }
        }, 300);
      }, duration);
    }
  }

  /**
   * Get z-order information for a node
   * @param {Node} node - The node to get z-order info for
   * @returns {Object} Z-order information
   */
  getNodeZOrderInfo(node) {
    if (!node || !node.element) {
      return null;
    }
    
    const nodesLayer = this.layerManager ? this.layerManager.getLayer('nodes') : this.svg.querySelector('#nodes-layer');
    if (!nodesLayer) {
      return null;
    }
    
    const allNodes = Array.from(nodesLayer.children);
    const currentIndex = allNodes.indexOf(node.element);
    
    if (currentIndex === -1) {
      return null;
    }
    
    const overlappingNodes = this.findOverlappingNodes(node);
    
    return {
      currentIndex,
      totalNodes: allNodes.length,
      isAtTop: currentIndex === allNodes.length - 1,
      isAtBottom: currentIndex === 0,
      overlappingCount: overlappingNodes.length,
      overlappingNodes: overlappingNodes
    };
  }
  
  /**
   * Show z-order help when a node is selected
   * @param {Node} node - The selected node
   */
  showZOrderHelp(node) {
    const zOrderInfo = this.getNodeZOrderInfo(node);
    if (!zOrderInfo) return;
    
    const { currentIndex, totalNodes, isAtTop, isAtBottom, overlappingCount } = zOrderInfo;
    
    let helpText = `Layer: ${currentIndex + 1}/${totalNodes}`;
    if (overlappingCount > 0) {
      helpText += ` (${overlappingCount} overlap${overlappingCount > 1 ? 's' : ''})`;
    }
    
    // Add keyboard shortcuts info
    const shortcuts = [];
    if (!isAtTop && !isAtBottom) {
      shortcuts.push('PgUp/PgDown to move');
    } else if (isAtTop) {
      shortcuts.push('PgDown to move down');
    } else if (isAtBottom) {
      shortcuts.push('PgUp to move up');
    }
    
    if (!isAtTop) {
      shortcuts.push('Home for top');
    }
    if (!isAtBottom) {
      shortcuts.push('End for bottom');
    }
    
    if (shortcuts.length > 0) {
      helpText += ` • ${shortcuts.join(', ')}`;
    }
    
    // Show help text briefly
    this.showZOrderFeedback(node, 'info', helpText, 'info', 2000);
  }
  
  /**
   * Find overlapping nodes for a given node
   * @param {Node} targetNode - The node to check for overlaps
   * @returns {Array} Array of overlapping nodes
   */
  findOverlappingNodes(targetNode) {
    if (!targetNode || !this.nodeMap) {
      return [];
    }
    
    const overlapping = [];
    const targetBounds = this.getNodeBounds(targetNode);
    
    for (const [nodeId, node] of this.nodeMap) {
      if (node === targetNode) continue;
      
      const nodeBounds = this.getNodeBounds(node);
      if (this.doNodesOverlap(targetBounds, nodeBounds)) {
        overlapping.push(node);
      }
    }
    
    return overlapping;
  }
  
  /**
   * Get bounding box for a node
   * @param {Node} node - The node to get bounds for
   * @returns {Object} {x, y, width, height}
   */
  getNodeBounds(node) {
    if (!node || !node.element) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    try {
      const bbox = node.element.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    } catch (e) {
      // Fallback for nodes without getBBox
      return {
        x: node.x - 30,
        y: node.y - 30,
        width: 60,
        height: 60
      };
    }
  }
  
  /**
   * Check if two bounding boxes overlap
   * @param {Object} bounds1 - First bounding box
   * @param {Object} bounds2 - Second bounding box
   * @returns {boolean} True if they overlap
   */
  doNodesOverlap(bounds1, bounds2) {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }
  
  /**
   * Configuration methods for customizing behavior
   */
  
  /**
   * Enable or disable automatic z-order help display on node selection
   * @param {boolean} enabled - Whether to show z-order help when a node is selected
   */
  setShowZOrderHelpOnSelection(enabled) {
    this.settings.showZOrderHelpOnSelection = enabled;
    console.log(`Z-order help on selection: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  
  /**
   * Get current configuration setting for z-order help display
   * @returns {boolean} Current setting
   */
  getShowZOrderHelpOnSelection() {
    return this.settings.showZOrderHelpOnSelection;
  }
  
  /**
   * Toggle z-order help display on node selection
   * @returns {boolean} New setting value
   */
  toggleShowZOrderHelpOnSelection() {
    this.settings.showZOrderHelpOnSelection = !this.settings.showZOrderHelpOnSelection;
    console.log(`Z-order help on selection: ${this.settings.showZOrderHelpOnSelection ? 'ENABLED' : 'DISABLED'}`);
    return this.settings.showZOrderHelpOnSelection;
  }
  
  /**
   * Enable or disable z-order feedback messages
   * @param {boolean} enabled - Whether to show z-order feedback messages
   */
  setShowZOrderFeedback(enabled) {
    this.settings.showZOrderFeedback = enabled;
    console.log(`Z-order feedback messages: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  
  /**
   * Get current configuration setting for z-order feedback
   * @returns {boolean} Current setting
   */
  getShowZOrderFeedback() {
    return this.settings.showZOrderFeedback;
  }
  
  /**
   * Toggle z-order feedback messages
   * @returns {boolean} New setting value
   */
  toggleShowZOrderFeedback() {
    this.settings.showZOrderFeedback = !this.settings.showZOrderFeedback;
    console.log(`Z-order feedback messages: ${this.settings.showZOrderFeedback ? 'ENABLED' : 'DISABLED'}`);
    return this.settings.showZOrderFeedback;
  }
  
  /**
   * Enable or disable arrow key fine-tuning
   * @param {boolean} enabled - Whether to enable arrow key fine-tuning
   */
  setEnableArrowKeyFinetuning(enabled) {
    this.settings.enableArrowKeyFinetuning = enabled;
    console.log(`Arrow key fine-tuning: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  
  /**
   * Get current configuration setting for arrow key fine-tuning
   * @returns {boolean} Current setting
   */
  getEnableArrowKeyFinetuning() {
    return this.settings.enableArrowKeyFinetuning;
  }
  
  /**
   * Toggle arrow key fine-tuning
   * @returns {boolean} New setting value
   */
  toggleArrowKeyFinetuning() {
    this.settings.enableArrowKeyFinetuning = !this.settings.enableArrowKeyFinetuning;
    console.log(`Arrow key fine-tuning: ${this.settings.enableArrowKeyFinetuning ? 'ENABLED' : 'DISABLED'}`);
    return this.settings.enableArrowKeyFinetuning;
  }
  
  /**
   * Set the arrow key movement amount
   * @param {number} amount - Base movement amount in viewBox coordinates
   */
  setArrowKeyMovementAmount(amount) {
    if (amount > 0) {
      this.settings.arrowKeyMovementAmount = amount;
      console.log(`Arrow key movement amount set to: ${amount}`);
    } else {
      console.warn('⚠️ Arrow key movement amount must be positive');
    }
  }
  
  /**
   * Get the current arrow key movement amount
   * @returns {number} Current movement amount
   */
  getArrowKeyMovementAmount() {
    return this.settings.arrowKeyMovementAmount;
  }
}

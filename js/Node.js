// Default node dimensions (used for fallback calculations)
const DEFAULT_NODE_SIZE = 50;
const DEFAULT_NODE_RADIUS = DEFAULT_NODE_SIZE / 2;

export class Node {
  constructor(data, element) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.svg = data.svg;
    this.label = data.label;
    this.class = data.class;
    this.scale = data.scale ?? 1;
    this.element = element;
    
    // Interaction state
    this.isDragging = false;
    this.isScaling = false;
    this.interactionMode = null; // 'move', 'scale', or null
    this.previousMode = null; // Previous interaction mode for mode transition detection
    this.clickStartX = 0;
    this.clickStartY = 0;
    this.clickStartTime = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.startDistance = 0;
    this.startScale = 1;
    this.justCreated = false; // Flag to track if this node was just created/duplicated
  }

  // Get the center and radius in the node's local coordinate space
  getLocalCenter() {
    if (this.coordinateSystem) {
      return this.coordinateSystem.getNodeCenter(this.element, 'local');
    }
    
    // Fallback to original implementation
    try {
      const bbox = this.element.getBBox();
      return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
        radius: Math.min(bbox.width, bbox.height) / 2
      };
    } catch (error) {
      console.error('Error in getLocalCenter:', error);
      return {
        x: 0,
        y: 0,
        radius: DEFAULT_NODE_RADIUS * (this.scale ?? 1)
      };
    }
  }

  // Get the center in SVG/global coordinate space
  getGlobalCenter() {
    if (this.coordinateSystem) {
      return this.coordinateSystem.getNodeCenter(this.element, 'global');
    }
    
    // Fallback to original implementation
    try {
      const localCenter = this.getLocalCenter();
      const ctm = this.element.getCTM();
      
      // Transform local center to global coordinates
      const globalX = ctm.a * localCenter.x + ctm.c * localCenter.y + ctm.e;
      const globalY = ctm.b * localCenter.x + ctm.d * localCenter.y + ctm.f;
      
      // Transform the radius by the scale factor from the transformation matrix
      const scaleX = Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b);
      const scaleY = Math.sqrt(ctm.c * ctm.c + ctm.d * ctm.d);
      const avgScale = (scaleX + scaleY) / 2;
      const globalRadius = localCenter.radius * avgScale;
      
      return {
        x: globalX,
        y: globalY,
        radius: globalRadius
      };
    } catch (error) {
      console.error('Error in getGlobalCenter:', error);
      // Use coordinate system for fallback if available
      if (this.coordinateSystem) {
        const fallbackCenter = this.coordinateSystem.getDefaultNodeCenter(this.x, this.y, this.scale ?? 1);
        return fallbackCenter;
      }
      // Last resort fallback
      return {
        x: this.x + DEFAULT_NODE_RADIUS * (this.scale ?? 1),
        y: this.y + DEFAULT_NODE_RADIUS * (this.scale ?? 1),
        radius: DEFAULT_NODE_RADIUS * (this.scale ?? 1)
      };
    }
  }

  // Backward compatibility - this was the old method name
  getTransformedCenter() {
    return this.getGlobalCenter();
  }

  onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox) {
    // Convert mouse coordinates to viewBox coordinates
    const mousePos = getMousePositionInViewBox(e);
    
    // If we're in edge creation mode, only allow clicks (not drags)
    if (isEdgeCreationMode && isEdgeCreationMode()) {
      // Store click info but don't start dragging
      this.clickStartX = mousePos.x;
      this.clickStartY = mousePos.y;
      this.clickStartTime = Date.now();
      this.isDragging = false; // Don't start dragging in edge creation mode
      return;
    }
    
    // Store whether this node was already selected before the interaction
    this.wasSelectedBeforeInteraction = this.element.classList.contains('selected');
    
    // Store initial click position and time for click detection
    const svgRect = svg.getBoundingClientRect();
    this.clickStartX = e.clientX - svgRect.left;
    this.clickStartY = e.clientY - svgRect.top;
    this.clickStartTime = Date.now();
    
    // Check if we should prioritize scaling over edge creation when node is selected and Shift is held
    if (getShiftDown() && this.wasSelectedBeforeInteraction) {
      // Convert mouse coordinates to SVG space
      const svgRect = svg.getBoundingClientRect();
      const mouseXInSvg = e.clientX - svgRect.left;
      const mouseYInSvg = e.clientY - svgRect.top;
      
      // Check if mouse is within node bounds using proper coordinate conversion
      const isWithinBounds = this.containsGlobalPoint(mouseXInSvg, mouseYInSvg);
      
      if (isWithinBounds) {
        // Cancel any existing edge creation to start scaling
        if (cancelEdgeCreationCallback) {
          cancelEdgeCreationCallback();
        }
      } else {
        // Mouse is outside node bounds, start edge creation
        if (startEdgeCreationCallback) {
          startEdgeCreationCallback(this);
        }
        // Don't start dragging since we're starting edge creation
        return;
      }
    }
    
    // Get node center using coordinate system or fallback
    const center = this.coordinateSystem 
      ? this.coordinateSystem.getNodeCenter(this.element, 'global')
      : this.getGlobalCenter();
    
    this.centerX = center.x;
    this.centerY = center.y;
    this.startDistance = Math.hypot(mousePos.x - this.centerX, mousePos.y - this.centerY);
    this.startScale = this.scale ?? 1;
    this.isDragging = true;
    this.isScaling = getShiftDown();
    this.interactionMode = getShiftDown() ? 'scale' : 'move';
    this.previousMode = null;

    // Cancel edge creation if we start dragging/scaling
    if (cancelEdgeCreationCallback) {
      cancelEdgeCreationCallback();
    }

    if (this.isScaling) {
      // For scaling, recalculate center using the proper coordinate system
      const scalingCenter = this.coordinateSystem 
        ? this.coordinateSystem.getNodeCenter(this.element, 'global')
        : this.getGlobalCenter();
      this.centerX = scalingCenter.x;
      this.centerY = scalingCenter.y;
      this.startDistance = Math.hypot(mousePos.x - this.centerX, mousePos.y - this.centerY);
      this.startScale = this.scale ?? 1;
    } else {
      // Use DragManager for movement operations
      if (this.dragManager) {
        this.dragManager.startDrag(this, mousePos.x, mousePos.y);
      } else {
        // Fallback to old method if dragManager not available
        this.dragStartMousePos = { x: mousePos.x, y: mousePos.y };
        this.dragStartNodePos = { x: this.x, y: this.y };
      }
    }
  }

  onMouseMove(e, svg, getShiftDown, scheduleRedrawCallback, selectCallback, getMousePositionInViewBox) {
    if (!this.isDragging) return;
    
    // Store previous mode and determine current mode
    this.previousMode = this.interactionMode;
    this.interactionMode = getShiftDown() ? 'scale' : 'move';
    this.isScaling = (this.interactionMode === 'scale'); // Update the scaling state
    
    // Convert mouse coordinates to viewBox coordinates
    const mousePos = getMousePositionInViewBox(e);
    const mouseXInSvg = mousePos.x;
    const mouseYInSvg = mousePos.y;
    
    // Detect mode transition and recalculate parameters
    if (this.hasInteractionModeChanged()) {
      if (this.interactionMode === 'scale') {
        // Switching to scale mode - recalculate scaling parameters based on current state
        const center = this.coordinateSystem 
          ? this.coordinateSystem.getNodeCenter(this.element, 'global')
          : this.getGlobalCenter();
        this.centerX = center.x;
        this.centerY = center.y;
        this.startDistance = Math.hypot(mouseXInSvg - this.centerX, mouseYInSvg - this.centerY);
        this.startScale = this.scale ?? 1; // Use current scale as new baseline
      } else {
        // Switching to move mode - start new drag operation with DragManager
        if (this.dragManager) {
          // Stop current drag and start new one
          this.dragManager.stopDrag(this);
          this.dragManager.startDrag(this, mouseXInSvg, mouseYInSvg);
        } else {
          // Fallback to old method
          this.dragStartMousePos = { x: mouseXInSvg, y: mouseYInSvg };
          this.dragStartNodePos = { x: this.x, y: this.y };
        }
      }
    }
    
    // Check if we've actually started dragging (moved more than a few pixels)
    const distanceMoved = Math.hypot(mouseXInSvg - this.clickStartX, mouseYInSvg - this.clickStartY);
    if (distanceMoved > 5 && !this.hasStartedDragging) {
      // We've started actually dragging, so select this node and set appropriate visual state
      this.hasStartedDragging = true;
      selectCallback(this);
      
      // Set the appropriate visual state based on interaction mode
      if (this.interactionMode === 'scale') {
        this.setScalingState();
      } else {
        this.setDraggingState();
      }
    } else if (this.hasStartedDragging) {
      // Update visual state if interaction mode changed during drag
      if (this.interactionMode === 'scale') {
        this.setScalingState();
      } else {
        this.setDraggingState();
      }
    }

    if (this.interactionMode === 'scale') {
      const currentDistance = Math.hypot(mouseXInSvg - this.centerX, mouseYInSvg - this.centerY);
      const scaleFactor = currentDistance / (this.startDistance || 1);
      this.scale = Math.max(0.1, this.startScale * scaleFactor);
    } else {
      // Use DragManager for movement operations
      if (this.dragManager) {
        this.dragManager.updateDrag(this, mouseXInSvg, mouseYInSvg);
      } else {
        // Fallback to old method
        const deltaX = mouseXInSvg - this.dragStartMousePos.x;
        const deltaY = mouseYInSvg - this.dragStartMousePos.y;
        this.x = this.dragStartNodePos.x + deltaX;
        this.y = this.dragStartNodePos.y + deltaY;
      }
    }

    this.updateTransform();
    scheduleRedrawCallback();
  }

  onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox) {
    // Handle clicks during edge creation mode
    if (isEdgeCreationMode && isEdgeCreationMode()) {
      const mousePos = getMousePositionInViewBox(e);
      const timeDiff = Date.now() - this.clickStartTime;
      const distanceMoved = Math.hypot(mousePos.x - this.clickStartX, mousePos.y - this.clickStartY);
      
      // Only trigger selection if this was a quick click (not a drag attempt)
      if (timeDiff < 200 && distanceMoved < 5) {
        console.log(`Click detected on node ${this.id} during edge creation`);
        selectCallback(this);
      }
      return;
    }
    
    if (this.isDragging) {
      // Check if this was a click (not a drag)
      const mousePos = getMousePositionInViewBox(e);
      const timeDiff = Date.now() - this.clickStartTime;
      const distanceMoved = Math.hypot(mousePos.x - this.clickStartX, mousePos.y - this.clickStartY);
      
      console.log(`Mouse up on node ${this.id}: timeDiff=${timeDiff}, distanceMoved=${distanceMoved}, hasStartedDragging=${this.hasStartedDragging}, justCreated=${this.justCreated}`);
      
      if (timeDiff < 200 && distanceMoved < 5) {
        // This was a click - toggle selection
        console.log(`Click detected on node ${this.id}`);
        this.clearInteractionStates();
        selectCallback(this);
      } else if (this.hasStartedDragging) {
        // This was a drag - handle post-drag selection state
        console.log(`Drag completed on node ${this.id}`);
        
        // First, always clear interaction states (dragging/scaling)
        this.element.classList.remove('dragging', 'scaling');
        
        if (this.justCreated) {
          console.log(`Node ${this.id} was just created, will deselect after brief selection`);
          // Show as selected briefly using proper callback, then deselect
          if (selectCallback) {
            selectCallback(this);
          }
          setTimeout(() => {
            if (selectCallback) {
              selectCallback(null);
            }
          }, 150);
          // Clear the justCreated flag now that we've handled it
          this.justCreated = false;
        } else if (!this.wasSelectedBeforeInteraction) {
          console.log(`Node ${this.id} wasn't selected before, deselecting`);
          // Deselect using proper callback
          if (selectCallback) {
            selectCallback(null);
          }
        } else {
          console.log(`Node ${this.id} was selected before, keeping selected`);
          // Keep selected using proper callback to maintain state sync
          if (selectCallback) {
            selectCallback(this);
          }
        }
      } else {
        // No actual dragging occurred, just clear all states
        console.log(`No dragging occurred on node ${this.id}, clearing states`);
        this.clearInteractionStates();
      }
    }
    
    // Stop drag operations with DragManager
    if (this.dragManager) {
      this.dragManager.stopDrag(this);
    }
    
    this.isDragging = false;
    this.isScaling = false;
    this.hasStartedDragging = false;
    this.interactionMode = null;
    this.previousMode = null;
  }

  updateTransform() {
    this.element.setAttribute('transform', `translate(${this.x}, ${this.y}) scale(${this.scale ?? 1})`);
  }

  select() {
    console.log(`Selecting node ${this.id}`);
    this.clearInteractionStates();
    this.element.classList.add('selected');
  }

  deselect() {
    console.log(`Deselecting node ${this.id}`);
    this.element.classList.remove('selected', 'dragging', 'scaling');
  }

  setDraggingState() {
    // Only change state if it's actually different
    if (!this.element.classList.contains('dragging')) {
      console.log(`Setting dragging state for node ${this.id}`);
      this.clearInteractionStates();
      this.element.classList.add('dragging');
    }
  }

  setScalingState() {
    // Only change state if it's actually different
    if (!this.element.classList.contains('scaling')) {
      console.log(`Setting scaling state for node ${this.id}`);
      this.clearInteractionStates();
      this.element.classList.add('scaling');
    }
  }

  clearInteractionStates() {
    // Only log if there are actually states to clear
    if (this.element.classList.contains('selected') || 
        this.element.classList.contains('dragging') || 
        this.element.classList.contains('scaling')) {
      console.log(`Clearing interaction states for node ${this.id}`);
    }
    this.element.classList.remove('selected', 'dragging', 'scaling');
  }
  
  /**
   * Get current interaction mode
   */
  getInteractionMode() {
    return this.interactionMode;
  }
  
  /**
   * Get previous interaction mode
   */
  getPreviousInteractionMode() {
    return this.previousMode;
  }
  
  /**
   * Check if interaction mode has changed
   */
  hasInteractionModeChanged() {
    return this.interactionMode !== this.previousMode;
  }

  restoreSelectionState() {
    console.log(`Restoring selection state for node ${this.id}`);
    this.clearInteractionStates();
    this.element.classList.add('selected');
  }

  markAsJustCreated() {
    this.justCreated = true;
    // Clear the flag only after user interaction is complete
    // We'll clear it manually in onMouseUp instead of using a timer
  }

  /**
   * Clone this node with optional position offset and ID modification
   */
  async clone(svg, offsetX = 50, offsetY = 50, idSuffix = '_copy') {
    // Generate unique ID
    let newId = this.id + idSuffix;
    let counter = 1;
    const existingNodes = Array.from(svg.querySelectorAll('g[class]')).map(el => el.id || '');
    while (existingNodes.includes(newId)) {
      newId = this.id + idSuffix + '_' + counter;
      counter++;
    }

    // Create new node data
    const nodeData = {
      id: newId,
      x: this.x + offsetX,
      y: this.y + offsetY,
      svg: this.svg,
      label: this.label + ' (Copy)',
      class: this.class,
      scale: this.scale ?? 1
    };

    // Create the SVG element
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', nodeData.class);
    const scale = nodeData.scale ?? 1;
    g.setAttribute('transform', `translate(${nodeData.x}, ${nodeData.y}) scale(${scale})`);

    // Load and append the SVG icon (reuse the same icon)
    const svgRes = await fetch(`assets/icons/${nodeData.svg}`);
    const svgText = await svgRes.text();
    const parser = new DOMParser();
    const svgNode = parser.parseFromString(svgText, 'image/svg+xml').documentElement;

    g.appendChild(svgNode);
    svg.appendChild(g);

    // Create and return the new Node instance
    const clonedNode = new Node(nodeData, g);
    clonedNode.markAsJustCreated();
    
    return clonedNode;
  }

  /**
   * Get the node's data as a plain object (useful for serialization)
   */
  toData() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      svg: this.svg,
      label: this.label,
      class: this.class,
      scale: this.scale ?? 1
    };
  }

  /**
   * Update the node's position and transform
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.updateTransform();
  }

  /**
   * Create a clone with specific parameters
   */
  async cloneWithParams(svg, params = {}) {
    const defaultParams = {
      offsetX: 50,
      offsetY: 50,
      idSuffix: '_copy',
      labelSuffix: ' (Copy)',
      scale: this.scale
    };
    
    const config = { ...defaultParams, ...params };
    
    // Generate unique ID
    let newId = this.id + config.idSuffix;
    let counter = 1;
    const existingNodes = Array.from(svg.querySelectorAll('g[class]')).map(el => el.id || '');
    while (existingNodes.includes(newId)) {
      newId = this.id + config.idSuffix + '_' + counter;
      counter++;
    }

    // Create new node data
    const nodeData = {
      id: newId,
      x: this.x + config.offsetX,
      y: this.y + config.offsetY,
      svg: this.svg,
      label: this.label + config.labelSuffix,
      class: this.class,
      scale: config.scale ?? 1
    };

    // Create the SVG element
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', nodeData.class);
    const scale = nodeData.scale ?? 1;
    g.setAttribute('transform', `translate(${nodeData.x}, ${nodeData.y}) scale(${scale})`);

    // Load and append the SVG icon
    const svgRes = await fetch(`assets/icons/${nodeData.svg}`);
    const svgText = await svgRes.text();
    const parser = new DOMParser();
    const svgNode = parser.parseFromString(svgText, 'image/svg+xml').documentElement;

    g.appendChild(svgNode);
    svg.appendChild(g);

    // Create and return the new Node instance
    const clonedNode = new Node(nodeData, g);
    clonedNode.markAsJustCreated();
    
    return clonedNode;
  }

  // Convert global SVG coordinates to node's local coordinate space
  globalToLocal(globalX, globalY) {
    try {
      const ctm = this.element.getCTM();
      if (ctm) {
        // Invert the transformation matrix to convert global to local
        const inverse = ctm.inverse();
        const localX = inverse.a * globalX + inverse.c * globalY + inverse.e;
        const localY = inverse.b * globalX + inverse.d * globalY + inverse.f;
        return { x: localX, y: localY };
      }
    } catch (error) {
      console.error('Error in globalToLocal:', error);
    }
    
    // Fallback: approximate conversion
    return {
      x: globalX - this.x,
      y: globalY - this.y
    };
  }

  // Check if a global coordinate is within this node's bounds
  containsGlobalPoint(globalX, globalY) {
    if (this.coordinateSystem) {
      return this.coordinateSystem.isPointInNode(globalX, globalY, this.element);
    }
    
    // Fallback to original implementation
    const localPoint = this.globalToLocal(globalX, globalY);
    const localCenter = this.getLocalCenter();
    const distance = Math.hypot(localPoint.x - localCenter.x, localPoint.y - localCenter.y);
    return distance <= localCenter.radius;
  }
  
  // Set the coordinate system for this node
  setCoordinateSystem(coordinateSystem) {
    this.coordinateSystem = coordinateSystem;
  }

  makeDraggable(svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox, dragManager, coordinateSystem) {
    this.dragManager = dragManager;
    this.coordinateSystem = coordinateSystem;
    
    this.element.addEventListener('mousedown', (e) => 
      this.onMouseDown(e, svg, getShiftDown, selectCallback, scheduleRedrawCallback, isEdgeCreationMode, cancelEdgeCreationCallback, startEdgeCreationCallback, getMousePositionInViewBox)
    );
    
    svg.addEventListener('mousemove', (e) => 
      this.onMouseMove(e, svg, getShiftDown, scheduleRedrawCallback, selectCallback, getMousePositionInViewBox)
    );
    
    window.addEventListener('mouseup', (e) => 
      this.onMouseUp(e, selectCallback, isEdgeCreationMode, getMousePositionInViewBox)
    );
  }

  /**
   * Destroy this node (remove from DOM and clean up)
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Clean up any references
    this.element = null;
    this.coordinateSystem = null;
    this.dragManager = null;
  }

  /**
   * Move this node to a new position with animation (optional)
   */
  moveTo(x, y, animate = false) {
    if (animate) {
      // Simple animation using requestAnimationFrame
      const startX = this.x;
      const startY = this.y;
      const deltaX = x - startX;
      const deltaY = y - startY;
      const duration = 300; // ms
      const startTime = performance.now();
      
      const animateFrame = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        this.x = startX + deltaX * easeProgress;
        this.y = startY + deltaY * easeProgress;
        this.updateTransform();
        
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      };
      
      requestAnimationFrame(animateFrame);
    } else {
      this.setPosition(x, y);
    }
  }

  /**
   * Scale this node to a new size with animation (optional)
   */
  scaleTo(newScale, animate = false) {
    if (animate) {
      const startScale = this.scale;
      const deltaScale = newScale - startScale;
      const duration = 300; // ms
      const startTime = performance.now();
      
      const animateFrame = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        this.scale = startScale + deltaScale * easeProgress;
        this.updateTransform();
        
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      };
      
      requestAnimationFrame(animateFrame);
    } else {
      this.scale = newScale;
      this.updateTransform();
    }
  }
}
/**
 * Context Menu Manager - Handles right-click context menus
 * v009 - Fixed zoom/pan blocking when context menu is displayed
 */

export class ContextMenu {
  constructor(svg) {
    this.svg = svg;
    this.overlayContainer = null;
    this.menuGroup = null;
    this.isVisible = false;
    this.menuWidth = 120;
    this.menuHeight = 80;
    this.cornerRadius = 8;
    
    // Menu colors based on context
    this.colors = {
      node: '#bbdefb',      // More distinct blue for node context
      edge: '#e1bee7',      // More distinct purple for edge context
      background: '#e0e0e0', // More distinct gray for background context
      border: '#424242',    // Darker border color
      shadow: 'rgba(0,0,0,0.3)' // Darker shadow
    };
    
    this.currentContext = null; // 'node', 'edge', or 'background'
    this.targetElement = null;  // The element that was right-clicked
    
    this.setupOverlayContainer();
    this.setupEventListeners();
  }
  
  /**
   * Create a separate SVG overlay container for context menus
   */
  setupOverlayContainer() {
    // Create an overlay SVG that covers the entire viewport
    this.overlayContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.overlayContainer.setAttribute('class', 'context-menu-overlay');
    this.overlayContainer.style.position = 'fixed';
    this.overlayContainer.style.top = '0';
    this.overlayContainer.style.left = '0';
    this.overlayContainer.style.width = '100vw';
    this.overlayContainer.style.height = '100vh';
    this.overlayContainer.style.pointerEvents = 'none'; // Allow clicks through by default
    this.overlayContainer.style.zIndex = '10000';
    
    // CRITICAL: Set viewBox to match screen coordinates exactly (1:1 pixel mapping)
    this.overlayContainer.setAttribute('viewBox', '0 0 ' + window.innerWidth + ' ' + window.innerHeight);
    
    // Prevent any scaling or transformation that could affect sizing
    this.overlayContainer.setAttribute('preserveAspectRatio', 'none');
    
    // Set transform origin but don't override transforms completely
    this.overlayContainer.style.transformOrigin = 'top left';
    
    // PREVENT mouse events that could cause movement but allow positioning
    this.overlayContainer.addEventListener('mousemove', (e) => {
      // Only stop propagation if the mouse is over the actual menu, not the overlay
      if (this.isClickInsideMenu(e)) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    this.overlayContainer.addEventListener('mouseenter', (e) => {
      // Only stop propagation if entering the actual menu
      if (this.isClickInsideMenu(e)) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    this.overlayContainer.addEventListener('mouseleave', (e) => {
      // Only stop propagation if leaving the actual menu
      if (this.isClickInsideMenu(e)) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    // Add drop shadow filter definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'context-menu-shadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '4');
    feDropShadow.setAttribute('dy', '4');
    feDropShadow.setAttribute('stdDeviation', '3');
    feDropShadow.setAttribute('flood-color', 'rgba(0,0,0,0.3)');
    feDropShadow.setAttribute('flood-opacity', '1');
    
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    this.overlayContainer.appendChild(defs);
    
    // Add to document body
    document.body.appendChild(this.overlayContainer);
  }
  
  
  /**
   * Set up event listeners for context menu
   */
  setupEventListeners() {
    // Listen for clicks outside the menu to close it
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.isClickInsideMenu(e)) {
        this.hide();
      }
    });
    
    // Prevent default context menu on SVG and on overlay - be more aggressive
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });
    
    // Prevent context menu on the overlay itself and anywhere when menu is visible
    document.addEventListener('contextmenu', (e) => {
      if (this.isVisible || e.target.closest('.context-menu-overlay') || e.target.closest('.context-menu')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    });
    
    // Prevent context menu on the overlay container specifically
    this.overlayContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });
    
    // Handle window resize to update overlay container
    window.addEventListener('resize', () => {
      if (this.overlayContainer) {
        this.overlayContainer.style.width = '100vw';
        this.overlayContainer.style.height = '100vh';
        // Update viewBox to match new window size
        this.overlayContainer.setAttribute('viewBox', '0 0 ' + window.innerWidth + ' ' + window.innerHeight);
      }
    });
  }
  
  /**
   * Show context menu at specified coordinates
   * @param {number} svgX - X coordinate in SVG space
   * @param {number} svgY - Y coordinate in SVG space
   * @param {string} context - Context type: 'node', 'edge', or 'background'
   * @param {Element} targetElement - The element that was right-clicked
   */
  show(svgX, svgY, context, targetElement = null) {
    // Remove existing menu if any
    this.hide();
    
    // Set the new context
    this.currentContext = context;
    this.targetElement = targetElement;
    
    // Convert SVG coordinates to screen coordinates
    const screenCoords = this.svgToScreenCoordinates(svgX, svgY);
    
    // Create SVG menu group with FIXED position (no transform that can be affected by mouse)
    this.menuGroup = this.createSvgMenu(screenCoords.x, screenCoords.y);
    
    // Add menu to overlay container
    this.overlayContainer.appendChild(this.menuGroup);
    // Keep overlay pointer events as 'none' to allow zoom/pan, but enable on menu group
    this.overlayContainer.style.pointerEvents = 'none';
    this.menuGroup.style.pointerEvents = 'auto'; // Only enable clicks on the actual menu
    this.isVisible = true;
    
    // Force the menu to stay at the fixed position - prevent any mouse following
    this.menuGroup.style.pointerEvents = 'all';
    
    console.log(`Context menu shown at screen(${screenCoords.x}, ${screenCoords.y}) for context: ${context} with color:`, this.colors[context]);
  }
  
  /**
   * Convert SVG coordinates to screen coordinates
   * @param {number} svgX - X coordinate in SVG space
   * @param {number} svgY - Y coordinate in SVG space
   * @returns {Object} Screen coordinates {x, y}
   */
  svgToScreenCoordinates(svgX, svgY) {
    const rect = this.svg.getBoundingClientRect();
    const viewBox = this.svg.viewBox.baseVal;
    
    // Calculate the scale factor
    const scaleX = rect.width / viewBox.width;
    const scaleY = rect.height / viewBox.height;
    
    // Convert SVG coordinates to screen coordinates
    const screenX = rect.left + (svgX - viewBox.x) * scaleX;
    const screenY = rect.top + (svgY - viewBox.y) * scaleY;
    
    return { x: screenX, y: screenY };
  }
  
  /**
   * Create SVG menu group with COMPLETELY FIXED positioning
   * @param {number} x - Screen X coordinate
   * @param {number} y - Screen Y coordinate
   * @returns {SVGGElement} Menu group element
   */
  createSvgMenu(x, y) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `context-menu context-menu-${this.currentContext}`);
    
    // Use fixed translation - this will NOT be affected by mouse movement
    group.setAttribute('transform', `translate(${x}, ${y})`);
    group.style.pointerEvents = 'all';
    
    // Lock the group position - but DON'T override the SVG transform attribute
    // Remove the style.transform = 'none' that was overriding positioning
    group.style.transformOrigin = 'top left';
    
    // Prevent ANY mouse events on the group from causing position changes
    group.addEventListener('mousemove', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    group.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    group.addEventListener('mouseleave', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    // Create menu background with NO transform-based effects
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', 0);
    background.setAttribute('y', 0);
    background.setAttribute('width', this.menuWidth);
    background.setAttribute('height', this.menuHeight);
    background.setAttribute('rx', this.cornerRadius);
    background.setAttribute('ry', this.cornerRadius);
    
    const fillColor = this.colors[this.currentContext] || this.colors.background;
    background.setAttribute('fill', fillColor);
    background.setAttribute('stroke', this.colors.border);
    background.setAttribute('stroke-width', '2');
    background.setAttribute('filter', 'url(#context-menu-shadow)');
    background.style.cursor = 'pointer';
    
    // COMPLETELY DISABLE hover effects to prevent jumping
    // Remove all transform-based hover effects that could cause movement
    background.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Only use non-transform effects (like opacity or filter brightness)
      background.style.filter = 'brightness(0.95)';
    });
    
    background.addEventListener('mouseleave', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Reset to normal brightness
      background.style.filter = 'brightness(1)';
    });
    
    // Only prevent mouse events that would interfere with menu interaction
    background.addEventListener('mousemove', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    // Allow click events to work normally on the menu
    background.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Handle menu item clicks here if needed
    });
    
    group.appendChild(background);
    
    // Add context-specific text
    const textGroup = this.createContextText();
    
    // Also lock the text group to prevent any movement
    textGroup.style.pointerEvents = 'none'; // Text should not respond to mouse
    textGroup.addEventListener('mousemove', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    group.appendChild(textGroup);
    
    return group;
  }
  
  /**
   * Create context-specific text for the menu
   * @returns {SVGGElement} Text group element
   */
  createContextText() {
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('class', 'context-menu-text');
    textGroup.style.pointerEvents = 'none';
    
    // Main context label
    const mainText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    mainText.setAttribute('x', this.menuWidth / 2);
    mainText.setAttribute('y', 25);
    mainText.setAttribute('text-anchor', 'middle');
    mainText.setAttribute('font-family', 'Arial, sans-serif');
    mainText.setAttribute('font-size', '14');
    mainText.setAttribute('font-weight', 'bold');
    mainText.setAttribute('fill', '#333');
    mainText.textContent = this.currentContext.toUpperCase();
    
    // Subtitle
    const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    subText.setAttribute('x', this.menuWidth / 2);
    subText.setAttribute('y', 45);
    subText.setAttribute('text-anchor', 'middle');
    subText.setAttribute('font-family', 'Arial, sans-serif');
    subText.setAttribute('font-size', '12');
    subText.setAttribute('fill', '#666');
    subText.textContent = 'Context Menu';
    
    // Additional info
    const infoText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    infoText.setAttribute('x', this.menuWidth / 2);
    infoText.setAttribute('y', 65);
    infoText.setAttribute('text-anchor', 'middle');
    infoText.setAttribute('font-family', 'Arial, sans-serif');
    infoText.setAttribute('font-size', '9');
    infoText.setAttribute('fill', '#888');
    infoText.textContent = `Right-clicked on ${this.currentContext}`;
    
    textGroup.appendChild(mainText);
    textGroup.appendChild(subText);
    textGroup.appendChild(infoText);
    
    return textGroup;
  }
  
  /**
   * Hide the context menu
   */
  hide() {
    if (this.menuGroup && this.menuGroup.parentNode) {
      this.menuGroup.parentNode.removeChild(this.menuGroup);
    }
    this.menuGroup = null;
    this.isVisible = false;
    this.currentContext = null;
    this.targetElement = null;
    
    // Disable pointer events on overlay when no menu is shown
    if (this.overlayContainer) {
      this.overlayContainer.style.pointerEvents = 'none';
    }
  }
  
  /**
   * Check if a click event is inside the menu
   * @param {Event} event - Click event
   * @returns {boolean} True if click is inside menu
   */
  isClickInsideMenu(event) {
    if (!this.isVisible || !this.menuGroup) {
      return false;
    }
    
    // Check if the clicked element is part of the context menu
    const clickedElement = event.target;
    return clickedElement.closest('.context-menu') === this.menuGroup;
  }
  
  /**
   * Get current context information
   * @returns {Object} Context information
   */
  getContext() {
    return {
      type: this.currentContext,
      element: this.targetElement,
      isVisible: this.isVisible
    };
  }
  
  /**
   * Set menu dimensions
   * @param {number} width - Menu width
   * @param {number} height - Menu height
   */
  setDimensions(width, height) {
    this.menuWidth = width;
    this.menuHeight = height;
  }
  
  /**
   * Set corner radius
   * @param {number} radius - Corner radius
   */
  setCornerRadius(radius) {
    this.cornerRadius = radius;
  }
  
  /**
   * Update menu colors
   * @param {Object} colors - Color configuration
   */
  setColors(colors) {
    this.colors = { ...this.colors, ...colors };
  }
  
  /**
   * Clean up - remove overlay container
   */
  destroy() {
    this.hide();
    if (this.overlayContainer && this.overlayContainer.parentNode) {
      this.overlayContainer.parentNode.removeChild(this.overlayContainer);
    }
    this.overlayContainer = null;
  }
}

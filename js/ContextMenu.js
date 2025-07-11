/**
 * Context Menu Manager - Handles right-click context menus
 * v003 - Fixed context reset issue in show() method
 */

export class ContextMenu {
  constructor(svg) {
    this.svg = svg;
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
    
    this.setupEventListeners();
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
    
    // Prevent default context menu on SVG
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * Show context menu at specified coordinates
   * @param {number} x - X coordinate in SVG space
   * @param {number} y - Y coordinate in SVG space
   * @param {string} context - Context type: 'node', 'edge', or 'background'
   * @param {Element} targetElement - The element that was right-clicked
   */
  show(x, y, context, targetElement = null) {
    // Remove existing menu if any - but don't reset context yet
    if (this.menuGroup && this.menuGroup.parentNode) {
      this.menuGroup.parentNode.removeChild(this.menuGroup);
    }
    this.menuGroup = null;
    this.isVisible = false;
    
    // Set the new context
    this.currentContext = context;
    this.targetElement = targetElement;
    
    // Create menu group
    this.menuGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.menuGroup.setAttribute('class', 'context-menu');
    this.menuGroup.setAttribute('transform', `translate(${x}, ${y})`);
    
    // Create drop shadow
    const shadow = this.createShadow();
    this.menuGroup.appendChild(shadow);
    
    // Create menu background
    const background = this.createBackground();
    this.menuGroup.appendChild(background);
    
    // Add menu to SVG
    this.svg.appendChild(this.menuGroup);
    this.isVisible = true;
    
    console.log(`Context menu shown at (${x}, ${y}) for context: ${context} with color:`, this.colors[context]);
  }
  
  /**
   * Create drop shadow for menu
   */
  createShadow() {
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    shadow.setAttribute('x', 2);
    shadow.setAttribute('y', 2);
    shadow.setAttribute('width', this.menuWidth);
    shadow.setAttribute('height', this.menuHeight);
    shadow.setAttribute('rx', this.cornerRadius);
    shadow.setAttribute('ry', this.cornerRadius);
    shadow.setAttribute('fill', this.colors.shadow);
    shadow.setAttribute('class', 'context-menu-shadow');
    return shadow;
  }
  
  /**
   * Create menu background with context-specific color
   */
  createBackground() {
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
    background.setAttribute('stroke-width', 1);
    background.setAttribute('class', `context-menu-bg context-menu-${this.currentContext}`);
    
    // Add hover effects
    background.style.cursor = 'pointer';
    
    return background;
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
    if (clickedElement.closest('.context-menu')) {
      return true;
    }
    
    return false;
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
}

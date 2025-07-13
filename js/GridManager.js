// Version 002 - Added background rectangle management for infinite background coverage
/**
 * GridManager - Manages the background grid that adapts to viewport changes
 */

export class GridManager {
  constructor(svg, layerManager = null) {
    this.svg = svg;
    this.layerManager = layerManager;
    this.gridSize = 20; // Default grid size
    this.gridColor = '#e0e0e0';
    this.gridOpacity = 0.5;
    this.backgroundColor = '#fafafa'; // Light background color
    
    // Grid elements
    this.gridPattern = null;
    this.gridRect = null;
    this.backgroundRect = null; // New: background rectangle
    this.gridLayer = null;
    this.backgroundLayer = null;
    
    // Buffer for grid extension (how much beyond visible area to draw)
    this.gridBuffer = 200;
    
    this.initializeGrid();
  }
  
  /**
   * Initialize the grid pattern and background
   */
  initializeGrid() {
    // Find or create background layer
    this.backgroundLayer = this.svg.getElementById('background-layer');
    
    // Find or create grid layer
    this.gridLayer = this.svg.getElementById('grid-layer') || this.svg.getElementById('background-layer');
    
    if (!this.gridLayer) {
      console.warn('GridManager: No grid layer found, creating one');
      this.gridLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.gridLayer.setAttribute('id', 'grid-layer');
      this.gridLayer.setAttribute('class', 'layer');
      
      // Add to background layer if LayerManager is available
      if (this.layerManager) {
        this.layerManager.addToLayer('background', this.gridLayer);
      } else {
        // Add as first child of SVG
        this.svg.insertBefore(this.gridLayer, this.svg.firstChild);
      }
    }
    
    // Create or update background rectangle
    this.createBackgroundRect();
    
    // Create or update grid pattern
    this.createGridPattern();
    
    // Create or update grid rectangle
    this.createGridRect();
    
    console.log('✅ GridManager initialized with background and grid');
  }
  
  /**
   * Create the grid pattern definition
   */
  createGridPattern() {
    // Find or create defs element
    let defs = this.gridLayer.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.gridLayer.appendChild(defs);
    }
    
    // Remove existing pattern if it exists
    const existingPattern = defs.querySelector('#grid');
    if (existingPattern) {
      existingPattern.remove();
    }
    
    // Create new pattern
    this.gridPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    this.gridPattern.setAttribute('id', 'grid');
    this.gridPattern.setAttribute('width', this.gridSize);
    this.gridPattern.setAttribute('height', this.gridSize);
    this.gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    // Create grid lines
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${this.gridSize} 0 L 0 0 0 ${this.gridSize}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.gridColor);
    path.setAttribute('stroke-width', '1');
    path.setAttribute('opacity', this.gridOpacity);
    
    this.gridPattern.appendChild(path);
    defs.appendChild(this.gridPattern);
  }
  
  /**
   * Create or update the grid rectangle
   */
  createGridRect() {
    // Remove existing grid rect if it exists
    const existingRect = this.gridLayer.querySelector('rect.grid-background');
    if (existingRect) {
      existingRect.remove();
    }
    
    // Create new grid rectangle
    this.gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.gridRect.setAttribute('class', 'grid-background');
    this.gridRect.setAttribute('fill', 'url(#grid)');
    this.gridRect.setAttribute('pointer-events', 'none'); // Don't interfere with interactions
    
    // Add to grid layer
    this.gridLayer.appendChild(this.gridRect);
    
    // Initial size - will be updated by updateGrid()
    this.updateGrid(0, 0, 800, 600);
  }
  
  /**
   * Create or update the background rectangle
   */
  createBackgroundRect() {
    // Remove existing background rect if it exists
    if (this.backgroundLayer) {
      const existingRect = this.backgroundLayer.querySelector('rect');
      if (existingRect) {
        existingRect.remove();
      }
      
      // Create new background rectangle
      this.backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.backgroundRect.setAttribute('class', 'diagram-background');
      this.backgroundRect.setAttribute('fill', this.backgroundColor);
      this.backgroundRect.setAttribute('pointer-events', 'none'); // Don't interfere with interactions
      
      // Add to background layer as first child (behind everything else)
      this.backgroundLayer.insertBefore(this.backgroundRect, this.backgroundLayer.firstChild);
    }
  }
  
  /**
   * Update grid and background to cover the current viewBox with buffer
   * @param {number} viewBoxX - Current viewBox X
   * @param {number} viewBoxY - Current viewBox Y  
   * @param {number} viewBoxWidth - Current viewBox width
   * @param {number} viewBoxHeight - Current viewBox height
   */
  updateGrid(viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight) {
    // Calculate coverage area with buffer
    const coverageX = viewBoxX - this.gridBuffer;
    const coverageY = viewBoxY - this.gridBuffer;
    const coverageWidth = viewBoxWidth + (this.gridBuffer * 2);
    const coverageHeight = viewBoxHeight + (this.gridBuffer * 2);
    
    // Update background rectangle
    if (this.backgroundRect) {
      this.backgroundRect.setAttribute('x', coverageX);
      this.backgroundRect.setAttribute('y', coverageY);
      this.backgroundRect.setAttribute('width', coverageWidth);
      this.backgroundRect.setAttribute('height', coverageHeight);
    }
    
    // Update grid rectangle
    if (this.gridRect) {
      this.gridRect.setAttribute('x', coverageX);
      this.gridRect.setAttribute('y', coverageY);
      this.gridRect.setAttribute('width', coverageWidth);
      this.gridRect.setAttribute('height', coverageHeight);
    }
    
    console.log(`🔄 Background and grid updated: ${coverageX}, ${coverageY} (${coverageWidth}x${coverageHeight})`);
  }
  
  /**
   * Set grid size and update pattern
   * @param {number} size - Grid size in pixels
   */
  setGridSize(size) {
    this.gridSize = size;
    this.createGridPattern();
    console.log(`📏 Grid size set to: ${size}px`);
  }
  
  /**
   * Set grid color and update pattern
   * @param {string} color - Grid color (CSS color value)
   */
  setGridColor(color) {
    this.gridColor = color;
    this.createGridPattern();
    console.log(`🎨 Grid color set to: ${color}`);
  }
  
  /**
   * Set grid opacity
   * @param {number} opacity - Grid opacity (0-1)
   */
  setGridOpacity(opacity) {
    this.gridOpacity = opacity;
    this.createGridPattern();
    console.log(`🔍 Grid opacity set to: ${opacity}`);
  }
  
  /**
   * Show/hide grid
   * @param {boolean} visible - Whether grid should be visible
   */
  setVisible(visible) {
    if (this.gridLayer) {
      this.gridLayer.style.display = visible ? 'block' : 'none';
      console.log(`👁️ Grid visibility set to: ${visible}`);
    }
  }
  
  /**
   * Get current grid configuration
   */
  getConfig() {
    return {
      size: this.gridSize,
      color: this.gridColor,
      opacity: this.gridOpacity,
      backgroundColor: this.backgroundColor,
      buffer: this.gridBuffer
    };
  }
  
  /**
   * Set grid buffer (how much beyond visible area to draw)
   * @param {number} buffer - Buffer size in pixels
   */
  setGridBuffer(buffer) {
    this.gridBuffer = buffer;
    console.log(`📏 Grid buffer set to: ${buffer}px`);
  }
  
  /**
   * Set background color
   * @param {string} color - Background color (CSS color value)
   */
  setBackgroundColor(color) {
    this.backgroundColor = color;
    if (this.backgroundRect) {
      this.backgroundRect.setAttribute('fill', color);
    }
    console.log(`🎨 Background color set to: ${color}`);
  }
  
  /**
   * Update method to handle window resize
   */
  handleResize() {
    // For now, just log the resize event
    console.log('📏 Window resized, updating grid and background');
    
    // TODO: Implement adaptive grid and background resizing
  }
}

// Version 020 - Added grid visibility toggle functionality
/**
 * GridManager - Pure CSS-driven infinite hierarchical grid system
 * 
 * This version eliminates JavaScript-based color updates entirely.
 * All grid and background colors are handled by CSS variables,
 * ensuring perfect synchronization with theme changes.
 */

export class GridManager {
  constructor(svg, layerManager = null) {
    this.svg = svg;
    this.layerManager = layerManager;
    this.gridSize = 20; // Default base grid size
    this.gridColor = '#e0e0e0';
    this.gridOpacity = 0.5;
    
    // Grid colors are now handled entirely by CSS variables (theme-aware)
    // No longer need to initialize colors in JavaScript
    
    // Infinite hierarchical grid settings
    this.gridMultiplier = 5; // Each level is 5x the previous level for perfect integer multiples
    this.maxVisibleLevels = 6; // Maximum number of levels to show at once (increased from 4)
    this.gridLevels = []; // Array to store all grid level data
    
    // Grid colors are now handled entirely by CSS variables (theme-aware)
    // No longer need to store colors in JavaScript
    
    // Dynamic zoom-based opacity settings
    this.enableDynamicOpacity = true;
    this.targetGridSpacing = 40; // Target spacing in viewport pixels for optimal visibility
    this.opacityFadeRange = 0.5; // How gradually opacity fades (0.1 = sharp, 1.0 = gradual)
    this.minVisibleOpacity = 0.05; // Minimum opacity before grid becomes invisible
    this.maxVisibleOpacity = 1.0; // Maximum opacity for any grid level
    this.currentZoom = 1.0; // Track current zoom level
    
    // Level calculation
    this.activeStartLevel = 0; // Starting level index for currently active levels
    this.needsRecalculation = true; // Flag to trigger level recalculation
    
    // Dynamic zoom-based opacity settings
    this.enableDynamicOpacity = true;
    this.targetGridSpacing = 40; // Target spacing in viewport pixels for optimal visibility
    this.opacityFadeRange = 0.5; // How gradually opacity fades (0.1 = sharp, 1.0 = gradual)
    this.minVisibleOpacity = 0.05; // Minimum opacity before grid becomes invisible
    this.maxVisibleOpacity = 1.0; // Maximum opacity for any grid level
    this.currentZoom = 1.0; // Track current zoom level
    
    // Grid visibility state
    this.gridVisible = true; // Default to visible
    
    // Grid elements
    this.gridPatterns = new Map(); // Map of pattern ID to pattern element
    this.gridRects = new Map(); // Map of level to rectangle element
    this.backgroundRect = null;
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
    
    // Force initial calculation of grid levels
    this.calculateRequiredLevels();
    
    // Create or update infinite grid patterns
    this.createGridPatterns();
    
    // Create or update grid rectangles
    this.createGridRects();
    
    console.log('✅ GridManager initialized with infinite hierarchical grid system');
  }
  
  /**
   * Toggle grid visibility
   */
  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.updateGridVisibility();
    console.log(`🔄 Grid visibility toggled: ${this.gridVisible ? 'visible' : 'hidden'}`);
  }
  
  /**
   * Show the grid
   */
  showGrid() {
    this.gridVisible = true;
    this.updateGridVisibility();
    console.log('✅ Grid shown');
  }
  
  /**
   * Hide the grid
   */
  hideGrid() {
    this.gridVisible = false;
    this.updateGridVisibility();
    console.log('🔄 Grid hidden');
  }
  
  /**
   * Update grid visibility based on current state
   */
  updateGridVisibility() {
    if (this.gridLayer) {
      this.gridLayer.style.display = this.gridVisible ? 'block' : 'none';
    }
  }
  
  /**
   * Get current grid visibility state
   */
  isGridVisible() {
    return this.gridVisible;
  }
  
  /**
   * Create the infinite hierarchical grid patterns
   */
  createGridPatterns() {
    console.log('🔧 Creating grid patterns...');
    
    // Find or create defs element
    let defs = this.gridLayer.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.gridLayer.appendChild(defs);
    }
    
    // Remove existing patterns
    this.gridPatterns.clear();
    const existingPatterns = defs.querySelectorAll('pattern[id^="grid-level-"]');
    console.log(`🗑️ Removing ${existingPatterns.length} existing patterns`);
    existingPatterns.forEach(pattern => pattern.remove());
    
    // Calculate required levels if needed
    if (this.needsRecalculation) {
      this.calculateRequiredLevels();
      this.needsRecalculation = false;
    }
    
    if (this.gridLevels.length === 0) {
      console.warn('⚠️ No grid levels calculated, falling back to basic grid');
      // Fallback: create a basic grid
      this.gridLevels = [{
        level: 0,
        size: this.gridSize,
        apparentSize: this.gridSize * this.currentZoom,
        id: 'grid-level-0',
        color: '#e0e0e0',
        strokeWidth: 1
      }];
    }
    
    // Create patterns for all required levels
    this.gridLevels.forEach((levelData, index) => {
      const pattern = this.createGridPattern(
        defs, 
        levelData.id, 
        levelData.size, 
        index, // Use array index as level for CSS variable mapping
        1.0, // Opacity will be handled dynamically
        levelData.strokeWidth
      );
      this.gridPatterns.set(levelData.id, pattern);
    });
    
    console.log(`✅ Created ${this.gridLevels.length} infinite grid patterns`);
  }
  
  /**
   * Create a single grid pattern with explicit alignment
   * @param {Element} defs - The defs element to add pattern to
   * @param {string} id - Pattern ID
   * @param {number} size - Grid size
   * @param {number} level - Grid level index (for CSS variable mapping)
   * @param {number} opacity - Grid opacity
   * @param {number} strokeWidth - Line stroke width (default 1)
   * @returns {Element} The created pattern element
   */
  createGridPattern(defs, id, size, level, opacity, strokeWidth = 1) {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', id);
    pattern.setAttribute('width', size);
    pattern.setAttribute('height', size);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    // CRITICAL FIX: Explicit pattern alignment to ensure all grids start from same origin
    // Set pattern x and y to 0 to force alignment to coordinate origin
    pattern.setAttribute('x', '0');
    pattern.setAttribute('y', '0');
    
    console.log(`🔧 Creating CSS-driven pattern ${id} with size ${size}px, level ${level}, forced origin (0,0)`);
    
    // Create grid lines with CSS variable colors
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${size} 0 L 0 0 0 ${size}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', `var(--grid-level-${level})`);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('opacity', opacity);
    path.setAttribute('class', `grid-line grid-level-${level}`);
    
    pattern.appendChild(path);
    defs.appendChild(pattern);
    
    return pattern;
  }
  
  /**
   * Create or update the grid rectangles for all levels
   */
  createGridRects() {
    console.log('🔧 Creating grid rectangles...');
    
    // Remove existing grid rects
    this.gridRects.clear();
    const existingRects = this.gridLayer.querySelectorAll('rect[class^="grid-level-"]');
    console.log(`🗑️ Removing ${existingRects.length} existing rectangles`);
    existingRects.forEach(rect => rect.remove());
    
    if (this.gridLevels.length === 0) {
      console.warn('⚠️ No grid levels available for rectangle creation');
      return;
    }
    
    // Create rectangles for all required levels (in reverse order so finer grids are on top)
    this.gridLevels.slice().reverse().forEach((levelData, index) => {
      console.log(`🔧 Creating rectangle for level ${levelData.level} (${levelData.size}px) with pattern url(#${levelData.id})`);
      const rect = this.createGridRect(`grid-level-${levelData.level}`, `url(#${levelData.id})`);
      this.gridRects.set(levelData.level, rect);
      
      // Verify the pattern exists
      const pattern = this.gridLayer.querySelector(`defs pattern#${levelData.id}`);
      if (!pattern) {
        console.error(`❌ Pattern #${levelData.id} not found for level ${levelData.level}!`);
      }
    });
    
    // Initial size - will be updated by updateGrid()
    this.updateGridBounds(0, 0, 800, 600);
    
    console.log(`✅ Created ${this.gridLevels.length} infinite grid rectangles`);
    console.log(`📊 Rectangle map:`, Array.from(this.gridRects.keys()).map(k => `L${k}`).join(', '));
  }
  
  /**
   * Create a single grid rectangle
   * @param {string} className - CSS class name for the rectangle
   * @param {string} fill - Fill pattern URL
   * @returns {Element} The created rectangle element
   */
  createGridRect(className, fill) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', className);
    rect.setAttribute('fill', fill);
    rect.setAttribute('pointer-events', 'none'); // Don't interfere with interactions
    
    // Add to grid layer
    this.gridLayer.appendChild(rect);
    
    return rect;
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
      
      // Create new background rectangle with CSS-driven color
      this.backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.backgroundRect.setAttribute('class', 'diagram-background grid-background');
      this.backgroundRect.setAttribute('fill', 'var(--grid-background)');
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
      this.setRectBounds(this.backgroundRect, coverageX, coverageY, coverageWidth, coverageHeight);
    }
    
    // Update all grid rectangles
    if (this.superGridRect) {
      this.setRectBounds(this.superGridRect, coverageX, coverageY, coverageWidth, coverageHeight);
    }
    if (this.majorGridRect) {
      this.setRectBounds(this.majorGridRect, coverageX, coverageY, coverageWidth, coverageHeight);
    }
    if (this.minorGridRect) {
      this.setRectBounds(this.minorGridRect, coverageX, coverageY, coverageWidth, coverageHeight);
    }
    
    console.log(`🔄 Background and hierarchical grid updated: ${coverageX}, ${coverageY} (${coverageWidth}x${coverageHeight})`);
  }
  
  /**
   * Update grid with zoom-aware opacity adjustments
   * @param {number} viewBoxX - Current viewBox X
   * @param {number} viewBoxY - Current viewBox Y  
   * @param {number} viewBoxWidth - Current viewBox width
   * @param {number} viewBoxHeight - Current viewBox height
   * @param {number} zoom - Current zoom level (optional, will calculate if not provided)
   */
  updateGrid(viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight, zoom = null) {
    // Calculate or use provided zoom level
    const oldZoom = this.currentZoom;
    if (zoom !== null) {
      this.currentZoom = zoom;
    } else {
      // Estimate zoom based on viewBox width (assuming initial width of ~800)
      this.currentZoom = 800 / viewBoxWidth;
    }
    
    console.log(`🔄 Grid update: viewBox ${viewBoxWidth.toFixed(1)}x${viewBoxHeight.toFixed(1)}, zoom ${oldZoom.toFixed(2)}x → ${this.currentZoom.toFixed(2)}x`);
    
    // Check if zoom changed significantly enough to require level recalculation
    const zoomChangeThreshold = 0.15; // 15% change (reduced from 20% for more responsive updates)
    const zoomChanged = oldZoom === 0 || Math.abs(this.currentZoom - oldZoom) / oldZoom > zoomChangeThreshold;
    
    if (zoomChanged) {
      console.log(`🔄 Zoom change ${((this.currentZoom - oldZoom) / oldZoom * 100).toFixed(1)}% triggers recalculation`);
      this.needsRecalculation = true;
    }
    
    // ALWAYS recalculate apparent sizes even if we don't recreate patterns
    this.gridLevels.forEach(levelData => {
      levelData.apparentSize = levelData.size * this.currentZoom;
    });
    
    // Recalculate and recreate grid if needed
    if (this.needsRecalculation) {
      this.createGridPatterns();
      this.createGridRects();
    }
    
    // Update grid patterns with dynamic opacity if enabled
    if (this.enableDynamicOpacity) {
      this.updateDynamicOpacity();
    }
    
    // Update grid bounds
    this.updateGridBounds(viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight);
    
    console.log(`🔄 Infinite grid updated (zoom: ${this.currentZoom.toFixed(2)}x, ${this.gridLevels.length} levels active)`);
  }

  /**
   * Update the bounds of all grid rectangles with smart alignment
   * @param {number} viewBoxX - Current viewBox X
   * @param {number} viewBoxY - Current viewBox Y  
   * @param {number} viewBoxWidth - Current viewBox width
   * @param {number} viewBoxHeight - Current viewBox height
   */
  updateGridBounds(viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight) {
    // Calculate coverage area with buffer
    const coverageX = viewBoxX - this.gridBuffer;
    const coverageY = viewBoxY - this.gridBuffer;
    const coverageWidth = viewBoxWidth + (this.gridBuffer * 2);
    const coverageHeight = viewBoxHeight + (this.gridBuffer * 2);
    
    // For pattern alignment, use the base grid size as the alignment reference
    // This ensures that all patterns align to the same coordinate system
    const alignedX = Math.floor(coverageX / this.gridSize) * this.gridSize;
    const alignedY = Math.floor(coverageY / this.gridSize) * this.gridSize;
    
    // Expand to cover the required area
    const alignedWidth = Math.ceil((coverageX + coverageWidth - alignedX) / this.gridSize) * this.gridSize;
    const alignedHeight = Math.ceil((coverageY + coverageHeight - alignedY) / this.gridSize) * this.gridSize;
    
    console.log(`🔧 Smart pattern alignment: coverage=(${coverageX.toFixed(1)}, ${coverageY.toFixed(1)}) → grid=(${alignedX}, ${alignedY}), base=${this.gridSize}px`);
    
    // Update background rectangle (no alignment constraint for background)
    if (this.backgroundRect) {
      this.setRectBounds(this.backgroundRect, coverageX, coverageY, coverageWidth, coverageHeight);
    }
    
    // Update all grid rectangles with aligned coordinates
    this.gridRects.forEach(rect => {
      this.setRectBounds(rect, alignedX, alignedY, alignedWidth, alignedHeight);
    });
  }

  /**
   * Snap a coordinate to the base grid
   * @param {number} coordinate - The coordinate to snap
   * @returns {number} Snapped coordinate
   */
  snapToGrid(coordinate) {
    return Math.floor(coordinate / this.gridSize) * this.gridSize;
  }

  /**
   * Calculate and apply dynamic opacity based on current zoom level
   */
  updateDynamicOpacity() {
    if (this.gridLevels.length === 0) {
      console.warn('📊 No grid levels available for dynamic opacity update');
      return;
    }
    
    console.log(`📊 Updating dynamic opacity for ${this.gridLevels.length} levels at zoom ${this.currentZoom.toFixed(2)}x`);
    
    // Calculate opacity for each active grid level
    const opacityUpdates = [];
    
    this.gridLevels.forEach(levelData => {
      // Ensure apparent size is up to date
      levelData.apparentSize = levelData.size * this.currentZoom;
      
      const opacity = this.calculateZoomBasedOpacity(levelData.apparentSize);
      opacityUpdates.push(`L${levelData.level}(${levelData.size.toFixed(0)}px*${this.currentZoom.toFixed(2)}=${levelData.apparentSize.toFixed(1)}px→${opacity.toFixed(2)})`);
      
      // Apply calculated opacity
      this.updatePatternOpacity(levelData.id, opacity);
      
      // Log if opacity is very low
      if (opacity < 0.1) {
        console.warn(`⚠️ Level ${levelData.level} has very low opacity: ${opacity.toFixed(3)} (apparent: ${levelData.apparentSize.toFixed(1)}px)`);
      }
    });
    
    console.log(`📊 Opacity updates: ${opacityUpdates.join(', ')}`);
  }

  /**
   * Calculate opacity for a grid level based on its apparent spacing
   * @param {number} apparentSpacing - The spacing in viewport pixels
   * @returns {number} Calculated opacity (0-1)
   */
  calculateZoomBasedOpacity(apparentSpacing) {
    // Enhanced opacity mapping for 6-level visual hierarchy
    // More granular ranges for better differentiation of 6 levels
    let opacity;
    
    if (apparentSpacing < 3) {
      opacity = 0.02; // Extremely fine grids are nearly invisible
    } else if (apparentSpacing < 6) {
      opacity = 0.06; // Very fine grids are very faint
    } else if (apparentSpacing < 10) {
      opacity = 0.12; // Fine grids are faint
    } else if (apparentSpacing < 18) {
      opacity = 0.25; // Small grids are subtle
    } else if (apparentSpacing < 30) {
      opacity = 0.40; // Medium-small grids are moderate
    } else if (apparentSpacing < 50) {
      opacity = 0.60; // Medium grids are clearly visible
    } else if (apparentSpacing < 80) {
      opacity = 0.80; // Large grids are prominent
    } else if (apparentSpacing < 120) {
      opacity = 0.90; // Large grids are very visible
    } else if (apparentSpacing < 200) {
      opacity = 0.85; // Very large grids slightly reduced
    } else if (apparentSpacing < 300) {
      opacity = 0.70; // Extra large grids moderate
    } else if (apparentSpacing < 500) {
      opacity = 0.55; // Huge grids subtle
    } else if (apparentSpacing < 800) {
      opacity = 0.40; // Very huge grids
    } else if (apparentSpacing < 1200) {
      opacity = 0.30; // Extremely large grids
    } else {
      opacity = 0.20; // Ultra large grids still visible
    }
    
    // Apply quality score multiplier if available, but don't let it make things too faint
    const currentLevel = this.gridLevels.find(level => 
      Math.abs(level.apparentSize - apparentSpacing) < 0.1
    );
    if (currentLevel && currentLevel.qualityScore) {
      // Limit quality score impact to prevent invisibility
      const qualityMultiplier = Math.max(0.4, currentLevel.qualityScore);
      opacity *= qualityMultiplier;
    }
    
    // Clamp to min/max bounds
    return Math.max(this.minVisibleOpacity, Math.min(this.maxVisibleOpacity, opacity));
  }

  /**
   * Update the opacity of a specific grid pattern
   * @param {string} patternId - ID of the pattern to update
   * @param {number} opacity - New opacity value
   */
  updatePatternOpacity(patternId, opacity) {
    const defs = this.gridLayer.querySelector('defs');
    if (!defs) return;
    
    const pattern = defs.querySelector(`#${patternId}`);
    if (pattern) {
      const path = pattern.querySelector('path');
      if (path) {
        path.setAttribute('opacity', opacity);
      }
    }
  }
  
  /**
   * Helper method to set rectangle bounds
   * @param {Element} rect - Rectangle element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   */
  setRectBounds(rect, x, y, width, height) {
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
  }
  
  /**
   * Set grid size and mark for recalculation
   * @param {number} size - Base grid size in pixels
   */
  setGridSize(size) {
    this.gridSize = size;
    this.needsRecalculation = true;
    console.log(`📏 Grid size set to: ${size}px`);
  }
  
  /**
   * Set minor grid color and mark for recalculation
   * @param {string} color - Grid color (CSS color value)
   */
  setGridColor(color) {
    this.gridColor = color;
    this.needsRecalculation = true;
    console.log(`🎨 Minor grid color set to: ${color}`);
  }
  
  /**
   * Set major grid color and mark for recalculation
   * @param {string} color - Major grid color (CSS color value)
   */
  setMajorGridColor(color) {
    this.majorGridColor = color;
    this.needsRecalculation = true;
    console.log(`🎨 Major grid color set to: ${color}`);
  }
  
  /**
   * Set super grid color and mark for recalculation
   * @param {string} color - Super grid color (CSS color value)
   */
  setSuperGridColor(color) {
    this.superGridColor = color;
    this.needsRecalculation = true;
    console.log(`🎨 Super grid color set to: ${color}`);
  }
  
  /**
   * Set grid opacity and mark for recalculation
   * @param {number} opacity - Minor grid opacity (0-1)
   */
  setGridOpacity(opacity) {
    this.gridOpacity = opacity;
    this.needsRecalculation = true;
    console.log(`🔍 Minor grid opacity set to: ${opacity}`);
  }
  
  /**
   * Set major grid opacity and mark for recalculation
   * @param {number} opacity - Major grid opacity (0-1)
   */
  setMajorGridOpacity(opacity) {
    this.majorGridOpacity = opacity;
    this.needsRecalculation = true;
    console.log(`🔍 Major grid opacity set to: ${opacity}`);
  }

  /**
   * Set super grid opacity and mark for recalculation
   * @param {number} opacity - Super grid opacity (0-1)
   */
  setSuperGridOpacity(opacity) {
    this.superGridOpacity = opacity;
    this.needsRecalculation = true;
    console.log(`🔍 Super grid opacity set to: ${opacity}`);
  }
  
  /**
   * Set major grid multiplier and mark for recalculation
   * @param {number} multiplier - Multiplier value
   */
  setMajorGridMultiplier(multiplier) {
    this.majorGridMultiplier = multiplier;
    this.needsRecalculation = true;
    console.log(`📐 Major grid multiplier set to: ${multiplier}`);
  }
  
  /**
   * Set super grid multiplier and mark for recalculation
   * @param {number} multiplier - Multiplier value
   */
  setSuperGridMultiplier(multiplier) {
    this.superGridMultiplier = multiplier;
    this.needsRecalculation = true;
    console.log(`📐 Super grid multiplier set to: ${multiplier}`);
  }
  
  /**
   * Set grid multiplier (how much each level increases)
   * @param {number} multiplier - Multiplier value (e.g., 5 means each level is 5x bigger)
   */
  setGridMultiplier(multiplier) {
    this.gridMultiplier = multiplier;
    this.needsRecalculation = true;
    console.log(`📐 Grid multiplier set to: ${multiplier}`);
  }

  /**
   * Set maximum number of visible levels
   * @param {number} maxLevels - Maximum levels to show at once
   */
  setMaxVisibleLevels(maxLevels) {
    this.maxVisibleLevels = maxLevels;
    this.needsRecalculation = true;
    console.log(`📊 Max visible levels set to: ${maxLevels}`);
  }

  /**
   * Get current grid configuration for debugging
   * @returns {Object} Configuration object
   */
  getConfig() {
    const activeLevels = this.gridLevels.length;
    const levelRange = activeLevels > 0 ? 
      `L${Math.min(...this.gridLevels.map(l => l.level))} to L${Math.max(...this.gridLevels.map(l => l.level))}` : 
      'None';
    
    return {
      activeLevels: activeLevels,
      levelRange: levelRange,
      enableDynamicOpacity: this.enableDynamicOpacity,
      currentZoom: this.currentZoom,
      gridMultiplier: this.gridMultiplier,
      maxVisibleLevels: this.maxVisibleLevels
    };
  }

  /**
   * Force recalculation of all grid levels
   */
  forceRecalculation() {
    console.log('🔄 Forcing grid recalculation...');
    this.calculateRequiredLevels();
    this.createGridPatterns();
    if (this.enableDynamicOpacity) {
      this.updateDynamicOpacity();
    }
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
      gridMultiplier: this.gridMultiplier,
      maxVisibleLevels: this.maxVisibleLevels,
      activeLevels: this.gridLevels.length,
      backgroundColor: this.backgroundColor,
      buffer: this.gridBuffer,
      enableDynamicOpacity: this.enableDynamicOpacity,
      targetGridSpacing: this.targetGridSpacing,
      opacityFadeRange: this.opacityFadeRange,
      minVisibleOpacity: this.minVisibleOpacity,
      currentZoom: this.currentZoom,
      levelRange: this.gridLevels.length > 0 ? 
        `${this.gridLevels[0].level} to ${this.gridLevels[this.gridLevels.length - 1].level}` : 'None'
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
   * Enable or disable dynamic opacity based on zoom level
   * @param {boolean} enabled - Whether to enable dynamic opacity
   */
  setDynamicOpacityEnabled(enabled) {
    this.enableDynamicOpacity = enabled;
    if (enabled) {
      this.updateDynamicOpacity();
    } else {
      // Reset to static opacities
      this.createGridPatterns();
    }
    console.log(`🎛️ Dynamic opacity ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set target grid spacing for optimal visibility
   * @param {number} spacing - Target spacing in viewport pixels
   */
  setTargetGridSpacing(spacing) {
    this.targetGridSpacing = spacing;
    if (this.enableDynamicOpacity) {
      this.updateDynamicOpacity();
    }
    console.log(`🎯 Target grid spacing set to: ${spacing}px`);
  }

  /**
   * Set opacity fade range (how gradually opacity changes)
   * @param {number} range - Fade range (0.1 = sharp, 1.0 = gradual)
   */
  setOpacityFadeRange(range) {
    this.opacityFadeRange = range;
    if (this.enableDynamicOpacity) {
      this.updateDynamicOpacity();
    }
    console.log(`📉 Opacity fade range set to: ${range}`);
  }

  /**
   * Set minimum visible opacity
   * @param {number} opacity - Minimum opacity (0-1)
   */
  setMinVisibleOpacity(opacity) {
    this.minVisibleOpacity = opacity;
    if (this.enableDynamicOpacity) {
      this.updateDynamicOpacity();
    }
    console.log(`🔅 Minimum visible opacity set to: ${opacity}`);
  }

  /**
   * Calculate grid levels needed for current zoom level with expanded visibility
   */
  calculateRequiredLevels() {
    console.log(`🔍 Calculating grid levels for zoom: ${this.currentZoom.toFixed(2)}x`);
    console.log(`🔍 Base grid size: ${this.gridSize}px, Multiplier: ${this.gridMultiplier}x`);
    
    const levels = [];
    
    // More generous visibility range to capture more levels
    const minSpacing = 2; // Allow even finer grids (reduced from 3px)
    const maxSpacing = 1500; // Allow larger grids (increased from 1200px)
    const preferredMinSpacing = 6; // Preferred minimum for good visibility (reduced from 8px)
    const preferredMaxSpacing = 500; // Preferred maximum for good visibility (increased from 400px)
    
    // Find the level range that covers our visibility range
    let level = -10; // Start with very fine levels (for high zoom)
    while (level < 20) { // Go up to very coarse levels (for low zoom)
      // Calculate exact spacing for this level
      const exactSpacing = this.gridSize * Math.pow(this.gridMultiplier, level);
      const apparentSpacing = exactSpacing * this.currentZoom;
      
      // Enhanced debug logging to understand what's happening
      if (level >= -2 && level <= 8) {
        console.log(`🔍 Level ${level}: exact=${exactSpacing.toFixed(2)}px, apparent=${apparentSpacing.toFixed(2)}px, visible=${apparentSpacing >= minSpacing && apparentSpacing <= maxSpacing}, preferred=${apparentSpacing >= preferredMinSpacing && apparentSpacing <= preferredMaxSpacing}`);
      }
      
      if (apparentSpacing >= minSpacing && apparentSpacing <= maxSpacing) {
        // Calculate quality score - higher for spacing closer to preferred range
        let qualityScore = 1.0;
        if (apparentSpacing < preferredMinSpacing) {
          qualityScore = 0.3 + 0.7 * (apparentSpacing / preferredMinSpacing);
        } else if (apparentSpacing > preferredMaxSpacing) {
          qualityScore = 0.3 + 0.7 * (preferredMaxSpacing / apparentSpacing);
        }
        
        levels.push({
          level: level,
          size: exactSpacing,
          apparentSize: apparentSpacing,
          id: `grid-level-${level}`,
          strokeWidth: this.getLevelStrokeWidth(level),
          qualityScore: qualityScore
        });
      }
      level++;
    }
    
    console.log(`🔍 Found ${levels.length} potential levels at zoom ${this.currentZoom.toFixed(2)}x`);
    
    // Sort by level (from fine to coarse)
    levels.sort((a, b) => a.level - b.level);
    
    // Ensure we have at least 6 levels visible
    if (levels.length < 6) {
      console.warn(`⚠️ Only found ${levels.length} levels, expanding search range...`);
      
      // If we don't have enough levels, be more aggressive and include marginal levels
      const expandedLevels = [];
      level = -15;
      while (level < 25) {
        const exactSpacing = this.gridSize * Math.pow(this.gridMultiplier, level);
        const apparentSpacing = exactSpacing * this.currentZoom;
        
        // Much more lenient criteria to ensure we get enough levels
        if (apparentSpacing >= 1 && apparentSpacing <= 2500) {
          expandedLevels.push({
            level: level,
            size: exactSpacing,
            apparentSize: apparentSpacing,
            id: `grid-level-${level}`,
            strokeWidth: this.getLevelStrokeWidth(level),
            qualityScore: 0.5 // Lower quality but still usable
          });
        }
        level++;
      }
      
      console.log(`🔍 Expanded search found ${expandedLevels.length} total levels`);
      
      // Sort and take the best ones around target spacing
      expandedLevels.sort((a, b) => 
        Math.abs(a.apparentSize - this.targetGridSpacing) - 
        Math.abs(b.apparentSize - this.targetGridSpacing)
      );
      
      this.gridLevels = expandedLevels.slice(0, Math.max(6, this.maxVisibleLevels));
    } else {
      // Select best levels around the target spacing
      if (levels.length > this.maxVisibleLevels) {
        // Find the level closest to target spacing
        const targetLevel = levels.reduce((closest, current) => 
          Math.abs(current.apparentSize - this.targetGridSpacing) < 
          Math.abs(closest.apparentSize - this.targetGridSpacing) ? current : closest
        );
        
        const targetIndex = levels.indexOf(targetLevel);
        
        // Try to center around the target level, ensuring we get the requested number
        let startIndex = Math.max(0, targetIndex - Math.floor(this.maxVisibleLevels / 2));
        let endIndex = Math.min(levels.length, startIndex + this.maxVisibleLevels);
        
        // Adjust if we don't have enough levels at the end
        if (endIndex - startIndex < this.maxVisibleLevels) {
          startIndex = Math.max(0, endIndex - this.maxVisibleLevels);
        }
        
        this.gridLevels = levels.slice(startIndex, endIndex);
        console.log(`🎯 Selected levels ${startIndex} to ${endIndex-1} from ${levels.length} available`);
      } else {
        this.gridLevels = levels;
      }
    }
    
    // Ensure minimum of 6 levels even if we have to create synthetic ones
    if (this.gridLevels.length < 6 && this.gridLevels.length > 0) {
      console.warn(`⚠️ Still only ${this.gridLevels.length} levels, creating synthetic levels...`);
      
      const baseLevel = this.gridLevels[this.gridLevels.length - 1]; // Use the coarsest level as base
      while (this.gridLevels.length < 6) {
        const syntheticLevel = baseLevel.level + this.gridLevels.length - (this.gridLevels.length - 1);
        this.gridLevels.push({
          level: syntheticLevel,
          size: this.gridSize * Math.pow(this.gridMultiplier, syntheticLevel),
          apparentSize: this.gridSize * Math.pow(this.gridMultiplier, syntheticLevel) * this.currentZoom,
          id: `grid-level-${syntheticLevel}`,
          strokeWidth: this.getLevelStrokeWidth(syntheticLevel),
          qualityScore: 0.4
        });
      }
    }
    
    // Sort final levels by level
    this.gridLevels.sort((a, b) => a.level - b.level);
    
    // Update apparent sizes for all levels (in case zoom changed)
    this.gridLevels.forEach(levelData => {
      levelData.apparentSize = levelData.size * this.currentZoom;
    });
    
    console.log(`📊 FINAL: Selected ${this.gridLevels.length} grid levels for zoom ${this.currentZoom.toFixed(2)}x:`, 
      this.gridLevels.map(l => `L${l.level}(${l.size.toFixed(1)}px→${l.apparentSize.toFixed(1)}px)`).join(', '));
  }

  /**
   * Snap a grid size to ensure perfect multiples for pattern alignment
   * @param {number} size - The calculated grid size
   * @returns {number} Snapped grid size that's an exact multiple of base size
   */
  snapToGridSize(size) {
    // Ensure minimum size is the base grid size
    if (size < this.gridSize) {
      return this.gridSize;
    }
    
    // Force exact integer multiples to prevent floating point alignment issues
    const exactMultiplier = Math.round(size / this.gridSize);
    const snappedSize = exactMultiplier * this.gridSize;
    
    console.log(`📐 Enforcing exact multiple: ${size.toFixed(2)}px → ${snappedSize}px (${exactMultiplier}x base)`);
    
    return snappedSize;
  }

  /**
   * Get stroke width for a grid level
   * @param {number} level - Grid level index
   * @returns {number} Stroke width in pixels
   */
  getLevelStrokeWidth(level) {
    // Higher levels (coarser grids) get thicker strokes
    return Math.min(5, Math.max(1, 1 + level * 0.3));
  }

  /**
   * Update method to handle window resize
   */
  handleResize() {
    // For now, just log the resize event
    console.log('📏 Window resized, updating grid and background');
    
    // TODO: Implement adaptive grid and background resizing
  }

  /**
   * Initialize theme colors (NO-OP since we use CSS variables)
   * This method is kept for backward compatibility but does nothing
   * since grid colors are now handled entirely by CSS variables
   */
  initializeThemeColors() {
    console.log('🎨 Grid now uses CSS variables - no manual color initialization needed');
  }

  /**
   * Update theme colors (NO-OP since we use CSS variables)
   * This method is kept for backward compatibility but does nothing
   * since grid colors are now handled entirely by CSS variables
   */
  updateThemeColors() {
    console.log('🎨 Grid now uses CSS variables - no manual color updates needed');
  }
}

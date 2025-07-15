/**
 * ScreenLayoutManager - Manages viewport dimensions and aspect ratios
 * Allows switching between different screen layouts (phone, tablet, desktop, TV, etc.)
 */
export class ScreenLayoutManager {
  constructor(svgElement, viewBoxManager) {
    this.svg = svgElement;
    this.viewBoxManager = viewBoxManager;
    this.currentLayout = null;
    this.layouts = {};
    this.categories = {};
    this.settings = {};
    this.onLayoutChangeCallback = null;
    
    // Initialize with default dimensions
    this.originalWidth = parseInt(this.svg.getAttribute('width')) || 800;
    this.originalHeight = parseInt(this.svg.getAttribute('height')) || 600;
    
    console.log('🖥️ ScreenLayoutManager initialized');
  }
  
  /**
   * Load layouts from configuration file
   */
  async loadLayouts() {
    try {
      const response = await fetch('/config/screen-layouts.json');
      if (!response.ok) {
        throw new Error(`Failed to load screen layouts: ${response.status}`);
      }
      
      const config = await response.json();
      this.layouts = config.layouts;
      this.categories = config.categories;
      this.settings = config.settings;
      
      // Set default layout
      if (this.settings.defaultLayout && this.layouts[this.settings.defaultLayout]) {
        this.setLayout(this.settings.defaultLayout);
      }
      
      console.log('📱 Screen layouts loaded:', Object.keys(this.layouts));
      return true;
    } catch (error) {
      console.error('❌ Failed to load screen layouts:', error);
      return false;
    }
  }
  
  /**
   * Set a specific layout
   */
  setLayout(layoutId, customDimensions = null) {
    if (layoutId === 'custom' && customDimensions) {
      this.layouts.custom.width = customDimensions.width;
      this.layouts.custom.height = customDimensions.height;
      this.layouts.custom.aspectRatio = this.calculateAspectRatio(customDimensions.width, customDimensions.height);
    }
    
    if (!this.layouts[layoutId]) {
      console.error(`❌ Layout '${layoutId}' not found`);
      return false;
    }
    
    const layout = this.layouts[layoutId];
    const previousLayout = this.currentLayout;
    
    console.log(`🖥️ Switching to layout: ${layout.name} (${layout.width}x${layout.height})`);
    
    // Update SVG dimensions
    this.updateSVGDimensions(layout.width, layout.height);
    
    // Update viewBox if needed
    if (this.viewBoxManager) {
      this.viewBoxManager.updateViewBoxForLayout(layout);
    }
    
    // Store current layout
    this.currentLayout = {
      id: layoutId,
      ...layout
    };
    
    // Trigger callback if set
    if (this.onLayoutChangeCallback) {
      this.onLayoutChangeCallback(this.currentLayout, previousLayout);
    }
    
    return true;
  }
  
  /**
   * Update SVG dimensions with transition animation
   */
  updateSVGDimensions(width, height) {
    const duration = this.settings.animateTransition ? this.settings.transitionDuration : 0;
    
    if (duration > 0) {
      // Animate the transition
      this.svg.style.transition = `width ${duration}ms ease, height ${duration}ms ease`;
      
      // Remove transition after animation completes
      setTimeout(() => {
        this.svg.style.transition = '';
      }, duration);
    }
    
    // Update dimensions
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    
    // Update CSS styles for responsive behavior
    this.svg.style.width = width + 'px';
    this.svg.style.height = height + 'px';
    
    // Update viewBox to maintain aspect ratio if needed
    if (this.settings.maintainAspectRatio) {
      this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
  }
  
  /**
   * Get current layout information
   */
  getCurrentLayout() {
    return this.currentLayout;
  }
  
  /**
   * Get all available layouts
   */
  getLayouts() {
    return this.layouts;
  }
  
  /**
   * Get layouts by category
   */
  getLayoutsByCategory(category) {
    return Object.entries(this.layouts)
      .filter(([_, layout]) => layout.category === category)
      .reduce((acc, [id, layout]) => {
        acc[id] = layout;
        return acc;
      }, {});
  }
  
  /**
   * Get all categories
   */
  getCategories() {
    return this.categories;
  }
  
  /**
   * Calculate aspect ratio from dimensions
   */
  calculateAspectRatio(width, height) {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }
  
  /**
   * Reset to original dimensions
   */
  resetToOriginal() {
    console.log('🔄 Resetting to original dimensions');
    this.updateSVGDimensions(this.originalWidth, this.originalHeight);
    this.currentLayout = null;
    
    if (this.onLayoutChangeCallback) {
      this.onLayoutChangeCallback(null, this.currentLayout);
    }
  }
  
  /**
   * Set callback for layout changes
   */
  setOnLayoutChangeCallback(callback) {
    this.onLayoutChangeCallback = callback;
  }
  
  /**
   * Get current dimensions
   */
  getCurrentDimensions() {
    return {
      width: parseInt(this.svg.getAttribute('width')),
      height: parseInt(this.svg.getAttribute('height'))
    };
  }
  
  /**
   * Check if current layout is responsive
   */
  isResponsive() {
    return this.settings.scaleToFit;
  }
  
  /**
   * Update layout settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ Layout settings updated:', this.settings);
  }
  
  /**
   * Create a custom layout
   */
  createCustomLayout(name, width, height, description = '') {
    const id = `custom-${Date.now()}`;
    const aspectRatio = this.calculateAspectRatio(width, height);
    
    this.layouts[id] = {
      name,
      width,
      height,
      aspectRatio,
      description,
      category: 'other',
      custom: true
    };
    
    console.log(`📐 Custom layout created: ${name} (${width}x${height})`);
    return id;
  }
  
  /**
   * Remove a custom layout
   */
  removeCustomLayout(layoutId) {
    if (this.layouts[layoutId] && this.layouts[layoutId].custom) {
      delete this.layouts[layoutId];
      console.log(`🗑️ Custom layout removed: ${layoutId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Export current layout configuration
   */
  exportConfig() {
    return {
      layouts: this.layouts,
      categories: this.categories,
      settings: this.settings,
      currentLayout: this.currentLayout
    };
  }
  
  /**
   * Import layout configuration
   */
  importConfig(config) {
    if (config.layouts) this.layouts = config.layouts;
    if (config.categories) this.categories = config.categories;
    if (config.settings) this.settings = config.settings;
    
    console.log('📥 Layout configuration imported');
  }
}

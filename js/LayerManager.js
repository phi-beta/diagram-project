// Version 001 - SVG Layer Manager for organizing diagram elements
/**
 * LayerManager - Manages SVG layers for better organization and performance
 */

export class LayerManager {
  constructor(svg) {
    this.svg = svg;
    this.layers = new Map();
    this.initialized = false;
    
    this.initializeLayers();
  }
  
  /**
   * Initialize layer references
   */
  initializeLayers() {
    const layerIds = [
      'background',
      'grid', 
      'edges',
      'nodes',
      'temp',
      'ui',
      'debug'
    ];
    
    layerIds.forEach(layerId => {
      const layer = this.svg.getElementById(`${layerId}-layer`);
      if (layer) {
        this.layers.set(layerId, layer);
        console.log(`✅ Layer initialized: ${layerId}`);
      } else {
        console.warn(`⚠️ Layer not found: ${layerId}-layer`);
      }
    });
    
    this.initialized = true;
    console.log(`🎨 LayerManager initialized with ${this.layers.size} layers`);
  }
  
  /**
   * Get a specific layer
   */
  getLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`⚠️ Layer not found: ${layerId}`);
    }
    return layer;
  }
  
  /**
   * Add an element to a specific layer
   */
  addToLayer(layerId, element) {
    const layer = this.getLayer(layerId);
    if (layer && element) {
      layer.appendChild(element);
      console.log(`📝 Added element to ${layerId} layer:`, element.tagName);
      return true;
    }
    return false;
  }
  
  /**
   * Remove an element from its current layer
   */
  removeFromLayer(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
      console.log(`🗑️ Removed element from layer:`, element.tagName);
      return true;
    }
    return false;
  }
  
  /**
   * Move an element from one layer to another
   */
  moveToLayer(element, targetLayerId) {
    if (this.removeFromLayer(element)) {
      return this.addToLayer(targetLayerId, element);
    }
    return false;
  }
  
  /**
   * Hide a layer
   */
  hideLayer(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.classList.add('hidden');
      console.log(`👁️ Hidden layer: ${layerId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Show a layer
   */
  showLayer(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.classList.remove('hidden');
      console.log(`👁️ Shown layer: ${layerId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Toggle layer visibility
   */
  toggleLayer(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      if (layer.classList.contains('hidden')) {
        return this.showLayer(layerId);
      } else {
        return this.hideLayer(layerId);
      }
    }
    return false;
  }
  
  /**
   * Set layer opacity
   */
  setLayerOpacity(layerId, opacity) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.style.opacity = opacity;
      console.log(`🎨 Set ${layerId} layer opacity to ${opacity}`);
      return true;
    }
    return false;
  }
  
  /**
   * Make layer non-interactive
   */
  setLayerNonInteractive(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.classList.add('non-interactive');
      console.log(`🚫 Made ${layerId} layer non-interactive`);
      return true;
    }
    return false;
  }
  
  /**
   * Make layer interactive
   */
  setLayerInteractive(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.classList.remove('non-interactive');
      console.log(`👆 Made ${layerId} layer interactive`);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all elements from a layer
   */
  clearLayer(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      const childCount = layer.children.length;
      while (layer.firstChild) {
        layer.removeChild(layer.firstChild);
      }
      console.log(`🧹 Cleared ${childCount} elements from ${layerId} layer`);
      return true;
    }
    return false;
  }
  
  /**
   * Get all elements in a layer
   */
  getLayerElements(layerId) {
    const layer = this.getLayer(layerId);
    return layer ? Array.from(layer.children) : [];
  }
  
  /**
   * Count elements in a layer
   */
  getLayerElementCount(layerId) {
    const layer = this.getLayer(layerId);
    return layer ? layer.children.length : 0;
  }
  
  /**
   * Get layer statistics
   */
  getLayerStats() {
    const stats = {};
    this.layers.forEach((layer, layerId) => {
      stats[layerId] = {
        elementCount: layer.children.length,
        visible: !layer.classList.contains('hidden'),
        interactive: !layer.classList.contains('non-interactive'),
        opacity: layer.style.opacity || '1'
      };
    });
    return stats;
  }
  
  /**
   * Enable debug layer
   */
  enableDebugLayer() {
    const debugLayer = this.getLayer('debug');
    if (debugLayer) {
      debugLayer.classList.add('visible');
      console.log('🔍 Debug layer enabled');
      return true;
    }
    return false;
  }
  
  /**
   * Disable debug layer
   */
  disableDebugLayer() {
    const debugLayer = this.getLayer('debug');
    if (debugLayer) {
      debugLayer.classList.remove('visible');
      console.log('🔍 Debug layer disabled');
      return true;
    }
    return false;
  }
  
  /**
   * Add debug information to debug layer
   */
  addDebugElement(element) {
    return this.addToLayer('debug', element);
  }
  
  /**
   * Log layer information for debugging
   */
  logLayerInfo() {
    console.log('🎨 Layer Manager Status:');
    console.log('  Initialized:', this.initialized);
    console.log('  Layer count:', this.layers.size);
    
    const stats = this.getLayerStats();
    this.layers.forEach((layer, layerId) => {
      const stat = stats[layerId];
      console.log(`  ${layerId}: ${stat.elementCount} elements, visible: ${stat.visible}, interactive: ${stat.interactive}`);
    });
  }
}

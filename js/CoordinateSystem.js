/**
 * Comprehensive coordinate system manager that handles transformations between
 * different coordinate spaces in the SVG diagram editor.
 * 
 * Coordinate Spaces:
 * - Screen: Browser viewport pixel coordinates (e.g., mouse events)
 * - ViewBox: SVG viewBox coordinate space (affected by zoom/pan)
 * - Global: SVG root coordinate space (absolute SVG coordinates)
 * - Local: Node-local coordinate space (relative to node's transform)
 */
export class CoordinateSystem {
  constructor(svg) {
    this.svg = svg;
  }
  
  /**
   * Convert screen coordinates (browser pixels) to viewBox coordinates
   */
  screenToViewBox(screenX, screenY) {
    const svgRect = this.svg.getBoundingClientRect();
    const viewBox = this.getViewBox();
    
    const scaleX = viewBox.width / svgRect.width;
    const scaleY = viewBox.height / svgRect.height;
    
    const x = viewBox.x + (screenX - svgRect.left) * scaleX;
    const y = viewBox.y + (screenY - svgRect.top) * scaleY;
    
    return { x, y };
  }
  
  /**
   * Convert viewBox coordinates to screen coordinates (browser pixels)
   */
  viewBoxToScreen(viewBoxX, viewBoxY) {
    const svgRect = this.svg.getBoundingClientRect();
    const viewBox = this.getViewBox();
    
    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;
    
    const x = svgRect.left + (viewBoxX - viewBox.x) * scaleX;
    const y = svgRect.top + (viewBoxY - viewBox.y) * scaleY;
    
    return { x, y };
  }
  
  /**
   * Convert local node coordinates to global SVG coordinates
   */
  localToGlobal(localX, localY, element) {
    try {
      const ctm = element.getCTM();
      if (!ctm) {
        throw new Error('Unable to get transformation matrix');
      }
      
      const globalX = ctm.a * localX + ctm.c * localY + ctm.e;
      const globalY = ctm.b * localX + ctm.d * localY + ctm.f;
      
      return { x: globalX, y: globalY };
    } catch (error) {
      console.error('Error in localToGlobal:', error);
      // Fallback: assume identity transformation
      return { x: localX, y: localY };
    }
  }
  
  /**
   * Convert global SVG coordinates to local node coordinates
   */
  globalToLocal(globalX, globalY, element) {
    try {
      const ctm = element.getCTM();
      if (!ctm) {
        throw new Error('Unable to get transformation matrix');
      }
      
      const inverse = ctm.inverse();
      const localX = inverse.a * globalX + inverse.c * globalY + inverse.e;
      const localY = inverse.b * globalX + inverse.d * globalY + inverse.f;
      
      return { x: localX, y: localY };
    } catch (error) {
      console.error('Error in globalToLocal:', error);
      // Fallback: assume identity transformation
      return { x: globalX, y: globalY };
    }
  }
  
  /**
   * Convert screen coordinates directly to global SVG coordinates
   */
  screenToGlobal(screenX, screenY) {
    const viewBoxPos = this.screenToViewBox(screenX, screenY);
    // In most cases, viewBox coordinates ARE the global coordinates
    // unless there are additional transformations on the SVG root
    return viewBoxPos;
  }
  
  /**
   * Convert global SVG coordinates to screen coordinates
   */
  globalToScreen(globalX, globalY) {
    // In most cases, global coordinates ARE viewBox coordinates
    return this.viewBoxToScreen(globalX, globalY);
  }
  
  /**
   * Convert screen coordinates directly to local node coordinates
   */
  screenToLocal(screenX, screenY, element) {
    const globalPos = this.screenToGlobal(screenX, screenY);
    return this.globalToLocal(globalPos.x, globalPos.y, element);
  }
  
  /**
   * Convert local node coordinates directly to screen coordinates
   */
  localToScreen(localX, localY, element) {
    const globalPos = this.localToGlobal(localX, localY, element);
    return this.globalToScreen(globalPos.x, globalPos.y);
  }
  
  /**
   * Get the node's center point in various coordinate systems
   */
  getNodeCenter(element, coordinateSpace = 'global') {
    try {
      const bbox = element.getBBox();
      const localCenter = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
        radius: Math.min(bbox.width, bbox.height) / 2
      };
      
      switch (coordinateSpace) {
        case 'local':
          return localCenter;
          
        case 'global':
        case 'viewbox':
          const globalPos = this.localToGlobal(localCenter.x, localCenter.y, element);
          return {
            x: globalPos.x,
            y: globalPos.y,
            radius: this.transformRadius(localCenter.radius, element)
          };
          
        case 'screen':
          const globalCenter = this.localToGlobal(localCenter.x, localCenter.y, element);
          const screenPos = this.globalToScreen(globalCenter.x, globalCenter.y);
          return {
            x: screenPos.x,
            y: screenPos.y,
            radius: this.transformRadiusToScreen(localCenter.radius, element)
          };
          
        default:
          throw new Error(`Unknown coordinate space: ${coordinateSpace}`);
      }
    } catch (error) {
      console.error('Error in getNodeCenter:', error);
      // Fallback based on coordinate space
      const fallbackRadius = 25;
      switch (coordinateSpace) {
        case 'local':
          return { x: 0, y: 0, radius: fallbackRadius };
        case 'global':
        case 'viewbox':
          return { x: 50, y: 50, radius: fallbackRadius };
        case 'screen':
          return { x: 100, y: 100, radius: fallbackRadius };
        default:
          return { x: 0, y: 0, radius: fallbackRadius };
      }
    }
  }
  
  /**
   * Get default node center based on position and scale (for fallback cases)
   */
  getDefaultNodeCenter(x, y, scale = 1) {
    const DEFAULT_NODE_RADIUS = 25; // Half of 50px default node size
    return {
      x: x + DEFAULT_NODE_RADIUS * scale,
      y: y + DEFAULT_NODE_RADIUS * scale,
      radius: DEFAULT_NODE_RADIUS * scale
    };
  }
  
  /**
   * Transform a radius from local to global coordinate space
   */
  transformRadius(radius, element) {
    try {
      const ctm = element.getCTM();
      if (!ctm) return radius;
      
      // Use the average of the x and y scale factors for a circular radius
      const scaleX = Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b);
      const scaleY = Math.sqrt(ctm.c * ctm.c + ctm.d * ctm.d);
      const avgScale = (scaleX + scaleY) / 2;
      
      return radius * avgScale;
    } catch (error) {
      console.error('Error in transformRadius:', error);
      return radius;
    }
  }
  
  /**
   * Transform a radius from local coordinates to screen pixel size
   */
  transformRadiusToScreen(radius, element) {
    const globalRadius = this.transformRadius(radius, element);
    const viewBox = this.getViewBox();
    const svgRect = this.svg.getBoundingClientRect();
    
    // Convert radius to screen pixels
    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;
    const avgScale = (scaleX + scaleY) / 2;
    
    return globalRadius * avgScale;
  }
  
  /**
   * Check if a global point is inside a node's bounds
   */
  isPointInNode(globalX, globalY, element) {
    const center = this.getNodeCenter(element, 'global');
    const distance = Math.hypot(globalX - center.x, globalY - center.y);
    return distance <= center.radius;
  }
  
  /**
   * Check if a screen point is inside a node's bounds
   */
  isScreenPointInNode(screenX, screenY, element) {
    const globalPos = this.screenToGlobal(screenX, screenY);
    return this.isPointInNode(globalPos.x, globalPos.y, element);
  }
  
  /**
   * Transform coordinates from one viewBox to another (for drag compensation)
   */
  transformBetweenViewBoxes(x, y, oldViewBox, newViewBox) {
    // First convert to screen coordinates using old viewBox
    const svgRect = this.svg.getBoundingClientRect();
    const oldScaleX = svgRect.width / oldViewBox.width;
    const oldScaleY = svgRect.height / oldViewBox.height;
    
    const screenX = svgRect.left + (x - oldViewBox.x) * oldScaleX;
    const screenY = svgRect.top + (y - oldViewBox.y) * oldScaleY;
    
    // Then convert back using new viewBox
    const newScaleX = newViewBox.width / svgRect.width;
    const newScaleY = newViewBox.height / svgRect.height;
    
    const newX = newViewBox.x + (screenX - svgRect.left) * newScaleX;
    const newY = newViewBox.y + (screenY - svgRect.top) * newScaleY;
    
    return { x: newX, y: newY };
  }
  
  /**
   * Get the current viewBox as an object
   */
  getViewBox() {
    const viewBoxAttr = this.svg.getAttribute('viewBox');
    if (!viewBoxAttr) {
      // Fallback to SVG dimensions
      const rect = this.svg.getBoundingClientRect();
      return { x: 0, y: 0, width: rect.width, height: rect.height };
    }
    
    const [x, y, width, height] = viewBoxAttr.split(' ').map(Number);
    return { x, y, width, height };
  }
  
  /**
   * Get distance between two points in any coordinate system
   */
  getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
  
  /**
   * Create a coordinate point object
   */
  createPoint(x, y, coordinateSpace = 'global') {
    return { x, y, coordinateSpace };
  }
  
  /**
   * Convert a point from one coordinate space to another
   */
  convertPoint(point, fromSpace, toSpace, element = null) {
    if (fromSpace === toSpace) return { ...point };
    
    const { x, y } = point;
    
    // Define conversion paths
    const conversions = {
      'screen->viewbox': () => this.screenToViewBox(x, y),
      'screen->global': () => this.screenToGlobal(x, y),
      'screen->local': () => this.screenToLocal(x, y, element),
      'viewbox->screen': () => this.viewBoxToScreen(x, y),
      'viewbox->global': () => ({ x, y }), // Usually the same
      'viewbox->local': () => this.globalToLocal(x, y, element),
      'global->screen': () => this.globalToScreen(x, y),
      'global->viewbox': () => ({ x, y }), // Usually the same
      'global->local': () => this.globalToLocal(x, y, element),
      'local->screen': () => this.localToScreen(x, y, element),
      'local->viewbox': () => this.localToGlobal(x, y, element),
      'local->global': () => this.localToGlobal(x, y, element)
    };
    
    const conversionKey = `${fromSpace}->${toSpace}`;
    const converter = conversions[conversionKey];
    
    if (!converter) {
      throw new Error(`No conversion available from ${fromSpace} to ${toSpace}`);
    }
    
    if ((fromSpace === 'local' || toSpace === 'local') && !element) {
      throw new Error(`Element required for local coordinate conversions`);
    }
    
    return converter();
  }
}

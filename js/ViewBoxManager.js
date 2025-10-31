/**
 * Manages the SVG viewBox coordinate system and transformations between
 * screen coordinates and viewBox coordinates.
 */
import { CoordinateSystem } from './CoordinateSystem.js?v=003';
import { CoordinateUtils } from './CoordinateUtils.js?v=003';

export class ViewBoxManager {
  constructor(svg, initialWidth = 800, initialHeight = 600) {
    this.svg = svg;
    this.currentZoom = 1;
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.viewBoxWidth = initialWidth;
    this.viewBoxHeight = initialHeight;
    this.isPanning = false;
    this.lastPanX = 0;
    this.lastPanY = 0;
    
    // Initialize coordinate system
    this.coordinateSystem = new CoordinateSystem(svg);
    this.coordinateUtils = new CoordinateUtils(this.coordinateSystem);
    
    // Callbacks for when viewBox changes
    this.viewBoxChangeCallbacks = [];
    
    this.updateViewBox();
  }
  
  /**
   * Register a callback to be called when the viewBox changes
   */
  onViewBoxChange(callback) {
    this.viewBoxChangeCallbacks.push(callback);
  }
  
  /**
   * Notify all callbacks that the viewBox has changed
   */
  notifyViewBoxChange(oldViewBox) {
    this.viewBoxChangeCallbacks.forEach(callback => {
      callback(oldViewBox, this.getCurrentViewBox());
    });
  }
  
  /**
   * Get the current viewBox state
   */
  getCurrentViewBox() {
    return {
      x: this.viewBoxX,
      y: this.viewBoxY,
      width: this.viewBoxWidth,
      height: this.viewBoxHeight,
      zoom: this.currentZoom
    };
  }
  
  /**
   * Update the SVG viewBox attribute and viewport indicators
   */
  updateViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBoxX} ${this.viewBoxY} ${this.viewBoxWidth} ${this.viewBoxHeight}`);
    this.updateViewportIndicators();
  }
  
  /**
   * Update the viewport indicator UI elements
   */
  updateViewportIndicators() {
    const zoomLevel = document.getElementById('zoom-level');
    const coordinates = document.getElementById('coordinates');
    
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }
    
    if (coordinates) {
      coordinates.textContent = `${Math.round(this.viewBoxX)}, ${Math.round(this.viewBoxY)}`;
    }
  }
  
  /**
   * Convert screen coordinates to viewBox coordinates
   */
  screenToViewBox(screenX, screenY) {
    return this.coordinateSystem.screenToViewBox(screenX, screenY);
  }
  
  /**
   * Convert viewBox coordinates to screen coordinates
   */
  viewBoxToScreen(viewBoxX, viewBoxY) {
    return this.coordinateSystem.viewBoxToScreen(viewBoxX, viewBoxY);
  }
  
  /**
   * Transform coordinates from old viewBox to current viewBox
   */
  transformCoordinates(x, y, oldViewBox) {
    const currentViewBox = this.getCurrentViewBox();
    return this.coordinateSystem.transformBetweenViewBoxes(x, y, oldViewBox, currentViewBox);
  }
  
  /**
   * Zoom around a specific point
   */
  zoom(factor, centerX = this.viewBoxWidth / 2, centerY = this.viewBoxHeight / 2) {
    const oldViewBox = this.getCurrentViewBox();
    
    const newZoom = Math.max(0.1, Math.min(5, this.currentZoom * factor));
    const zoomRatio = newZoom / this.currentZoom;
    
    // Adjust viewBox to zoom around the center point
    const newWidth = this.viewBoxWidth / zoomRatio;
    const newHeight = this.viewBoxHeight / zoomRatio;
    
    this.viewBoxX += (this.viewBoxWidth - newWidth) * (centerX / this.viewBoxWidth);
    this.viewBoxY += (this.viewBoxHeight - newHeight) * (centerY / this.viewBoxHeight);
    
    this.viewBoxWidth = newWidth;
    this.viewBoxHeight = newHeight;
    this.currentZoom = newZoom;
    
    this.updateViewBox();
    this.notifyViewBoxChange(oldViewBox);
  }
  
  /**
   * Pan the viewBox by a delta amount
   */
  pan(deltaX, deltaY) {
    const oldViewBox = this.getCurrentViewBox();
    
    this.viewBoxX += deltaX;
    this.viewBoxY += deltaY;
    
    this.updateViewBox();
    this.notifyViewBoxChange(oldViewBox);
  }
  
  /**
   * Reset the viewBox to its initial state
   */
  resetView() {
    const oldViewBox = this.getCurrentViewBox();
    
    this.currentZoom = 1;
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.viewBoxWidth = 800;
    this.viewBoxHeight = 600;
    
    this.updateViewBox();
    this.notifyViewBoxChange(oldViewBox);
  }
  
  /**
   * Start panning operation
   */
  startPanning(screenX, screenY) {
    this.isPanning = true;
    this.lastPanX = screenX;
    this.lastPanY = screenY;
    this.svg.style.cursor = 'grabbing';
  }
  
  /**
   * Update panning operation
   */
  updatePanning(screenX, screenY) {
    if (!this.isPanning) return;
    
    const deltaX = (screenX - this.lastPanX) * (this.viewBoxWidth / this.svg.clientWidth);
    const deltaY = (screenY - this.lastPanY) * (this.viewBoxHeight / this.svg.clientHeight);
    
    this.pan(-deltaX, -deltaY);
    
    this.lastPanX = screenX;
    this.lastPanY = screenY;
  }
  
  /**
   * Stop panning operation
   */
  stopPanning() {
    if (this.isPanning) {
      this.isPanning = false;
      this.svg.style.cursor = '';
    }
  }
  
  /**
   * Update the viewBox based on the provided layout dimensions
   */
  updateViewBoxForLayout(layout) {
    const oldViewBox = this.getCurrentViewBox();

    // Update viewBox dimensions
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.viewBoxWidth = layout.width;
    this.viewBoxHeight = layout.height;

    // Apply the changes to the SVG element
    this.updateViewBox();

    // Notify callbacks about the viewBox change
    this.notifyViewBoxChange(oldViewBox);
  }
}

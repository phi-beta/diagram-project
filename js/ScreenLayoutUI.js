/**
 * ScreenLayoutUI - UI component for screen layout selection
 */
export class ScreenLayoutUI {
  constructor(screenLayoutManager) {
    this.screenLayoutManager = screenLayoutManager;
    this.container = null;
    this.selector = null;
    this.dimensionDisplay = null;
    this.customInputs = null;
    this.isVisible = false;
    
    this.createUI();
    this.bindEvents();
    
    console.log('🎨 ScreenLayoutUI initialized');
  }
  
  /**
   * Create the UI elements
   */
  createUI() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'screen-layout-selector';
    this.container.innerHTML = `
      <div class="layout-selector-header">
        <h3>📱 Screen Layout</h3>
        <button id="layout-toggle" class="layout-toggle">🔽</button>
      </div>
      <div class="layout-selector-content">
        <div class="layout-categories">
          <!-- Categories will be populated here -->
        </div>
        <div class="layout-options">
          <select id="layout-select">
            <option value="">Select Layout...</option>
          </select>
        </div>
        <div class="layout-info">
          <div class="dimension-display">
            <span id="current-dimensions">800 × 600</span>
            <span id="current-aspect-ratio">4:3</span>
          </div>
        </div>
        <div class="custom-dimensions" id="custom-dimensions" style="display: none;">
          <div class="custom-inputs">
            <label>
              Width: <input type="number" id="custom-width" min="100" max="10000" value="800">
            </label>
            <label>
              Height: <input type="number" id="custom-height" min="100" max="10000" value="600">
            </label>
            <button id="apply-custom">Apply</button>
          </div>
        </div>
        <div class="layout-actions">
          <button id="reset-layout">Reset</button>
          <button id="save-layout">Save Custom</button>
        </div>
      </div>
    `;
    
    // Add CSS styles
    this.addStyles();
    
    // Add to page
    document.body.appendChild(this.container);
    
    // Get references
    this.selector = document.getElementById('layout-select');
    this.dimensionDisplay = document.getElementById('current-dimensions');
    this.aspectRatioDisplay = document.getElementById('current-aspect-ratio');
    this.customInputs = document.getElementById('custom-dimensions');
    
    // Populate UI
    this.populateCategories();
    this.populateLayouts();
    
    // Start visible by default to make feature discoverable
    this.isVisible = true;
  }
  
  /**
   * Add CSS styles for the UI
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #screen-layout-selector {
        position: fixed;
        top: 10px;
        right: 10px;
        background: var(--body-background, #2a2a2a);
        border: 2px solid var(--grid-level-1, #444);
        border-radius: 8px;
        padding: 10px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        color: var(--text-color, #fff);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        min-width: 250px;
        max-width: 350px;
        transition: all 0.3s ease;
      }
      
      #screen-layout-selector.collapsed .layout-selector-content {
        display: none;
      }
      
      .layout-selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .layout-selector-header h3 {
        margin: 0;
        font-size: 16px;
        color: var(--text-color, #fff);
      }
      
      .layout-toggle {
        background: none;
        border: 1px solid var(--grid-level-1, #444);
        color: var(--text-color, #fff);
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .layout-toggle:hover {
        background: var(--grid-level-1, #444);
      }
      
      .layout-categories {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 10px;
      }
      
      .category-button {
        background: var(--grid-level-1, #444);
        border: 1px solid var(--grid-level-2, #555);
        color: var(--text-color, #fff);
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      
      .category-button:hover {
        background: var(--grid-level-2, #555);
      }
      
      .category-button.active {
        background: var(--node-stroke, #4CAF50);
        border-color: var(--node-stroke, #4CAF50);
      }
      
      .layout-options {
        margin-bottom: 10px;
      }
      
      #layout-select {
        width: 100%;
        padding: 8px;
        background: var(--diagram-background, #1a1a1a);
        border: 1px solid var(--grid-level-1, #444);
        border-radius: 4px;
        color: var(--text-color, #fff);
        font-size: 14px;
      }
      
      #layout-select option {
        background: var(--diagram-background, #1a1a1a);
        color: var(--text-color, #fff);
      }
      
      .layout-info {
        margin-bottom: 10px;
      }
      
      .dimension-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: var(--diagram-background, #1a1a1a);
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
      }
      
      #current-dimensions {
        font-weight: bold;
        color: var(--node-stroke, #4CAF50);
      }
      
      #current-aspect-ratio {
        color: var(--text-color, #aaa);
      }
      
      .custom-dimensions {
        margin-bottom: 10px;
        padding: 10px;
        background: var(--diagram-background, #1a1a1a);
        border-radius: 4px;
      }
      
      .custom-inputs {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .custom-inputs label {
        display: flex;
        flex-direction: column;
        font-size: 12px;
      }
      
      .custom-inputs input {
        width: 60px;
        padding: 4px;
        margin-top: 2px;
        background: var(--body-background, #2a2a2a);
        border: 1px solid var(--grid-level-1, #444);
        border-radius: 4px;
        color: var(--text-color, #fff);
        font-size: 12px;
      }
      
      .layout-actions {
        display: flex;
        gap: 10px;
      }
      
      .layout-actions button {
        flex: 1;
        padding: 6px 12px;
        background: var(--grid-level-1, #444);
        border: 1px solid var(--grid-level-2, #555);
        border-radius: 4px;
        color: var(--text-color, #fff);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      
      .layout-actions button:hover {
        background: var(--grid-level-2, #555);
      }
      
      #apply-custom {
        padding: 4px 8px;
        background: var(--node-stroke, #4CAF50);
        border: 1px solid var(--node-stroke, #4CAF50);
        color: white;
        font-size: 11px;
      }
      
      #apply-custom:hover {
        background: var(--node-stroke-hover, #45a049);
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        #screen-layout-selector {
          position: relative;
          top: 0;
          right: 0;
          width: 100%;
          max-width: none;
          margin-bottom: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Populate category buttons
   */
  populateCategories() {
    const categories = this.screenLayoutManager.getCategories();
    const categoriesContainer = this.container.querySelector('.layout-categories');
    
    // Add "All" category
    const allButton = document.createElement('button');
    allButton.className = 'category-button active';
    allButton.textContent = '🌐 All';
    allButton.dataset.category = 'all';
    categoriesContainer.appendChild(allButton);
    
    // Add category buttons
    Object.entries(categories).forEach(([id, category]) => {
      const button = document.createElement('button');
      button.className = 'category-button';
      button.textContent = `${category.icon} ${category.name}`;
      button.dataset.category = id;
      button.style.borderColor = category.color;
      categoriesContainer.appendChild(button);
    });
  }
  
  /**
   * Populate layout options
   */
  populateLayouts(categoryFilter = null) {
    const layouts = this.screenLayoutManager.getLayouts();
    const categories = this.screenLayoutManager.getCategories();
    
    // Clear existing options (except first one)
    this.selector.innerHTML = '<option value="">Select Layout...</option>';
    
    // Add layouts
    Object.entries(layouts).forEach(([id, layout]) => {
      if (categoryFilter && categoryFilter !== 'all' && layout.category !== categoryFilter) {
        return;
      }
      
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${layout.name} (${layout.width}×${layout.height})`;
      
      // Add category color as data attribute
      const category = categories[layout.category];
      if (category) {
        option.style.color = category.color;
      }
      
      this.selector.appendChild(option);
    });
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Toggle visibility
    const toggleButton = this.container.querySelector('#layout-toggle');
    toggleButton.addEventListener('click', () => {
      this.toggle();
    });
    
    // Category filtering
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-button')) {
        // Update active category
        this.container.querySelectorAll('.category-button').forEach(btn => {
          btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Filter layouts
        const category = e.target.dataset.category;
        this.populateLayouts(category === 'all' ? null : category);
      }
    });
    
    // Layout selection
    this.selector.addEventListener('change', (e) => {
      const layoutId = e.target.value;
      if (layoutId) {
        if (layoutId === 'custom') {
          this.showCustomInputs();
        } else {
          this.hideCustomInputs();
        }
        this.screenLayoutManager.setLayout(layoutId);
      }
    });
    
    // Custom dimensions
    const applyCustomButton = document.getElementById('apply-custom');
    applyCustomButton.addEventListener('click', () => {
      this.applyCustomDimensions();
    });
    
    // Reset layout
    const resetButton = document.getElementById('reset-layout');
    resetButton.addEventListener('click', () => {
      this.screenLayoutManager.resetToOriginal();
      this.selector.value = '';
      this.hideCustomInputs();
    });
    
    // Save custom layout
    const saveButton = document.getElementById('save-layout');
    saveButton.addEventListener('click', () => {
      this.saveCustomLayout();
    });
    
    // Listen for layout changes
    this.screenLayoutManager.setOnLayoutChangeCallback((newLayout, previousLayout) => {
      this.updateDisplay(newLayout);
    });
    
    // Update inputs when custom dimensions are changed
    const customWidth = document.getElementById('custom-width');
    const customHeight = document.getElementById('custom-height');
    
    [customWidth, customHeight].forEach(input => {
      input.addEventListener('input', () => {
        this.updateCustomPreview();
      });
    });
  }
  
  /**
   * Toggle UI visibility
   */
  toggle() {
    this.isVisible = !this.isVisible;
    this.container.classList.toggle('collapsed', !this.isVisible);
    
    const toggleButton = this.container.querySelector('#layout-toggle');
    toggleButton.textContent = this.isVisible ? '🔽' : '⚙️';
  }
  
  /**
   * Show custom dimension inputs
   */
  showCustomInputs() {
    this.customInputs.style.display = 'block';
    const currentDimensions = this.screenLayoutManager.getCurrentDimensions();
    document.getElementById('custom-width').value = currentDimensions.width;
    document.getElementById('custom-height').value = currentDimensions.height;
  }
  
  /**
   * Hide custom dimension inputs
   */
  hideCustomInputs() {
    this.customInputs.style.display = 'none';
  }
  
  /**
   * Apply custom dimensions
   */
  applyCustomDimensions() {
    const width = parseInt(document.getElementById('custom-width').value);
    const height = parseInt(document.getElementById('custom-height').value);
    
    if (width && height && width > 0 && height > 0) {
      this.screenLayoutManager.setLayout('custom', { width, height });
    }
  }
  
  /**
   * Update custom preview
   */
  updateCustomPreview() {
    const width = parseInt(document.getElementById('custom-width').value);
    const height = parseInt(document.getElementById('custom-height').value);
    
    if (width && height) {
      const aspectRatio = this.screenLayoutManager.calculateAspectRatio(width, height);
      this.dimensionDisplay.textContent = `${width} × ${height}`;
      this.aspectRatioDisplay.textContent = aspectRatio;
    }
  }
  
  /**
   * Save custom layout
   */
  saveCustomLayout() {
    const name = prompt('Enter name for custom layout:');
    if (name) {
      const dimensions = this.screenLayoutManager.getCurrentDimensions();
      const layoutId = this.screenLayoutManager.createCustomLayout(
        name,
        dimensions.width,
        dimensions.height,
        'User-defined custom layout'
      );
      
      // Refresh layout options
      this.populateLayouts();
      this.selector.value = layoutId;
      
      alert(`Custom layout "${name}" saved!`);
    }
  }
  
  /**
   * Update display with current layout info
   */
  updateDisplay(layout) {
    if (layout) {
      this.dimensionDisplay.textContent = `${layout.width} × ${layout.height}`;
      this.aspectRatioDisplay.textContent = layout.aspectRatio;
      this.selector.value = layout.id;
    } else {
      const currentDimensions = this.screenLayoutManager.getCurrentDimensions();
      this.dimensionDisplay.textContent = `${currentDimensions.width} × ${currentDimensions.height}`;
      this.aspectRatioDisplay.textContent = this.screenLayoutManager.calculateAspectRatio(
        currentDimensions.width,
        currentDimensions.height
      );
      this.selector.value = '';
    }
  }
  
  /**
   * Show/hide the UI
   */
  show() {
    this.container.style.display = 'block';
  }
  
  hide() {
    this.container.style.display = 'none';
  }
  
  /**
   * Destroy the UI
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

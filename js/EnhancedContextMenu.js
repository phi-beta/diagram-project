/**
 * Enhanced Context Menu Manager - JSON-based context menus
 * Handles right-click context menus with configurable actions based on element type
 */
export class EnhancedContextMenu {
  constructor(svg, diagramComponents = {}) {
    this.svg = svg;
    this.diagramComponents = diagramComponents;
    this.overlayContainer = null;
    this.menuGroup = null;
    this.isVisible = false;
    this.currentContext = null;
    this.targetElement = null;
    this.mousePosition = null;
    
    // Menu configuration (will be loaded from JSON)
    this.menuConfig = null;
    this.actions = null;
    
    // Initialize
    this.init();
  }
  
  async init() {
    await this.loadMenuConfig();
    this.setupOverlayContainer();
    this.setupEventListeners();
    
    // Import and initialize actions handler
    const { ContextMenuActions } = await import('./ContextMenuActions.js');
    this.actions = new ContextMenuActions(this.diagramComponents);
    
    console.log('🎯 EnhancedContextMenu initialized');
  }
  
  /**
   * Load menu configuration from JSON file
   */
  async loadMenuConfig() {
    try {
      const response = await fetch('config/context-menus.json');
      this.menuConfig = await response.json();
      console.log('📋 Context menu configuration loaded');
    } catch (error) {
      console.error('Failed to load context menu configuration:', error);
      this.menuConfig = this.getDefaultConfig();
    }
  }
  
  /**
   * Get default configuration as fallback
   */
  getDefaultConfig() {
    return {
      contextMenus: {
        node: {
          default: {
            title: 'Node',
            subtitle: 'Diagram Node',
            icon: '⚪',
            color: '#FF9800',
            borderColor: '#F57C00',
            actions: [
              { id: 'delete', label: 'Delete', icon: '🗑️', enabled: true, dangerous: true }
            ]
          }
        },
        edge: {
          default: {
            title: 'Edge',
            subtitle: 'Diagram Edge',
            icon: '➡️',
            color: '#607D8B',
            borderColor: '#455A64',
            actions: [
              { id: 'delete', label: 'Delete', icon: '🗑️', enabled: true, dangerous: true }
            ]
          }
        },
        background: {
          default: {
            title: 'Canvas',
            subtitle: 'Diagram Canvas',
            icon: '🎨',
            color: '#757575',
            borderColor: '#424242',
            actions: [
              { id: 'add-user', label: 'Add User', icon: '👤', enabled: true }
            ]
          }
        }
      },
      settings: {
        defaultMenuWidth: 180,
        cornerRadius: 8,
        fontSize: 12,
        iconSize: 16,
        padding: 8,
        actionHeight: 28,
        shadowBlur: 6,
        shadowOffset: 2
      }
    };
  }
  
  /**
   * Create overlay container for context menu
   */
  setupOverlayContainer() {
    this.overlayContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.overlayContainer.setAttribute('class', 'enhanced-context-menu-overlay');
    this.overlayContainer.style.position = 'fixed';
    this.overlayContainer.style.top = '0';
    this.overlayContainer.style.left = '0';
    this.overlayContainer.style.width = '100vw';
    this.overlayContainer.style.height = '100vh';
    this.overlayContainer.style.pointerEvents = 'none';
    this.overlayContainer.style.zIndex = '10000';
    
    this.overlayContainer.setAttribute('viewBox', '0 0 ' + window.innerWidth + ' ' + window.innerHeight);
    this.overlayContainer.setAttribute('preserveAspectRatio', 'none');
    
    // Add drop shadow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'enhanced-context-menu-shadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', this.menuConfig?.settings?.shadowOffset || 2);
    feDropShadow.setAttribute('dy', this.menuConfig?.settings?.shadowOffset || 2);
    feDropShadow.setAttribute('stdDeviation', this.menuConfig?.settings?.shadowBlur || 6);
    feDropShadow.setAttribute('flood-color', 'rgba(0,0,0,0.3)');
    feDropShadow.setAttribute('flood-opacity', '1');
    
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    this.overlayContainer.appendChild(defs);
    
    document.body.appendChild(this.overlayContainer);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Hide menu on click outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.isClickInsideMenu(e)) {
        this.hide();
      }
    });
    
    // Hide menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
    
    // Prevent default context menu
    document.addEventListener('contextmenu', (e) => {
      if (this.isVisible) {
        e.preventDefault();
      }
    });
  }
  
  /**
   * Show context menu
   * @param {number} svgX - X coordinate in SVG space
   * @param {number} svgY - Y coordinate in SVG space
   * @param {string} context - Context type: 'node', 'edge', or 'background'
   * @param {Element} targetElement - The element that was right-clicked
   */
  show(svgX, svgY, context, targetElement = null) {
    this.hide(); // Remove any existing menu
    
    this.currentContext = context;
    this.targetElement = targetElement;
    this.mousePosition = { x: svgX, y: svgY };
    
    // Get menu configuration for this context
    const menuConfig = this.getMenuConfigForContext(context, targetElement);
    if (!menuConfig) {
      console.warn(`No menu configuration found for context: ${context}`);
      return;
    }
    
    // Convert SVG coordinates to screen coordinates
    const screenCoords = this.svgToScreenCoordinates(svgX, svgY);
    
    // Create menu
    this.menuGroup = this.createMenu(screenCoords.x, screenCoords.y, menuConfig);
    
    // Add to overlay
    this.overlayContainer.appendChild(this.menuGroup);
    this.menuGroup.style.pointerEvents = 'auto';
    this.isVisible = true;
    
    console.log(`🎯 Enhanced context menu shown for ${context} at (${screenCoords.x}, ${screenCoords.y})`);
  }
  
  /**
   * Get menu configuration for specific context and element
   */
  getMenuConfigForContext(context, targetElement) {
    const contextMenus = this.menuConfig?.contextMenus?.[context];
    if (!contextMenus) return null;
    
    let elementType = 'default';
    
    if (context === 'node' && targetElement) {
      // Get node type from the element's class or data attribute
      const nodeClasses = targetElement.getAttribute('class') || '';
      if (nodeClasses.includes('user')) {
        elementType = 'user';
      } else if (nodeClasses.includes('server')) {
        elementType = 'server';
      }
    } else if (context === 'edge' && targetElement) {
      // Get edge type from the element's class or data attribute
      const edgeClasses = targetElement.getAttribute('class') || '';
      if (edgeClasses.includes('connection')) {
        elementType = 'connection';
      }
    }
    
    return contextMenus[elementType] || contextMenus.default;
  }
  
  /**
   * Create the menu SVG elements
   */
  createMenu(screenX, screenY, menuConfig) {
    const settings = this.menuConfig.settings;
    const actions = menuConfig.actions.filter(action => action.type !== 'separator');
    const separators = menuConfig.actions.filter(action => action.type === 'separator');
    
    // Calculate menu dimensions
    const menuWidth = settings.defaultMenuWidth;
    const actionHeight = settings.actionHeight;
    const padding = settings.padding;
    const separatorHeight = settings.separatorHeight || 1;
    const separatorMargin = settings.separatorMargin || 4;
    
    let totalHeight = padding * 2; // Top and bottom padding
    totalHeight += 40; // Header height
    totalHeight += actions.length * actionHeight; // Actions height
    totalHeight += separators.length * (separatorHeight + separatorMargin * 2); // Separators height
    
    const menuHeight = totalHeight;
    
    // Create menu group
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'enhanced-context-menu');
    group.setAttribute('transform', `translate(${screenX}, ${screenY})`);
    
    // Create background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', menuWidth);
    background.setAttribute('height', menuHeight);
    background.setAttribute('rx', settings.cornerRadius);
    background.setAttribute('ry', settings.cornerRadius);
    background.setAttribute('fill', 'white');
    background.setAttribute('stroke', menuConfig.borderColor);
    background.setAttribute('stroke-width', '1');
    background.setAttribute('filter', 'url(#enhanced-context-menu-shadow)');
    
    group.appendChild(background);
    
    // Create header
    const headerHeight = 40;
    const header = this.createMenuHeader(menuConfig, menuWidth, headerHeight);
    group.appendChild(header);
    
    // Create actions
    let currentY = headerHeight + padding;
    menuConfig.actions.forEach(action => {
      if (action.type === 'separator') {
        const separator = this.createSeparator(menuWidth, currentY, separatorMargin);
        group.appendChild(separator);
        currentY += separatorHeight + separatorMargin * 2;
      } else {
        const actionElement = this.createAction(action, menuWidth, currentY, actionHeight);
        group.appendChild(actionElement);
        currentY += actionHeight;
      }
    });
    
    return group;
  }
  
  /**
   * Create menu header
   */
  createMenuHeader(menuConfig, menuWidth, headerHeight) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'menu-header');
    
    // Header background
    const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerBg.setAttribute('width', menuWidth);
    headerBg.setAttribute('height', headerHeight);
    headerBg.setAttribute('fill', menuConfig.color);
    headerBg.setAttribute('opacity', '0.1');
    group.appendChild(headerBg);
    
    // Icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', 12);
    icon.setAttribute('y', 20);
    icon.setAttribute('font-size', '16');
    icon.textContent = menuConfig.icon;
    group.appendChild(icon);
    
    // Title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', 35);
    title.setAttribute('y', 18);
    title.setAttribute('font-family', 'Arial, sans-serif');
    title.setAttribute('font-size', '14');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('fill', '#333');
    title.textContent = menuConfig.title;
    group.appendChild(title);
    
    // Subtitle
    const subtitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    subtitle.setAttribute('x', 35);
    subtitle.setAttribute('y', 32);
    subtitle.setAttribute('font-family', 'Arial, sans-serif');
    subtitle.setAttribute('font-size', '11');
    subtitle.setAttribute('fill', '#666');
    subtitle.textContent = menuConfig.subtitle;
    group.appendChild(subtitle);
    
    return group;
  }
  
  /**
   * Create separator
   */
  createSeparator(menuWidth, y, margin) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 8);
    line.setAttribute('y1', y + margin);
    line.setAttribute('x2', menuWidth - 8);
    line.setAttribute('y2', y + margin);
    line.setAttribute('stroke', '#e0e0e0');
    line.setAttribute('stroke-width', '1');
    return line;
  }
  
  /**
   * Create action item
   */
  createAction(action, menuWidth, y, height) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'menu-action');
    group.setAttribute('data-action-id', action.id);
    
    // Action background (for hover effect)
    const actionBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    actionBg.setAttribute('width', menuWidth);
    actionBg.setAttribute('height', height);
    actionBg.setAttribute('y', y);
    actionBg.setAttribute('fill', 'transparent');
    actionBg.setAttribute('class', 'action-background');
    
    // Add hover effects
    actionBg.addEventListener('mouseenter', () => {
      if (action.enabled) {
        actionBg.setAttribute('fill', action.dangerous ? '#ffebee' : '#f5f5f5');
      }
    });
    
    actionBg.addEventListener('mouseleave', () => {
      actionBg.setAttribute('fill', 'transparent');
    });
    
    // Add click handler
    actionBg.addEventListener('click', (e) => {
      if (action.enabled) {
        e.stopPropagation();
        this.executeAction(action.id);
      }
    });
    
    group.appendChild(actionBg);
    
    // Icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', 12);
    icon.setAttribute('y', y + height/2 + 5);
    icon.setAttribute('font-size', '14');
    icon.setAttribute('fill', action.enabled ? '#333' : '#ccc');
    icon.textContent = action.icon;
    group.appendChild(icon);
    
    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', 35);
    label.setAttribute('y', y + height/2 + 4);
    label.setAttribute('font-family', 'Arial, sans-serif');
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', action.enabled ? (action.dangerous ? '#d32f2f' : '#333') : '#ccc');
    label.textContent = action.label;
    group.appendChild(label);
    
    // Shortcut (if available)
    if (action.shortcut) {
      const shortcut = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      shortcut.setAttribute('x', menuWidth - 12);
      shortcut.setAttribute('y', y + height/2 + 4);
      shortcut.setAttribute('font-family', 'Arial, sans-serif');
      shortcut.setAttribute('font-size', '10');
      shortcut.setAttribute('fill', action.enabled ? '#666' : '#ccc');
      shortcut.setAttribute('text-anchor', 'end');
      shortcut.textContent = action.shortcut;
      group.appendChild(shortcut);
    }
    
    return group;
  }
  
  /**
   * Execute action
   */
  async executeAction(actionId) {
    this.hide(); // Hide menu first
    
    if (this.actions) {
      await this.actions.executeAction(
        actionId,
        this.currentContext,
        this.targetElement,
        this.mousePosition
      );
    }
  }
  
  /**
   * Hide the context menu
   */
  hide() {
    if (this.menuGroup) {
      this.menuGroup.remove();
      this.menuGroup = null;
    }
    this.isVisible = false;
    this.currentContext = null;
    this.targetElement = null;
    this.mousePosition = null;
  }
  
  /**
   * Check if click is inside menu
   */
  isClickInsideMenu(event) {
    if (!this.menuGroup) return false;
    
    const rect = this.overlayContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Simple bounding box check
    return this.menuGroup.contains(event.target) || 
           this.menuGroup === event.target;
  }
  
  /**
   * Convert SVG coordinates to screen coordinates
   */
  svgToScreenCoordinates(svgX, svgY) {
    const rect = this.svg.getBoundingClientRect();
    const viewBox = this.svg.viewBox.baseVal;
    
    const scaleX = rect.width / viewBox.width;
    const scaleY = rect.height / viewBox.height;
    
    const screenX = rect.left + (svgX - viewBox.x) * scaleX;
    const screenY = rect.top + (svgY - viewBox.y) * scaleY;
    
    return { x: screenX, y: screenY };
  }
}

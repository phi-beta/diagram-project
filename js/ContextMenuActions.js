/**
 * Context Menu Actions Handler
 * Handles the execution of context menu actions
 */
export class ContextMenuActions {
  constructor(diagramComponents = {}) {
    this.diagramComponents = diagramComponents;
    this.svg = diagramComponents.svg;
    this.nodeMap = diagramComponents.nodeMap;
    this.edgeList = diagramComponents.edgeList;
    this.viewBoxManager = diagramComponents.viewBoxManager;
    this.layerManager = diagramComponents.layerManager;
    this.interactionManager = diagramComponents.interactionManager;
    
    console.log('🎯 ContextMenuActions initialized');
  }
  
  /**
   * Execute a context menu action
   * @param {string} actionId - The ID of the action to execute
   * @param {string} contextType - The type of context (node, edge, background)
   * @param {Object} targetElement - The element that was right-clicked
   * @param {Object} mousePosition - The mouse position where the action was triggered
   */
  async executeAction(actionId, contextType, targetElement, mousePosition) {
    console.log(`🎯 Executing action: ${actionId} for ${contextType}`);
    
    try {
      switch (contextType) {
        case 'node':
          await this.executeNodeAction(actionId, targetElement, mousePosition);
          break;
        case 'edge':
          await this.executeEdgeAction(actionId, targetElement, mousePosition);
          break;
        case 'background':
          await this.executeBackgroundAction(actionId, mousePosition);
          break;
        default:
          console.warn(`Unknown context type: ${contextType}`);
      }
    } catch (error) {
      console.error(`Failed to execute action ${actionId}:`, error);
    }
  }
  
  /**
   * Execute node-specific actions
   */
  async executeNodeAction(actionId, nodeElement, mousePosition) {
    const nodeId = nodeElement.getAttribute('data-node-id');
    const node = this.nodeMap?.get(nodeId);
    
    if (!node) {
      console.error(`Node not found: ${nodeId}`);
      return;
    }
    
    switch (actionId) {
      case 'edit':
        await this.editNode(node);
        break;
      case 'duplicate':
        await this.duplicateNode(node);
        break;
      case 'permissions':
        await this.manageNodePermissions(node);
        break;
      case 'properties':
        await this.showNodeProperties(node);
        break;
      case 'status':
        await this.showNodeStatus(node);
        break;
      case 'configure':
        await this.configureNode(node);
        break;
      case 'logs':
        await this.showNodeLogs(node);
        break;
      case 'delete':
        await this.deleteNode(node);
        break;
      default:
        console.warn(`Unknown node action: ${actionId}`);
    }
  }
  
  /**
   * Execute edge-specific actions
   */
  async executeEdgeAction(actionId, edgeElement, mousePosition) {
    const edgeId = edgeElement.getAttribute('data-edge-id');
    const edge = this.edgeList?.find(e => e.id === edgeId);
    
    if (!edge) {
      console.error(`Edge not found: ${edgeId}`);
      return;
    }
    
    switch (actionId) {
      case 'edit':
        await this.editEdge(edge);
        break;
      case 'properties':
        await this.showEdgeProperties(edge);
        break;
      case 'reverse':
        await this.reverseEdge(edge);
        break;
      case 'delete':
        await this.deleteEdge(edge);
        break;
      default:
        console.warn(`Unknown edge action: ${actionId}`);
    }
  }
  
  /**
   * Execute background-specific actions
   */
  async executeBackgroundAction(actionId, mousePosition) {
    switch (actionId) {
      case 'add-user':
        await this.addUserNode(mousePosition);
        break;
      case 'add-server':
        await this.addServerNode(mousePosition);
        break;
      case 'paste':
        await this.pasteFromClipboard(mousePosition);
        break;
      case 'select-all':
        await this.selectAllNodes();
        break;
      case 'clear-selection':
        await this.clearSelection();
        break;
      case 'center-view':
        await this.centerView();
        break;
      case 'reset-zoom':
        await this.resetZoom();
        break;
      default:
        console.warn(`Unknown background action: ${actionId}`);
    }
  }
  
  // Node Actions Implementation
  async editNode(node) {
    console.log(`📝 Editing node: ${node.id}`);
    
    const label = prompt(`Edit label for node ${node.id}:`, node.label || '');
    if (label !== null) {
      node.label = label;
      // Update the node display if there's a label element
      const labelElement = node.element.querySelector('text');
      if (labelElement) {
        labelElement.textContent = label;
      }
      console.log(`✅ Updated node ${node.id} label to: ${label}`);
    }
  }
  
  async duplicateNode(node) {
    console.log(`📋 Duplicating node: ${node.id}`);
    
    if (window.duplicateSelectedNode) {
      // First select the node
      if (this.interactionManager) {
        this.interactionManager.selectNode(node);
      }
      
      // Then duplicate it
      try {
        await window.duplicateSelectedNode();
        console.log(`✅ Node ${node.id} duplicated successfully`);
      } catch (error) {
        console.error(`Failed to duplicate node ${node.id}:`, error);
        alert('Failed to duplicate node. Please try again.');
      }
    } else {
      console.warn('duplicateSelectedNode function not available');
      alert('Node duplication not available in this context');
    }
  }
  
  async manageNodePermissions(node) {
    console.log(`🔒 Managing permissions for node: ${node.id}`);
    // TODO: Implement permissions dialog
    alert(`Manage permissions for: ${node.id}`);
  }
  
  async showNodeProperties(node) {
    console.log(`⚙️ Showing properties for node: ${node.id}`);
    
    const properties = [
      `ID: ${node.id}`,
      `Label: ${node.label || 'None'}`,
      `Class: ${node.class || 'default'}`,
      `Position: (${node.x}, ${node.y})`,
      `Scale: ${node.scale || 1}`
    ];
    
    alert(`Node Properties:\n\n${properties.join('\n')}`);
  }
  
  async showNodeStatus(node) {
    console.log(`📊 Showing status for node: ${node.id}`);
    // TODO: Implement status dialog
    alert(`Status for: ${node.id}`);
  }
  
  async configureNode(node) {
    console.log(`⚙️ Configuring node: ${node.id}`);
    // TODO: Implement configuration dialog
    alert(`Configure: ${node.id}`);
  }
  
  async showNodeLogs(node) {
    console.log(`📜 Showing logs for node: ${node.id}`);
    // TODO: Implement logs dialog
    alert(`Logs for: ${node.id}`);
  }
  
  async deleteNode(node) {
    console.log(`🗑️ Deleting node: ${node.id}`);
    
    if (confirm(`Are you sure you want to delete node "${node.id}"?`)) {
      try {
        // Remove from node map
        this.nodeMap?.delete(node.id);
        
        // Remove from DOM
        if (node.element) {
          node.element.remove();
        }
        
        // Remove associated edges
        if (this.edgeList) {
          const edgesToRemove = this.edgeList.filter(edge => 
            edge.from === node.id || edge.to === node.id
          );
          
          edgesToRemove.forEach(edge => {
            const edgeIndex = this.edgeList.indexOf(edge);
            if (edgeIndex > -1) {
              this.edgeList.splice(edgeIndex, 1);
            }
            if (edge.element) {
              edge.element.remove();
            }
          });
        }
        
        console.log(`✅ Node ${node.id} deleted successfully`);
      } catch (error) {
        console.error(`Failed to delete node ${node.id}:`, error);
      }
    }
  }
    // Edge Actions Implementation
  async editEdge(edge) {
    console.log(`📝 Editing edge: ${edge.id}`);
    
    const label = prompt(`Edit label for edge ${edge.id}:`, edge.label || '');
    if (label !== null) {
      edge.label = label;
      // Update the edge display if there's a label element
      const labelElement = edge.element.querySelector('text');
      if (labelElement) {
        labelElement.textContent = label;
      }
      console.log(`✅ Updated edge ${edge.id} label to: ${label}`);
    }
  }

  async showEdgeProperties(edge) {
    console.log(`⚙️ Showing properties for edge: ${edge.id}`);
    
    const properties = [
      `ID: ${edge.id}`,
      `Label: ${edge.label || 'None'}`,
      `Class: ${edge.class || 'default'}`,
      `From: ${edge.from}`,
      `To: ${edge.to}`
    ];
    
    alert(`Edge Properties:\n\n${properties.join('\n')}`);
  }
  
  async reverseEdge(edge) {
    console.log(`🔄 Reversing edge: ${edge.id}`);
    // TODO: Implement edge reversal
    alert(`Reverse edge: ${edge.id}`);
  }
  
  async deleteEdge(edge) {
    console.log(`🗑️ Deleting edge: ${edge.id}`);
    
    if (confirm(`Are you sure you want to delete this connection?`)) {
      try {
        // Remove from edge list
        if (this.edgeList) {
          const edgeIndex = this.edgeList.indexOf(edge);
          if (edgeIndex > -1) {
            this.edgeList.splice(edgeIndex, 1);
          }
        }
        
        // Remove from DOM
        if (edge.element) {
          edge.element.remove();
        }
        
        console.log(`✅ Edge ${edge.id} deleted successfully`);
      } catch (error) {
        console.error(`Failed to delete edge ${edge.id}:`, error);
      }
    }
  }
    // Background Actions Implementation
  async addUserNode(mousePosition) {
    console.log(`👤 Adding user node at:`, mousePosition);
    
    // Create user node data
    const nodeData = {
      id: `user_${Date.now()}`,
      x: mousePosition.x,
      y: mousePosition.y,
      svg: 'user.svg',
      label: 'User',
      class: 'user',
      scale: 0.21
    };
    
    // Check if we have access to the global createNode function
    if (window.createNode) {
      try {
        await window.createNode(nodeData);
        console.log(`✅ User node created: ${nodeData.id}`);
      } catch (error) {
        console.error('Failed to create user node:', error);
        alert('Failed to create user node. Please try again.');
      }
    } else {
      console.warn('createNode function not available');
      alert('Node creation not available in this context');
    }
  }

  async addServerNode(mousePosition) {
    console.log(`🖥️ Adding server node at:`, mousePosition);
    
    // Create server node data
    const nodeData = {
      id: `server_${Date.now()}`,
      x: mousePosition.x,
      y: mousePosition.y,
      svg: 'server.svg',
      label: 'Server',
      class: 'server',
      scale: 0.5
    };
    
    // Check if we have access to the global createNode function
    if (window.createNode) {
      try {
        await window.createNode(nodeData);
        console.log(`✅ Server node created: ${nodeData.id}`);
      } catch (error) {
        console.error('Failed to create server node:', error);
        alert('Failed to create server node. Please try again.');
      }
    } else {
      console.warn('createNode function not available');
      alert('Node creation not available in this context');
    }
  }
  
  async pasteFromClipboard(mousePosition) {
    console.log(`📋 Pasting from clipboard at:`, mousePosition);
    // TODO: Implement paste functionality
    alert(`Paste at (${mousePosition.x.toFixed(0)}, ${mousePosition.y.toFixed(0)})`);
  }
    async selectAllNodes() {
    console.log(`⚡ Selecting all nodes`);
    
    if (this.interactionManager && this.nodeMap) {
      // First clear current selection
      this.interactionManager.deselectAllNodes();
      
      // Then select all nodes
      for (const [nodeId, node] of this.nodeMap) {
        if (node && node.element) {
          node.element.classList.add('selected');
          
          // Also use state machine to select if available
          if (window.nodeStateManager) {
            try {
              window.nodeStateManager.handleNodeEvent(nodeId, 'select');
            } catch (error) {
              console.warn(`Could not select node ${nodeId} via state machine:`, error);
            }
          }
        }
      }
      
      console.log(`✅ Selected ${this.nodeMap.size} nodes`);
    } else {
      console.warn('InteractionManager or nodeMap not available');
      alert('Selection not available in this context');
    }
  }

  async clearSelection() {
    console.log(`❌ Clearing selection`);
    
    if (this.interactionManager) {
      this.interactionManager.deselectAllNodes();
      console.log(`✅ Selection cleared`);
    } else {
      console.warn('InteractionManager not available');
      alert('Selection clearing not available in this context');
    }
  }
  
  async centerView() {
    console.log(`🎯 Centering view`);
    if (this.viewBoxManager) {
      this.viewBoxManager.resetView();
    }
  }
  
  async resetZoom() {
    console.log(`🔍 Resetting zoom`);
    if (this.viewBoxManager) {
      this.viewBoxManager.resetView();
    }
  }
}

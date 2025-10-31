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
    console.log(`🎯 ContextMenuActions.executeAction called:`);
    console.log(`  - actionId: ${actionId}`);
    console.log(`  - contextType: ${contextType}`);
    console.log(`  - targetElement:`, targetElement);
    console.log(`  - mousePosition:`, mousePosition);

    try {
      if (!contextType) {
        console.error(`❌ Context type is null. Ensure the correct context type is passed.`);
        console.log(`🔍 Debug Info: actionId=${actionId}, targetElement=`, targetElement, `, mousePosition=`, mousePosition);
        return;
      }

      switch (contextType) {
        case 'node':
          console.log(`🎯 Executing node action: ${actionId}`);
          await this.executeNodeAction(actionId, targetElement, mousePosition);
          break;
        case 'edge':
          console.log(`🎯 Executing edge action: ${actionId}`);
          await this.executeEdgeAction(actionId, targetElement, mousePosition);
          break;
        case 'background':
          console.log(`🎯 Executing background action: ${actionId}`);
          await this.executeBackgroundAction(actionId, mousePosition);
          break;
        default:
          console.warn(`Unknown context type: ${contextType}`);
      }
    } catch (error) {
      console.error(`❌ Error executing action ${actionId}:`, error);
      alert(`Failed to execute action: ${error.message}`);
    }
  }
  
  /**
   * Execute node-specific actions
   */
  async executeNodeAction(actionId, nodeElement, mousePosition) {
    console.log(`🎯 ExecuteNodeAction called: actionId=${actionId}`);
    console.log(`🔍 NodeElement:`, nodeElement);
    
    const nodeId = nodeElement.getAttribute('data-node-id');
    console.log(`🔍 Node ID from element: ${nodeId}`);
    
    const node = this.nodeMap?.get(nodeId);
    console.log(`🔍 Node from nodeMap:`, node);
    
    if (!node) {
      console.error(`❌ Node not found: ${nodeId}`);
      console.log(`🔍 Available nodes in nodeMap:`, Array.from(this.nodeMap?.keys() || []));
      return;
    }
    
    console.log(`✅ Executing ${actionId} action for node ${node.id}`);
    
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
        console.log(`🗑️ Delete action triggered for node ${node.id}`);
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
      // Pass the node directly to duplicateSelectedNode instead of relying on selection
      try {
        await window.duplicateSelectedNode(node);
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
  
  /**
   * Delete a node without confirmation (for testing)
   */
  async deleteNodeDirect(node) {
    console.log(`🗑️ DIRECT DELETE: Deleting node: ${node.id} WITHOUT confirmation`);
    
    try {
      // Deselect the node if it's currently selected
      if (this.interactionManager && this.interactionManager.selectedNode === node) {
        console.log(`🔄 Deselecting node ${node.id} before deletion`);
        this.interactionManager.deselectAllNodes();
      }
      
      // Remove from node map
      if (this.nodeMap && this.nodeMap.has(node.id)) {
        this.nodeMap.delete(node.id);
        console.log(`✅ Removed node ${node.id} from nodeMap`);
      } else {
        console.warn(`⚠️ Node ${node.id} not found in nodeMap`);
      }
      
      // Remove from DOM
      if (node.element && node.element.parentNode) {
        node.element.remove();
        console.log(`✅ Removed node ${node.id} from DOM`);
      } else {
        console.warn(`⚠️ Node ${node.id} element not found in DOM or has no parent`);
      }
      
      console.log(`🗑️ DIRECT DELETE: Node map and DOM cleanup completed`);

      // Remove associated edges - use the live edge list reference
      console.log(`🗑️ DIRECT DELETE: Starting edge cleanup...`);
      const currentEdgeList = window.renderer?.getEdgeList?.() || window.edgeList || this.edgeList;
      console.log(`🗑️ DIRECT DELETE: Got edge list reference:`, currentEdgeList);
      if (currentEdgeList) {
        const initialEdgeCount = currentEdgeList.length;
        console.log(`🔍 Looking for edges connected to node ${node.id} in edgeList of ${initialEdgeCount} edges`);
        console.log(`🔍 Using edge list reference:`, currentEdgeList === this.edgeList ? 'this.edgeList' : 'window.edgeList/renderer');
        
        // Debug: Log all edges and their properties
        currentEdgeList.forEach((edge, index) => {
          console.log(`🔍 Edge ${index}: id=${edge.id}, from=${edge.from}, to=${edge.to}, type=${typeof edge.from}/${typeof edge.to}`);
        });
        
        const edgesToRemove = currentEdgeList.filter(edge => {
          // Handle both string and object IDs
          const edgeFrom = typeof edge.from === 'string' ? edge.from : edge.from?.id;
          const edgeTo = typeof edge.to === 'string' ? edge.to : edge.to?.id;
          const nodeId = typeof node.id === 'string' ? node.id : node.id?.toString();
          
          console.log(`🔍 Comparing edge ${edge.id}:`);
          console.log(`  edge.from = ${edge.from} (type: ${typeof edge.from})`);
          console.log(`  edge.to = ${edge.to} (type: ${typeof edge.to})`);
          console.log(`  edgeFrom = ${edgeFrom} (type: ${typeof edgeFrom})`);
          console.log(`  edgeTo = ${edgeTo} (type: ${typeof edgeTo})`);
          console.log(`  node.id = ${node.id} (type: ${typeof node.id})`);
          console.log(`  nodeId = ${nodeId} (type: ${typeof nodeId})`);
          
          const shouldRemove = edgeFrom === nodeId || edgeTo === nodeId;
          console.log(`  shouldRemove = ${shouldRemove}`);
          
          return shouldRemove;
        });
        
        console.log(`🔍 Found ${edgesToRemove.length} edges to remove for node ${node.id}`);
        
        edgesToRemove.forEach(edge => {
          const edgeIndex = currentEdgeList.indexOf(edge);
          if (edgeIndex > -1) {
            currentEdgeList.splice(edgeIndex, 1);
            console.log(`✅ Removed edge ${edge.id} from edgeList`);
          }
          if (edge.element && edge.element.parentNode) {
            edge.element.remove();
            console.log(`✅ Removed edge ${edge.id} from DOM`);
          }
        });
        
        console.log(`🔍 Edges removed: ${initialEdgeCount - currentEdgeList.length}`);
      } else {
        console.warn(`⚠️ DIRECT DELETE: EdgeList not available for edge cleanup`);
      }

      console.log(`✅ DIRECT DELETE COMPLETE: Node ${node.id} deleted successfully`);
      
      // Trigger a redraw if callback is available
      if (this.diagramComponents.redrawCallback) {
        this.diagramComponents.redrawCallback();
      }
      
    } catch (error) {
      console.error(`❌ DIRECT DELETE ERROR: Failed to delete node ${node.id}:`, error);
    }
  }

  async deleteNode(node) {
    console.log(`🗑️ DELETENODE START: Deleting node: ${node.id}`);
    console.log(`🔍 Node object:`, node);
    console.log(`🔍 Node element:`, node.element);
    console.log(`🔍 NodeMap size before:`, this.nodeMap?.size);
    console.log(`🔍 EdgeList reference:`, this.edgeList);
    console.log(`🔍 EdgeList === window.edgeList:`, this.edgeList === window.edgeList);
    console.log(`🔍 EdgeList === window.renderer?.getEdgeList():`, this.edgeList === window.renderer?.getEdgeList?.());
    
    console.log(`🗑️ DELETENODE: About to show confirmation dialog`);
    // Temporarily skip confirmation for debugging
    const confirmResult = true; // confirm(`Are you sure you want to delete node "${node.id}"?`);
    console.log(`🗑️ DELETENODE: Confirmation result: ${confirmResult} (SKIPPED FOR DEBUG)`);
    
    if (confirmResult) {
      console.log(`🗑️ DELETENODE: User confirmed deletion, proceeding...`);
      try {
        // Deselect the node if it's currently selected
        if (this.interactionManager && this.interactionManager.selectedNode === node) {
          console.log(`🔄 Deselecting node ${node.id} before deletion`);
          this.interactionManager.deselectAllNodes();
        }
        
        // Remove from node map
        if (this.nodeMap && this.nodeMap.has(node.id)) {
          this.nodeMap.delete(node.id);
          console.log(`✅ Removed node ${node.id} from nodeMap`);
        } else {
          console.warn(`⚠️ Node ${node.id} not found in nodeMap`);
        }
        
        // Remove from DOM
        if (node.element && node.element.parentNode) {
          node.element.remove();
          console.log(`✅ Removed node ${node.id} from DOM`);
        } else {
          console.warn(`⚠️ Node ${node.id} element not found in DOM or has no parent`);
        }
        console.log(`🗑️ DELETENODE: Node map and DOM cleanup completed`);

        // Remove associated edges - use the live edge list reference
        console.log(`🗑️ DELETENODE: Starting edge cleanup...`);
        const currentEdgeList = window.renderer?.getEdgeList?.() || window.edgeList || this.edgeList;
        console.log(`🗑️ DELETENODE: Got edge list reference:`, currentEdgeList);
        if (currentEdgeList) {
          const initialEdgeCount = currentEdgeList.length;
          console.log(`🔍 Looking for edges connected to node ${node.id} in edgeList of ${initialEdgeCount} edges`);
          console.log(`🔍 Using edge list reference:`, currentEdgeList === this.edgeList ? 'this.edgeList' : 'window.edgeList/renderer');
          
          // Debug: Log all edges and their properties
          currentEdgeList.forEach((edge, index) => {
            console.log(`🔍 Edge ${index}: id=${edge.id}, from=${edge.from}, to=${edge.to}, type=${typeof edge.from}/${typeof edge.to}`);
            console.log(`🔍 Edge ${index} full object:`, edge);
            console.log(`🔍 Edge ${index} edgeData:`, edge.edgeData);
          });
          
          const edgesToRemove = currentEdgeList.filter(edge => {
            // Handle both string and object IDs
            const edgeFrom = typeof edge.from === 'string' ? edge.from : edge.from?.id;
            const edgeTo = typeof edge.to === 'string' ? edge.to : edge.to?.id;
            const nodeId = typeof node.id === 'string' ? node.id : node.id?.toString();
            
            console.log(`🔍 Comparing edge ${edge.id}:`);
            console.log(`  edge.from = ${edge.from} (type: ${typeof edge.from})`);
            console.log(`  edge.to = ${edge.to} (type: ${typeof edge.to})`);
            console.log(`  edgeFrom = ${edgeFrom} (type: ${typeof edgeFrom})`);
            console.log(`  edgeTo = ${edgeTo} (type: ${typeof edgeTo})`);
            console.log(`  node.id = ${node.id} (type: ${typeof node.id})`);
            console.log(`  nodeId = ${nodeId} (type: ${typeof nodeId})`);
            
            const shouldRemove = edgeFrom === nodeId || edgeTo === nodeId;
            console.log(`  shouldRemove = ${shouldRemove}`);
            
            if (shouldRemove) {
              console.log(`✅ Will remove edge ${edge.id} (matches node ${nodeId})`);
            }
            return shouldRemove;
          });
          
          console.log(`🔍 Found ${edgesToRemove.length} edges to remove for node ${node.id}`);
          
          edgesToRemove.forEach(edge => {
            const edgeIndex = currentEdgeList.indexOf(edge);
            if (edgeIndex > -1) {
              currentEdgeList.splice(edgeIndex, 1);
              console.log(`✅ Removed edge ${edge.id} from edgeList`);
            }
            if (edge.element && edge.element.parentNode) {
              edge.element.remove();
              console.log(`✅ Removed edge ${edge.id} from DOM`);
            }
          });
          
          console.log(`🔍 Edges removed: ${initialEdgeCount - currentEdgeList.length}`);        } else {
          console.warn(`⚠️ DELETENODE: EdgeList not available for edge cleanup`);
        }

        console.log(`🔍 NodeMap size after:`, this.nodeMap?.size);
        console.log(`✅ DELETENODE COMPLETE: Node ${node.id} deleted successfully`);
        
        // Trigger a redraw if callback is available
        if (this.diagramComponents.redrawCallback) {
          this.diagramComponents.redrawCallback();
        }
        
      } catch (error) {
        console.error(`❌ DELETENODE ERROR: Failed to delete node ${node.id}:`, error);
        alert(`Failed to delete node: ${error.message}`);
      }
    } else {
      console.log(`❌ DELETENODE CANCELLED: Node deletion cancelled by user`);
    }
  }
    // Edge Actions Implementation
  async editEdge(edge) {
    console.log(`📝 Editing edge: ${edge.id}`);

    // Create a modal or floating box for editing edge properties
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = 'white';
    modal.style.border = '1px solid black';
    modal.style.zIndex = '1000';

    // Line type dropdown
    const lineTypeLabel = document.createElement('label');
    lineTypeLabel.textContent = 'Line Type:';
    const lineTypeSelect = document.createElement('select');
    ['solid', 'dashed', 'dotted'].forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      if (edge.lineType === type) option.selected = true;
      lineTypeSelect.appendChild(option);
    });

    // Arrow end type dropdown
    const arrowTypeLabel = document.createElement('label');
    arrowTypeLabel.textContent = 'Arrow End Type:';
    const arrowTypeSelect = document.createElement('select');
    ['none', 'arrow', 'circle'].forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      if (edge.arrowType === type) option.selected = true;
      arrowTypeSelect.appendChild(option);
    });

    // Text input for edge label
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Edge Label:';
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = edge.label || '';

    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.onclick = () => {
      edge.lineType = lineTypeSelect.value;
      edge.arrowType = arrowTypeSelect.value;
      edge.label = textInput.value;

      // Update the edge visually
      const fromNode = this.nodeMap.get(edge.from);
      const toNode = this.nodeMap.get(edge.to);
      if (fromNode && toNode && edge.renderer) {
        edge.renderer.updatePath(fromNode, toNode);
      } else {
        console.error('Failed to update edge visual: Missing nodes or renderer');
      }

      document.body.removeChild(modal);
      console.log(`✅ Edge ${edge.id} updated.`);
    };

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => {
      document.body.removeChild(modal);
      console.log(`❌ Edit cancelled for edge ${edge.id}.`);
    };

    // Append elements to modal
    modal.appendChild(lineTypeLabel);
    modal.appendChild(lineTypeSelect);
    modal.appendChild(document.createElement('br'));
    modal.appendChild(arrowTypeLabel);
    modal.appendChild(arrowTypeSelect);
    modal.appendChild(document.createElement('br'));
    modal.appendChild(textLabel);
    modal.appendChild(textInput);
    modal.appendChild(document.createElement('br'));
    modal.appendChild(saveButton);
    modal.appendChild(cancelButton);

    // Append modal to body
    document.body.appendChild(modal);
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

// Version coordination approach
const APP_VERSION = '1.0.6'; // Increment this when any file changes

import { Node } from `./Node.js?v=${APP_VERSION}`;
import { Edge } from `./Edge.js?v=${APP_VERSION}`;
import { ViewBoxManager } from `./ViewBoxManager.js?v=${APP_VERSION}`;
import { DragManager } from `./DragManager.js?v=${APP_VERSION}`;
import { InteractionManager } from `./InteractionManager.js?v=${APP_VERSION}`;
import { generateGuid, clearGuidRegistry, initializeFromExisting } from `./GuidManager.js?v=${APP_VERSION}`;
import { nodeStateManager } from `./NodeStateManager.js?v=${APP_VERSION}`;

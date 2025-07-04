// Timestamp-based versioning (updates automatically on page load)
const CACHE_BUST = Date.now();

import { Node } from `./Node.js?v=${CACHE_BUST}`;
import { Edge } from `./Edge.js?v=${CACHE_BUST}`;
// ... etc

// Or for development, use a fixed timestamp that you update manually:
const DEV_VERSION = '20250104'; // Update this date when you want to bust cache

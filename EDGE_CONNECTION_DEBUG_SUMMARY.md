# Edge Connection Debugging Summary

## Problem
The user reported that "the edges are not oriented to the node centers" - meaning that edges are not connecting to the visual centers of nodes as expected.

## Current Implementation

### Node Center Calculation
- **getLocalCenter()**: Returns the center of the node in local coordinates using `getBBox()`
- **getViewportCenter()**: Returns the center of the node in viewport coordinates by adding node position to local center

```javascript
getLocalCenter() {
  const bbox = this.element.getBBox();
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
    radius: Math.min(bbox.width, bbox.height) / 2
  };
}

getViewportCenter() {
  const localCenter = this.getLocalCenter();
  return {
    x: this.nodeData.x + localCenter.x,
    y: this.nodeData.y + localCenter.y,
    radius: localCenter.radius
  };
}
```

### Edge Connection Logic
- **Primary**: Uses `getViewportCenter()` when available
- **Fallback**: Calculates viewport center from local center + node position
- **Ultimate fallback**: Uses node position directly

```javascript
if (typeof fromNode.getViewportCenter === 'function') {
  p1 = fromNode.getViewportCenter();
} else if (typeof fromNode.getLocalCenter === 'function' && fromNode.nodeData) {
  const localCenter = fromNode.getLocalCenter();
  p1 = { 
    x: fromNode.nodeData.x + localCenter.x, 
    y: fromNode.nodeData.y + localCenter.y, 
    radius: localCenter.radius 
  };
}
```

## Debug Tests Created

### 1. test-edge-connection-debug.html
- **Purpose**: Visual debugging of actual edge connections
- **Features**:
  - Creates two nodes with known positions
  - Shows visual markers for:
    - Node transform origins (orange/green)
    - Calculated node centers (red/blue)
    - Actual edge endpoints (purple)
  - Measures distances between edge endpoints and calculated centers
  - Provides pass/fail analysis

### 2. debug-svg-bbox.html
- **Purpose**: Investigate SVG getBBox() behavior
- **Features**:
  - Tests different center calculation methods
  - Shows bounding box outlines
  - Compares bbox.x+width/2 vs width/2 vs origin methods

### 3. debug-center-calculation.html
- **Purpose**: Test center calculations on various node types
- **Features**:
  - Tests different SVG shapes (circles, rectangles, complex icons)
  - Shows how getBBox() behaves with different SVG content

## Expected Behavior
1. **Node Centers**: Should be at the visual center of the node icon/shape
2. **Edge Endpoints**: Should connect to the edge of the node at the point closest to the other node
3. **Stability**: Connections should remain stable during pan/zoom operations

## Key Insights
1. **SVG Icons**: Have their own coordinate systems and viewBoxes
2. **getBBox()**: Returns coordinates relative to the SVG's internal coordinate system
3. **Transform Origin**: Nodes are positioned using `transform="translate(x,y)"`
4. **Center Calculation**: Must account for SVG coordinate system offset

## Debugging Process
1. Run `test-edge-connection-debug.html`
2. Check visual markers to see if:
   - Red/blue markers (calculated centers) are at the visual centers of nodes
   - Purple markers (edge endpoints) are close to the red/blue markers
3. Review debug output for distance measurements
4. If edges are not connecting to centers, the issue is likely in the center calculation logic

## Next Steps
Based on the debug test results, we can:
1. **If centers are correct but edges are wrong**: Fix edge calculation logic
2. **If centers are wrong**: Fix the `getLocalCenter()` method
3. **If transform origins are wrong**: Fix node positioning logic

The debug tests provide comprehensive visual and numerical feedback to identify exactly where the problem lies.

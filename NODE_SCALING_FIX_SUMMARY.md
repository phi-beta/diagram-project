# Node Scaling Fix - Test Accuracy Update

## Issue Identified
The test files were creating nodes with default scaling (scale = 1.0), but the actual diagram uses different scaling values from `layout.json`:
- User nodes: scale = 0.21037687894947063 (about 21% of original size)
- Server nodes: scale = 0.49719793227240705 (about 50% of original size)

This discrepancy could cause:
1. Incorrect center calculations in tests vs. actual usage
2. Different edge connection points
3. Misleading radius calculations for edge endpoints

## Root Cause
The tests were not accounting for the actual scale values used in the production layout, leading to nodes that were approximately 5x larger for user nodes and 2x larger for server nodes.

## Solution Applied
Updated all test files to use the correct scaling values from `layout.json`:

### Files Modified:
1. **test-simple-center-calculation.html**
   - Added scale values to nodePositions array
   - Updated transform attribute to include scale
   - Fixed radius calculation to account for scaling

2. **test-edge-connection-debug.html**
   - Added scale property to node creation calls
   - Ensures nodes match the actual diagram appearance

3. **test-coordinate-system-fix.html**
   - Added scale property to node creation calls
   - Provides accurate testing environment

### Key Changes:
```javascript
// Before (incorrect):
{ x: 200, y: 200, svg: 'user.svg', label: 'User Node' }

// After (correct):
{ x: 200, y: 200, svg: 'user.svg', label: 'User Node', scale: 0.21037687894947063 }
```

```javascript
// Transform attribute updated:
g.setAttribute('transform', `translate(${pos.x}, ${pos.y}) scale(${pos.scale})`);
```

```javascript
// Radius calculation corrected:
radius: localCenter.radius * pos.scale
```

## Expected Impact
With proper scaling:
1. **User nodes** will be much smaller (21% of original size)
2. **Server nodes** will be smaller (50% of original size)
3. **Edge connections** will be more accurate to actual usage
4. **Center calculations** will match production behavior
5. **Radius calculations** will be proportionally correct

## Verification Steps
1. Run the updated simple center calculation test
2. Compare results with the main index.html diagram
3. Verify edge connection accuracy in the debug test
4. Ensure visual markers align with actual node centers

## Status
✅ **UPDATED** - All test files now use proper scaling values matching the production layout, ensuring accurate testing of center calculations and edge connections.

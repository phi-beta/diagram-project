# CSS Loading Timing Fix

## Problem Identified
On initial page load, the diagram elements were using the default (light) theme styling, but the grid was picking up dark theme colors. This suggests a race condition where:

1. The CSS file loads asynchronously 
2. `window.onload` can fire before CSS variables are fully parsed and available
3. Different parts of the code were reading CSS variables at different times, getting inconsistent results

## Root Cause Analysis
- **CSS Loading Race Condition**: Link tags load CSS asynchronously, but `getComputedStyle()` might return empty values if called before CSS is fully parsed
- **Theme Initialization Timing**: The GridManager was being initialized before CSS variables were reliably available
- **Theme Toggle Timing**: When switching themes, the update was happening before the new CSS was fully loaded

## Solutions Implemented

### 1. Enhanced CSS Loading Detection
**File: `index.html`**
- Added a CSS loading helper function `ensureCSSLoaded()` that:
  - Creates a test element to force style computation
  - Repeatedly checks for CSS variable availability
  - Only proceeds when both grid colors and background are available
  - Provides better logging for debugging

### 2. Robust GridManager Initialization 
**File: `js/renderer.js` - loadLayout()**
- Dual initialization strategy:
  - Primary: Use CSS loading helper if available
  - Fallback: Enhanced polling with better error handling
- Added attempt counting and forced style recalculation after multiple failures
- More detailed logging to track CSS loading progress

### 3. Improved Theme Toggle Function
**File: `js/renderer.js` - toggleTheme()**
- Enhanced CSS change detection before updating grid colors
- Waits for new theme CSS to be fully loaded before calling `updateThemeColors()`
- Added comprehensive logging for theme switch debugging

### 4. Enhanced GridManager Theme Detection
**File: `js/GridManager.js` - initializeThemeColors()**
- Better fallback handling when CSS variables are missing
- Enhanced logging to distinguish between actual CSS values vs fallbacks
- Warning messages when CSS variables aren't fully loaded yet

### 5. Version Updates
- Updated all version numbers to force browser cache refresh:
  - renderer.js: v122 → v123
  - GridManager.js: v018 (enhanced)
  - CSS files: v041 → v042
  - index.html: Updated script version reference

## Expected Behavior After Fix

### Initial Load
1. CSS loading helper ensures CSS variables are available before GridManager initialization
2. Both diagram elements and grid should use the same theme consistently
3. Console logs will show CSS loading progress and confirmation

### Theme Toggle
1. Theme switch waits for new CSS to load completely
2. Grid colors update only after new theme is confirmed loaded
3. All elements switch themes synchronously

## Testing
Created `test-css-loading.html` to isolate and verify CSS loading behavior:
- Tests CSS variable availability on load
- Logs detailed timing information
- Provides manual theme toggle testing
- Shows exactly when CSS variables become available

## Files Modified
1. `index.html` - Added CSS loading helper
2. `js/renderer.js` - Enhanced initialization and theme toggle
3. `js/GridManager.js` - Better theme detection and logging
4. Created `test-css-loading.html` - Testing page

## Next Steps
1. Test initial load behavior - grid and diagram should use same theme
2. Test theme toggle - should switch synchronously
3. Monitor console logs for CSS loading timing
4. Verify behavior across different browsers/loading speeds

This fix ensures that CSS variables are reliably available before any component tries to read them, eliminating the race condition that caused the diagram and grid to use different themes on initial load.

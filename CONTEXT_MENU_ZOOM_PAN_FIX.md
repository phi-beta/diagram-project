# Context Menu Zoom/Pan Fix

## Problem
When a context menu was displayed in the diagram editor, users could not zoom or pan the diagram. The context menu overlay was blocking all mouse events from reaching the underlying SVG element.

## Root Cause Analysis
The issue was caused by the ContextMenu implementation:

1. **Full-screen overlay**: The context menu used a full-screen SVG overlay (`position: fixed` covering 100vw x 100vh)
2. **Blocked pointer events**: When the menu was visible, `pointerEvents: 'auto'` was set on the entire overlay
3. **Aggressive event blocking**: Mouse events were being stopped with `e.stopPropagation()` and `e.preventDefault()`
4. **Essential events blocked**: The following events required for zoom/pan were being blocked:
   - `wheel` events (for zooming)
   - `mousedown` events (for starting pan)
   - `mousemove` events (for updating pan)
   - `mouseup` events (for stopping pan)

## Solution
Modified the ContextMenu class to allow zoom/pan events to pass through while still maintaining menu functionality:

### 1. Selective Pointer Events
**Before:**
```javascript
this.overlayContainer.style.pointerEvents = 'auto'; // Blocked all events
```

**After:**
```javascript
this.overlayContainer.style.pointerEvents = 'none'; // Allow events to pass through
this.menuGroup.style.pointerEvents = 'auto'; // Only enable on actual menu
```

### 2. Reduced Event Blocking
**Before:**
```javascript
// Blocked mousedown, mouseup, mousemove on all elements
background.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  e.preventDefault();
});
```

**After:**
```javascript
// Only block events that interfere with menu interaction
background.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  // Handle menu item clicks
});
```

### 3. Conditional Event Handling
**Before:**
```javascript
// Always blocked mousemove
this.overlayContainer.addEventListener('mousemove', (e) => {
  e.stopPropagation();
  e.preventDefault();
});
```

**After:**
```javascript
// Only block if mouse is over actual menu
this.overlayContainer.addEventListener('mousemove', (e) => {
  if (this.isClickInsideMenu(e)) {
    e.stopPropagation();
    e.preventDefault();
  }
});
```

## Technical Details

### Files Modified
- `js/ContextMenu.js` (v008 → v009)
- `js/InteractionManager.js` (v078 → v079) - Updated import version

### Key Changes
1. **Overlay pointer events**: Set to `'none'` to allow events to pass through
2. **Menu-specific pointer events**: Only enable on the actual menu group
3. **Conditional event blocking**: Only block events when mouse is over the menu
4. **Removed excessive event prevention**: Removed blocking of mousedown/mouseup events

### How Zoom/Pan Events Flow Now
1. **Normal operation**: Events pass through overlay directly to SVG
2. **When menu is open**: 
   - Events outside menu → pass through to SVG (zoom/pan works)
   - Events on menu → handled by menu (menu interaction works)
3. **Menu dismissal**: Clicking outside menu works because click events pass through

## Testing
Created comprehensive test page: `test-context-menu-zoom-pan.html`

### Test Cases
1. ✅ Normal zoom/pan functionality
2. ✅ Context menu appears on right-click
3. ✅ Zoom/pan works while context menu is open
4. ✅ Menu dismissal works (click outside, ESC key)
5. ✅ Menu positioning remains stable during zoom/pan

### Test Results
- **Zoom while menu open**: ✅ Works correctly
- **Pan while menu open**: ✅ Works correctly
- **Menu interaction**: ✅ Still works as expected
- **Menu dismissal**: ✅ Works correctly
- **No regression**: ✅ All existing functionality preserved

## Benefits
1. **Improved UX**: Users can zoom/pan without dismissing context menus
2. **More natural interaction**: Context menus don't block essential navigation
3. **Better workflow**: Users can examine menu options while adjusting view
4. **Backward compatibility**: All existing menu functionality preserved

## Implementation Notes
- The fix maintains all existing context menu functionality
- No changes needed to zoom/pan logic - events now reach the SVG naturally
- The approach is cleaner than event re-dispatching alternatives
- Performance impact is minimal (actually reduced event blocking)

## Future Considerations
- Could add visual feedback when hovering over menu items
- Could implement keyboard navigation for menu items
- Could add animation for menu appearance/dismissal
- Could implement menu positioning adjustment based on viewport edges

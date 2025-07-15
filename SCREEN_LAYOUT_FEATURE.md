# Screen Layout Feature

## Overview
The Screen Layout feature allows users to quickly switch between different device screen sizes and aspect ratios for designing and testing diagrams across various devices.

## Features

### 📱 Device Layout Selection
- **Mobile Devices**: iPhone, Android phones in portrait and landscape
- **Tablets**: iPad, Android tablets in portrait and landscape  
- **Desktop**: Common desktop resolutions (1920x1080, 1440x900, etc.)
- **TV/Large Screens**: 4K, 8K, and other large display formats
- **Web**: Common web layouts (laptop, desktop, ultra-wide)

### 🎛️ User Interface
- **Floating Panel**: Accessible via the "📱 Screen Layout" button
- **Category Filters**: Filter layouts by device type (mobile, tablet, desktop, etc.)
- **Live Preview**: Real-time dimension and aspect ratio display
- **Custom Dimensions**: Enter custom width/height values
- **Quick Reset**: Return to default 800x600 layout

### 💾 Configuration
- **JSON Configuration**: All layouts stored in `config/screen-layouts.json`
- **Extensible**: Easy to add new layouts or categories
- **Custom Layouts**: Save frequently used custom dimensions

## Usage

### Basic Usage
1. Click the "📱 Screen Layout" button in the top toolbar
2. Select a category filter (Mobile, Tablet, Desktop, etc.) or use "All"
3. Choose a layout from the dropdown menu
4. The diagram canvas will automatically resize to match

### Custom Dimensions
1. Select "Custom" from the layout dropdown
2. Enter desired width and height values
3. Click "Apply" to set the custom dimensions
4. Optionally click "Save Custom" to store for future use

### Keyboard Shortcuts
- The layout panel can be toggled using the gear icon (⚙️)
- Reset to default layout using the "Reset" button

## Technical Implementation

### Files Structure
```
config/
  screen-layouts.json          # Layout configurations
js/
  ScreenLayoutManager.js       # Core layout management
  ScreenLayoutUI.js           # User interface components
  renderer.js                 # Integration with main app
```

### Key Classes
- **ScreenLayoutManager**: Handles layout switching, SVG resizing, and configuration
- **ScreenLayoutUI**: Provides user interface for layout selection and customization

### Integration
The feature is integrated into the main renderer initialization and works seamlessly with:
- ViewBoxManager for proper scaling
- Theme system for consistent styling
- Grid system for accurate alignment

## Configuration Format

The `config/screen-layouts.json` file structure:
```json
{
  "layouts": [
    {
      "id": "iphone-portrait",
      "name": "iPhone Portrait",
      "width": 375,
      "height": 667,
      "category": "mobile",
      "aspectRatio": "9:16"
    }
  ],
  "categories": {
    "mobile": "📱 Mobile",
    "tablet": "📱 Tablet",
    "desktop": "🖥️ Desktop"
  }
}
```

## Adding New Layouts

To add a new layout:
1. Edit `config/screen-layouts.json`
2. Add a new layout object with required fields
3. Assign to an existing category or create a new one
4. The layout will automatically appear in the UI

## Browser Compatibility
- Works in all modern browsers
- Responsive design adapts to different screen sizes
- Touch-friendly interface for mobile devices

## Future Enhancements
- Import/export layout configurations
- Layout history and favorites
- Preset collections for specific use cases
- Integration with responsive design testing tools

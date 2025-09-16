# ESCAP Climate Risk Visualization - Demo Mode Guide

## Current Status
Your application is now running in **Demo Mode** - a simplified version that works without the Docker infrastructure.

## What's Fixed

### ✅ Service Connection Issues
- **Backend Service**: Now uses mock data instead of requiring Docker backend
- **Geospatial Service**: Simplified to work without GeoServer
- **Database**: Uses in-memory storage via Spark KV system
- **Error Handling**: Graceful fallbacks for missing services

### ✅ Core Features Working
- **Multi-Map Comparison**: 1, 2, or 4 map layouts
- **Country Selection**: Bhutan, Mongolia, Laos with proper zoom levels
- **Map Synchronization**: Pan/zoom sync across all maps
- **Layer Controls**: Climate variables, GIRI hazards, Energy infrastructure
- **Admin Panel**: Data upload interface (mock mode)
- **Boundary Display**: Country administrative boundaries
- **UN ESCAP Styling**: Official color scheme and branding

## How to Use the Application

### 1. Main Interface
- **Top Bar**: Country selection, map layout (1/2/4 maps), dashboard toggle
- **Sidebar**: Layer controls for data overlays (left panel)
- **Map Area**: Interactive maps with zoom/pan synchronization
- **Dashboard**: Analysis and charts (right panel, when enabled)

### 2. Map Navigation
- **Pan**: Click and drag to move around
- **Zoom**: Mouse wheel or zoom controls
- **Country Focus**: Select country to auto-zoom to boundaries
- **Multi-Map**: All maps stay synchronized

### 3. Layer Selection
- **Climate Variables**: Temperature, precipitation, etc.
- **GIRI Hazards**: Flood and drought risk
- **Energy Infrastructure**: Power plants and facilities
- **Click on categories** to see selection options

### 4. Admin Panel Access
- Click "Admin" button in top bar
- Upload raster files (TIF/COG format)
- Upload shapefiles (ZIP format with .shp, .dbf, .shx files)
- Configure classifications and styling

## Current Limitations (Demo Mode)

### 🔄 What's Simulated
- **File Processing**: Upload interface works but uses mock data
- **Raster Display**: Shows sample overlays instead of actual uploaded files
- **Real-time Processing**: Simulated progress bars and status updates
- **Data Analysis**: Mock charts and statistics

### 🎯 What's Fully Functional
- **Map Interactions**: All zoom, pan, and sync features
- **UI Components**: All interface elements and controls
- **Data Storage**: Settings and preferences saved via Spark KV
- **Responsive Design**: Works on different screen sizes

## Next Steps for Production

### 1. Deploy Full Infrastructure
```bash
# When you're ready for production deployment
docker-compose up -d --build
```

### 2. Enable Real Data Processing
- Connect to PostGIS database
- Set up GeoServer for raster/vector serving
- Configure Redis for caching
- Enable file upload processing

### 3. Data Integration
- Upload actual climate data (TIF files)
- Upload GIRI hazard layers
- Upload energy infrastructure shapefiles
- Configure proper styling and classifications

## Technical Details

### Mock Data Sources
- **Boundaries**: Sample GeoJSON for country outlines
- **Climate Data**: Procedurally generated temperature/precipitation layers
- **Energy Sites**: Sample point locations
- **Basemaps**: OpenStreetMap, satellite imagery

### Performance Optimizations
- **Caching**: All map data cached in browser
- **Lazy Loading**: Components load as needed
- **Debounced Updates**: Smooth pan/zoom without lag
- **Memory Management**: Efficient layer switching

## Getting Help

### Common Issues
1. **Map not loading**: Check browser console for errors
2. **Layers not appearing**: Try refreshing the page
3. **Sync issues**: Activate map by clicking before adding layers
4. **Admin panel**: Use "Back to App" button to return to main view

### Performance Tips
- Use single map view for detailed analysis
- Switch to multi-map for comparisons
- Clear layers when changing countries
- Disable dashboard if not needed

## Features Ready for Testing

### ✅ Ready to Use
- Multi-map comparison workflows
- Country boundary visualization
- Layer management and controls
- Map synchronization
- Admin interface mockups
- Responsive design

### 🔄 Coming Soon (with infrastructure)
- Real raster data processing
- Large file upload handling
- Advanced spatial analysis
- Collaborative editing
- Export functionality

---

**Your application is now fully functional in demo mode!** 

Try switching between countries, comparing different map layouts, and exploring the layer controls to see all the features working.
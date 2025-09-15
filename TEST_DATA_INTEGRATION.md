# Test Files for Data Integration

This document explains how to add test files to verify the overlay functionality.

## Quick Test Setup

### Step 1: Convert a sample TIFF to COG format
```bash
# If you have GDAL installed
gdal_translate -of COG -co COMPRESS=DEFLATE input.tif output.cog

# For example:
gdal_translate -of COG -co COMPRESS=DEFLATE bhutan_temp.tif bhutan_temp.cog
```

### Step 2: Create test directory structure
```
src/assets/data/
├── climate/
│   └── bhutan/
│       └── maximum_temp/
│           └── historical/
│               └── annual/
│                   └── max_temp_annual.cog
├── energy/
│   └── bhutan/
│       ├── hydro_power_plants.geojson
│       ├── solar_power_plants.geojson
│       └── wind_power_plants.geojson
└── boundaries/
    └── bhutan/
        └── bhutan_boundary.geojson
```

### Step 3: For shapefiles, convert to GeoJSON for web compatibility
```bash
# If you have ogr2ogr (part of GDAL)
ogr2ogr -f GeoJSON output.geojson input.shp

# For example:
ogr2ogr -f GeoJSON bhutan_boundary.geojson bhutan_boundary.shp
```

## Test Process

1. **Add your files** to the appropriate directories
2. **Click on "Climate Variables"** in the sidebar 
3. **Select Maximum Temperature > Historical > Annual**
4. **Click "Add Layer"** - the system will attempt to load your COG file
5. **Check browser console** for loading status and any errors

## Expected Behavior

✅ **Selection panel appears** when you click on a data category
✅ **Form fields appear progressively** as you make selections  
✅ **Add Layer button activates** when all required fields are filled
✅ **Layer appears in Active Layers** section after adding
✅ **Map overlay loads** (will show in browser console for now)

## Current Implementation Status

- ✅ **File path resolution** - correctly builds paths based on your selections
- ✅ **Progressive form** - shows relevant options based on previous selections  
- ✅ **Layer management** - tracks active layers per map
- ⚠️ **COG loading** - simplified implementation (logs to console)
- ⚠️ **Shapefile loading** - requires GeoJSON format for now

## Alternative: Upload via File Input

If you prefer to test with direct file upload instead of pre-placed files, I can add a file upload component that handles:
- TIFF/COG files for climate/GIRI data
- Shapefile archives (.zip containing .shp, .dbf, .shx, .prj)
- Direct GeoJSON files

## Next Steps

1. Share your test files or file structure
2. I'll implement proper COG loading with OpenLayers GeoTIFF source
3. Add real overlay rendering with classification colors
4. Implement shapefile loading (or GeoJSON conversion)
5. Add proper error handling and loading states

Would you like me to implement file upload functionality or do you prefer working with the pre-placed file structure?
# Data Integration Guide - UN ESCAP Climate & Energy Risk Visualization

## Overview
This guide explains how to integrate your geospatial data (boundary shapefiles, climate raster TIFFs, and energy point shapefiles) into the application using Cloud Optimized GeoTIFF (COG) format for fast overlay performance.

## Required Data Structure

### 1. Boundary Shapefiles (Country/Province boundaries)
**Location:** `/src/assets/data/boundaries/`
```
boundaries/
├── bhutan/
│   ├── bhutan_boundary.shp
│   ├── bhutan_boundary.shx
│   ├── bhutan_boundary.dbf
│   └── bhutan_boundary.prj
├── mongolia/
│   └── [similar structure]
└── laos/
    └── [similar structure]
```

### 2. Climate Raster Files (Convert to COG format)
**Location:** `/src/assets/data/climate/`
```
climate/
├── bhutan/
│   ├── maximum_temp/
│   │   ├── historical/
│   │   │   ├── annual/
│   │   │   │   └── max_temp_annual.cog
│   │   │   └── seasonal/
│   │   │       ├── max_temp_12_02.cog  # Dec-Feb
│   │   │       ├── max_temp_03_05.cog  # Mar-May
│   │   │       ├── max_temp_06_08.cog  # Jun-Aug
│   │   │       └── max_temp_09_11.cog  # Sep-Nov
│   │   ├── ssp1/
│   │   │   ├── 2021-2040/
│   │   │   │   ├── annual/
│   │   │   │   └── seasonal/
│   │   │   ├── 2041-2060/
│   │   │   ├── 2061-2080/
│   │   │   └── 2081-2100/
│   │   └── [ssp2, ssp3, ssp5 similar structure]
│   ├── minimum_temp/
│   ├── mean_temp/
│   ├── precipitation/
│   ├── solar_radiation/
│   ├── cooling_degree_days/
│   └── heating_degree_days/
├── mongolia/
└── laos/
```

### 3. GIRI Hazard Data (Convert to COG format)
**Location:** `/src/assets/data/giri/`
```
giri/
├── bhutan/
│   ├── flood/
│   │   ├── existing/
│   │   │   └── flood_existing.cog
│   │   ├── ssp1/
│   │   │   └── flood_ssp1.cog
│   │   └── ssp5/
│   │       └── flood_ssp5.cog
│   └── drought/
│       └── [similar structure]
├── mongolia/
└── laos/
```

### 4. Energy Infrastructure (Point Shapefiles)
**Location:** `/src/assets/data/energy/`
```
energy/
├── bhutan/
│   ├── hydro_power_plants.shp
│   ├── solar_power_plants.shp
│   └── wind_power_plants.shp
├── mongolia/
└── laos/
```

## Step-by-Step Integration Process

### Step 1: Convert TIFFs to COG Format
You'll need GDAL installed on your system. Use this command for each TIFF file:

```bash
# Install GDAL (if not already installed)
# Ubuntu/Debian: sudo apt-get install gdal-bin
# macOS: brew install gdal
# Windows: Download from https://gdal.org/download.html

# Convert TIFF to COG
gdal_translate -of COG -co COMPRESS=DEFLATE -co PREDICTOR=2 -co OVERVIEW_RESAMPLING=AVERAGE input.tif output.cog

# Example for a climate variable:
gdal_translate -of COG -co COMPRESS=DEFLATE -co PREDICTOR=2 -co OVERVIEW_RESAMPLING=AVERAGE bhutan_max_temp_annual.tif bhutan_max_temp_annual.cog
```

### Step 2: Prepare Data Classification
Create a JSON file for each climate variable defining the classification ranges and colors:

**Location:** `/src/assets/data/classifications/`
```
classifications/
├── maximum_temp.json
├── minimum_temp.json
├── precipitation.json
└── [other variables].json
```

**Example classification file:**
```json
{
  "variable": "maximum_temp",
  "unit": "°C",
  "ranges": [
    { "min": -10, "max": 0, "color": "#1a1a1a", "label": "Very Cold" },
    { "min": 0, "max": 10, "color": "#3b82f6", "label": "Cold" },
    { "min": 10, "max": 20, "color": "#10b981", "label": "Moderate" },
    { "min": 20, "max": 30, "color": "#f59e0b", "label": "Warm" },
    { "min": 30, "max": 50, "color": "#dc2626", "label": "Hot" }
  ]
}
```

### Step 3: Upload Files to Project
1. Create the directory structure in `/src/assets/data/`
2. Upload your converted COG files and shapefiles
3. Upload classification JSON files

### Step 4: Test Integration
I'll create a test overlay system that can:
- Load and display COG files as raster overlays
- Apply color classification based on your JSON files
- Load shapefiles for boundaries and points
- Handle the hierarchical selection system you described

## Current Implementation Status

✅ **Ready for Integration:**
- Multi-map comparison system
- Layer management infrastructure
- OpenLayers with EPSG:4326 support
- Overlay information display
- Legend system framework

🔄 **Next Steps:**
- COG loader utility
- Shapefile loader utility  
- Classification system
- File path resolver based on selections
- Performance optimization for large files

## File Upload Instructions

Once you have your files ready:

1. **Compress your data** into organized ZIP files by country
2. **Share the download links** or describe your data structure
3. **Provide sample classification ranges** for at least one climate variable
4. I'll implement the loading system and test with your data

## Performance Considerations

- **COG Benefits:** 50-100x faster loading than standard TIFFs
- **Tile Pyramids:** Automatic generation for smooth zooming
- **Compression:** DEFLATE compression reduces file sizes by 60-80%
- **Caching:** Browser caches tiles for instant re-display

## Questions for You

1. Do you have GDAL installed to convert TIFFs to COG format?
2. What are the typical data ranges for your climate variables?
3. Do you have preferred color schemes for different variables?
4. Are your shapefiles in EPSG:4326 projection?
5. How large are your typical TIFF files (MB/GB)?

Ready to proceed when you share your test files!
# Data Integration Guide for UN ESCAP Climate & Energy Risk Visualization

## Overview

This guide explains how to integrate your geospatial data (boundary shapefiles, raster files, and point shapefiles) with the UN ESCAP visualization application for fast and responsive overlay capabilities.

## Data Requirements

### 1. Country Boundary Shapefile
- **Format**: Shapefile (.shp, .shx, .dbf, .prj)
- **Projection**: EPSG:4326 (WGS84)
- **Purpose**: Define country boundaries for masking and zoom extent
- **Attributes**: Should include country name/code for identification

### 2. Climate Variable Raster Files
- **Current Format**: GeoTIFF (.tif)
- **Recommended Format**: Cloud Optimized GeoTIFF (COG) for fast loading
- **Projection**: EPSG:4326 (WGS84)
- **Data Classification**: 5 categories with color ranges (0-100, 101-250, 251-500, 501-750, 751-1000)
- **File Structure**:
  ```
  country/
    ├── climate/
    │   ├── maximum_temperature/
    │   │   ├── historical/
    │   │   │   ├── annual/
    │   │   │   │   └── max_temp_annual.cog
    │   │   │   └── seasonal/
    │   │   │       ├── max_temp_jan_mar.cog
    │   │   │       ├── max_temp_apr_jun.cog
    │   │   │       ├── max_temp_jul_sep.cog
    │   │   │       └── max_temp_oct_dec.cog
    │   │   ├── ssp1/
    │   │   │   ├── 2021-2040/
    │   │   │   ├── 2041-2060/
    │   │   │   ├── 2061-2080/
    │   │   │   └── 2081-2100/
    │   │   └── (ssp2, ssp3, ssp5...)
    │   └── (other climate variables...)
  ```

### 3. GIRI Hazard Raster Files
- **Format**: Cloud Optimized GeoTIFF (COG)
- **Projection**: EPSG:4326 (WGS84)
- **Variables**: Flood, Drought
- **Scenarios**: Existing, SSP1, SSP5
- **Data Classification**: 5 categories with appropriate color schemes

### 4. Energy Infrastructure Point Shapefiles
- **Format**: Shapefile (.shp, .shx, .dbf, .prj)
- **Projection**: EPSG:4326 (WGS84)
- **Required Attribute**: `designCapacity` (numeric, in MW)
- **Point Sizing**: Based on designCapacity values
  - < 10 MW: Small (4px)
  - 10-50 MW: Medium (6px)
  - 50-200 MW: Large (8px)
  - > 200 MW: Very Large (10px)

## Converting TIFFs to COG for Fast Performance

To achieve snappy overlay performance (50-100x faster), convert your existing TIFF files to Cloud Optimized GeoTIFF format:

```bash
# Install GDAL if not already installed
# Ubuntu/Debian: sudo apt-get install gdal-bin
# macOS: brew install gdal
# Windows: Download from https://gdal.org/

# Convert single TIFF to COG
gdal_translate -of COG -co COMPRESS=DEFLATE -co TILED=YES -co BLOCKSIZE=512 input.tif output.cog

# Batch convert all TIFFs in a directory
for file in *.tif; do
    gdal_translate -of COG -co COMPRESS=DEFLATE -co TILED=YES -co BLOCKSIZE=512 "$file" "${file%.tif}.cog"
done
```

### COG Parameters Explained:
- `COMPRESS=DEFLATE`: Lossless compression to reduce file size
- `TILED=YES`: Creates internal tiles for efficient random access
- `BLOCKSIZE=512`: Optimal block size for web viewing

## Layer Management System

The application implements smart layer management:

### Restriction Rules:
1. **One layer per category per map**: Only one Climate, GIRI, or Energy layer can be active per sub-map
2. **Climate vs GIRI mutual exclusivity**: Since both are raster overlays with classifications, only one can be visible at a time
3. **Energy layers are additive**: Point shapefiles can coexist with one raster layer

### Example Scenarios:
- ✅ Climate (Temperature) + Energy (Hydro Plants)
- ✅ GIRI (Flood) + Energy (Solar Plants)  
- ❌ Climate (Temperature) + GIRI (Flood) - GIRI will replace Climate
- ❌ Two Climate variables - Second will replace first

## Testing Overlay Integration

To test the overlay system with your data:

1. **Prepare Sample Files**:
   - 1 boundary shapefile for your country
   - 1 climate raster (converted to COG)
   - 1 energy infrastructure shapefile with `designCapacity` attribute

2. **File Hosting**:
   - Host files on a web-accessible server with CORS enabled
   - Ensure URLs are directly accessible (not behind authentication)

3. **Integration Points**:
   - The app will fetch files based on user selections
   - URL structure should match the hierarchical folder organization
   - Files are loaded dynamically when overlay is selected

## Performance Considerations

### Recommended Optimizations:
1. **Use COG format** for all raster data
2. **Tile pyramids**: COG automatically creates multiple resolution levels
3. **File size**: Keep individual files under 50MB for web delivery
4. **Compression**: Use appropriate compression (DEFLATE for most cases)
5. **Spatial indexing**: Ensure shapefiles have .shx spatial index

### Expected Performance:
- COG files: Load in 1-3 seconds
- Regular TIFFs: May take 30-60 seconds or more
- Shapefiles: Near-instantaneous for < 10,000 features

## Next Steps

Once you have prepared your data files:

1. **Convert TIFFs to COG** using the commands above
2. **Validate projections** are EPSG:4326
3. **Test file accessibility** via direct URL access
4. **Provide sample URLs** for integration testing
5. **Configure data endpoint** in the application

The application is designed to handle this data structure and provide responsive, interactive visualizations suitable for policy decision-making and risk analysis.
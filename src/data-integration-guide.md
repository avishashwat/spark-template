# UN ESCAP Data Integration Guide

## Overview

This guide provides comprehensive instructions for uploading and managing geospatial data in the UN ESCAP Climate & Energy Risk Visualization platform. The system supports three types of data:

1. **Raster Data** (Climate and GIRI variables)
2. **Vector Point Data** (Energy infrastructure)
3. **Boundary Data** (Administrative boundaries)

## Prerequisites

### Software Requirements

- **GDAL 3.1+** (for raster processing)
- **Node.js 18+** (if running preprocessing scripts)
- **Python 3.8+** (optional, for advanced processing)

### File Format Requirements

- **Raster files**: `.tif` or `.cog` format in EPSG:4326 projection
- **Shapefiles**: Zipped format containing `.shp`, `.shx`, `.dbf`, and `.prj` files
- **Boundary files**: Zipped shapefiles with administrative boundaries
- **Icons**: `.png`, `.jpg`, or `.svg` format for point symbols

## Raster Data (Climate & GIRI Variables)

### Supported Variables

#### Climate Variables
- Maximum Temperature
- Minimum Temperature
- Mean Temperature
- Precipitation
- Solar Radiation
- Cooling Degree Days
- Heating Degree Days

#### GIRI Variables
- Flood Risk
- Drought Risk

### Directory Structure

```
data/
├── rasters/
│   ├── bhutan/
│   │   ├── climate/
│   │   │   ├── maximum_temperature/
│   │   │   │   ├── historical/
│   │   │   │   │   ├── annual/
│   │   │   │   │   │   └── max_temp_annual.cog
│   │   │   │   │   └── seasonal/
│   │   │   │   │       ├── max_temp_12_2.cog  (Dec-Feb)
│   │   │   │   │       ├── max_temp_3_5.cog   (Mar-May)
│   │   │   │   │       ├── max_temp_6_8.cog   (Jun-Aug)
│   │   │   │   │       └── max_temp_9_11.cog  (Sep-Nov)
│   │   │   │   ├── ssp1/
│   │   │   │   │   ├── 2021-2040/
│   │   │   │   │   ├── 2041-2060/
│   │   │   │   │   ├── 2061-2080/
│   │   │   │   │   └── 2081-2100/
│   │   │   │   └── [ssp2, ssp3, ssp5]/
│   │   │   └── [other climate variables]/
│   │   └── giri/
│   │       ├── flood/
│   │       └── drought/
│   ├── mongolia/
│   └── laos/
```

### File Naming Convention

For seasonal data, use the pattern: `{variable}_{fromMonth}_{toMonth}.cog`

Examples:
- `max_temp_12_2.cog` (December to February)
- `precipitation_6_8.cog` (June to August)

### Converting TIF to COG

Use the provided conversion script:

```bash
# Make script executable
chmod +x src/utils/convert-to-cog.sh

# Convert all TIFFs in a directory
./src/utils/convert-to-cog.sh -i /path/to/tiffs -o /path/to/cogs

# With custom compression and verbose output
./src/utils/convert-to-cog.sh -i input/ -o output/ -c LZW -v
```

### Raster Requirements

- **Projection**: EPSG:4326 (WGS84 Geographic)
- **Format**: GeoTIFF or Cloud Optimized GeoTIFF (COG)
- **Data Type**: Float32 or Int16
- **NoData Value**: Properly defined
- **Spatial Resolution**: Consistent within each variable

### Classification Setup

When uploading rasters through the admin panel:

1. The system will analyze the file and show min/max/mean values
2. Configure 5 classification classes:
   - Adjust min/max values for each class
   - Select appropriate colors (use ColorBrewer schemes)
   - Provide descriptive labels

Example classification for temperature (°C):
```
Class 1: -10 to 0   | Color: #313695 | Label: "Very Cold"
Class 2: 0 to 10    | Color: #74add1 | Label: "Cold"
Class 3: 10 to 20   | Color: #fee090 | Label: "Moderate"
Class 4: 20 to 30   | Color: #f46d43 | Label: "Warm"
Class 5: 30 to 45   | Color: #a50026 | Label: "Very Hot"
```

## Vector Point Data (Energy Infrastructure)

### Supported Infrastructure Types

- Hydro Power Plants
- Solar Power Plants
- Wind Power Plants

### Shapefile Requirements

- **Geometry**: Point features
- **Projection**: EPSG:4326
- **Required Attributes**:
  - Design capacity field (numeric)
  - Name field (text)
  - Status field (optional)

### Example Attribute Table

| Name | designCapacity | status | type |
|------|----------------|--------|------|
| Chukha Hydropower | 336.0 | operational | hydro |
| Tala Hydropower | 1020.0 | operational | hydro |
| Solar Farm A | 25.5 | planned | solar |

### Point Sizing

Points will be sized based on the selected design capacity attribute:
- Values are normalized across the dataset
- Minimum point size: 8px
- Maximum point size: 24px
- Logarithmic scaling for better visualization

### Icon Configuration

Custom icons can be uploaded for each infrastructure type:
- Upload PNG/SVG files through the admin panel
- Icons should be 32x32 pixels for optimal display
- Use transparent backgrounds

## Boundary Data (Administrative Boundaries)

### Administrative Levels

- **ADM0**: Country boundaries
- **ADM1**: Province/State boundaries (recommended)
- **ADM2**: District boundaries
- **ADM3**: Sub-district boundaries

### Shapefile Requirements

- **Geometry**: Polygon features
- **Projection**: EPSG:4326
- **Required Attributes**: Name field for hover display

### Recommended Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| NAME_EN | English name | "Thimphu" |
| NAME_LOCAL | Local name | "ཐིམ་ཕུ" |
| ADM1_CODE | Administrative code | "BT.TH" |
| POPULATION | Population count | 114551 |

### Hover Configuration

Select the attribute that will be displayed when users hover over regions. Common choices:
- `NAME_EN` (English names)
- `NAME_LOCAL` (Local language names)
- `ADM1_NAME` (Administrative names)

## Upload Process

### Step 1: Prepare Data

1. Ensure all files meet format requirements
2. Convert TIFFs to COG format using the conversion script
3. Create zipped shapefiles with all required components
4. Prepare classification schemes (Excel files optional)

### Step 2: Access Admin Panel

1. Navigate to the admin URL
2. Sign in with owner credentials
3. Use demo credentials if needed:
   - Username: `admin`
   - Password: `escap2024`

### Step 3: Upload Files

#### For Raster Data:
1. Go to "File Upload" tab
2. Select "Raster (.tif/.cog)" file type
3. Choose the appropriate data layer
4. Select target country
5. Upload the COG file
6. Configure classification (5 classes with colors)
7. Complete upload

#### For Shapefile Data:
1. Select "Shapefile (.zip)" file type
2. Choose energy infrastructure layer
3. Select target country
4. Upload zipped shapefile
5. Select design capacity attribute
6. Choose or upload custom icon
7. Complete upload

#### For Boundary Data:
1. Go to "Boundaries" tab
2. Select country and administrative level
3. Upload zipped boundary shapefile
4. Choose hover attribute
5. Complete upload

### Step 4: Verify Upload

1. Check the file appears in the uploaded files list
2. Verify classification settings
3. Test the layer in the main application
4. Confirm proper zoom and display

## Data Management

### Updating Existing Data

1. Upload new file with same configuration
2. System will overwrite previous version
3. Classifications can be reused from previous uploads

### Deleting Data

1. Use the delete button in file management
2. Confirm deletion in the dialog
3. Associated classifications are preserved for reuse

### Backup and Export

1. Use "Create Backup" in System Settings
2. Downloads JSON file with all configurations
3. Store backups regularly for data safety

## Troubleshooting

### Common Issues

**Raster not displaying:**
- Check projection (must be EPSG:4326)
- Verify file is properly COG formatted
- Ensure data values are within classification ranges

**Shapefile upload fails:**
- Verify all required files are in ZIP
- Check for special characters in filenames
- Ensure projection file (.prj) is included

**Performance issues:**
- Use COG format for faster loading
- Keep file sizes under 100MB when possible
- Enable caching in system settings

### File Size Optimization

**For Rasters:**
```bash
# Compress and optimize
gdal_translate -of COG -co COMPRESS=DEFLATE \
  -co OVERVIEW_RESAMPLING=AVERAGE \
  input.tif output_optimized.cog
```

**For Shapefiles:**
- Simplify geometries if too detailed
- Remove unnecessary attributes
- Use appropriate data types

## Best Practices

1. **Data Quality**: Ensure consistent projections and data types
2. **Naming**: Use descriptive, consistent naming conventions
3. **Documentation**: Maintain metadata for each dataset
4. **Testing**: Always test uploads in a staging environment
5. **Backup**: Regular backups of both data and configurations

## Support

For technical issues or questions:
- Check system logs in admin panel
- Review upload error messages
- Contact system administrator for assistance

## Appendix

### Useful GDAL Commands

```bash
# Check file information
gdalinfo input.tif

# Reproject to EPSG:4326
gdalwarp -t_srs EPSG:4326 input.tif output.tif

# Create overviews
gdaladdo -r average input.tif 2 4 8 16

# Convert to COG with compression
gdal_translate -of COG -co COMPRESS=LZW input.tif output.cog
```

### Color Schemes

Recommended color schemes for different data types:

- **Temperature**: Blue to Red (diverging)
- **Precipitation**: Yellow to Blue (sequential)
- **Risk/Hazard**: Green to Red (sequential)
- **Elevation**: Brown to White (sequential)
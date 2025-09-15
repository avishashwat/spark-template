# UN ESCAP Climate & Energy Risk Visualization - Data Integration

This README provides step-by-step instructions for integrating your geospatial data into the web application.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   # Install GDAL for raster processing
   # Ubuntu/Debian:
   sudo apt-get install gdal-bin python3-gdal
   
   # macOS:
   brew install gdal
   
   # Install Python packages
   pip install -r scripts/requirements.txt
   ```

2. **Prepare Your Data**
   - Follow the folder structure in `example-data-structure.md`
   - Use the naming conventions specified in the guide
   - Ensure all data is in EPSG:4326 coordinate system

3. **Run Processing Scripts**
   ```bash
   # Convert TIF files to COG (faster loading)
   python scripts/convert_to_cog.py /path/to/data/countries /path/to/data/processed
   
   # Process shapefiles (boundaries and energy)
   python scripts/process_shapefiles.py /path/to/data/countries /path/to/data/processed
   
   # Process Excel classifications
   python scripts/process_classifications.py /path/to/data/classifications /path/to/data/processed/classifications
   ```

4. **Upload to Web Application**
   - Use the DataUpload component in the sidebar
   - Upload processed files according to type
   - Files will be integrated into map layers automatically

## 📁 Required Data Types

### 1. Country Boundaries (Shapefiles)
- **Format**: Shapefile (.shp + .shx + .dbf + .prj)
- **Content**: Administrative level 1 boundaries
- **Purpose**: Map zoom fitting and region highlighting
- **Example**: `bhutan_adm1.shp`

### 2. Climate/GIRI Rasters (TIF Files)
- **Format**: GeoTIFF (.tif)
- **Content**: Climate variables or GIRI risk data
- **Purpose**: Overlay data visualization
- **Example**: `bhutan_max_temp_historical_annual.tif`

### 3. Data Classifications (Excel Files)
- **Format**: Excel (.xlsx or .xls)
- **Content**: Color schemes and value ranges
- **Purpose**: Raster styling and legends
- **Example**: `climate_classifications.xlsx`

### 4. Energy Infrastructure (Shapefiles)
- **Format**: Shapefile (.shp + .shx + .dbf + .prj)
- **Content**: Power plant locations with capacity data
- **Purpose**: Point overlays with scaled markers
- **Example**: `bhutan_hydro_power_plants.shp`

## 🎯 Key Features Enabled

### Fast Raster Loading
- **COG Format**: 50-100x faster than regular TIF files
- **Tile Pyramids**: Progressive loading for better UX
- **Compression**: Smaller file sizes, faster transfers

### Accurate Map Fitting
- **Boundary-Based Zoom**: Maps automatically fit country boundaries
- **Region Highlighting**: Areas outside boundaries are greyed out
- **Multi-Scale Display**: Zoom levels optimized for each map layout

### Smart Layer Management
- **Classification-Based Styling**: Automatic color application from Excel
- **Capacity-Based Sizing**: Energy infrastructure scaled by capacity
- **Legend Generation**: Automatic legend creation from classifications

### Synchronized Comparisons
- **Multi-Map Support**: 1, 2, or 4 map layouts
- **Synchronized Views**: Pan/zoom affects all maps
- **Independent Layers**: Each map can show different data

## 📊 Data Processing Benefits

| Original Format | Processed Format | Improvement |
|-----------------|------------------|-------------|
| Regular TIF | Cloud Optimized GeoTIFF | 50-100x faster loading |
| Raw Shapefile | Processed GeoJSON | Web-optimized format |
| Excel Classifications | JSON Color Schemes | Direct application to maps |
| Mixed Projections | Standardized EPSG:4326 | Consistent overlay alignment |

## 🔧 Technical Architecture

```
Data Flow:
Raw Data → Processing Scripts → Web-Optimized Format → Application Integration

TIF Files → COG Conversion → Faster Raster Display
Shapefiles → GeoJSON + Bounds → Accurate Map Fitting  
Excel Files → JSON Classifications → Styled Overlays
```

## 📋 Validation Checklist

Before uploading data, ensure:

- [ ] All files follow naming conventions
- [ ] Coordinate system is EPSG:4326
- [ ] Shapefile components are complete (.shp, .shx, .dbf, .prj)
- [ ] Excel files have required columns (min_value, max_value, class_name, color_hex)
- [ ] Energy shapefiles have 'designCapacity' attribute
- [ ] Files are under 100MB each
- [ ] Data covers the expected geographic extent

## 🚨 Troubleshooting

### Common Issues:

**"GDAL not found"**
- Install GDAL tools for your operating system
- Ensure gdal-translate is in your PATH

**"Projection mismatch"**  
- All data must be in EPSG:4326 (WGS84)
- Use GIS software to reproject if needed

**"Missing shapefile components"**
- Upload ALL files: .shp, .shx, .dbf, .prj
- All components must have the same filename

**"Excel columns not found"**
- Check column names: min_value, max_value, class_name, color_hex
- Ensure no extra spaces in column headers

**"designCapacity attribute missing"**
- Energy shapefiles require this numeric field
- Add the attribute in GIS software if missing

### Performance Tips:

- Use SSD storage for faster processing
- Process large datasets in batches
- Monitor disk space (COG files are ~30-50% smaller)
- Test with small datasets first

## 📧 Support

For technical assistance:
1. Check the detailed guides in `src/data-integration-guide.md`
2. Review example structures in `example-data-structure.md`
3. Validate data formats using provided scripts
4. Test with sample data before processing full datasets

## 🔄 Next Steps

After successful data integration:
1. Test overlay performance in the web application
2. Verify legend accuracy and color schemes  
3. Confirm map fitting and boundary highlighting
4. Validate multi-map synchronization
5. Test download functionality with real data
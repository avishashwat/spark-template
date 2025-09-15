# Data Integration Guide for UN ESCAP Climate & Energy Risk Visualization

## Overview
This guide explains how to prepare and integrate your geospatial data (TIF rasters, shapefiles, and Excel classifications) for optimal performance in the web application.

## Data Structure Requirements

### 1. Folder Structure
```
/data/
├── countries/
│   ├── bhutan/
│   │   ├── boundaries/
│   │   │   └── bhutan_adm1.shp (+ .shx, .dbf, .prj files)
│   │   ├── climate/
│   │   │   ├── maximum_temp/
│   │   │   │   ├── historical/
│   │   │   │   │   ├── annual/
│   │   │   │   │   │   └── bhutan_max_temp_historical_annual.tif
│   │   │   │   │   └── seasonal/
│   │   │   │   │       ├── bhutan_max_temp_historical_12_2.tif (Dec-Feb)
│   │   │   │   │       ├── bhutan_max_temp_historical_3_5.tif (Mar-May)
│   │   │   │   │       └── ...
│   │   │   │   ├── ssp1/
│   │   │   │   │   ├── 2021-2040/
│   │   │   │   │   │   ├── annual/
│   │   │   │   │   │   └── seasonal/
│   │   │   │   │   └── ...
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── giri/
│   │   │   ├── flood/
│   │   │   │   ├── existing/
│   │   │   │   ├── ssp1/
│   │   │   │   └── ssp5/
│   │   │   └── drought/
│   │   │       └── ...
│   │   └── energy/
│   │       ├── hydro_power_plants.shp
│   │       ├── solar_power_plants.shp
│   │       └── wind_power_plants.shp
│   ├── mongolia/
│   │   └── ... (same structure)
│   └── laos/
│       └── ... (same structure)
├── classifications/
│   ├── climate_classifications.xlsx
│   ├── giri_classifications.xlsx
│   └── energy_classifications.xlsx
└── processed/ (output folder for COG files)
    └── ... (mirrors input structure but with .cog files)
```

### 2. File Naming Conventions

#### Climate Variables
- Pattern: `{country}_{variable}_{scenario}_{period}_{seasonality}.tif`
- Examples:
  - `bhutan_max_temp_historical_annual.tif`
  - `bhutan_precipitation_ssp1_2021-2040_seasonal_3_5.tif`

#### GIRI Variables
- Pattern: `{country}_{giri_type}_{scenario}.tif`
- Examples:
  - `bhutan_flood_existing.tif`
  - `mongolia_drought_ssp5.tif`

#### Energy Infrastructure
- Pattern: `{country}_{energy_type}_plants.shp`
- Required attribute: `designCapacity` (numeric field for sizing markers)

## Data Preparation Scripts

### 1. TIF to COG Conversion Script

Create this script as `scripts/convert_to_cog.py`:

```python
#!/usr/bin/env python3
"""
Convert TIF raster files to Cloud Optimized GeoTIFF (COG) format
for faster web loading and display.
"""

import os
import subprocess
import sys
from pathlib import Path

def convert_tif_to_cog(input_path, output_path, compression='DEFLATE'):
    """Convert a single TIF file to COG format."""
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # GDAL translate command for COG conversion
    cmd = [
        'gdal_translate',
        '-of', 'COG',
        '-co', f'COMPRESS={compression}',
        '-co', 'TILED=YES',
        '-co', 'BLOCKSIZE=512',
        '-co', 'BIGTIFF=IF_SAFER',
        '-co', 'OVERVIEW_RESAMPLING=NEAREST',
        str(input_path),
        str(output_path)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"✓ Converted: {input_path.name} -> {output_path.name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to convert {input_path.name}: {e.stderr}")
        return False

def batch_convert_directory(input_dir, output_dir):
    """Convert all TIF files in a directory structure to COG."""
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    if not input_path.exists():
        print(f"Error: Input directory {input_dir} does not exist")
        return
    
    # Find all TIF files
    tif_files = list(input_path.rglob('*.tif')) + list(input_path.rglob('*.TIF'))
    
    if not tif_files:
        print("No TIF files found in the input directory")
        return
    
    print(f"Found {len(tif_files)} TIF files to convert...")
    
    success_count = 0
    
    for tif_file in tif_files:
        # Calculate relative path and create output path
        rel_path = tif_file.relative_to(input_path)
        output_file = output_path / rel_path.with_suffix('.cog')
        
        # Skip if output file already exists and is newer
        if output_file.exists() and output_file.stat().st_mtime > tif_file.stat().st_mtime:
            print(f"⏭ Skipping {tif_file.name} (already converted)")
            continue
        
        if convert_tif_to_cog(tif_file, output_file):
            success_count += 1
    
    print(f"\nConversion complete: {success_count}/{len(tif_files)} files converted successfully")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_to_cog.py <input_directory> <output_directory>")
        print("Example: python convert_to_cog.py /data/countries /data/processed")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    batch_convert_directory(input_dir, output_dir)
```

### 2. Shapefile Processing Script

Create this script as `scripts/process_shapefiles.py`:

```python
#!/usr/bin/env python3
"""
Process shapefiles to extract boundaries and prepare for web use.
"""

import geopandas as gpd
import json
from pathlib import Path
import sys

def process_boundary_shapefile(shapefile_path, output_dir):
    """Process boundary shapefile to extract bounds and GeoJSON."""
    
    try:
        # Read shapefile
        gdf = gpd.read_file(shapefile_path)
        
        # Ensure it's in WGS84 (EPSG:4326)
        if gdf.crs != 'EPSG:4326':
            gdf = gdf.to_crs('EPSG:4326')
        
        # Calculate bounds
        bounds = gdf.total_bounds  # [minx, miny, maxx, maxy]
        
        # Calculate center
        center_x = (bounds[0] + bounds[2]) / 2
        center_y = (bounds[1] + bounds[3]) / 2
        
        # Calculate appropriate zoom level based on bounds
        lat_diff = bounds[3] - bounds[1]
        lon_diff = bounds[2] - bounds[0]
        max_diff = max(lat_diff, lon_diff)
        
        # Rough zoom calculation (adjust as needed)
        if max_diff > 20:
            zoom = 3
        elif max_diff > 10:
            zoom = 4
        elif max_diff > 5:
            zoom = 5
        elif max_diff > 2:
            zoom = 6
        elif max_diff > 1:
            zoom = 7
        else:
            zoom = 8
        
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save as GeoJSON for web use
        country_name = shapefile_path.stem.split('_')[0]
        geojson_path = output_path / f"{country_name}_boundaries.geojson"
        gdf.to_file(geojson_path, driver='GeoJSON')
        
        # Save bounds and zoom info
        bounds_info = {
            "country": country_name,
            "bounds": bounds.tolist(),
            "center": [center_x, center_y],
            "zoom": zoom,
            "extent": {
                "minx": bounds[0],
                "miny": bounds[1], 
                "maxx": bounds[2],
                "maxy": bounds[3]
            }
        }
        
        bounds_path = output_path / f"{country_name}_bounds.json"
        with open(bounds_path, 'w') as f:
            json.dump(bounds_info, f, indent=2)
        
        print(f"✓ Processed {country_name} boundaries:")
        print(f"  - Bounds: {bounds}")
        print(f"  - Center: [{center_x:.6f}, {center_y:.6f}]")
        print(f"  - Zoom: {zoom}")
        print(f"  - GeoJSON: {geojson_path}")
        print(f"  - Bounds info: {bounds_path}")
        
        return bounds_info
        
    except Exception as e:
        print(f"✗ Error processing {shapefile_path}: {e}")
        return None

def process_energy_shapefile(shapefile_path, output_dir):
    """Process energy infrastructure shapefile."""
    
    try:
        # Read shapefile
        gdf = gpd.read_file(shapefile_path)
        
        # Ensure it's in WGS84 (EPSG:4326)
        if gdf.crs != 'EPSG:4326':
            gdf = gdf.to_crs('EPSG:4326')
        
        # Check for required designCapacity field
        if 'designCapacity' not in gdf.columns:
            print(f"⚠ Warning: 'designCapacity' field not found in {shapefile_path.name}")
            # Add a default capacity field
            gdf['designCapacity'] = 1.0
        
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save as GeoJSON
        filename = shapefile_path.stem
        geojson_path = output_path / f"{filename}.geojson"
        gdf.to_file(geojson_path, driver='GeoJSON')
        
        # Generate capacity statistics for legend
        capacity_stats = {
            "min": float(gdf['designCapacity'].min()),
            "max": float(gdf['designCapacity'].max()),
            "mean": float(gdf['designCapacity'].mean()),
            "count": len(gdf)
        }
        
        stats_path = output_path / f"{filename}_stats.json"
        with open(stats_path, 'w') as f:
            json.dump(capacity_stats, f, indent=2)
        
        print(f"✓ Processed {filename}:")
        print(f"  - Points: {len(gdf)}")
        print(f"  - Capacity range: {capacity_stats['min']:.1f} - {capacity_stats['max']:.1f}")
        print(f"  - GeoJSON: {geojson_path}")
        
        return capacity_stats
        
    except Exception as e:
        print(f"✗ Error processing {shapefile_path}: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python process_shapefiles.py <input_directory> <output_directory>")
        print("Example: python process_shapefiles.py /data/countries /data/processed")
        sys.exit(1)
    
    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    
    # Process all shapefiles
    shapefiles = list(input_dir.rglob('*.shp'))
    
    for shapefile in shapefiles:
        if 'boundaries' in str(shapefile) or 'adm1' in shapefile.name:
            process_boundary_shapefile(shapefile, output_dir / 'boundaries')
        elif 'energy' in str(shapefile) or any(energy_type in shapefile.name for energy_type in ['hydro', 'solar', 'wind']):
            process_energy_shapefile(shapefile, output_dir / 'energy')
```

### 3. Excel Classification Processor

Create this script as `scripts/process_classifications.py`:

```python
#!/usr/bin/env python3
"""
Process Excel classification files to generate color schemes for raster data.
"""

import pandas as pd
import json
import sys
from pathlib import Path

def process_classification_excel(excel_path, output_dir):
    """Process Excel file containing classification and color information."""
    
    try:
        # Read Excel file
        # Expecting columns: 'min_value', 'max_value', 'class_name', 'color_hex'
        df = pd.read_excel(excel_path)
        
        # Validate required columns
        required_columns = ['min_value', 'max_value', 'class_name', 'color_hex']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"✗ Missing required columns in {excel_path.name}: {missing_columns}")
            return None
        
        # Create classification object
        classification = {
            "type": "classified",
            "classes": []
        }
        
        for _, row in df.iterrows():
            class_info = {
                "min": float(row['min_value']),
                "max": float(row['max_value']),
                "label": str(row['class_name']),
                "color": str(row['color_hex']).upper()
            }
            
            # Ensure color has # prefix
            if not class_info["color"].startswith('#'):
                class_info["color"] = '#' + class_info["color"]
            
            classification["classes"].append(class_info)
        
        # Sort classes by min value
        classification["classes"].sort(key=lambda x: x["min"])
        
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save classification
        filename = excel_path.stem
        json_path = output_path / f"{filename}.json"
        
        with open(json_path, 'w') as f:
            json.dump(classification, f, indent=2)
        
        print(f"✓ Processed {filename}:")
        print(f"  - Classes: {len(classification['classes'])}")
        print(f"  - Range: {classification['classes'][0]['min']} - {classification['classes'][-1]['max']}")
        print(f"  - Output: {json_path}")
        
        return classification
        
    except Exception as e:
        print(f"✗ Error processing {excel_path}: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python process_classifications.py <excel_file_or_directory> <output_directory>")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    
    if input_path.is_file() and input_path.suffix in ['.xlsx', '.xls']:
        # Process single file
        process_classification_excel(input_path, output_dir)
    elif input_path.is_dir():
        # Process all Excel files in directory
        excel_files = list(input_path.glob('*.xlsx')) + list(input_path.glob('*.xls'))
        
        for excel_file in excel_files:
            process_classification_excel(excel_file, output_dir)
    else:
        print("Error: Input must be an Excel file or directory containing Excel files")
```

## Installation Requirements

### Prerequisites
You'll need to install these tools on your system:

```bash
# Install GDAL (for raster processing)
# On Ubuntu/Debian:
sudo apt-get update
sudo apt-get install gdal-bin python3-gdal

# On macOS:
brew install gdal

# On Windows:
# Download from https://www.lfd.uci.edu/~gohlke/pythonlibs/#gdal

# Install Python dependencies
pip install geopandas pandas openpyxl
```

## Usage Instructions

### Step 1: Prepare Your Data Structure
1. Create the folder structure as shown above
2. Place your TIF files in the appropriate country/variable folders
3. Place boundary shapefiles in the boundaries folders
4. Place energy shapefiles in the energy folders
5. Place Excel classification files in the classifications folder

### Step 2: Run the Processing Scripts

```bash
# Make scripts executable
chmod +x scripts/*.py

# Convert TIF files to COG
python scripts/convert_to_cog.py /path/to/data/countries /path/to/data/processed

# Process shapefiles
python scripts/process_shapefiles.py /path/to/data/countries /path/to/data/processed

# Process Excel classifications
python scripts/process_classifications.py /path/to/data/classifications /path/to/data/processed/classifications
```

### Step 3: Update Application Configuration
After processing, update the application's data paths in your configuration files to point to the processed data.

## Excel Classification Format

Your Excel files should have these columns:

| min_value | max_value | class_name | color_hex |
|-----------|-----------|------------|-----------|
| 0 | 100 | Very Low | #0d47a1 |
| 101 | 250 | Low | #1976d2 |
| 251 | 500 | Medium | #ffa726 |
| 501 | 750 | High | #f57c00 |
| 751 | 1000 | Very High | #d32f2f |

## Next Steps

1. **Test the Scripts**: Run the scripts on a small subset of your data first
2. **Verify Output**: Check that COG files load faster than original TIFs
3. **Update Application**: Integrate the processed data paths into your web application
4. **Performance Testing**: Test loading times with your actual data

## Troubleshooting

### Common Issues:
- **GDAL not found**: Install GDAL tools for your operating system
- **Memory errors**: For very large files, consider processing in smaller batches
- **Projection issues**: Ensure all data is in EPSG:4326 before processing
- **Missing attributes**: Check that energy shapefiles have the 'designCapacity' field

### Performance Tips:
- Use SSD storage for faster I/O
- Process files in parallel for large datasets
- Monitor disk space (COG files are typically 30-50% smaller than TIFs)
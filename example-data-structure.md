# Example Data Structure

This directory shows the expected folder structure for your geospatial data.

## Folder Structure

```
data/
├── countries/
│   ├── bhutan/
│   │   ├── boundaries/
│   │   │   ├── bhutan_adm1.shp
│   │   │   ├── bhutan_adm1.shx
│   │   │   ├── bhutan_adm1.dbf
│   │   │   └── bhutan_adm1.prj
│   │   ├── climate/
│   │   │   ├── maximum_temp/
│   │   │   │   ├── historical/
│   │   │   │   │   ├── annual/
│   │   │   │   │   │   └── bhutan_max_temp_historical_annual.tif
│   │   │   │   │   └── seasonal/
│   │   │   │   │       ├── bhutan_max_temp_historical_12_2.tif
│   │   │   │   │       ├── bhutan_max_temp_historical_3_5.tif
│   │   │   │   │       ├── bhutan_max_temp_historical_6_8.tif
│   │   │   │   │       └── bhutan_max_temp_historical_9_11.tif
│   │   │   │   ├── ssp1/
│   │   │   │   │   ├── 2021-2040/
│   │   │   │   │   ├── 2041-2060/
│   │   │   │   │   ├── 2061-2080/
│   │   │   │   │   └── 2081-2100/
│   │   │   │   └── (ssp2, ssp3, ssp5 same structure)
│   │   │   ├── minimum_temp/
│   │   │   ├── mean_temp/
│   │   │   ├── precipitation/
│   │   │   ├── solar_radiation/
│   │   │   ├── cooling_degree_days/
│   │   │   └── heating_degree_days/
│   │   ├── giri/
│   │   │   ├── flood/
│   │   │   │   ├── existing/
│   │   │   │   ├── ssp1/
│   │   │   │   └── ssp5/
│   │   │   └── drought/
│   │   │       ├── existing/
│   │   │       ├── ssp1/
│   │   │       └── ssp5/
│   │   └── energy/
│   │       ├── bhutan_hydro_power_plants.shp
│   │       ├── bhutan_solar_power_plants.shp
│   │       └── bhutan_wind_power_plants.shp
│   ├── mongolia/
│   │   └── (same structure as bhutan)
│   └── laos/
│       └── (same structure as bhutan)
├── classifications/
│   ├── climate_classifications.xlsx
│   ├── giri_classifications.xlsx
│   └── energy_classifications.xlsx
└── processed/
    └── (output from processing scripts)
```

## File Naming Conventions

### Climate Variables
- **Pattern**: `{country}_{variable}_{scenario}_{period}_{seasonality}.tif`
- **Examples**:
  - `bhutan_max_temp_historical_annual.tif`
  - `mongolia_precipitation_ssp1_2021-2040_seasonal_3_5.tif`
  - `laos_solar_radiation_ssp3_2061-2080_annual.tif`

### Seasonal Files
- **Pattern**: `{country}_{variable}_{scenario}_{period}_seasonal_{fromMonth}_{toMonth}.tif`
- **Season Mapping**:
  - Winter: `12_2` (December-February)
  - Spring: `3_5` (March-May)
  - Summer: `6_8` (June-August)
  - Autumn: `9_11` (September-November)

### GIRI Variables
- **Pattern**: `{country}_{giri_type}_{scenario}.tif`
- **Examples**:
  - `bhutan_flood_existing.tif`
  - `mongolia_drought_ssp1.tif`
  - `laos_flood_ssp5.tif`

### Energy Infrastructure
- **Pattern**: `{country}_{energy_type}_power_plants.shp`
- **Required Attribute**: `designCapacity` (numeric field for sizing markers)
- **Examples**:
  - `bhutan_hydro_power_plants.shp`
  - `mongolia_solar_power_plants.shp`
  - `laos_wind_power_plants.shp`

### Boundary Files
- **Pattern**: `{country}_adm1.shp`
- **Examples**:
  - `bhutan_adm1.shp`
  - `mongolia_adm1.shp`
  - `laos_adm1.shp`

## Next Steps

1. Create this folder structure on your system
2. Place your files following these naming conventions
3. Run the processing scripts to convert TIF to COG and prepare shapefiles
4. Update the web application to use the processed data
# Climate Data Classification Example

## Excel File Format: climate_classifications.xlsx

Your Excel file should have these columns:

| min_value | max_value | class_name | color_hex |
|-----------|-----------|------------|-----------|
| -10 | 0 | Very Cold | #2E3192 |
| 1 | 10 | Cold | #2E86AB |
| 11 | 20 | Cool | #A23B72 |
| 21 | 30 | Warm | #F18F01 |
| 31 | 40 | Hot | #C73E1D |
| 41 | 50 | Very Hot | #8B0000 |

## Column Descriptions

- **min_value**: Minimum value for this class (numeric)
- **max_value**: Maximum value for this class (numeric)  
- **class_name**: Human-readable label for the class (text)
- **color_hex**: Hex color code for visualization (text, with or without #)

## Color Schemes

### Temperature Variables (°C)
Use a blue-to-red gradient:
- Cold: Blue tones (#2E3192, #2E86AB)
- Moderate: Purple/Orange tones (#A23B72, #F18F01) 
- Hot: Red tones (#C73E1D, #8B0000)

### Precipitation (mm)
Use a yellow-to-blue gradient:
- Low: Yellow/Orange (#FFEB3B, #FF9800)
- Medium: Green (#4CAF50, #2196F3)
- High: Blue (#1976D2, #0D47A1)

### Solar Radiation (W/m²)
Use a dark-to-bright gradient:
- Low: Dark purple (#4A148C)
- Medium: Orange (#FF9800)
- High: Bright yellow (#FFEB3B)

## Multiple Variables
You can create separate sheets in the same Excel file for different variables, or separate Excel files for each variable type.
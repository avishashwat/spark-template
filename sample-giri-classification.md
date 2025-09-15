# GIRI Data Classification Example

## Excel File Format: giri_classifications.xlsx

Your Excel file should have these columns for GIRI (flood/drought) data:

### Flood Risk Classification

| min_value | max_value | class_name | color_hex |
|-----------|-----------|------------|-----------|
| 0 | 0.2 | Very Low Risk | #E8F5E8 |
| 0.21 | 0.4 | Low Risk | #A5D6A7 |
| 0.41 | 0.6 | Medium Risk | #66BB6A |
| 0.61 | 0.8 | High Risk | #FFA726 |
| 0.81 | 1.0 | Very High Risk | #F44336 |

### Drought Risk Classification

| min_value | max_value | class_name | color_hex |
|-----------|-----------|------------|-----------|
| 0 | 0.2 | Very Low Risk | #FFF3E0 |
| 0.21 | 0.4 | Low Risk | #FFCC02 |
| 0.41 | 0.6 | Medium Risk | #FF9800 |
| 0.61 | 0.8 | High Risk | #F57C00 |
| 0.81 | 1.0 | Very High Risk | #BF360C |

## Color Schemes

### Flood Risk
Use a green-to-red gradient representing increasing water risk:
- Very Low: Light green (#E8F5E8)
- Low: Medium green (#A5D6A7)
- Medium: Darker green (#66BB6A)
- High: Orange warning (#FFA726)
- Very High: Red danger (#F44336)

### Drought Risk  
Use a yellow-to-brown gradient representing increasing drought severity:
- Very Low: Light cream (#FFF3E0)
- Low: Light yellow (#FFCC02)
- Medium: Orange (#FF9800)
- High: Dark orange (#F57C00)
- Very High: Dark brown (#BF360C)

## Risk Scale
GIRI values typically range from 0 (no risk) to 1 (maximum risk), representing normalized risk indices.

## Multiple Scenarios
If you have different classifications for different scenarios (existing, SSP1, SSP5), you can:
1. Create separate sheets in the same Excel file
2. Use the same classification scheme across scenarios
3. Or create separate Excel files for each scenario if classifications differ
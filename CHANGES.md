# Changes Made

## Issues Fixed

1. **Layer Persistence on Layout Change**: 
   - Added mapLayout prop to Sidebar component
   - Added useEffect to clear active layers when layout changes
   - Clear mapOverlays state in App.tsx when layout changes

2. **Header Updates**:
   - Moved basemap selection from sidebar to header (next to Dashboard button)
   - Removed "X Maps Active" badge 
   - Reduced header height (py-4 to py-2)
   - Made elements smaller (h-8 to h-7, text-sm to text-xs)

3. **Better Country Zooming**:
   - Updated Bhutan zoom from 6 to 8 for better province visibility
   - Added country-specific zoom levels in countryBounds object
   - Mongolia: zoom 5, Laos: zoom 6, Bhutan: zoom 8

4. **Sidebar Cleanup**:
   - Removed basemap selection from sidebar
   - Layers now clear properly when switching layouts
   - Selection panel resets when layout changes

## Key Changes by File

### src/App.tsx
- Updated countryBounds to include zoom levels
- Added mapLayout prop to Sidebar
- Pass basemap props to Header instead of Sidebar
- Clear overlays on layout change

### src/components/Header.tsx
- Added basemap and onBasemapChange props
- Moved basemap selection from sidebar to header
- Removed active maps badge
- Reduced header size and element sizes

### src/components/Sidebar.tsx
- Added mapLayout prop and useEffect to clear layers
- Removed basemap selection section
- Simplified component interface
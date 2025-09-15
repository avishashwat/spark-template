# Performance Optimization for Country Switching

## Changes Made

### 1. Enhanced Boundary Data Caching
- Added `processedLayers` cache to store pre-processed boundary and mask layers
- This eliminates the need to recreate complex OpenLayers vector layers every time

### 2. Background Preloading
- All boundary data and layers are now preloaded in the background after initial load
- Reduces preload delay from 2000ms to 500ms for faster initialization
- Countries switch instantly if layers are already cached

### 3. Optimized Boundary Layer Creation
- Created `createBoundaryLayers()` function that processes boundary data once and caches results
- Complex turf union operations are done once during preload, not on every country switch
- Layers are reused rather than recreated

### 4. Faster Animation Transitions
- Reduced view animation duration from 300ms to 150ms for snappier country switching
- Optimized view center and zoom calculations

### 5. Intelligent Loading Strategy
- Check cache first before loading from storage
- Use existing processed layers for instant switching when available
- Only show loading indicator when actually processing new data

## Expected Performance Improvements

- **First country switch**: ~2-3 seconds (while preloading in background)
- **Subsequent switches**: ~150ms (instant with cached layers)
- **Memory usage**: Slightly increased due to caching, but improves user experience significantly
- **Network usage**: Same (data loaded once)

## Technical Details

### Before Optimization
1. Country change triggers boundary data load from chunked storage
2. GeoJSON features parsed and processed
3. Complex turf union operations performed
4. Mask layer geometry calculated
5. OpenLayers vector layers created
6. Layers added to map

### After Optimization
1. **Background**: All countries preloaded and processed once
2. **Country change**: Retrieve cached layers and add to map instantly
3. **Fallback**: If not cached, process once and cache for future use

### Cache Structure
```typescript
boundaryCache: Map<string, { geojsonData: any, hoverAttribute: string }>
processedLayers: Map<string, { 
  boundaryLayer: VectorLayer, 
  maskLayer: VectorLayer | null 
}>
```

This ensures that expensive geometric operations are done once upfront rather than on every interaction.
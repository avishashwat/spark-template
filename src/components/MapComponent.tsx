import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Map as OLMap, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { defaults as defaultControls, Zoom, ScaleLine } from 'ol/control'
import { GeoJSON } from 'ol/format'
import { Style, Stroke, Fill } from 'ol/style'
import { Polygon, MultiPolygon } from 'ol/geom'
import Feature from 'ol/Feature'
import { Download, ChartBar, Table, MapPin, CaretDown, ArrowLeft } from '@phosphor-icons/react'
import { ChartView, TableView } from './DataVisualization'
import { RasterLegend } from './RasterLegend'
import { EnergyLegend } from './EnergyLegend'
import { toast } from 'sonner'
import 'ol/ol.css'

interface MapComponentProps {
  id: string
  isActive: boolean
  onActivate: () => void
  center: [number, number]
  zoom: number
  onViewChange: (center: [number, number], zoom: number) => void
  country: string
  basemap?: string
  overlayInfo?: {
    type: string
    name: string
    scenario?: string
    year?: string
    season?: string
  }
  allMapOverlays?: Record<string, any> // Add access to all map overlays
  mapLayout: number // Added to know if we're in multi-map mode
}

const basemapSources = {
  osm: () => new XYZ({
    // Use Cartodb tile server instead to avoid OSM blocking
    url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors © CARTO',
    maxZoom: 18,
    crossOrigin: 'anonymous'
  }),
  satellite: () => new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
    crossOrigin: 'anonymous'
  }),
  terrain: () => new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri — Source: USGS, Esri, TANA, DeLorme, and NPS',
    maxZoom: 18,
    crossOrigin: 'anonymous'
  }),
  street: () => new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 18,
    crossOrigin: 'anonymous'
  })
}

// More precise country bounds [minLon, minLat, maxLon, maxLat] for proper zooming
const countryBounds = {
  bhutan: [88.75, 26.70, 92.12, 28.35],     // Bhutan precise bounds
  mongolia: [87.73, 41.58, 119.92, 52.15],  // Mongolia precise bounds  
  laos: [100.08, 13.91, 107.64, 22.50]      // Laos precise bounds
}

export function MapComponent({ 
  id, 
  isActive, 
  onActivate, 
  center, 
  zoom, 
  onViewChange,
  country,
  basemap = 'osm',
  overlayInfo,
  allMapOverlays,
  mapLayout
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<OLMap | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'chart' | 'table'>('map')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  // Cache for boundary data to avoid repeated loading
  const boundaryCache = useRef<Map<string, any>>(new Map())
  const loadingPromises = useRef<Map<string, Promise<any>>>(new Map())
  // Cache for processed mask geometries to avoid heavy re-computation
  const maskCache = useRef<Map<string, { maskFeature: any, boundaryLayer: VectorLayer<VectorSource> }>>(new Map())
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  
  // Province zoom state
  const [isProvinceView, setIsProvinceView] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<any>(null)
  const [countryView, setCountryView] = useState<{ center: [number, number], zoom: number } | null>(null)
  
  // Only show dropdown in multi-map mode (2 or 4 maps)
  const showViewSelector = mapLayout > 1
  
  // Reset view mode to map when layout changes to single map
  useEffect(() => {
    if (mapLayout === 1) {
      setViewMode('map')
    }
  }, [mapLayout])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        setShowDropdown(false)
      }
    }
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || viewMode !== 'map') return

    const bounds = countryBounds[country as keyof typeof countryBounds]
    const centerCoord: [number, number] = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]
    
    // Calculate optimal zoom to fit country bounds
    const lngDiff = bounds[2] - bounds[0]  // longitude difference
    const latDiff = bounds[3] - bounds[1]  // latitude difference
    
    // Rough calculation for zoom level based on bounds
    let optimalZoom = 6
    if (lngDiff < 0.5 && latDiff < 0.5) optimalZoom = 11      // Very small country
    else if (lngDiff < 1 && latDiff < 1) optimalZoom = 9     // Small country like Bhutan
    else if (lngDiff < 3 && latDiff < 3) optimalZoom = 7     // Medium country like Laos
    else if (lngDiff < 10 && latDiff < 10) optimalZoom = 5   // Large country
    else optimalZoom = 4                                     // Very large country like Mongolia

    // Create basemap layer
    const basemapSource = basemapSources[basemap as keyof typeof basemapSources]()
    const basemapLayer = new TileLayer({
      source: basemapSource,
    })

    const map = new OLMap({
      target: mapRef.current,
      layers: [basemapLayer],
      view: new View({
        center: centerCoord, // No transformation needed for EPSG:4326
        zoom: optimalZoom,
        projection: 'EPSG:4326',
        minZoom: 4,
        maxZoom: 18,
        // Set extent to prevent panning beyond valid geographic bounds
        extent: [-180, -90, 180, 90]
      }),
      controls: defaultControls().extend([
        new Zoom({
          className: 'ol-zoom',
        }),
        new ScaleLine({
          bar: true,
          text: true,
          minWidth: 60,
          steps: 2, // Only 2 divisions
        }),
      ]),
    })

    mapInstanceRef.current = map

    // Handle view changes
    const view = map.getView()
    view.on('change', () => {
      if (isUpdating) return
      
      const currentCenter = view.getCenter()
      if (currentCenter) {
        const newCenter: [number, number] = [currentCenter[0], currentCenter[1]]
        const newZoom = view.getZoom() || optimalZoom
        onViewChange(newCenter, newZoom)
      }
    })

    // Handle map clicks for activation
    map.on('click', () => {
      onActivate()
    })

    return () => {
      map.setTarget(undefined)
    }
  }, [basemap, viewMode]) // Re-initialize when basemap or viewMode changes

  // Update view when external changes occur
  useEffect(() => {
    if (!mapInstanceRef.current || isUpdating) return

    setIsUpdating(true)
    const view = mapInstanceRef.current.getView()
    
    view.animate({
      center: center, // No transformation needed for EPSG:4326
      zoom: zoom,
      duration: 300,
    }, () => {
      setIsUpdating(false)
    })
  }, [center, zoom])

  // Update country bounds with proper fit to viewport
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const bounds = countryBounds[country as keyof typeof countryBounds]
    const centerCoord: [number, number] = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]
    
    // Calculate optimal zoom to fit country bounds precisely
    const lngDiff = bounds[2] - bounds[0]  // longitude difference
    const latDiff = bounds[3] - bounds[1]  // latitude difference
    
    // More precise zoom calculation based on country size
    let optimalZoom = 6
    if (country === 'bhutan') {
      optimalZoom = 9  // Bhutan is small, needs higher zoom
    } else if (country === 'laos') {
      optimalZoom = 6  // Laos is medium sized
    } else if (country === 'mongolia') {
      optimalZoom = 4  // Mongolia is very large, needs lower zoom
    }
    
    const view = mapInstanceRef.current.getView()
    
    // Use fitExtent for more precise fitting with faster animation
    view.animate({
      center: centerCoord,
      zoom: optimalZoom,
      duration: 300, // Reduced from 500ms for faster country switching
    })
  }, [country])

  // Update basemap when changed - optimized to avoid flicker
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    const map = mapInstanceRef.current
    const layers = map.getLayers()
    
    // Check if basemap actually changed
    const currentBasemap = layers.item(0)?.get('basemapType')
    if (currentBasemap === basemap) {
      console.log('Basemap unchanged, skipping update')
      return
    }
    
    // Remove existing basemap (should be the first layer)
    if (layers.getLength() > 0) {
      layers.removeAt(0)
    }
    
    // Add new basemap
    const basemapSource = basemapSources[basemap as keyof typeof basemapSources]()
    const basemapLayer = new TileLayer({
      source: basemapSource,
    })
    
    // Mark basemap type for future comparison
    basemapLayer.set('basemapType', basemap)
    
    layers.insertAt(0, basemapLayer)
  }, [basemap])

  // Optimized boundary data loading with caching
  const loadBoundaryData = useCallback(async (country: string): Promise<any> => {
    // Check cache first
    if (boundaryCache.current.has(country)) {
      console.log('Loading boundary from cache for:', country)
      return boundaryCache.current.get(country)
    }
    
    // Check if we're already loading this country
    if (loadingPromises.current.has(country)) {
      console.log('Already loading boundary for:', country, 'waiting for existing promise...')
      return loadingPromises.current.get(country)
    }
    
    // Create new loading promise
    const loadingPromise = (async () => {
      try {
        console.log('Loading boundary data for country:', country)
        
        // Get boundary files from storage
        const boundaryFiles = await window.spark.kv.get<any[]>('admin_boundary_files') || []
        const countryBoundary = boundaryFiles.find(file => file.country === country)
        
        if (!countryBoundary) {
          console.log(`No boundary file found for country: ${country}`)
          return null
        }
        
        let geojsonData: any = null
        
        // Check if we need to load from chunked storage
        if (countryBoundary.dataKey && !countryBoundary.geojsonData) {
          console.log('Loading boundary data from chunked storage:', countryBoundary.dataKey)
          
          // Function to retrieve chunked data with optimized parallel loading
          const getDataFromChunks = async (key: string): Promise<any> => {
            const metaOrData = await window.spark.kv.get<any>(key)
            
            if (!metaOrData) return null
            
            // Check if it's chunked data
            if (metaOrData && typeof metaOrData === 'object' && 'isChunked' in metaOrData && metaOrData.isChunked) {
              const chunkMeta = metaOrData
              console.log(`Loading ${chunkMeta.totalChunks} chunks in parallel for ${key}`)
              
              // Load all chunks in parallel for faster loading
              const chunkPromises: Promise<string | undefined>[] = []
              for (let i = 0; i < chunkMeta.totalChunks; i++) {
                chunkPromises.push(
                  window.spark.kv.get<string>(`${key}_chunk_${i}`)
                )
              }
              
              const chunks = await Promise.all(chunkPromises)
              
              // Verify all chunks are present
              for (let i = 0; i < chunks.length; i++) {
                if (!chunks[i]) {
                  throw new Error(`Missing chunk ${i} for ${key}`)
                }
              }
              
              // Reconstruct data
              const reconstructedData = chunks.join('')
              return JSON.parse(reconstructedData)
            }
            
            // Return direct data if not chunked
            return metaOrData
          }
          
          const fullBoundaryData = await getDataFromChunks(countryBoundary.dataKey)
          if (fullBoundaryData && fullBoundaryData.geojsonData) {
            geojsonData = fullBoundaryData.geojsonData
            console.log('Successfully loaded boundary data from chunks:', geojsonData.features?.length, 'features')
          } else {
            console.error('Failed to load boundary data from chunks')
            return null
          }
        } else if (countryBoundary.geojsonData) {
          // Use directly available geojson data
          geojsonData = countryBoundary.geojsonData
          console.log('Using directly available geojson data:', geojsonData.features?.length, 'features')
        }
        
        if (!geojsonData) {
          console.error('No boundary geojson data available for country:', country)
          return null
        }
        
        // Cache the loaded data
        const result = {
          geojsonData,
          hoverAttribute: countryBoundary.hoverAttribute
        }
        boundaryCache.current.set(country, result)
        
        return result
      } catch (error) {
        console.error('Error loading boundary data for', country, ':', error)
        return null
      } finally {
        // Clean up the loading promise
        loadingPromises.current.delete(country)
      }
    })()
    
    // Store the promise so other calls can wait for it
    loadingPromises.current.set(country, loadingPromise)
    
    return loadingPromise
  }, [])

  // Create cached mask and boundary layers for a country
  const createCachedBoundaryLayers = useCallback(async (country: string, boundaryData: any): Promise<{ maskLayer: VectorLayer<VectorSource> | null, boundaryLayer: VectorLayer<VectorSource> }> => {
    // Check if we already have cached layers for this country
    if (maskCache.current.has(country)) {
      console.log('Using cached mask and boundary layers for:', country)
      const cached = maskCache.current.get(country)!
      
      // Clone the layers for reuse (OpenLayers doesn't allow sharing layer instances)
      const clonedMaskLayer = cached.maskFeature ? new VectorLayer({
        source: new VectorSource({
          features: [cached.maskFeature.clone()]
        }),
        style: new Style({
          fill: new Fill({
            color: 'rgba(128, 128, 128, 0.4)'
          })
        }),
        zIndex: 999
      }) : null
      
      if (clonedMaskLayer) {
        clonedMaskLayer.set('layerType', 'countryMask')
      }
      
      // Clone boundary layer
      const originalBoundarySource = cached.boundaryLayer.getSource() as VectorSource
      const boundaryFeatures = originalBoundarySource.getFeatures()
      const clonedBoundaryLayer = new VectorLayer({
        source: new VectorSource({
          features: boundaryFeatures.map(f => f.clone())
        }),
        style: new Style({
          stroke: new Stroke({
            color: '#000000',
            width: 2
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 0, 0)'
          })
        }),
        zIndex: 1000
      })
      clonedBoundaryLayer.set('layerType', 'boundary')
      
      return { maskLayer: clonedMaskLayer, boundaryLayer: clonedBoundaryLayer }
    }
    
    console.log('Creating new mask and boundary layers for:', country)
    
    // Create boundary source
    const geojsonFormat = new GeoJSON()
    const boundarySource = new VectorSource()
    
    const features = geojsonFormat.readFeatures(boundaryData.geojsonData, {
      featureProjection: 'EPSG:4326',
      dataProjection: 'EPSG:4326'
    })
    
    if (Array.isArray(features)) {
      boundarySource.addFeatures(features)
    } else {
      boundarySource.addFeature(features as Feature)
    }
    
    const featuresLoaded = boundarySource.getFeatures().length
    console.log('Created boundary source with features:', featuresLoaded)
    
    if (featuresLoaded === 0) {
      console.error('No features were loaded into the vector source')
      throw new Error('No boundary features loaded')
    }
    
    // Create mask layer
    const worldExtent = [-180, -90, 180, 90]
    const boundaryFeatures = boundarySource.getFeatures()
    let maskFeature: Feature | null = null
    
    if (boundaryFeatures.length > 0) {
      try {
        // Import turf for geometric operations
        const { union } = await import('@turf/union')
        const { polygon, multiPolygon, featureCollection } = await import('@turf/helpers')
        
        // Convert all boundary features to turf polygons
        const turfPolygons: any[] = []
        
        boundaryFeatures.forEach(feature => {
          const geom = feature.getGeometry()
          
          if (geom?.getType() === 'Polygon') {
            const coords = (geom as Polygon).getCoordinates()
            if (coords && coords.length > 0) {
              turfPolygons.push(polygon(coords))
            }
          } else if (geom?.getType() === 'MultiPolygon') {
            const coords = (geom as MultiPolygon).getCoordinates()
            turfPolygons.push(multiPolygon(coords))
          }
        })
        
        console.log('Converting', turfPolygons.length, 'boundary features to unified geometry')
        
        // Create a union of all administrative boundaries
        let unifiedBoundary = turfPolygons[0]
        for (let i = 1; i < turfPolygons.length; i++) {
          try {
            unifiedBoundary = union(featureCollection([unifiedBoundary, turfPolygons[i]]))
          } catch (unionError) {
            console.warn('Union operation failed for feature', i, ':', unionError)
          }
        }
        
        // Extract coordinates from the unified boundary
        let allExteriorRings: number[][][] = []
        
        if (unifiedBoundary && unifiedBoundary.geometry) {
          if (unifiedBoundary.geometry.type === 'Polygon') {
            allExteriorRings.push(unifiedBoundary.geometry.coordinates[0])
          } else if (unifiedBoundary.geometry.type === 'MultiPolygon') {
            unifiedBoundary.geometry.coordinates.forEach((polygon: number[][][]) => {
              if (polygon && polygon.length > 0) {
                allExteriorRings.push(polygon[0])
              }
            })
          }
        }
        
        console.log('Created unified boundary with', allExteriorRings.length, 'exterior rings after union operation')
        
        // Create the world polygon with holes for unified boundary exterior rings
        const maskGeometry = {
          type: "Polygon",
          coordinates: [[
            [worldExtent[0], worldExtent[1]],
            [worldExtent[2], worldExtent[1]],
            [worldExtent[2], worldExtent[3]],
            [worldExtent[0], worldExtent[3]],
            [worldExtent[0], worldExtent[1]]
          ], ...allExteriorRings]
        }
        
        // Create a GeoJSON feature object
        const maskGeoJSON = {
          type: "Feature",
          geometry: maskGeometry,
          properties: {}
        }
        
        maskFeature = geojsonFormat.readFeature(maskGeoJSON, {
          featureProjection: 'EPSG:4326',
          dataProjection: 'EPSG:4326'
        }) as Feature
        
        console.log('Created mask feature for caching')
        
      } catch (error) {
        console.error('Error creating mask geometry:', error)
      }
    }
    
    // Create the boundary layer
    const boundaryLayer = new VectorLayer({
      source: boundarySource,
      style: new Style({
        stroke: new Stroke({
          color: '#000000',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 0, 0)'
        })
      }),
      zIndex: 1000
    })
    boundaryLayer.set('layerType', 'boundary')
    
    // Create mask layer if we have a mask feature
    let maskLayer: VectorLayer<VectorSource> | null = null
    if (maskFeature) {
      maskLayer = new VectorLayer({
        source: new VectorSource({
          features: [maskFeature]
        }),
        style: new Style({
          fill: new Fill({
            color: 'rgba(128, 128, 128, 0.4)'
          })
        }),
        zIndex: 999
      })
      maskLayer.set('layerType', 'countryMask')
    }
    
    // Cache the created layers and mask feature
    maskCache.current.set(country, {
      maskFeature,
      boundaryLayer
    })
    
    console.log('Cached mask and boundary layers for:', country)
    
    return { maskLayer, boundaryLayer }
  }, [])

  // Load boundary layer for the current country
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    const loadBoundaryLayer = async () => {
      try {
        setBoundaryLoading(true)
        console.log('=== Loading boundary layer for country:', country, '===')
        
        // Use optimized loading function with caching
        const boundaryData = await loadBoundaryData(country)
        
        if (!boundaryData) {
          console.log(`No boundary data available for country: ${country}`)
          return
        }
        
        const { geojsonData, hoverAttribute } = boundaryData
        
        console.log('GeoJSON data structure:', {
          type: geojsonData.type,
          features: geojsonData.features?.length,
          firstFeature: geojsonData.features?.[0]?.geometry?.type
        })
        
        // Remove existing boundary and mask layers if any
        const map = mapInstanceRef.current!
        const layers = map.getLayers()
        const existingBoundaryLayer = layers.getArray().find(layer => 
          layer.get('layerType') === 'boundary'
        )
        const existingMaskLayer = layers.getArray().find(layer => 
          layer.get('layerType') === 'countryMask'
        )
        if (existingBoundaryLayer) {
          console.log('Removing existing boundary layer')
          layers.remove(existingBoundaryLayer)
        }
        if (existingMaskLayer) {
          console.log('Removing existing mask layer')
          layers.remove(existingMaskLayer)
        }
        
        console.log('Processing GeoJSON data with', geojsonData.features?.length, 'features')
        
        if (!geojsonData.features || geojsonData.features.length === 0) {
          console.error('Invalid GeoJSON data:', geojsonData)
          return
        }

        // Log first feature for debugging
        console.log('First feature geometry:', geojsonData.features[0]?.geometry)
        console.log('First feature properties:', geojsonData.features[0]?.properties)
        
        // Use cached mask and boundary creation
        const { maskLayer, boundaryLayer } = await createCachedBoundaryLayers(country, boundaryData)
        
        console.log('Retrieved/created boundary and mask layers from cache')
        
        // Add both layers to the map
        if (maskLayer) {
          layers.insertAt(layers.getLength(), maskLayer)
          console.log('Added country mask layer')
        }
        layers.insertAt(layers.getLength(), boundaryLayer)
        console.log('Added boundary layer')
        
        console.log('Added boundary and mask layers to map. Total layers now:', layers.getLength())
        
        // Force a re-render to ensure the layer appears
        map.renderSync()
        
        // Check if layer is visible
        console.log('Boundary layer visible:', boundaryLayer.getVisible())
        console.log('Boundary layer opacity:', boundaryLayer.getOpacity())
        console.log('Boundary layer z-index:', boundaryLayer.getZIndex())
        
        // Get the extent of all features and log it
        const boundarySource = boundaryLayer.getSource() as VectorSource
        const extent = boundarySource.getExtent()
        console.log('Boundary source extent:', extent)
        console.log('Expected country bounds:', countryBounds[country as keyof typeof countryBounds])
        
        // Compare with expected bounds
        const expectedBounds = countryBounds[country as keyof typeof countryBounds]
        if (expectedBounds) {
          console.log('Extent comparison:')
          console.log('  Actual  :', `[${extent[0].toFixed(3)}, ${extent[1].toFixed(3)}, ${extent[2].toFixed(3)}, ${extent[3].toFixed(3)}]`)
          console.log('  Expected:', `[${expectedBounds[0]}, ${expectedBounds[1]}, ${expectedBounds[2]}, ${expectedBounds[3]}]`)
        }
        
        // Fit the view to show the boundary if it's the only country layer
        if (extent && extent.every(coord => isFinite(coord))) {
          console.log('Fitting view to boundary extent')
          map.getView().fit(extent, {
            padding: [20, 20, 20, 20],
            duration: 300 // Reduced from 1000ms for faster response
          })
        } else {
          console.error('Invalid extent for boundary:', extent)
        }
        
        // Add hover and click interactions for boundary features
        console.log('Setting up hover and click interactions for attribute:', hoverAttribute)
        
        if (hoverAttribute) {
          // Create a select interaction for hover
          import('ol/interaction/Select').then(({ default: Select }) => {
            import('ol/events/condition').then(({ pointerMove, click }) => {
              const hoverInteraction = new Select({
                condition: pointerMove,
                layers: [boundaryLayer],
                style: new Style({
                  stroke: new Stroke({
                    color: '#0072bc',
                    width: 3
                  }),
                  fill: new Fill({
                    color: 'rgba(0, 114, 188, 0.1)'
                  })
                })
              })
              
              const clickInteraction = new Select({
                condition: click,
                layers: [boundaryLayer],
                style: null // No persistent styling on click
              })
              
              map.addInteraction(hoverInteraction)
              map.addInteraction(clickInteraction)
              
              // Create a div for tooltip
              const tooltip = document.createElement('div')
              tooltip.className = 'ol-tooltip hidden'
              tooltip.style.cssText = `
                position: absolute;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
              `
              map.getViewport().appendChild(tooltip)
              
              hoverInteraction.on('select', (e) => {
                if (e.selected.length > 0) {
                  const feature = e.selected[0]
                  const properties = feature.getProperties()
                  const name = properties[hoverAttribute] || 'Unknown'
                  tooltip.innerHTML = `${name}<br><small>Click to zoom to province</small>`
                  tooltip.classList.remove('hidden')
                } else {
                  tooltip.classList.add('hidden')
                }
              })
              
              // Handle province click to zoom
              clickInteraction.on('select', (e) => {
                if (e.selected.length > 0) {
                  const feature = e.selected[0]
                  const properties = feature.getProperties()
                  const provinceName = properties[hoverAttribute] || 'Unknown Province'
                  
                  // Store current country view for back button
                  const currentView = map.getView()
                  setCountryView({
                    center: currentView.getCenter() as [number, number],
                    zoom: currentView.getZoom() || 7
                  })
                  
                  // Get feature extent and zoom to province
                  const geometry = feature.getGeometry()
                  if (geometry) {
                    const extent = geometry.getExtent()
                    
                    // Create a mask for the selected province
                    const worldExtent = [-180, -90, 180, 90]
                    let provinceMask: Feature | null = null
                    
                    try {
                      // Import turf for geometric operations
                      import('@turf/union').then(({ union }) => {
                        import('@turf/helpers').then(({ polygon, multiPolygon, featureCollection }) => {
                          // Convert feature geometry to turf format
                          const geojsonFormat = new GeoJSON()
                          const featureGeoJSON = geojsonFormat.writeFeatureObject(feature)
                          
                          let provinceGeometry = featureGeoJSON.geometry
                          let allExteriorRings: number[][][] = []
                          
                          if (provinceGeometry.type === 'Polygon') {
                            allExteriorRings.push(provinceGeometry.coordinates[0])
                          } else if (provinceGeometry.type === 'MultiPolygon') {
                            provinceGeometry.coordinates.forEach((polygon: number[][][]) => {
                              if (polygon && polygon.length > 0) {
                                allExteriorRings.push(polygon[0])
                              }
                            })
                          }
                          
                          // Create the world polygon with holes for province
                          const maskGeometry = {
                            type: "Polygon",
                            coordinates: [[
                              [worldExtent[0], worldExtent[1]],
                              [worldExtent[2], worldExtent[1]],
                              [worldExtent[2], worldExtent[3]],
                              [worldExtent[0], worldExtent[3]],
                              [worldExtent[0], worldExtent[1]]
                            ], ...allExteriorRings]
                          }
                          
                          const maskGeoJSON = {
                            type: "Feature",
                            geometry: maskGeometry,
                            properties: {}
                          }
                          
                          provinceMask = geojsonFormat.readFeature(maskGeoJSON, {
                            featureProjection: 'EPSG:4326',
                            dataProjection: 'EPSG:4326'
                          }) as Feature
                          
                          // Remove existing province mask and selected province if any
                          const existingProvinceMask = layers.getArray().find(layer => 
                            layer.get('layerType') === 'provinceMask'
                          )
                          const existingSelectedProvince = layers.getArray().find(layer => 
                            layer.get('layerType') === 'selectedProvince'
                          )
                          if (existingProvinceMask) {
                            layers.remove(existingProvinceMask)
                          }
                          if (existingSelectedProvince) {
                            layers.remove(existingSelectedProvince)
                          }
                          
                          // Add new province mask
                          if (provinceMask) {
                            const provinceMaskLayer = new VectorLayer({
                              source: new VectorSource({
                                features: [provinceMask]
                              }),
                              style: new Style({
                                fill: new Fill({
                                  color: 'rgba(128, 128, 128, 0.6)'  // Increased opacity for grayed out areas
                                })
                              }),
                              zIndex: 998
                            })
                            provinceMaskLayer.set('layerType', 'provinceMask')
                            layers.insertAt(layers.getLength(), provinceMaskLayer)
                            
                            // Add the province feature itself with completely transparent fill
                            const provinceLayer = new VectorLayer({
                              source: new VectorSource({
                                features: [feature.clone()]
                              }),
                              style: new Style({
                                stroke: new Stroke({
                                  color: '#0072bc',
                                  width: 2
                                }),
                                fill: new Fill({
                                  color: 'rgba(0, 0, 0, 0)'  // Completely transparent fill
                                })
                              }),
                              zIndex: 999  // Higher z-index to appear above mask
                            })
                            provinceLayer.set('layerType', 'selectedProvince')
                            layers.insertAt(layers.getLength(), provinceLayer)
                          }
                        })
                      })
                    } catch (error) {
                      console.error('Error creating province mask:', error)
                    }
                    
                    // Zoom to province with animation
                    map.getView().fit(extent, {
                      padding: [50, 50, 50, 50],
                      duration: 500,
                      maxZoom: 12
                    })
                    
                    setIsProvinceView(true)
                    setSelectedProvince({
                      name: provinceName,
                      feature: feature
                    })
                    
                    toast.success(`Zoomed to ${provinceName}`)
                    
                    // Clear the click selection immediately to prevent persistent styling
                    clickInteraction.getFeatures().clear()
                  }
                }
              })
              
              // Update tooltip position on pointer move
              map.on('pointermove', (evt) => {
                if (!tooltip.classList.contains('hidden')) {
                  const pixel = map.getEventPixel(evt.originalEvent)
                  tooltip.style.left = (pixel[0] + 10) + 'px'
                  tooltip.style.top = (pixel[1] - 30) + 'px'
                }
              })
              
              console.log('Hover and click interactions setup complete')
            })
          })
        }
        
        console.log(`Successfully loaded boundary layer for ${country}`)
        
      } catch (error) {
        console.error('Failed to load boundary layer:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          country: country
        })
        toast.error(`Failed to load boundary for ${country}: ${error.message}`)
      } finally {
        setBoundaryLoading(false)
      }
    }
    
    loadBoundaryLayer()
  }, [country, loadBoundaryData]) // Re-run when country changes

  const handleDownload = async () => {
    if (!mapInstanceRef.current || isDownloading) return
    
    setIsDownloading(true)
    
    try {
      const map = mapInstanceRef.current
      const size = map.getSize()
      
      if (!size) {
        throw new Error('Could not get map size')
      }
      
      // Create a higher resolution canvas
      const canvas = document.createElement('canvas')
      const scaleFactor = 2 // Higher resolution
      canvas.width = size[0] * scaleFactor
      canvas.height = size[1] * scaleFactor
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Scale context for higher resolution
      ctx.scale(scaleFactor, scaleFactor)
      
      // Set white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size[0], size[1])
      
      // Try to capture map using a different approach
      await new Promise<void>((resolve, reject) => {
        try {
          map.once('rendercomplete', () => {
            try {
              const mapCanvas = map.getViewport().querySelector('canvas') as HTMLCanvasElement
              if (mapCanvas) {
                ctx.drawImage(mapCanvas, 0, 0)
              }
              resolve()
            } catch (error) {
              // If canvas capture fails, create informative export
              createInformativeExport(ctx, size[0], size[1])
              resolve()
            }
          })
          
          // Force a render
          map.renderSync()
          
          // Fallback timeout
          setTimeout(() => {
            createInformativeExport(ctx, size[0], size[1])
            resolve()
          }, 2000)
          
        } catch (error) {
          createInformativeExport(ctx, size[0], size[1])
          resolve()
        }
      })
      
      // Create download
      const timestamp = new Date().toISOString().split('T')[0]
      const countryName = country.charAt(0).toUpperCase() + country.slice(1)
      const overlayName = overlayInfo?.name?.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_') || 'no_overlay'
      const filename = `UN_ESCAP_Map_${countryName}_${overlayName}_${timestamp}.png`
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          link.style.display = 'none'
          
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          // Clean up
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          
          toast.success(`Map downloaded: ${filename}`)
        } else {
          throw new Error('Failed to create blob')
        }
        
        setIsDownloading(false)
      }, 'image/png', 1.0)
      
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Download failed. Please try again.')
      setIsDownloading(false)
    }
  }

  const createInformativeExport = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear and set background
    ctx.fillStyle = '#f8f9fa'
    ctx.fillRect(0, 0, width, height)
    
    // Add border
    ctx.strokeStyle = '#0072bc'
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, width - 20, height - 20)
    
    // Add UN ESCAP header
    ctx.fillStyle = '#0072bc'
    ctx.font = 'bold 24px Inter, Arial'
    ctx.textAlign = 'center'
    ctx.fillText('UN ESCAP', width / 2, 50)
    
    ctx.font = 'bold 18px Inter, Arial'
    ctx.fillText('Climate & Energy Risk Visualization', width / 2, 75)
    
    // Add country info
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 20px Inter, Arial'
    const countryName = country.charAt(0).toUpperCase() + country.slice(1)
    ctx.fillText(`Country: ${countryName}`, width / 2, 110)
    
    // Add overlay info if available
    if (overlayInfo) {
      ctx.font = '16px Inter, Arial'
      ctx.fillStyle = '#0072bc'
      ctx.fillText(`Layer: ${overlayInfo.name}`, width / 2, 140)
      
      let yPos = 165
      if (overlayInfo.scenario) {
        ctx.fillStyle = '#666'
        ctx.font = '14px Inter, Arial'
        ctx.fillText(`Scenario: ${overlayInfo.scenario}`, width / 2, yPos)
        yPos += 20
      }
      
      if (overlayInfo.year) {
        ctx.fillText(`Year: ${overlayInfo.year}`, width / 2, yPos)
        yPos += 20
      }
      
      if (overlayInfo.season) {
        ctx.fillText(`Season: ${overlayInfo.season}`, width / 2, yPos)
      }
    } else {
      ctx.font = '14px Inter, Arial'
      ctx.fillStyle = '#666'
      ctx.fillText('No overlay selected', width / 2, 140)
    }
    
    // Add map coordinates
    const view = mapInstanceRef.current?.getView()
    const center = view?.getCenter()
    const zoom = view?.getZoom()
    
    if (center && zoom) {
      ctx.font = '12px Inter, Arial'
      ctx.fillStyle = '#333'
      ctx.fillText(`Center: ${center[1].toFixed(4)}°N, ${center[0].toFixed(4)}°E`, width / 2, height - 80)
      ctx.fillText(`Zoom Level: ${zoom.toFixed(1)}`, width / 2, height - 60)
    }
    
    // Add timestamp
    ctx.font = '10px Inter, Arial'
    ctx.fillStyle = '#999'
    ctx.fillText(`Generated: ${new Date().toLocaleString()}`, width / 2, height - 30)
    
    // Add map ID overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(20, 20, 180, 50)
    ctx.strokeStyle = '#0072bc'
    ctx.lineWidth = 1
    ctx.strokeRect(20, 20, 180, 50)
    
    ctx.fillStyle = '#0072bc'
    ctx.font = 'bold 10px Inter, Arial'
    ctx.textAlign = 'left'
    ctx.fillText('UN ESCAP Map Export', 25, 35)
    
    ctx.font = '9px Inter, Arial'
    ctx.fillStyle = '#333'
    ctx.fillText(`Map ID: ${id}`, 25, 50)
    ctx.fillText(`Exported: ${new Date().toISOString().split('T')[0]}`, 25, 62)
  }



  const getOverlayDisplayText = () => {
    if (!allMapOverlays || !allMapOverlays[id] || Object.keys(allMapOverlays[id]).length === 0) {
      return 'No overlay selected'
    }
    
    const overlays = Object.values(allMapOverlays[id]) as any[]
    
    if (overlays.length === 1) {
      const overlay = overlays[0]
      let text = overlay.name
      if (overlay.scenario) text += ` (${overlay.scenario})`
      if (overlay.year) text += ` ${overlay.year}`
      if (overlay.season) text += ` - ${overlay.season}`
      return text
    } else {
      // Multiple overlays - show count and types
      const types = overlays.map(overlay => overlay.type).join(', ')
      return `${overlays.length} layers: ${types}`
    }
  }

  const viewModeOptions = [
    { value: 'map', label: 'Map View', icon: MapPin },
    { value: 'chart', label: 'Chart View', icon: ChartBar },
    { value: 'table', label: 'Table View', icon: Table }
  ]
  
  const currentViewOption = viewModeOptions.find(option => option.value === viewMode)

  // Function to go back to country view
  const handleBackToCountry = useCallback(() => {
    if (!mapInstanceRef.current || !countryView) return
    
    const map = mapInstanceRef.current
    const layers = map.getLayers()
    
    // Remove province mask and selected province layers
    const provinceMaskLayer = layers.getArray().find(layer => 
      layer.get('layerType') === 'provinceMask'
    )
    const selectedProvinceLayer = layers.getArray().find(layer => 
      layer.get('layerType') === 'selectedProvince'
    )
    if (provinceMaskLayer) {
      layers.remove(provinceMaskLayer)
    }
    if (selectedProvinceLayer) {
      layers.remove(selectedProvinceLayer)
    }
    
    // Clear all selection interactions to remove any persistent styling
    const interactions = map.getInteractions().getArray()
    interactions.forEach(interaction => {
      if (interaction.constructor.name === 'Select') {
        // Clear the selection of the Select interaction
        const selectInteraction = interaction as any
        if (selectInteraction.getFeatures) {
          selectInteraction.getFeatures().clear()
        }
      }
    })
    
    // Force refresh of boundary layer to remove any persistent styling
    const boundaryLayer = layers.getArray().find(layer => 
      layer.get('layerType') === 'boundary'
    )
    if (boundaryLayer) {
      // Reset the style of all features in the boundary layer
      const vectorLayer = boundaryLayer as VectorLayer<VectorSource>
      const source = vectorLayer.getSource()
      if (source) {
        const features = source.getFeatures()
        features.forEach(feature => {
          feature.setStyle(undefined) // Reset to default layer style
        })
      }
      // Force layer refresh
      vectorLayer.changed()
    }
    
    // Restore country view
    map.getView().animate({
      center: countryView.center,
      zoom: countryView.zoom,
      duration: 500
    })
    
    setIsProvinceView(false)
    setSelectedProvince(null)
    setCountryView(null)
    
    toast.success('Returned to country view')
  }, [countryView])

  // Reset province view when country changes
  useEffect(() => {
    // Clear any selection interactions when country changes
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current
      const interactions = map.getInteractions().getArray()
      interactions.forEach(interaction => {
        if (interaction.constructor.name === 'Select') {
          const selectInteraction = interaction as any
          if (selectInteraction.getFeatures) {
            selectInteraction.getFeatures().clear()
          }
        }
      })
    }
    
    setIsProvinceView(false)
    setSelectedProvince(null)
    setCountryView(null)
  }, [country])

  // Preload all boundaries and mask layers on component mount for instant switching
  useEffect(() => {
    const preloadBoundaries = async () => {
      const countries = ['bhutan', 'mongolia', 'laos']
      console.log('Preloading boundaries and mask layers for all countries...')
      
      // Load all boundaries and create cached mask layers in parallel in the background
      const preloadPromises = countries.map(async (country) => {
        try {
          const boundaryData = await loadBoundaryData(country)
          if (boundaryData) {
            // Also create and cache the mask layers
            await createCachedBoundaryLayers(country, boundaryData)
            console.log('Preloaded boundary and mask layers for:', country)
          }
        } catch (error) {
          console.error('Failed to preload boundary for', country, ':', error)
        }
      })
      
      await Promise.all(preloadPromises)
      console.log('All boundaries and mask layers preloaded successfully')
    }
    
    // Start preloading after a short delay to not interfere with initial load
    const timer = setTimeout(preloadBoundaries, 1000)
    return () => clearTimeout(timer)
  }, [loadBoundaryData, createCachedBoundaryLayers])

  return (
    <div className={`flex flex-col h-full border-2 rounded-lg overflow-hidden bg-white ${isActive ? 'border-primary' : 'border-border'}`}>
      {/* Map Header */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {/* Back button for province view */}
            {isProvinceView && (
              <button
                onClick={handleBackToCountry}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors"
                title="Back to country view"
              >
                <ArrowLeft size={12} />
                Back
              </button>
            )}
            <h3 className="font-medium text-sm text-foreground capitalize">
              {isProvinceView 
                ? `${selectedProvince?.name || 'Province'} - ${country}` 
                : `${country} - Map ${id.split('-')[1]}`
              }
            </h3>
            {isActive && (
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isProvinceView 
              ? `Province view - Click "Back" to see full ${country}` 
              : getOverlayDisplayText()
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Selector - only in multi-map mode */}
          {showViewSelector && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDropdown(!showDropdown)
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded border border-border transition-colors"
              >
                {currentViewOption && <currentViewOption.icon size={12} />}
                <span>{currentViewOption?.label || 'Map View'}</span>
                <CaretDown size={10} />
              </button>
              
              {showDropdown && (
                <div 
                  className="absolute top-full right-0 mt-1 bg-white border border-border rounded shadow-lg z-50 min-w-[120px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {viewModeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setViewMode(option.value as any)
                        setShowDropdown(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${
                        viewMode === option.value ? 'bg-muted text-primary' : 'text-foreground'
                      }`}
                    >
                      <option.icon size={12} />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={true}
            className="p-1.5 rounded transition-colors text-muted-foreground/50 cursor-not-allowed"
            title="Download feature temporarily disabled"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      
      {/* Content Container */}
      <div 
        className="flex-1 relative flex flex-col"
        onClick={viewMode === 'map' ? onActivate : undefined}
      >
        {viewMode === 'map' && (
          <>
            <div className="flex-1 relative">
              <div ref={mapRef} className="w-full h-full cursor-pointer" />
              
              {/* Loading indicator for boundaries */}
              {boundaryLoading && (
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-50">
                  <div className="bg-white/90 rounded-lg p-3 shadow-lg flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    <span className="text-sm text-foreground">Loading boundary...</span>
                  </div>
                </div>
              )}
              
              {/* Legends - positioned in top-left corner, support multiple overlays with scaled sizing */}
              {allMapOverlays && allMapOverlays[id] && Object.keys(allMapOverlays[id]).length > 0 && (
                <div className="absolute top-2 left-2 space-y-2 z-10">
                  {Object.entries(allMapOverlays[id]).map(([category, overlay]: [string, any]) => (
                    <div 
                      key={category} 
                      className={`bg-white/95 border border-border rounded shadow-sm map-legend ${
                        mapLayout === 1 
                          ? 'p-2 max-w-[180px]' 
                          : mapLayout === 2 
                            ? 'p-1.5 max-w-[140px]' 
                            : 'p-1 max-w-[100px]'
                      }`}
                    >
                      <div className={`font-medium text-foreground mb-1 ${
                        mapLayout === 1 
                          ? 'text-xs' 
                          : mapLayout === 2 
                            ? 'text-[10px]' 
                            : 'text-[9px]'
                      }`}>
                        {overlay.name}
                      </div>
                      {overlay.type === 'Energy' ? (
                        <EnergyLegend energyType={overlay.name} mapLayout={mapLayout} />
                      ) : (
                        <RasterLegend overlayInfo={overlay} mapLayout={mapLayout} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* North Arrow - Size based on layout */}
              <div className="absolute top-2 right-2 bg-white/90 border border-border rounded p-1 shadow-sm north-arrow">
                <div className="flex flex-col items-center">
                  {mapLayout === 1 ? (
                    // Larger north arrow for single map view
                    <svg width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M9 0L12 9L9 7.5L6 9L9 0Z" 
                        fill="#0072bc"
                      />
                      <path 
                        d="M9 24L12 15L9 16.5L6 15L9 24Z" 
                        fill="#666"
                      />
                    </svg>
                  ) : mapLayout === 2 ? (
                    // Medium north arrow for 2-map view
                    <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M7.5 0L10 7.5L7.5 6.25L5 7.5L7.5 0Z" 
                        fill="#0072bc"
                      />
                      <path 
                        d="M7.5 20L10 12.5L7.5 13.75L5 12.5L7.5 20Z" 
                        fill="#666"
                      />
                    </svg>
                  ) : (
                    // Smallest north arrow for 4-map view
                    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M6 0L8 6L6 5L4 6L6 0Z" 
                        fill="#0072bc"
                      />
                      <path 
                        d="M6 16L8 10L6 11L4 10L6 16Z" 
                        fill="#666"
                      />
                    </svg>
                  )}
                  <span className={`font-medium text-foreground ${mapLayout === 1 ? 'text-xs' : mapLayout === 2 ? 'text-[10px]' : 'text-[9px]'}`}>N</span>
                </div>
              </div>
            </div>
            
            {/* Source and Disclaimer - only show in single map view when any overlay is selected */}
            {allMapOverlays && allMapOverlays[id] && Object.keys(allMapOverlays[id]).length > 0 && mapLayout === 1 && (
              <div className="bg-muted/50 border-t border-border px-3 py-2">
                <div className="text-xs text-muted-foreground space-y-1 map-disclaimer">
                  <div>
                    <span className="font-medium text-foreground">Map source:</span> UN Geospatial
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Disclaimer:</span> The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations. Dotted line represents approximately the Line of Control in Jammu and Kashmir agreed upon by India and Pakistan. The final status of Jammu and Kashmir has not yet been agreed upon by the parties.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {viewMode === 'chart' && (
          <ChartView 
            overlayInfo={allMapOverlays && allMapOverlays[id] ? Object.values(allMapOverlays[id])[0] as any : undefined} 
            country={country} 
          />
        )}
        
        {viewMode === 'table' && (
          <TableView 
            overlayInfo={allMapOverlays && allMapOverlays[id] ? Object.values(allMapOverlays[id])[0] as any : undefined} 
            country={country} 
          />
        )}
      </div>
    </div>
  )
}
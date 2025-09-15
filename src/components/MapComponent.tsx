import React, { useEffect, useRef, useState } from 'react'
import { Map as OLMap, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { defaults as defaultControls, Zoom, ScaleLine } from 'ol/control'
import { Download, ChartBar, Table, MapPin, CaretDown } from '@phosphor-icons/react'
import { ChartView, TableView } from './DataVisualization'
import { RasterLegend } from './RasterLegend'
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

const countryBounds = {
  bhutan: [89.45, 26.70, 92.12, 28.25],
  mongolia: [87.75, 41.58, 119.92, 52.15], 
  laos: [100.09, 13.91, 107.64, 22.50]
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
  mapLayout
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<OLMap | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'chart' | 'table'>('map')
  const [showDropdown, setShowDropdown] = useState(false)
  
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
        zoom: 6,
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
        const newZoom = view.getZoom() || 6
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

  // Update country bounds
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const bounds = countryBounds[country as keyof typeof countryBounds]
    const centerCoord: [number, number] = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]
    
    const view = mapInstanceRef.current.getView()
    view.animate({
      center: centerCoord, // No transformation needed for EPSG:4326
      zoom: 6,
      duration: 500,
    })
  }, [country])

  // Update basemap when changed
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    const map = mapInstanceRef.current
    const layers = map.getLayers()
    
    // Remove existing basemap (should be the first layer)
    if (layers.getLength() > 0) {
      layers.removeAt(0)
    }
    
    // Add new basemap
    const basemapSource = basemapSources[basemap as keyof typeof basemapSources]()
    const basemapLayer = new TileLayer({
      source: basemapSource,
    })
    
    layers.insertAt(0, basemapLayer)
  }, [basemap])

  const handleDownload = () => {
    if (!mapInstanceRef.current) return
    
    const map = mapInstanceRef.current
    
    try {
      map.once('rendercomplete', () => {
        try {
          const mapCanvas = document.createElement('canvas')
          const size = map.getSize()
          if (!size) return
          
          mapCanvas.width = size[0]
          mapCanvas.height = size[1]
          const mapContext = mapCanvas.getContext('2d')
          if (!mapContext) return
          
          // Set a white background
          mapContext.fillStyle = '#ffffff'
          mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height)
          
          Array.prototype.forEach.call(
            map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
            (canvas: HTMLCanvasElement) => {
              if (canvas.width > 0) {
                try {
                  const opacity = canvas.parentElement?.style.opacity || canvas.style.opacity
                  mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity)
                  
                  let matrix
                  const transform = canvas.style.transform
                  if (transform) {
                    matrix = transform
                      .match(/^matrix\(([^\(]*)\)$/)?.[1]
                      ?.split(',')
                      ?.map(Number)
                  }
                  
                  if (matrix) {
                    mapContext.setTransform(...matrix)
                  }
                  mapContext.drawImage(canvas, 0, 0)
                  mapContext.setTransform(1, 0, 0, 1, 0, 0)
                  mapContext.globalAlpha = 1
                } catch (e) {
                  console.warn('Skipping canvas due to CORS restriction:', e)
                }
              }
            }
          )
          
          // Fallback: Create a simple map info image if canvas export fails
          if (!mapCanvas.toDataURL().includes('data:image')) {
            mapContext.fillStyle = '#f0f0f0'
            mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height)
            mapContext.fillStyle = '#333'
            mapContext.font = '16px Inter'
            mapContext.textAlign = 'center'
            mapContext.fillText(`Map of ${country}`, mapCanvas.width / 2, mapCanvas.height / 2)
            mapContext.fillText(`${overlayInfo?.name || 'No overlay'}`, mapCanvas.width / 2, mapCanvas.height / 2 + 30)
          }
          
          const link = document.createElement('a')
          link.download = `map_${id}_${country}_${Date.now()}.png`
          link.href = mapCanvas.toDataURL()
          link.click()
        } catch (error) {
          console.error('Error creating map image:', error)
          // Show a user-friendly error message
          alert('Unable to download map due to security restrictions. Please try using a different basemap.')
        }
      })
      map.renderSync()
    } catch (error) {
      console.error('Error initiating map download:', error)
    }
  }

  const getOverlayDisplayText = () => {
    if (!overlayInfo) return 'No overlay selected'
    
    let text = overlayInfo.name
    if (overlayInfo.scenario) text += ` (${overlayInfo.scenario})`
    if (overlayInfo.year) text += ` ${overlayInfo.year}`
    if (overlayInfo.season) text += ` - ${overlayInfo.season}`
    
    return text
  }

  const viewModeOptions = [
    { value: 'map', label: 'Map View', icon: MapPin },
    { value: 'chart', label: 'Chart View', icon: ChartBar },
    { value: 'table', label: 'Table View', icon: Table }
  ]
  
  const currentViewOption = viewModeOptions.find(option => option.value === viewMode)

  return (
    <div className={`flex flex-col h-full border-2 rounded-lg overflow-hidden bg-white ${isActive ? 'border-primary' : 'border-border'}`}>
      {/* Map Header */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-foreground capitalize">
              {country} - Map {id.split('-')[1]}
            </h3>
            {isActive && (
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getOverlayDisplayText()}
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
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Download map as PNG"
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
              
              {/* Legend - positioned in top-left corner */}
              {overlayInfo && (
                <div className="absolute top-2 left-2 bg-white/95 border border-border rounded p-2 shadow-sm max-w-[180px] z-10 map-legend">
                  <div className="text-xs font-medium text-foreground mb-2">{overlayInfo.name}</div>
                  <RasterLegend overlayInfo={overlayInfo} />
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
            
            {/* Source and Disclaimer - only show in single map view when overlay is selected */}
            {overlayInfo && mapLayout === 1 && (
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
          <ChartView overlayInfo={overlayInfo} country={country} />
        )}
        
        {viewMode === 'table' && (
          <TableView overlayInfo={overlayInfo} country={country} />
        )}
      </div>
    </div>
  )
}
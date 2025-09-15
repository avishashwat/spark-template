import React, { useEffect, useRef, useState } from 'react'
import { Map as OLMap, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { defaults as defaultControls, Zoom } from 'ol/control'
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
}

const basemapSources = {
  osm: () => new XYZ({
    // Use Cartodb tile server instead to avoid OSM blocking
    url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors © CARTO',
    maxZoom: 18
  }),
  satellite: () => new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }),
  terrain: () => new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri — Source: USGS, Esri, TANA, DeLorme, and NPS',
    maxZoom: 18
  }),
  street: () => new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 18
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
  basemap = 'osm'
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<OLMap | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return

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
  }, [basemap]) // Re-initialize when basemap changes

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

  return (
    <div 
      className={`map-container h-full w-full cursor-pointer ${isActive ? 'active' : ''}`}
      onClick={onActivate}
    >
      <div ref={mapRef} className="w-full h-full" />
      {isActive && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
          Active Map
        </div>
      )}
    </div>
  )
}
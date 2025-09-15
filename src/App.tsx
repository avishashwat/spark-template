import React, { useState, useCallback } from 'react'
import { Header } from '@/components/Header'
import { MapComponent } from '@/components/MapComponent'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/components/Dashboard'
import { useMockData } from '@/hooks/useMockData'
import { useKV } from '@github/spark/hooks'

interface MapInstance {
  id: string
  center: [number, number]
  zoom: number
  layers: any[]
  overlayInfo?: {
    type: string
    name: string
    scenario?: string
    year?: string
    season?: string
  }
}

function App() {
  // Initialize mock data
  useMockData()
  
  const [selectedCountry, setSelectedCountry] = useState('bhutan')
  const [mapLayout, setMapLayout] = useState(1)
  const [showDashboard, setShowDashboard] = useState(false)
  const [activeMapId, setActiveMapId] = useState('map-1')
  const [basemap, setBasemap] = useState('osm')
  const [sharedView, setSharedView] = useState<{ center: [number, number], zoom: number }>({
    center: [90.433601, 27.514162], // Bhutan center
    zoom: 6
  })
  
  // Store overlay information for each map
  const [mapOverlays, setMapOverlays] = useState<Record<string, any>>({})

  const handleCountryChange = useCallback((country: string) => {
    setSelectedCountry(country)
    
    // Clear overlays when changing country
    setMapOverlays({})
    
    // Update shared view based on country
    const countryBounds = {
      bhutan: [90.433601, 27.514162] as [number, number],
      mongolia: [103.835, 46.862] as [number, number], 
      laos: [103.865, 18.220] as [number, number]
    }
    
    const newCenter = countryBounds[country as keyof typeof countryBounds]
    setSharedView({ center: newCenter, zoom: 6 })
  }, [])

  const handleLayoutChange = useCallback((layout: number) => {
    setMapLayout(layout)
    setActiveMapId('map-1') // Reset to first map when layout changes
    // Clear overlays when changing layout
    setMapOverlays({})
  }, [])

  const handleMapActivate = useCallback((mapId: string) => {
    setActiveMapId(mapId)
  }, [])

  const handleViewChange = useCallback((center: [number, number], zoom: number) => {
    setSharedView({ center, zoom })
  }, [])

  const handleLayerChange = useCallback((mapId: string, layer: any) => {
    // Handle layer changes for specific map
    console.log('Layer change for map:', mapId, layer)
    
    // Update overlay info for the specific map
    if (layer) {
      setMapOverlays(prev => ({
        ...prev,
        [mapId]: {
          type: layer.type || 'Unknown',
          name: layer.name || 'Unknown Layer',
          scenario: layer.scenario,
          year: layer.year,
          season: layer.season
        }
      }))
    } else {
      // Remove overlay when layer is cleared
      setMapOverlays(prev => {
        const updated = { ...prev }
        delete updated[mapId]
        return updated
      })
    }
  }, [])

  const handleBasemapChange = useCallback((newBasemap: string) => {
    setBasemap(newBasemap)
  }, [])

  const renderMaps = () => {
    const maps: React.ReactElement[] = []
    const mapIds = Array.from({ length: mapLayout }, (_, i) => `map-${i + 1}`)
    
    for (let i = 0; i < mapLayout; i++) {
      const mapId = mapIds[i]
      maps.push(
        <div key={mapId} className="h-full">
          <MapComponent
            id={mapId}
            isActive={activeMapId === mapId}
            onActivate={() => handleMapActivate(mapId)}
            center={sharedView.center}
            zoom={sharedView.zoom}
            onViewChange={handleViewChange}
            country={selectedCountry}
            basemap={basemap}
            overlayInfo={mapOverlays[mapId]}
            mapLayout={mapLayout}
          />
        </div>
      )
    }
    
    return maps
  }

  const getMapGridClass = () => {
    switch (mapLayout) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-2'
      case 4:
        return 'grid-cols-2 grid-rows-2'
      default:
        return 'grid-cols-1'
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        mapLayout={mapLayout}
        onLayoutChange={handleLayoutChange}
        showDashboard={showDashboard}
        onToggleDashboard={() => setShowDashboard(!showDashboard)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <Sidebar
            activeMapId={activeMapId}
            onLayerChange={handleLayerChange}
            basemap={basemap}
            onBasemapChange={handleBasemapChange}
          />
        </div>
        
        {/* Main Map Area */}
        <div className="flex-1 p-2">
          <div className={`grid ${getMapGridClass()} h-full gap-2`}>
            {renderMaps()}
          </div>
        </div>
        
        {/* Dashboard */}
        {showDashboard && (
          <div className="w-80 flex-shrink-0">
            <Dashboard
              selectedCountry={selectedCountry}
              activeMapCount={mapLayout}
              mapOverlays={mapOverlays}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App

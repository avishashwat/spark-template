import React, { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/Header'
import { MapComponent } from '@/components/MapComponent'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/components/Dashboard'
import { AdminApp } from '@/components/AdminApp'
import { useMockData } from '@/hooks/useMockData'
import { useKV } from '@github/spark/hooks'
import { Toaster } from 'sonner'

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

function MainApp() {
  // Initialize mock data
  useMockData()
  
  const [selectedCountry, setSelectedCountry] = useState('bhutan')
  const [mapLayout, setMapLayout] = useState(1)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeMapId, setActiveMapId] = useState('map-1')
  const [basemap, setBasemap] = useState('osm')
  const [sharedView, setSharedView] = useState<{ center: [number, number], zoom: number }>({
    center: [90.433601, 27.514162], // Bhutan center
    zoom: 7.5
  })
  
  // Store overlay information for each map
  const [mapOverlays, setMapOverlays] = useState<Record<string, any>>({})
  
  // Pre-load boundary data for all countries on app start for better performance
  useEffect(() => {
    const preloadBoundaries = async () => {
      const countries = ['bhutan', 'mongolia', 'laos']
      console.log('Pre-loading boundary data for faster map switching...')
      
      const boundaryFiles = await window.spark.kv.get<any[]>('admin_boundary_files') || []
      
      // Load all countries in parallel
      const preloadPromises = countries.map(async (country) => {
        const countryBoundary = boundaryFiles.find(file => file.country === country)
        if (countryBoundary && countryBoundary.dataKey) {
          try {
            // Trigger boundary loading to populate cache
            const startTime = performance.now()
            
            // Load from chunked storage in the background
            const getDataFromChunks = async (key: string): Promise<any> => {
              const metaOrData = await window.spark.kv.get<any>(key)
              
              if (!metaOrData) return null
              
              if (metaOrData && typeof metaOrData === 'object' && 'isChunked' in metaOrData && metaOrData.isChunked) {
                const chunkMeta = metaOrData
                
                const chunkPromises: Promise<string | undefined>[] = []
                for (let i = 0; i < chunkMeta.totalChunks; i++) {
                  chunkPromises.push(window.spark.kv.get<string>(`${key}_chunk_${i}`))
                }
                
                const results = await Promise.allSettled(chunkPromises)
                const chunks: string[] = []
                
                for (let i = 0; i < results.length; i++) {
                  const result = results[i]
                  if (result.status === 'fulfilled' && result.value) {
                    chunks[i] = result.value
                  } else {
                    throw new Error(`Failed to load chunk ${i} for ${key}`)
                  }
                }
                
                const reconstructedData = chunks.join('')
                return JSON.parse(reconstructedData)
              }
              
              return metaOrData
            }
            
            const fullBoundaryData = await getDataFromChunks(countryBoundary.dataKey)
            const loadTime = performance.now() - startTime
            console.log(`Pre-loaded boundary for ${country} in ${loadTime.toFixed(2)}ms`)
            
            return { country, data: fullBoundaryData }
          } catch (error) {
            console.error(`Failed to pre-load boundary for ${country}:`, error)
            return null
          }
        }
        return null
      })
      
      const results = await Promise.allSettled(preloadPromises)
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length
      console.log(`Pre-loaded ${successCount}/${countries.length} country boundaries`)
    }
    
    // Start pre-loading after a short delay to not block initial render
    const timer = setTimeout(preloadBoundaries, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleCountryChange = useCallback((country: string) => {
    setSelectedCountry(country)
    
    // Clear overlays when changing country
    setMapOverlays({})
    
    // Update shared view based on country with proper zoom levels for each layout
    const getCountryZoom = (baseZoom: number) => {
      switch (mapLayout) {
        case 1: return baseZoom
        case 2: return Math.max(baseZoom - 0.5, 4) // Less aggressive zoom reduction for 2 maps
        case 4: return Math.max(baseZoom - 1, 3) // Less aggressive zoom reduction for 4 maps
        default: return baseZoom
      }
    }
    
    const countryBounds = {
      bhutan: { center: [90.433601, 27.514162] as [number, number], baseZoom: 7.5 },
      mongolia: { center: [103.835, 46.862] as [number, number], baseZoom: 4.2 },
      laos: { center: [103.865, 18.220] as [number, number], baseZoom: 5.2 }
    }
    
    const countryConfig = countryBounds[country as keyof typeof countryBounds]
    const adjustedZoom = getCountryZoom(countryConfig.baseZoom)
    setSharedView({ center: countryConfig.center, zoom: adjustedZoom })
  }, [mapLayout])

  const handleLayoutChange = useCallback((layout: number) => {
    setMapLayout(layout)
    setActiveMapId('map-1') // Reset to first map when layout changes
    // Clear overlays when changing layout
    setMapOverlays({})
    
    // Adjust zoom based on new layout and current country
    const getCountryZoom = (baseZoom: number) => {
      switch (layout) {
        case 1: return baseZoom
        case 2: return Math.max(baseZoom - 0.5, 4) // Less aggressive zoom reduction for 2 maps
        case 4: return Math.max(baseZoom - 1, 3) // Less aggressive zoom reduction for 4 maps
        default: return baseZoom
      }
    }
    
    const countryBounds = {
      bhutan: { center: [90.433601, 27.514162] as [number, number], baseZoom: 7.5 },
      mongolia: { center: [103.835, 46.862] as [number, number], baseZoom: 4.2 },
      laos: { center: [103.865, 18.220] as [number, number], baseZoom: 5.2 }
    }
    
    const countryConfig = countryBounds[selectedCountry as keyof typeof countryBounds]
    const adjustedZoom = getCountryZoom(countryConfig.baseZoom)
    setSharedView({ center: countryConfig.center, zoom: adjustedZoom })
  }, [selectedCountry])

  const handleMapActivate = useCallback((mapId: string) => {
    setActiveMapId(mapId)
  }, [])

  const handleViewChange = useCallback((center: [number, number], zoom: number) => {
    setSharedView({ center, zoom })
  }, [])

  const handleLayerChange = useCallback((mapId: string, layer: any, action: 'add' | 'remove' = 'add') => {
    // Handle layer changes for specific map
    console.log('Layer change for map:', mapId, layer, action)
    
    if (action === 'add' && layer) {
      // Update overlay info for the specific map - supporting multiple overlays
      setMapOverlays(prev => {
        const currentOverlays = prev[mapId] || {}
        
        // Store overlays by category
        const updatedOverlays = {
          ...currentOverlays,
          [layer.type.toLowerCase()]: {
            type: layer.type || 'Unknown',
            name: layer.name || 'Unknown Layer',
            scenario: layer.scenario,
            year: layer.year,
            season: layer.season
          }
        }
        
        return {
          ...prev,
          [mapId]: updatedOverlays
        }
      })
    } else if (action === 'remove') {
      // Remove specific overlay category or all overlays
      setMapOverlays(prev => {
        if (!layer) {
          // Remove all overlays for this map
          const updated = { ...prev }
          delete updated[mapId]
          return updated
        } else {
          // Remove specific category overlay
          const currentOverlays = prev[mapId] || {}
          const updatedOverlays = { ...currentOverlays }
          delete updatedOverlays[layer.type.toLowerCase()]
          
          if (Object.keys(updatedOverlays).length === 0) {
            // If no overlays left, remove the map entry
            const updated = { ...prev }
            delete updated[mapId]
            return updated
          } else {
            return {
              ...prev,
              [mapId]: updatedOverlays
            }
          }
        }
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
            allMapOverlays={mapOverlays}
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
        basemap={basemap}
        onBasemapChange={handleBasemapChange}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 flex-shrink-0">
            <Sidebar
              activeMapId={activeMapId}
              onLayerChange={handleLayerChange}
              mapLayout={mapLayout} // Pass layout to clear layers on change
              selectedCountry={selectedCountry} // Pass country to clear layers on change
            />
          </div>
        )}
        
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
      
      {/* Toast notifications */}
      <Toaster position="bottom-right" />
      
      {/* Admin Access Card */}
      {/* Removed - replaced with header button */}
    </div>
  )
}

function App() {
  // Check if we're on the admin route
  const [isAdminMode, setIsAdminMode] = useState(false)
  
  useEffect(() => {
    // Check URL or other conditions to determine admin mode
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('admin') === 'true' || window.location.pathname.includes('admin')) {
      setIsAdminMode(true)
    }
  }, [])

  // If admin mode, render admin app
  if (isAdminMode) {
    return (
      <div className="h-screen bg-background">
        <AdminApp />
        <Toaster position="bottom-right" />
      </div>
    )
  }

  // Otherwise render main app
  return <MainApp />
}

export default App
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Stack, Thermometer, Drop, Flashlight, Eye, EyeSlash, X, Plus } from '@phosphor-icons/react'

interface LayerConfig {
  id: string
  name: string
  category: 'climate' | 'giri' | 'energy'
  visible: boolean
  opacity: number
}

const climateVariables = [
  'Maximum Temperature',
  'Minimum Temperature', 
  'Mean Temperature',
  'Precipitation',
  'Solar Radiation',
  'Cooling Degree Days',
  'Heating Degree Days'
]

const scenarios = [
  'Historical',
  'SSP1',
  'SSP2', 
  'SSP3',
  'SSP5'
]

const seasonality = [
  'Annual',
  'Seasonal'
]

const yearRanges = [
  '2021-2040',
  '2041-2060',
  '2061-2080', 
  '2081-2100'
]

const giriVariables = [
  'Flood',
  'Drought'
]

const giriScenarios = [
  'Existing',
  'SSP1',
  'SSP5'
]

const energyInfrastructure = [
  'Hydro Power Plants',
  'Solar Power Plants',
  'Wind Power Plants'
]

export function Sidebar({ activeMapId, onLayerChange, mapLayout }: { activeMapId: string, onLayerChange: (mapId: string, layer: LayerConfig | null) => void, mapLayout: number }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showSelectionPanel, setShowSelectionPanel] = useState(false)
  const [climateVariable, setClimateVariable] = useState<string>('')
  const [scenario, setScenario] = useState<string>('')
  const [seasonalityType, setSeasonalityType] = useState<string>('')
  const [yearRange, setYearRange] = useState<string>('')
  const [season, setSeason] = useState<string>('')
  const [giriVariable, setGiriVariable] = useState<string>('')
  const [giriScenario, setGiriScenario] = useState<string>('')
  const [energyType, setEnergyType] = useState<string>('')
  const [activeLayers, setActiveLayers] = useState<LayerConfig[]>([])

  // Clear layers when layout changes
  useEffect(() => {
    setActiveLayers([])
    resetSelections()
  }, [mapLayout])

  const resetSelections = () => {
    setClimateVariable('')
    setScenario('')
    setSeasonalityType('')
    setYearRange('')
    setSeason('')
    setGiriVariable('')
    setGiriScenario('')
    setEnergyType('')
    // Don't hide the panel, just reset the form values
  }

  const handleCategoryChange = (category: string) => {
    // If clicking the same category that's already selected, just reset
    if (selectedCategory === category && showSelectionPanel) {
      resetSelections()
    } else {
      setSelectedCategory(category)
      setShowSelectionPanel(true)
      resetSelections()
    }
  }

  const addLayer = () => {
    let layerInfo: any = null
    
    if (selectedCategory === 'climate' && climateVariable && scenario) {
      layerInfo = {
        type: 'Climate',
        name: climateVariable,
        scenario: scenario,
        year: yearRange || undefined,
        season: season || (seasonalityType === 'Annual' ? 'Annual' : undefined)
      }
    } else if (selectedCategory === 'giri' && giriVariable && giriScenario) {
      layerInfo = {
        type: 'GIRI',
        name: giriVariable,
        scenario: giriScenario
      }
    } else if (selectedCategory === 'energy' && energyType) {
      layerInfo = {
        type: 'Energy',
        name: energyType
      }
    }

    if (layerInfo) {
      const newLayer: LayerConfig = {
        id: `${activeMapId}-${Date.now()}`,
        name: layerInfo.name,
        category: selectedCategory as 'climate' | 'giri' | 'energy',
        visible: true,
        opacity: 80
      }
      
      setActiveLayers([...activeLayers, newLayer])
      onLayerChange(activeMapId, layerInfo)
      
      // Keep the selection panel open but reset selections for easy re-use
      resetSelections()
    }
  }

  const toggleLayerVisibility = (layerId: string) => {
    setActiveLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    )
  }

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    setActiveLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, opacity }
          : layer
      )
    )
  }

  const removeLayer = (layerId: string) => {
    setActiveLayers(prev => prev.filter(layer => layer.id !== layerId))
    onLayerChange(activeMapId, null) // Clear overlay
  }

  const canAddLayer = () => {
    if (selectedCategory === 'climate') {
      return climateVariable && scenario && (scenario === 'Historical' ? true : yearRange)
    }
    if (selectedCategory === 'giri') {
      return giriVariable && giriScenario
    }
    if (selectedCategory === 'energy') {
      return energyType
    }
    return false
  }

  return (
    <>
      <Card className="h-full rounded-none border-y-0 border-l-0">
        <CardHeader className="pb-1 px-4 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stack className="w-4 h-4 text-primary" />
            Layer Controls
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 custom-scroll overflow-y-auto max-h-[calc(100vh-120px)] px-4">
          {/* Data Categories */}
          <div className="space-y-2">
            <h3 className="font-medium text-xs text-muted-foreground">DATA LAYERS</h3>
            <div className="grid gap-2">
              {[
                { id: 'climate', label: 'Climate Variables', icon: Thermometer, color: 'text-orange-600' },
                { id: 'giri', label: 'GIRI Hazards', icon: Drop, color: 'text-blue-600' },
                { id: 'energy', label: 'Energy Infrastructure', icon: Flashlight, color: 'text-yellow-600' }
              ].map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  className={`flex items-center justify-start w-full h-10 text-sm px-3 border-2 rounded-md transition-all duration-200 hover:bg-primary/5 hover:border-primary/50 ${
                    selectedCategory === id ? 'bg-primary/15 border-primary text-primary font-medium' : 'bg-white border-border text-foreground'
                  }`}
                  onClick={() => handleCategoryChange(id)}
                >
                  <Icon className={`w-4 h-4 mr-2 ${selectedCategory === id ? 'text-primary' : color}`} />
                  {label}
                  {selectedCategory === id && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Active
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selection Panel - Show when category is selected */}
          {selectedCategory && (
            <div className="space-y-3 border-2 rounded-lg p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/40 shadow-md relative z-10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                  {selectedCategory === 'climate' && (
                    <>
                      <Thermometer className="w-4 h-4" />
                      Configure Climate Variables
                    </>
                  )}
                  {selectedCategory === 'giri' && (
                    <>
                      <Drop className="w-4 h-4" />
                      Configure GIRI Hazards
                    </>
                  )}
                  {selectedCategory === 'energy' && (
                    <>
                      <Flashlight className="w-4 h-4" />
                      Configure Energy Infrastructure
                    </>
                  )}
                </h4>
                <button
                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
                  onClick={() => {
                    resetSelections()
                  }}
                  title="Clear selections"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Climate Variables */}
              {selectedCategory === 'climate' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Variable</label>
                    <Select value={climateVariable} onValueChange={setClimateVariable}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select variable" />
                      </SelectTrigger>
                      <SelectContent>
                        {climateVariables.map(variable => (
                          <SelectItem key={variable} value={variable} className="text-sm">
                            {variable}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {climateVariable && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Scenario</label>
                      <Select value={scenario} onValueChange={setScenario}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select scenario" />
                        </SelectTrigger>
                        <SelectContent>
                          {scenarios.map(s => (
                            <SelectItem key={s} value={s} className="text-sm">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scenario && scenario !== 'Historical' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Year Range</label>
                      <Select value={yearRange} onValueChange={setYearRange}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select year range" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearRanges.map(range => (
                            <SelectItem key={range} value={range} className="text-sm">
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scenario && (scenario === 'Historical' || yearRange) && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Seasonality</label>
                      <Select value={seasonalityType} onValueChange={setSeasonalityType}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select seasonality" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasonality.map(s => (
                            <SelectItem key={s} value={s} className="text-sm">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {seasonalityType === 'Seasonal' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Season</label>
                      <Select value={season} onValueChange={setSeason}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jan_mar" className="text-sm">January - March</SelectItem>
                          <SelectItem value="apr_jun" className="text-sm">April - June</SelectItem>
                          <SelectItem value="jul_sep" className="text-sm">July - September</SelectItem>
                          <SelectItem value="oct_dec" className="text-sm">October - December</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* GIRI Variables */}
              {selectedCategory === 'giri' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Variable</label>
                    <Select value={giriVariable} onValueChange={setGiriVariable}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select variable" />
                      </SelectTrigger>
                      <SelectContent>
                        {giriVariables.map(variable => (
                          <SelectItem key={variable} value={variable} className="text-sm">
                            {variable}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {giriVariable && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Scenario</label>
                      <Select value={giriScenario} onValueChange={setGiriScenario}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select scenario" />
                        </SelectTrigger>
                        <SelectContent>
                          {giriScenarios.map(s => (
                            <SelectItem key={s} value={s} className="text-sm">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Energy Infrastructure */}
              {selectedCategory === 'energy' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Infrastructure Type</label>
                  <Select value={energyType} onValueChange={setEnergyType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {energyInfrastructure.map(type => (
                        <SelectItem key={type} value={type} className="text-sm">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <button 
                onClick={addLayer}
                disabled={!canAddLayer()}
                className="w-full h-8 text-sm bg-primary text-primary-foreground rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Layer
              </button>
            </div>
          )}

          {/* Active Layers */}
          {activeLayers.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-2">
                <h3 className="font-medium text-xs text-muted-foreground">ACTIVE LAYERS</h3>
                <div className="space-y-2">
                  {activeLayers.map(layer => (
                    <div key={layer.id} className="bg-muted/30 rounded-md p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{layer.name}</div>
                          <Badge variant="secondary" className="text-xs h-4 px-1 mt-1">
                            {layer.category.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex items-center justify-center"
                            onClick={() => toggleLayerVisibility(layer.id)}
                          >
                            {layer.visible ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeSlash className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-muted rounded transition-colors flex items-center justify-center"
                            onClick={() => removeLayer(layer.id)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Opacity</span>
                          <span className="text-xs">{layer.opacity}%</span>
                        </div>
                        <Slider
                          value={[layer.opacity]}
                          onValueChange={([value]) => updateLayerOpacity(layer.id, value)}
                          max={100}
                          step={10}
                          className="w-full h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
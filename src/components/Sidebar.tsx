import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Stack, Thermometer, Drop, Flashlight, Eye, EyeSlash } from '@phosphor-icons/react'

interface LayerConfig {
  id: string
  name: string
  category: 'climate' | 'giri' | 'energy'
  visible: boolean
  opacity: number
}

interface SidebarProps {
  activeMapId: string
  onLayerChange: (mapId: string, layer: LayerConfig) => void
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

export function Sidebar({ activeMapId, onLayerChange }: SidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [climateVariable, setClimateVariable] = useState<string>('')
  const [scenario, setScenario] = useState<string>('')
  const [seasonalityType, setSeasonalityType] = useState<string>('')
  const [yearRange, setYearRange] = useState<string>('')
  const [season, setSeason] = useState<string>('')
  const [giriVariable, setGiriVariable] = useState<string>('')
  const [giriScenario, setGiriScenario] = useState<string>('')
  const [energyType, setEnergyType] = useState<string>('')
  const [activeLayers, setActiveLayers] = useState<LayerConfig[]>([])

  const resetSelections = () => {
    setClimateVariable('')
    setScenario('')
    setSeasonalityType('')
    setYearRange('')
    setSeason('')
    setGiriVariable('')
    setGiriScenario('')
    setEnergyType('')
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    resetSelections()
  }

  const addLayer = () => {
    let layerName = ''
    let category: 'climate' | 'giri' | 'energy' = 'climate'
    
    if (selectedCategory === 'climate' && climateVariable && scenario) {
      layerName = `${climateVariable} - ${scenario}`
      if (seasonalityType) layerName += ` - ${seasonalityType}`
      if (yearRange) layerName += ` - ${yearRange}`
      if (season) layerName += ` - ${season}`
      category = 'climate'
    } else if (selectedCategory === 'giri' && giriVariable && giriScenario) {
      layerName = `${giriVariable} - ${giriScenario}`
      category = 'giri'
    } else if (selectedCategory === 'energy' && energyType) {
      layerName = energyType
      category = 'energy'
    }

    if (layerName) {
      const newLayer: LayerConfig = {
        id: `${activeMapId}-${Date.now()}`,
        name: layerName,
        category,
        visible: true,
        opacity: 80
      }
      
      setActiveLayers([...activeLayers, newLayer])
      onLayerChange(activeMapId, newLayer)
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
    <Card className="h-full rounded-none border-y-0 border-l-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stack className="w-5 h-5 text-primary" />
          Layer Controls
        </CardTitle>
        <Badge variant="outline" className="w-fit">
          Active Map: {activeMapId}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-6 custom-scroll overflow-y-auto max-h-[calc(100vh-140px)]">
        {/* Category Selection */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-foreground">Data Category</h3>
          <div className="grid gap-2">
            {[
              { id: 'climate', label: 'Climate Variables', icon: Thermometer },
              { id: 'giri', label: 'GIRI Hazards', icon: Drop },
              { id: 'energy', label: 'Energy Infrastructure', icon: Flashlight }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={selectedCategory === id ? "default" : "outline"}
                className="justify-start h-10"
                onClick={() => handleCategoryChange(id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Climate Variables */}
        {selectedCategory === 'climate' && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Climate Variable</h4>
              <Select value={climateVariable} onValueChange={setClimateVariable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variable" />
                </SelectTrigger>
                <SelectContent>
                  {climateVariables.map(variable => (
                    <SelectItem key={variable} value={variable}>
                      {variable}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {climateVariable && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Scenario</h4>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map(s => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scenario && scenario !== 'Historical' && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Year Range</h4>
                <Select value={yearRange} onValueChange={setYearRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year range" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearRanges.map(range => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scenario && (scenario === 'Historical' || yearRange) && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Seasonality</h4>
                <Select value={seasonalityType} onValueChange={setSeasonalityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seasonality" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasonality.map(s => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {seasonalityType === 'Seasonal' && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Season</h4>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jan_mar">January - March</SelectItem>
                    <SelectItem value="apr_jun">April - June</SelectItem>
                    <SelectItem value="jul_sep">July - September</SelectItem>
                    <SelectItem value="oct_dec">October - December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* GIRI Variables */}
        {selectedCategory === 'giri' && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">GIRI Variable</h4>
              <Select value={giriVariable} onValueChange={setGiriVariable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variable" />
                </SelectTrigger>
                <SelectContent>
                  {giriVariables.map(variable => (
                    <SelectItem key={variable} value={variable}>
                      {variable}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {giriVariable && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Scenario</h4>
                <Select value={giriScenario} onValueChange={setGiriScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {giriScenarios.map(s => (
                      <SelectItem key={s} value={s}>
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
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Infrastructure Type</h4>
              <Select value={energyType} onValueChange={setEnergyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {energyInfrastructure.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Add Layer Button */}
        {selectedCategory && (
          <>
            <Separator />
            <Button 
              onClick={addLayer}
              disabled={!canAddLayer()}
              className="w-full"
            >
              Add Layer to Map
            </Button>
          </>
        )}

        {/* Active Layers */}
        {activeLayers.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Active Layers</h3>
              <div className="space-y-3">
                {activeLayers.map(layer => (
                  <Card key={layer.id} className="p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{layer.name}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleLayerVisibility(layer.id)}
                          >
                            {layer.visible ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeSlash className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLayer(layer.id)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Opacity</span>
                          <span>{layer.opacity}%</span>
                        </div>
                        <Slider
                          value={[layer.opacity]}
                          onValueChange={([value]) => updateLayerOpacity(layer.id, value)}
                          max={100}
                          step={10}
                          className="w-full"
                        />
                      </div>
                      
                      <Badge variant="secondary" className="text-xs">
                        {layer.category.toUpperCase()}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
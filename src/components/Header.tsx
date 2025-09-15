import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe, MapPin, ChartBar, Sidebar as SidebarIcon } from '@phosphor-icons/react'

interface HeaderProps {
  selectedCountry: string
  onCountryChange: (country: string) => void
  mapLayout: number
  onLayoutChange: (layout: number) => void
  showDashboard: boolean
  onToggleDashboard: () => void
  basemap: string
  onBasemapChange: (basemap: string) => void
  showSidebar: boolean
  onToggleSidebar: () => void
}

const countries = [
  { value: 'bhutan', label: 'Bhutan' },
  { value: 'mongolia', label: 'Mongolia' },
  { value: 'laos', label: 'Laos' }
]

const basemaps = [
  { id: 'osm', name: 'OpenStreetMap' },
  { id: 'satellite', name: 'Satellite' },
  { id: 'terrain', name: 'Terrain' },
  { id: 'street', name: 'Street Map' }
]

const layouts = [
  { value: 1, label: '1 Map' },
  { value: 2, label: '2 Maps' },
  { value: 4, label: '4 Maps' }
]

export function Header({ 
  selectedCountry, 
  onCountryChange, 
  mapLayout, 
  onLayoutChange,
  showDashboard,
  onToggleDashboard,
  basemap,
  onBasemapChange,
  showSidebar,
  onToggleSidebar
}: HeaderProps) {
  return (
    <Card className="rounded-none border-x-0 border-t-0 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Globe weight="fill" className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">UN ESCAP</h1>
              <p className="text-xs text-muted-foreground">Climate & Energy Risk Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={onCountryChange}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant={showSidebar ? "default" : "outline"}
            size="sm"
            onClick={onToggleSidebar}
            className="flex items-center gap-2 h-7 px-2 text-xs"
          >
            <SidebarIcon className="w-4 h-4" />
            Layers
          </Button>
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Compare:</span>
            <div className="flex gap-1">
              {layouts.map((layout) => (
                <Button
                  key={layout.value}
                  variant={mapLayout === layout.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onLayoutChange(layout.value)}
                  className="h-7 px-2 text-xs"
                >
                  {layout.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Basemap:</span>
            <Select value={basemap} onValueChange={onBasemapChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue placeholder="Basemap" />
              </SelectTrigger>
              <SelectContent>
                {basemaps.map((map) => (
                  <SelectItem key={map.id} value={map.id}>
                    {map.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant={showDashboard ? "default" : "outline"}
            size="sm"
            onClick={onToggleDashboard}
            className="flex items-center gap-2 h-7 px-2 text-xs"
          >
            <ChartBar className="w-4 h-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </Card>
  )
}
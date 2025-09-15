import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartBar, Warning, TrendUp, Info, Flashlight } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'

interface DashboardProps {
  selectedCountry: string
  activeMapCount: number
}

interface CountryData {
  temperature: {
    current: number
    trend: string
    extremeRisk: string
  }
  precipitation: {
    current: number
    trend: string
    droughtRisk: string
  }
  energyInfrastructure: {
    hydroPlants: number
    solarPlants: number
    windPlants: number
    vulnerabilityScore: number
  }
}

export function Dashboard({ selectedCountry, activeMapCount }: DashboardProps) {
  const [countryRiskData] = useKV<Record<string, CountryData>>('country-risk-data', {})
  const [currentCountryData, setCurrentCountryData] = useState<CountryData | null>(null)

  useEffect(() => {
    if (countryRiskData && selectedCountry) {
      setCurrentCountryData(countryRiskData[selectedCountry] || null)
    }
  }, [countryRiskData, selectedCountry])

  if (!currentCountryData) {
    return (
      <Card className="h-full rounded-none border-y-0 border-r-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ChartBar className="w-5 h-5 text-primary" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading country data...</p>
        </CardContent>
      </Card>
    )
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'text-accent'
      case 'medium': return 'text-secondary'
      case 'high': return 'text-destructive'
      case 'very-high': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <Card className="h-full rounded-none border-y-0 border-r-0">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ChartBar className="w-5 h-5 text-primary" />
          Analytics Dashboard
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">
            {selectedCountry.charAt(0).toUpperCase() + selectedCountry.slice(1)}
          </Badge>
          <Badge variant="outline">
            {activeMapCount} Map{activeMapCount > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 custom-scroll overflow-y-auto max-h-[calc(100vh-140px)] pt-6">
        {/* Climate Risk Summary */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Warning className="w-4 h-4 text-destructive" />
            Climate Risk Assessment
          </h3>
          
          <div className="grid gap-3">
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Average Temperature</p>
                  <p className="text-xl font-bold text-foreground">
                    {currentCountryData.temperature.current}°C
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Projection</p>
                  <p className="text-sm font-medium text-destructive">
                    {currentCountryData.temperature.trend}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className={getRiskColor(currentCountryData.temperature.extremeRisk)}>
                  {currentCountryData.temperature.extremeRisk.replace('-', ' ')} Extreme Risk
                </Badge>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Annual Precipitation</p>
                  <p className="text-xl font-bold text-foreground">
                    {currentCountryData.precipitation.current}mm
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Projection</p>
                  <p className="text-sm font-medium text-destructive">
                    {currentCountryData.precipitation.trend}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className={getRiskColor(currentCountryData.precipitation.droughtRisk)}>
                  {currentCountryData.precipitation.droughtRisk.replace('-', ' ')} Drought Risk
                </Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Energy Infrastructure */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Flashlight className="w-4 h-4 text-accent" />
            Energy Infrastructure
          </h3>
          
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Hydro</p>
                <p className="text-lg font-bold text-secondary">
                  {currentCountryData.energyInfrastructure.hydroPlants}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Solar</p>
                <p className="text-lg font-bold text-accent">
                  {currentCountryData.energyInfrastructure.solarPlants}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Wind</p>
                <p className="text-lg font-bold text-primary">
                  {currentCountryData.energyInfrastructure.windPlants}
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Vulnerability Score</p>
                  <p className="text-2xl font-bold text-destructive">
                    {currentCountryData.energyInfrastructure.vulnerabilityScore}/10
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Warning className="w-8 h-8 text-destructive" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendUp className="w-4 h-4 text-primary" />
            Overall Risk Assessment
          </h3>
          
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Overall Risk Level</span>
                <Badge variant="destructive">
                  {currentCountryData.energyInfrastructure.vulnerabilityScore > 7 ? 'High' : 
                   currentCountryData.energyInfrastructure.vulnerabilityScore > 5 ? 'Medium-High' : 'Medium'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Primary Risk Factor</span>
                <span className="text-sm font-medium text-foreground">
                  {currentCountryData.temperature.extremeRisk === 'high' ? 'Temperature Rise' : 'Precipitation Change'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Secondary Risk Factor</span>
                <span className="text-sm font-medium text-foreground">
                  {currentCountryData.precipitation.droughtRisk === 'high' || currentCountryData.precipitation.droughtRisk === 'very-high' 
                    ? 'Drought Risk' : 'Infrastructure Vulnerability'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Country-Specific Recommendations */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-secondary" />
            Recommendations
          </h3>
          
          <Card className="p-4">
            <div className="space-y-3">
              {selectedCountry === 'bhutan' && (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Strengthen hydroelectric infrastructure against increasing precipitation variability
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Develop solar capacity to reduce dependency on hydro during dry seasons
                    </p>
                  </div>
                </>
              )}
              
              {selectedCountry === 'mongolia' && (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Expand wind energy capacity to leverage abundant wind resources
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Implement drought-resistant energy infrastructure designs
                    </p>
                  </div>
                </>
              )}
              
              {selectedCountry === 'laos' && (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Optimize extensive hydro capacity for regional energy export
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Prepare for increased temperature impacts on cooling demands
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-foreground">
                  Develop early warning systems for extreme weather events
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Sources */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Data Sources</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Climate data: CMIP6 Global Climate Models</p>
            <p>• GIRI hazard data: Global Risk Index Repository</p>
            <p>• Infrastructure data: National energy authorities</p>
            <p>• Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
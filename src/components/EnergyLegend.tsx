import React from 'react'

interface EnergyLegendProps {
  energyType: string
}

const getEnergyLegendInfo = (energyType: string) => {
  const baseInfo = {
    'Hydro Power Plants': {
      color: '#1e40af', // Blue
      symbol: '▲',
      description: 'Hydro Power Plants'
    },
    'Solar Power Plants': {
      color: '#f59e0b', // Yellow/Orange
      symbol: '●',
      description: 'Solar Power Plants'
    },
    'Wind Power Plants': {
      color: '#10b981', // Green
      symbol: '✦',
      description: 'Wind Power Plants'
    }
  }

  return baseInfo[energyType as keyof typeof baseInfo] || baseInfo['Hydro Power Plants']
}

export function EnergyLegend({ energyType }: EnergyLegendProps) {
  const legendInfo = getEnergyLegendInfo(energyType)
  
  // Define size categories for designCapacity
  const sizeCategories = [
    { range: '< 10 MW', size: 4, description: 'Small' },
    { range: '10-50 MW', size: 6, description: 'Medium' },
    { range: '50-200 MW', size: 8, description: 'Large' },
    { range: '> 200 MW', size: 10, description: 'Very Large' }
  ]

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-600">
          Size by Design Capacity:
        </div>
        {sizeCategories.map((category, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div 
              className="rounded-full flex-shrink-0"
              style={{ 
                width: `${category.size}px`, 
                height: `${category.size}px`,
                backgroundColor: legendInfo.color,
                opacity: 0.8
              }}
            />
            <span className="text-gray-700 text-xs">
              {category.range}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
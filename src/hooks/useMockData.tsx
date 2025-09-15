import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'

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

export function useMockData() {
  const [countryRiskData, setCountryRiskData] = useKV<Record<string, CountryData>>('country-risk-data', {})
  
  useEffect(() => {
    // Initialize mock data if not present
    if (!countryRiskData || Object.keys(countryRiskData).length === 0) {
      const mockData: Record<string, CountryData> = {
        bhutan: {
          temperature: {
            current: 15.2,
            trend: '+2.8°C by 2050',
            extremeRisk: 'medium'
          },
          precipitation: {
            current: 1245,
            trend: '+15% by 2050',
            droughtRisk: 'low'
          },
          energyInfrastructure: {
            hydroPlants: 23,
            solarPlants: 8,
            windPlants: 2,
            vulnerabilityScore: 6.2
          }
        },
        mongolia: {
          temperature: {
            current: 1.8,
            trend: '+3.2°C by 2050',
            extremeRisk: 'high'
          },
          precipitation: {
            current: 295,
            trend: '-8% by 2050',
            droughtRisk: 'very-high'
          },
          energyInfrastructure: {
            hydroPlants: 5,
            solarPlants: 12,
            windPlants: 15,
            vulnerabilityScore: 7.8
          }
        },
        laos: {
          temperature: {
            current: 25.6,
            trend: '+2.5°C by 2050',
            extremeRisk: 'medium'
          },
          precipitation: {
            current: 1785,
            trend: '+12% by 2050',
            droughtRisk: 'low'
          },
          energyInfrastructure: {
            hydroPlants: 45,
            solarPlants: 6,
            windPlants: 3,
            vulnerabilityScore: 5.4
          }
        }
      }
      
      setCountryRiskData(mockData)
    }
  }, [countryRiskData, setCountryRiskData])
}
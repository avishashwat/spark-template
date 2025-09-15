import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Palette, TrendUp, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface RasterStats {
  min: number
  max: number
  mean: number
  stdDev: number
}

interface ClassificationRange {
  id: string
  min: number
  max: number
  color: string
  label: string
}

interface RasterClassificationConfigProps {
  files: any[]
  category: any
  country: string
  onComplete: (config: any) => void
  onBack: () => void
}

export function RasterClassificationConfig({ 
  files, 
  category, 
  country, 
  onComplete, 
  onBack 
}: RasterClassificationConfigProps) {
  const [rasterStats, setRasterStats] = useState<RasterStats | null>(null)
  const [classifications, setClassifications] = useState<ClassificationRange[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [templates, setTemplates] = useKV('classification-templates', {} as any)

  // Real raster analysis using GeoTIFF
  const analyzeRaster = async (file: File) => {
    setIsAnalyzing(true)
    
    try {
      // Import GeoTIFF dynamically to handle ES modules
      const { fromBlob } = await import('geotiff')
      
      // Read the raster file
      const tiff = await fromBlob(file)
      const image = await tiff.getImage()
      const rasters = await image.readRasters()
      
      // Get the first band data - ensure it's an array
      const rasterData = rasters[0]
      if (typeof rasterData === 'number') {
        throw new Error('Invalid raster data format')
      }
      
      // Convert to regular array for easier processing
      const dataArray = Array.from(rasterData)
      
      // Calculate statistics, excluding nodata values
      const noDataValue = image.getGDALNoData() || null
      let validData: number[] = []
      
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i]
        if (noDataValue === null || value !== noDataValue) {
          // Also exclude common nodata values like -9999, -32768, etc.
          if (value !== -9999 && value !== -32768 && value !== -3.4028235e+38 && !isNaN(value) && isFinite(value)) {
            validData.push(value)
          }
        }
      }
      
      if (validData.length === 0) {
        throw new Error('No valid pixel values found in raster')
      }
      
      // Calculate statistics
      const sortedData = validData.sort((a, b) => a - b)
      const min = sortedData[0]
      const max = sortedData[sortedData.length - 1]
      const sum = validData.reduce((acc, val) => acc + val, 0)
      const mean = sum / validData.length
      
      // Calculate standard deviation
      const squaredDiffs = validData.map(value => Math.pow(value - mean, 2))
      const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / validData.length
      const stdDev = Math.sqrt(avgSquaredDiff)
      
      const stats: RasterStats = {
        min: parseFloat(min.toFixed(6)),
        max: parseFloat(max.toFixed(6)),
        mean: parseFloat(mean.toFixed(6)),
        stdDev: parseFloat(stdDev.toFixed(6))
      }
      
      console.log('Raster analysis results:', {
        fileName: file.name,
        totalPixels: dataArray.length,
        validPixels: validData.length,
        noDataValue,
        stats
      })
      
      setRasterStats(stats)
      generateDefaultClassification(stats)
      toast.success(`Raster analyzed: ${validData.length} valid pixels found`)
      
    } catch (error) {
      console.error('Raster analysis failed:', error)
      toast.error(`Failed to analyze raster: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Fallback to basic stats if analysis fails
      const fallbackStats = { min: 0, max: 100, mean: 50, stdDev: 25 }
      setRasterStats(fallbackStats)
      generateDefaultClassification(fallbackStats)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateDefaultClassification = (stats: RasterStats) => {
    const range = stats.max - stats.min
    const classSize = range / 5
    
    const defaultColors = ['#d73027', '#fc8d59', '#fee08b', '#91bfdb', '#4575b4']
    
    const newClassifications: ClassificationRange[] = []
    for (let i = 0; i < 5; i++) {
      let min: number
      let max: number
      
      if (i === 0) {
        // First class: min is raster min
        min = stats.min
        max = Math.round((stats.min + classSize) * 100) / 100
      } else if (i === 4) {
        // Last class: max is raster max
        min = Math.round((stats.min + (classSize * i)) * 100) / 100
        max = stats.max
      } else {
        min = Math.round((stats.min + (classSize * i)) * 100) / 100
        max = Math.round((stats.min + (classSize * (i + 1))) * 100) / 100
      }
      
      newClassifications.push({
        id: crypto.randomUUID(),
        min,
        max,
        color: defaultColors[i],
        label: `${min} - ${max}`
      })
    }
    
    setClassifications(newClassifications)
  }

  const getSmallestIncrement = (value: number): number => {
    // Find the number of decimal places
    const str = value.toString()
    if (str.includes('.')) {
      const decimals = str.split('.')[1].length
      return Math.pow(10, -decimals)
    }
    return 1
  }

  const updateClassification = (id: string, field: keyof ClassificationRange, value: any) => {
    if (field === 'max') {
      const numValue = parseFloat(value)
      
      // Validate that max value is within raster bounds
      if (!rasterStats) return
      
      if (numValue < rasterStats.min || numValue > rasterStats.max) {
        toast.error(`Max value must be between ${rasterStats.min} and ${rasterStats.max}`)
        return
      }
      
      // When updating max value, automatically update next class's min and update labels
      setClassifications(prev => {
        const updated = prev.map(cls => 
          cls.id === id ? { 
            ...cls, 
            [field]: numValue,
            label: `${cls.min} - ${numValue}` // Update current class label
          } : cls
        )
        
        // Find current class index
        const currentIndex = updated.findIndex(cls => cls.id === id)
        
        // If not the last class, update next class's min and label
        if (currentIndex >= 0 && currentIndex < updated.length - 1) {
          const nextMin = numValue + getSmallestIncrement(numValue)
          updated[currentIndex + 1] = {
            ...updated[currentIndex + 1],
            min: nextMin,
            label: `${nextMin} - ${updated[currentIndex + 1].max}` // Update next class label
          }
        }
        
        return updated
      })
    } else {
      setClassifications(prev => 
        prev.map(cls => 
          cls.id === id ? { ...cls, [field]: value } : cls
        )
      )
    }
  }

  const validateClassifications = () => {
    if (!rasterStats) return false
    
    // Check that first class starts with min and last ends with max
    const sortedClasses = [...classifications].sort((a, b) => a.min - b.min)
    
    if (Math.abs(sortedClasses[0].min - rasterStats.min) > 0.001) {
      toast.error('First class must start with the minimum value')
      return false
    }
    
    if (Math.abs(sortedClasses[sortedClasses.length - 1].max - rasterStats.max) > 0.001) {
      toast.error('Last class must end with the maximum value')
      return false
    }
    
    // Check for logical sequence (each max should be less than or equal to next min)
    for (let i = 0; i < sortedClasses.length - 1; i++) {
      if (sortedClasses[i].max > sortedClasses[i + 1].min) {
        toast.error(`Class ${i + 1} max value (${sortedClasses[i].max}) cannot be greater than Class ${i + 2} min value (${sortedClasses[i + 1].min})`)
        return false
      }
    }
    
    // Check that all values are within raster bounds
    for (let i = 0; i < sortedClasses.length; i++) {
      if (sortedClasses[i].min < rasterStats.min || sortedClasses[i].max > rasterStats.max) {
        toast.error(`All classification values must be between ${rasterStats.min} and ${rasterStats.max}`)
        return false
      }
    }
    
    return true
  }

  const handleComplete = () => {
    if (!validateClassifications()) return
    
    const config = {
      type: 'raster',
      category: category.id,
      country,
      files: files.map(f => f.name),
      statistics: rasterStats,
      classifications,
      timestamp: Date.now()
    }
    
    onComplete(config)
  }

  const applyTemplate = (templateId: string) => {
    if (!templates || !templates[templateId]) return
    
    const template = templates[templateId]
    if (template && template.classifications) {
      setClassifications(template.classifications)
      toast.success('Template applied successfully')
    }
  }

  useEffect(() => {
    if (files.length > 0) {
      analyzeRaster(files[0].file)
    }
  }, [files])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Raster Classification Configuration
              </CardTitle>
              <CardDescription>
                Configure classification ranges and colors for {category.name}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Analyzing raster data...</p>
            </div>
          ) : rasterStats ? (
            <div className="space-y-6">
              {/* Raster Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">{rasterStats.min}</div>
                    <p className="text-xs text-muted-foreground">Minimum</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600">{rasterStats.max}</div>
                    <p className="text-xs text-muted-foreground">Maximum</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{rasterStats.mean.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">Mean</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-purple-600">{rasterStats.stdDev.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">Std Dev</p>
                  </CardContent>
                </Card>
              </div>

              {/* Template Selection */}
              <div>
                <Label htmlFor="template-select">Apply Existing Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={(value) => {
                  setSelectedTemplate(value)
                  if (value) applyTemplate(value)
                }}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a classification template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates && Object.entries(templates).map(([id, template]: [string, any]) => (
                      <SelectItem key={id} value={id}>
                        {template.name} ({template.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Classification Configuration */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendUp className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Classification Ranges</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Automatic Classification Rules:</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• First class minimum is automatically set to raster minimum ({rasterStats?.min})</li>
                        <li>• Last class maximum is automatically set to raster maximum ({rasterStats?.max})</li>
                        <li>• When you enter a max value, the next class minimum auto-adjusts (e.g., 5.41 → 5.42)</li>
                        <li>• You only need to enter 4 max values - minimums are calculated automatically</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {classifications.map((cls, index) => (
                    <div key={cls.id} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                      <div className="col-span-2">
                        <Label className="text-sm">Class {index + 1}</Label>
                      </div>
                      
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={cls.min}
                          onChange={(e) => updateClassification(cls.id, 'min', parseFloat(e.target.value))}
                          step="0.01"
                          disabled={true} // All mins are auto-calculated
                          className="bg-muted"
                          placeholder="Auto-calculated"
                        />
                      </div>
                      
                      <div className="col-span-1 text-center text-muted-foreground">to</div>
                      
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={cls.max}
                          onChange={(e) => updateClassification(cls.id, 'max', parseFloat(e.target.value))}
                          step="0.01"
                          disabled={index === classifications.length - 1} // Last max is fixed to raster max
                          className={index === classifications.length - 1 ? "bg-muted" : ""}
                          placeholder={index === classifications.length - 1 ? "Auto-calculated" : "Enter max value"}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cls.color}
                            onChange={(e) => updateClassification(cls.id, 'color', e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer flex-shrink-0"
                          />
                          <Input
                            type="text"
                            value={cls.color}
                            onChange={(e) => {
                              let value = e.target.value.trim()
                              // Add # if missing and valid hex characters
                              if (value && !value.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(value)) {
                                value = '#' + value
                              }
                              updateClassification(cls.id, 'color', value)
                            }}
                            onPaste={(e) => {
                              e.preventDefault()
                              let value = e.clipboardData.getData('text').trim()
                              // Add # if missing and valid hex characters
                              if (value && !value.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(value)) {
                                value = '#' + value
                              }
                              updateClassification(cls.id, 'color', value)
                            }}
                            placeholder="#000000"
                            className="font-mono text-sm"
                            maxLength={7}
                          />
                        </div>
                      </div>
                      
                      <div className="col-span-3">
                        <Input
                          type="text"
                          value={cls.label}
                          onChange={(e) => updateClassification(cls.id, 'label', e.target.value)}
                          placeholder="Class label"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} className="gap-2">
                  Complete Configuration
                  <TrendUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No raster data to analyze</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
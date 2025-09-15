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

  // Mock raster analysis - in production this would use GDAL
  const analyzeRaster = async (file: File) => {
    setIsAnalyzing(true)
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock statistics based on data type
    const mockStats: Record<string, RasterStats> = {
      'max-temp': { min: -5, max: 45, mean: 22.5, stdDev: 8.2 },
      'min-temp': { min: -25, max: 25, mean: 8.3, stdDev: 12.1 },
      'mean-temp': { min: -15, max: 35, mean: 15.4, stdDev: 9.8 },
      'precipitation': { min: 0, max: 3000, mean: 850, stdDev: 420 },
      'solar-radiation': { min: 800, max: 2400, mean: 1650, stdDev: 280 },
      'cooling-degree-days': { min: 0, max: 4500, mean: 1200, stdDev: 650 },
      'heating-degree-days': { min: 0, max: 6000, mean: 2800, stdDev: 890 },
      'flood': { min: 0, max: 1, mean: 0.3, stdDev: 0.2 },
      'drought': { min: 0, max: 1, mean: 0.25, stdDev: 0.18 }
    }
    
    const stats = mockStats[category.id] || { min: 0, max: 100, mean: 50, stdDev: 25 }
    
    setRasterStats(stats)
    generateDefaultClassification(stats)
    setIsAnalyzing(false)
  }

  const generateDefaultClassification = (stats: RasterStats) => {
    const range = stats.max - stats.min
    const classSize = range / 5
    
    const defaultColors = ['#d73027', '#fc8d59', '#fee08b', '#91bfdb', '#4575b4']
    
    const newClassifications: ClassificationRange[] = []
    for (let i = 0; i < 5; i++) {
      const min = stats.min + (classSize * i)
      const max = i === 4 ? stats.max : stats.min + (classSize * (i + 1))
      
      newClassifications.push({
        id: crypto.randomUUID(),
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        color: defaultColors[i],
        label: `Class ${i + 1}`
      })
    }
    
    setClassifications(newClassifications)
  }

  const updateClassification = (id: string, field: keyof ClassificationRange, value: any) => {
    setClassifications(prev => 
      prev.map(cls => 
        cls.id === id ? { ...cls, [field]: value } : cls
      )
    )
  }

  const validateClassifications = () => {
    if (!rasterStats) return false
    
    // Check that first class starts with min and last ends with max
    const sortedClasses = [...classifications].sort((a, b) => a.min - b.min)
    
    if (sortedClasses[0].min !== rasterStats.min) {
      toast.error('First class must start with the minimum value')
      return false
    }
    
    if (sortedClasses[sortedClasses.length - 1].max !== rasterStats.max) {
      toast.error('Last class must end with the maximum value')
      return false
    }
    
    // Check for gaps or overlaps
    for (let i = 0; i < sortedClasses.length - 1; i++) {
      if (sortedClasses[i].max !== sortedClasses[i + 1].min) {
        toast.error('Classes must be continuous with no gaps or overlaps')
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
                          disabled={index === 0} // First min is fixed to raster min
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
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cls.color}
                            onChange={(e) => updateClassification(cls.id, 'color', e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={cls.color}
                            onChange={(e) => updateClassification(cls.id, 'color', e.target.value)}
                            placeholder="#000000"
                            className="font-mono text-sm"
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
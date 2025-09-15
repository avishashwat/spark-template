import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, TrendUp, Palette } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SimpleRasterConfigProps {
  file: File
  onSave: (config: any) => void
  onCancel: () => void
}

interface ClassificationClass {
  min: number
  max: number
  color: string
  label: string
}

export function SimpleRasterConfig({ file, onSave, onCancel }: SimpleRasterConfigProps) {
  const [rasterStats, setRasterStats] = useState<{ min: number; max: number; mean: number } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [classes, setClasses] = useState<ClassificationClass[]>([
    { min: 0, max: 20, color: '#0571b0', label: 'Very Low' },
    { min: 20, max: 40, color: '#92c5de', label: 'Low' },
    { min: 40, max: 60, color: '#f7f7f7', label: 'Medium' },
    { min: 60, max: 80, color: '#f4a582', label: 'High' },
    { min: 80, max: 100, color: '#ca0020', label: 'Very High' }
  ])
  const [previousConfigs, setPreviousConfigs] = useState<any[]>([])

  useEffect(() => {
    analyzeRaster()
    loadPreviousConfigs()
  }, [])

  const analyzeRaster = async () => {
    try {
      setIsAnalyzing(true)
      
      // Simulate raster analysis - in production this would use actual file processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Generate mock statistics based on file name patterns
      const fileName = file.name.toLowerCase()
      let stats = { min: 0, max: 100, mean: 50 }
      
      if (fileName.includes('temp') || fileName.includes('temperature')) {
        stats = { min: -10, max: 45, mean: 18.5 }
      } else if (fileName.includes('precip') || fileName.includes('rainfall')) {
        stats = { min: 0, max: 2500, mean: 800 }
      } else if (fileName.includes('flood')) {
        stats = { min: 0, max: 1, mean: 0.15 }
      } else if (fileName.includes('drought')) {
        stats = { min: 0, max: 1, mean: 0.25 }
      }
      
      setRasterStats(stats)
      
      // Update class ranges based on statistics
      updateClassesFromStats(stats)
      
    } catch (error) {
      console.error('Failed to analyze raster:', error)
      toast.error('Failed to analyze raster file')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateClassesFromStats = (stats: { min: number; max: number; mean: number }) => {
    const range = stats.max - stats.min
    const classWidth = range / 5
    
    const newClasses = classes.map((cls, index) => ({
      ...cls,
      min: parseFloat((stats.min + (classWidth * index)).toFixed(2)),
      max: parseFloat((stats.min + (classWidth * (index + 1))).toFixed(2))
    }))
    
    setClasses(newClasses)
  }

  const loadPreviousConfigs = async () => {
    try {
      const configs = await window.spark.kv.get<any[]>('admin_raster_configs') || []
      setPreviousConfigs(configs.slice(-5)) // Last 5 configurations
    } catch (error) {
      console.error('Failed to load previous configs:', error)
    }
  }

  const applyPreviousConfig = (config: any) => {
    if (config.classes) {
      setClasses(config.classes)
      toast.success('Previous configuration applied')
    }
  }

  const handleClassChange = (index: number, field: string, value: any) => {
    const newClasses = [...classes]
    newClasses[index] = { ...newClasses[index], [field]: value }
    setClasses(newClasses)
  }

  const handleSave = async () => {
    if (!rasterStats) {
      toast.error('Raster analysis not complete')
      return
    }

    const config = {
      rasterStats,
      classification: {
        classes,
        type: 'raster'
      }
    }

    try {
      // Save this configuration for future reference
      const savedConfigs = await window.spark.kv.get<any[]>('admin_raster_configs') || []
      const newConfig = {
        id: Date.now().toString(),
        fileName: file.name,
        config,
        createdAt: new Date().toISOString()
      }
      savedConfigs.push(newConfig)
      await window.spark.kv.set('admin_raster_configs', savedConfigs)
      
      onSave(config)
    } catch (error) {
      console.error('Failed to save configuration:', error)
      toast.error('Failed to save configuration')
    }
  }

  const validateClasses = () => {
    if (!rasterStats) return false
    
    // Check that first class starts with min and last class ends with max
    const firstClass = classes[0]
    const lastClass = classes[classes.length - 1]
    
    return firstClass.min >= rasterStats.min && lastClass.max <= rasterStats.max
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendUp size={20} />
            Configure Raster Classification
          </DialogTitle>
          <DialogDescription>
            Set up data classification and color scheme for {file.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Analysis Status */}
          {isAnalyzing ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Analyzing raster file...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Raster Statistics */}
              {rasterStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Raster Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Minimum</div>
                        <div className="text-lg font-semibold">{rasterStats.min}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Maximum</div>
                        <div className="text-lg font-semibold">{rasterStats.max}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Mean</div>
                        <div className="text-lg font-semibold">{rasterStats.mean.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Previous Configurations */}
              {previousConfigs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Use Previous Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {previousConfigs.map((config) => (
                        <Button
                          key={config.id}
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreviousConfig(config.config)}
                        >
                          {config.fileName.split('_')[2] || 'Config'}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Classification Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette size={16} />
                    Classification Classes
                  </CardTitle>
                  <CardDescription>
                    Define value ranges and colors for data visualization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {classes.map((cls, index) => (
                    <div key={index} className="grid grid-cols-5 gap-3 items-center p-3 border rounded-lg">
                      <div className="space-y-1">
                        <Label className="text-xs">Min Value</Label>
                        <Input
                          type="number"
                          value={cls.min}
                          onChange={(e) => handleClassChange(index, 'min', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          step="0.01"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Value</Label>
                        <Input
                          type="number"
                          value={cls.max}
                          onChange={(e) => handleClassChange(index, 'max', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          step="0.01"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={cls.color}
                            onChange={(e) => handleClassChange(index, 'color', e.target.value)}
                            className="h-8 w-12 p-1"
                          />
                          <Input
                            type="text"
                            value={cls.color}
                            onChange={(e) => handleClassChange(index, 'color', e.target.value)}
                            className="h-8 text-xs font-mono flex-1"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={cls.label}
                          onChange={(e) => handleClassChange(index, 'label', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Class label"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Preview</Label>
                        <div 
                          className="h-8 rounded border"
                          style={{ backgroundColor: cls.color }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Validation Warning */}
              {rasterStats && !validateClasses() && (
                <Card className="border-warning">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-warning">
                      <X size={16} />
                      <span className="text-sm">
                        Warning: Class ranges should cover the full data range ({rasterStats.min} to {rasterStats.max})
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isAnalyzing || !rasterStats}
          >
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
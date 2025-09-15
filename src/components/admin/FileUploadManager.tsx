import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Upload, File, Image, Trash, Eye, Pencil, Check, X, Thermometer, Drop, Flashlight, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { SimpleRasterConfig } from './SimpleRasterConfig'
import { SimpleShapefileConfig } from './SimpleShapefileConfig'

interface FileUploadManagerProps {
  onStatsUpdate: () => void
}

interface UploadedFile {
  id: string
  name: string
  type: 'raster' | 'shapefile' | 'boundary' | 'icon'
  category?: string
  subcategory?: string
  scenario?: string
  yearRange?: string
  seasonality?: string
  season?: string
  country: string
  uploadDate: string
  size: string
  status: 'active' | 'inactive'
  classification?: any
  config?: any
  rasterStats?: {
    min: number
    max: number
    mean: number
  }
}

interface LayerStructure {
  id: string
  label: string
  icon: any
  color: string
  subcategories?: string[]
  hasScenarios?: boolean
  scenarios?: string[]
  hasYearRanges?: boolean
  yearRanges?: string[]
  hasSeasonality?: boolean
  seasonality?: string[]
  seasons?: string[]
}

export function FileUploadManager({ onStatsUpdate }: FileUploadManagerProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [showSelectionPanel, setShowSelectionPanel] = useState(false)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingConfig, setEditingConfig] = useState<any>(null)

  // Layer Selection State
  const [selectedLayer, setSelectedLayer] = useState<LayerStructure | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [selectedScenario, setSelectedScenario] = useState('')
  const [selectedYearRange, setSelectedYearRange] = useState('')
  const [selectedSeasonality, setSelectedSeasonality] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [showRasterConfig, setShowRasterConfig] = useState(false)
  const [showShapefileConfig, setShowShapefileConfig] = useState(false)

  const countries = ['bhutan', 'mongolia', 'laos']

  // Layer structure matching the sidebar
  const layerStructure: LayerStructure[] = [
    {
      id: 'climate',
      label: 'Climate Variables',
      icon: Thermometer,
      color: 'text-orange-600',
      subcategories: [
        'Maximum Temperature',
        'Minimum Temperature', 
        'Mean Temperature',
        'Precipitation',
        'Solar Radiation',
        'Cooling Degree Days',
        'Heating Degree Days'
      ],
      hasScenarios: true,
      scenarios: ['Historical', 'SSP1', 'SSP2', 'SSP3', 'SSP5'],
      hasYearRanges: true,
      yearRanges: ['2021-2040', '2041-2060', '2061-2080', '2081-2100'],
      hasSeasonality: true,
      seasonality: ['Annual', 'Seasonal'],
      seasons: ['January - March', 'April - June', 'July - September', 'October - December']
    },
    {
      id: 'giri',
      label: 'GIRI Hazards',
      icon: Drop,
      color: 'text-blue-600',
      subcategories: ['Flood', 'Drought'],
      hasScenarios: true,
      scenarios: ['Existing', 'SSP1', 'SSP5']
    },
    {
      id: 'energy',
      label: 'Energy Infrastructure',
      icon: Flashlight,
      color: 'text-yellow-600',
      subcategories: ['Hydro Power Plants', 'Solar Power Plants', 'Wind Power Plants']
    }
  ]

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const storedFiles = await window.spark.kv.get<UploadedFile[]>('admin_uploaded_files') || []
      setFiles(storedFiles)
    } catch (error) {
      console.error('Failed to load files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const saveFiles = async (updatedFiles: UploadedFile[]) => {
    try {
      await window.spark.kv.set('admin_uploaded_files', updatedFiles)
      setFiles(updatedFiles)
      onStatsUpdate()
    } catch (error) {
      console.error('Failed to save files:', error)
      toast.error('Failed to save files')
    }
  }

  const resetLayerSelection = () => {
    setSelectedLayer(null)
    setSelectedSubcategory('')
    setSelectedScenario('')
    setSelectedYearRange('')
    setSelectedSeasonality('')
    setSelectedSeason('')
  }

  const handleLayerSelect = (layer: LayerStructure) => {
    setSelectedLayer(layer)
    setShowSelectionPanel(true)
    // Reset other selections
    setSelectedSubcategory('')
    setSelectedScenario('')
    setSelectedYearRange('')
    setSelectedSeasonality('')
    setSelectedSeason('')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedLayer || !selectedSubcategory) {
      toast.error('Please select layer type and variable first')
      return
    }

    setUploadedFile(file)
    
    // Determine file type based on layer and file extension
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isRaster = fileExtension === 'tif' || fileExtension === 'tiff'
    const isShapefile = fileExtension === 'shp'
    
    if (selectedLayer.id === 'energy' && isShapefile) {
      setShowShapefileConfig(true)
    } else if ((selectedLayer.id === 'climate' || selectedLayer.id === 'giri') && isRaster) {
      setShowRasterConfig(true)
    } else {
      toast.error('Invalid file type for selected layer')
      setUploadedFile(null)
    }
  }

  const processFileUpload = async (file: File, config?: any) => {
    if (!selectedCountry || !selectedLayer || !selectedSubcategory) {
      toast.error('Please complete all selections')
      return
    }

    try {
      setLoading(true)

      // Generate filename based on naming convention
      const filename = generateFilename(file, selectedLayer, selectedSubcategory, selectedScenario, selectedYearRange, selectedSeasonality, selectedSeason, selectedCountry)
      
      const fileExtension = file.name.toLowerCase().split('.').pop()
      const fileType = fileExtension === 'tif' || fileExtension === 'tiff' ? 'raster' : 'shapefile'

      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: filename,
        type: fileType,
        category: selectedLayer.id,
        subcategory: selectedSubcategory,
        scenario: selectedScenario,
        yearRange: selectedYearRange,
        seasonality: selectedSeasonality,
        season: selectedSeason,
        country: selectedCountry,
        uploadDate: new Date().toISOString(),
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        status: 'active',
        classification: config?.classification,
        config: config,
        rasterStats: config?.rasterStats
      }

      const updatedFiles = [...files, newFile]
      await saveFiles(updatedFiles)

      // Reset form
      setUploadedFile(null)
      resetLayerSelection()
      setShowSelectionPanel(false)
      setShowRasterConfig(false)
      setShowShapefileConfig(false)
      
      toast.success(`File uploaded successfully as ${filename}`)
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const generateFilename = (
    file: File, 
    layer: LayerStructure, 
    subcategory: string, 
    scenario?: string, 
    yearRange?: string, 
    seasonality?: string, 
    season?: string, 
    country?: string
  ) => {
    const extension = file.name.split('.').pop()
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
    
    let filename = `${country}_${layer.id}`
    
    // Add subcategory (variable)
    const safeSub = subcategory.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    filename += `_${safeSub}`
    
    // Add scenario if present
    if (scenario) {
      filename += `_${scenario.toLowerCase()}`
    }
    
    // Add year range if present
    if (yearRange) {
      filename += `_${yearRange.replace('-', '_')}`
    }
    
    // Add seasonality info
    if (seasonality === 'Seasonal' && season) {
      const seasonMap: { [key: string]: string } = {
        'January - March': 'jan_mar',
        'April - June': 'apr_jun',
        'July - September': 'jul_sep',
        'October - December': 'oct_dec'
      }
      filename += `_${seasonMap[season] || 'seasonal'}`
    } else if (seasonality === 'Annual') {
      filename += '_annual'
    }
    
    filename += `_${timestamp}.${extension}`
    
    return filename
  }

  const deleteFile = async (fileId: string) => {
    try {
      const updatedFiles = files.filter(f => f.id !== fileId)
      await saveFiles(updatedFiles)
      toast.success('File deleted successfully')
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Delete failed')
    }
  }

  const toggleFileStatus = async (fileId: string) => {
    try {
      const updatedFiles = files.map(f => 
        f.id === fileId 
          ? { ...f, status: f.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' }
          : f
      )
      await saveFiles(updatedFiles)
      toast.success('File status updated')
    } catch (error) {
      console.error('Update failed:', error)
      toast.error('Update failed')
    }
  }

  const startEditFile = (file: UploadedFile) => {
    setEditingFile(file.id)
    setEditingConfig({...file})
    setShowEditDialog(true)
  }

  const saveEditedFile = async () => {
    if (!editingConfig || !editingFile) return

    try {
      const updatedFiles = files.map(f => 
        f.id === editingFile ? editingConfig : f
      )
      await saveFiles(updatedFiles)
      setShowEditDialog(false)
      setEditingFile(null)
      setEditingConfig(null)
      toast.success('File updated successfully')
    } catch (error) {
      console.error('Update failed:', error)
      toast.error('Update failed')
    }
  }

  const canProceedWithUpload = () => {
    if (!selectedCountry || !selectedLayer || !selectedSubcategory) return false
    
    // Check scenario requirements
    if (selectedLayer.hasScenarios && !selectedScenario) return false
    
    // Check year range requirements (only for non-Historical scenarios)
    if (selectedLayer.hasYearRanges && selectedScenario && selectedScenario !== 'Historical' && !selectedYearRange) return false
    
    // Check seasonality requirements
    if (selectedLayer.hasSeasonality && !selectedSeasonality) return false
    
    // Check season requirements (only for Seasonal)
    if (selectedSeasonality === 'Seasonal' && !selectedSeason) return false
    
    return true
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">File Upload Manager</h2>
        <p className="text-sm text-muted-foreground">
          Upload and manage data files using the same layer structure as the main application
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="manage">Manage Files</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload size={20} />
                Upload New File
              </CardTitle>
              <CardDescription>
                Select layer type from the same menu structure as the sidebar, then upload your file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Country Selection */}
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>
                        {country.charAt(0).toUpperCase() + country.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Layer Selection (Same as Sidebar) */}
              <div className="space-y-3">
                <Label>Data Layer Type</Label>
                <div className="grid gap-2">
                  {layerStructure.map((layer) => {
                    const Icon = layer.icon
                    return (
                      <button
                        key={layer.id}
                        className={`flex items-center justify-start w-full h-10 text-sm px-3 border-2 rounded-md transition-all duration-200 hover:bg-primary/5 hover:border-primary/50 ${
                          selectedLayer?.id === layer.id ? 'bg-primary/15 border-primary text-primary font-medium' : 'bg-white border-border text-foreground'
                        }`}
                        onClick={() => handleLayerSelect(layer)}
                      >
                        <Icon className={`w-4 h-4 mr-3 ${selectedLayer?.id === layer.id ? 'text-primary' : layer.color}`} />
                        {layer.label}
                        {selectedLayer?.id === layer.id && (
                          <Badge variant="secondary" className="ml-auto text-xs h-5 px-2">
                            Selected
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Layer Configuration Panel */}
              {selectedLayer && showSelectionPanel && (
                <div className="space-y-3 border-2 rounded-lg p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/40 shadow-md">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                      <selectedLayer.icon className="w-4 h-4" />
                      Configure {selectedLayer.label}
                    </h4>
                    <button
                      className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
                      onClick={() => {
                        setShowSelectionPanel(false)
                        resetLayerSelection()
                      }}
                      title="Close selection panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Variable/Type Selection */}
                  <div className="space-y-2">
                    <Label>Variable/Type</Label>
                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select variable/type" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedLayer.subcategories?.map(sub => (
                          <SelectItem key={sub} value={sub} className="text-sm">
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scenario Selection */}
                  {selectedLayer.hasScenarios && selectedSubcategory && (
                    <div className="space-y-2">
                      <Label>Scenario</Label>
                      <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select scenario" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLayer.scenarios?.map(scenario => (
                            <SelectItem key={scenario} value={scenario} className="text-sm">
                              {scenario}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Year Range Selection */}
                  {selectedLayer.hasYearRanges && selectedScenario && selectedScenario !== 'Historical' && (
                    <div className="space-y-2">
                      <Label>Year Range</Label>
                      <Select value={selectedYearRange} onValueChange={setSelectedYearRange}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select year range" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLayer.yearRanges?.map(range => (
                            <SelectItem key={range} value={range} className="text-sm">
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Seasonality Selection */}
                  {selectedLayer.hasSeasonality && selectedScenario && (selectedScenario === 'Historical' || selectedYearRange) && (
                    <div className="space-y-2">
                      <Label>Seasonality</Label>
                      <Select value={selectedSeasonality} onValueChange={setSelectedSeasonality}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select seasonality" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLayer.seasonality?.map(seasonality => (
                            <SelectItem key={seasonality} value={seasonality} className="text-sm">
                              {seasonality}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Season Selection */}
                  {selectedSeasonality === 'Seasonal' && (
                    <div className="space-y-2">
                      <Label>Season</Label>
                      <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLayer.seasons?.map(season => (
                            <SelectItem key={season} value={season} className="text-sm">
                              {season}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload */}
              {canProceedWithUpload() && (
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    accept={selectedLayer?.id === 'energy' ? '.shp' : '.tif,.tiff'}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedLayer?.id === 'energy' && 'Accepted formats: .shp (shapefile with associated files)'}
                    {(selectedLayer?.id === 'climate' || selectedLayer?.id === 'giri') && 'Accepted formats: .tif, .tiff (raster files)'}
                  </p>
                </div>
              )}

              {uploadedFile && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <File size={16} />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                    <Badge variant="secondary">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  {!showRasterConfig && !showShapefileConfig && (
                    <Button 
                      className="mt-2 w-full" 
                      onClick={() => processFileUpload(uploadedFile)}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Complete Upload'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File size={20} />
                Uploaded Files ({files.length})
              </CardTitle>
              <CardDescription>
                Manage, edit, and organize your uploaded data files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <File size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{file.name}</span>
                          <Badge variant={file.status === 'active' ? 'default' : 'secondary'}>
                            {file.status}
                          </Badge>
                          <Badge variant="outline">{file.type}</Badge>
                          {file.category && (
                            <Badge variant="outline">{file.category}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {file.country.charAt(0).toUpperCase() + file.country.slice(1)} • {file.size} • {new Date(file.uploadDate).toLocaleDateString()}
                          {file.subcategory && ` • ${file.subcategory}`}
                          {file.scenario && ` • ${file.scenario}`}
                        </div>
                        {file.rasterStats && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Min: {file.rasterStats.min.toFixed(2)} • Max: {file.rasterStats.max.toFixed(2)} • Mean: {file.rasterStats.mean.toFixed(2)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditFile(file)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFileStatus(file.id)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFile(file.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit File Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit File Configuration</DialogTitle>
            <DialogDescription>
              Modify the file settings and classification
            </DialogDescription>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>File Name</Label>
                  <Input
                    value={editingConfig.name}
                    onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingConfig.status}
                    onValueChange={(value) => setEditingConfig({...editingConfig, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {editingConfig.classification && (
                <div className="space-y-2">
                  <Label>Classification</Label>
                  <div className="text-sm text-muted-foreground">
                    {editingConfig.classification.classes?.length || 0} classes configured
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEditedFile}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raster Configuration Modal */}
      {showRasterConfig && uploadedFile && (
        <SimpleRasterConfig
          file={uploadedFile}
          onSave={(config) => {
            processFileUpload(uploadedFile, config)
          }}
          onCancel={() => {
            setShowRasterConfig(false)
            setUploadedFile(null)
          }}
        />
      )}

      {/* Shapefile Configuration Modal */}
      {showShapefileConfig && uploadedFile && (
        <SimpleShapefileConfig
          file={uploadedFile}
          onSave={(config) => {
            processFileUpload(uploadedFile, config)
          }}
          onCancel={() => {
            setShowShapefileConfig(false)
            setUploadedFile(null)
          }}
        />
      )}
    </div>
  )
}
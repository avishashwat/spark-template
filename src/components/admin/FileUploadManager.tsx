import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UploadSimple, File, Trash, Eye, Download } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  name: string
  type: 'raster' | 'shapefile' | 'icon'
  fileType: string
  size: number
  layerId: string
  layerName: string
  country: string
  classification?: {
    classes: Array<{
      min: number
      max: number
      color: string
      label: string
    }>
    designCapacityAttribute?: string
    iconUrl?: string
  }
  metadata?: {
    min?: number
    max?: number
    mean?: number
    attributes?: string[]
  }
  uploadedAt: number
  filePath: string
}

interface FileUploadManagerProps {
  onStatsUpdate: () => void
}

export function FileUploadManager({ onStatsUpdate }: FileUploadManagerProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedLayer, setSelectedLayer] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [fileType, setFileType] = useState<'raster' | 'shapefile' | 'icon'>('raster')
  const [layers, setLayers] = useState<any[]>([])
  const [showClassification, setShowClassification] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [rasterMetadata, setRasterMetadata] = useState<{ min: number; max: number; mean: number } | null>(null)
  const [shapefileAttributes, setShapefileAttributes] = useState<string[]>([])
  const [classification, setClassification] = useState({
    classes: [
      { min: 0, max: 20, color: '#0571b0', label: 'Very Low' },
      { min: 20, max: 40, color: '#92c5de', label: 'Low' },
      { min: 40, max: 60, color: '#f7f7f7', label: 'Medium' },
      { min: 60, max: 80, color: '#f4a582', label: 'High' },
      { min: 80, max: 100, color: '#ca0020', label: 'Very High' }
    ],
    designCapacityAttribute: '',
    iconUrl: ''
  })
  const [previousClassifications, setPreviousClassifications] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const countries = [
    { value: 'bhutan', label: 'Bhutan' },
    { value: 'mongolia', label: 'Mongolia' },
    { value: 'laos', label: 'Laos' }
  ]

  useEffect(() => {
    loadUploadedFiles()
    loadDataLayers()
    loadPreviousClassifications()
  }, [])

  const loadUploadedFiles = async () => {
    try {
      const files = await window.spark.kv.get<UploadedFile[]>('admin_uploaded_files') || []
      setUploadedFiles(files)
    } catch (error) {
      console.error('Failed to load uploaded files:', error)
    }
  }

  const loadDataLayers = async () => {
    try {
      const dataLayers = await window.spark.kv.get<any[]>('admin_data_layers') || []
      setLayers(dataLayers)
    } catch (error) {
      console.error('Failed to load data layers:', error)
    }
  }

  const loadPreviousClassifications = async () => {
    try {
      const classifications = await window.spark.kv.get<any[]>('admin_classifications') || []
      setPreviousClassifications(classifications)
    } catch (error) {
      console.error('Failed to load previous classifications:', error)
    }
  }

  // Simulate file analysis for raster files
  const analyzeRasterFile = async (file: File) => {
    // In a real implementation, this would process the actual raster file
    // For demo purposes, we'll generate mock metadata
    return new Promise<{ min: number; max: number; mean: number }>((resolve) => {
      setTimeout(() => {
        const min = Math.random() * 10
        const max = min + (Math.random() * 90) + 10
        const mean = min + (max - min) * 0.5
        resolve({ min: parseFloat(min.toFixed(2)), max: parseFloat(max.toFixed(2)), mean: parseFloat(mean.toFixed(2)) })
      }, 1000)
    })
  }

  // Simulate shapefile attribute extraction
  const analyzeShapefileAttributes = async (file: File) => {
    // In a real implementation, this would extract attributes from the shapefile
    // For demo purposes, we'll generate mock attributes
    return new Promise<string[]>((resolve) => {
      setTimeout(() => {
        const commonAttributes = ['designCapacity', 'powerOutput', 'capacity_MW', 'installed_capacity', 'name', 'type', 'status']
        const randomAttributes = commonAttributes.slice(0, 3 + Math.floor(Math.random() * 4))
        resolve(randomAttributes)
      }, 800)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedLayer || !selectedCountry) {
      toast.error('Please select a data layer and country first')
      return
    }

    setCurrentFile(file)
    setIsUploading(true)
    setUploadProgress(10)

    try {
      if (fileType === 'raster' && (file.name.endsWith('.tif') || file.name.endsWith('.cog'))) {
        setUploadProgress(30)
        const metadata = await analyzeRasterFile(file)
        setRasterMetadata(metadata)
        
        // Update classification min/max based on raster data
        setClassification(prev => ({
          ...prev,
          classes: prev.classes.map((cls, index) => {
            const range = (metadata.max - metadata.min) / 5
            return {
              ...cls,
              min: parseFloat((metadata.min + (range * index)).toFixed(2)),
              max: parseFloat((metadata.min + (range * (index + 1))).toFixed(2))
            }
          })
        }))
        setUploadProgress(60)
        setShowClassification(true)
      } else if (fileType === 'shapefile' && file.name.endsWith('.zip')) {
        setUploadProgress(30)
        const attributes = await analyzeShapefileAttributes(file)
        setShapefileAttributes(attributes)
        setUploadProgress(60)
        setShowClassification(true)
      } else if (fileType === 'icon' && (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.svg'))) {
        setUploadProgress(60)
        setShowClassification(true)
      } else {
        throw new Error('Invalid file type for selected category')
      }
      
      setUploadProgress(80)
      toast.success('File analyzed successfully')
    } catch (error) {
      console.error('File analysis error:', error)
      toast.error('Failed to analyze file')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleUploadComplete = async () => {
    if (!currentFile) return

    try {
      setUploadProgress(90)

      const selectedLayerData = layers.find(l => l.id === selectedLayer)
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}_${currentFile.name}`,
        name: currentFile.name,
        type: fileType,
        fileType: currentFile.type,
        size: currentFile.size,
        layerId: selectedLayer,
        layerName: selectedLayerData?.name || 'Unknown',
        country: selectedCountry,
        classification: { ...classification },
        metadata: fileType === 'raster' ? rasterMetadata! : { attributes: shapefileAttributes },
        uploadedAt: Date.now(),
        filePath: `/uploads/${selectedCountry}/${selectedLayer}/${currentFile.name}`
      }

      // Save the uploaded file record
      const updatedFiles = [...uploadedFiles, uploadedFile]
      await window.spark.kv.set('admin_uploaded_files', updatedFiles)
      
      // Save classification for future reference
      const classificationRecord = {
        id: `class_${Date.now()}`,
        type: fileType,
        layerId: selectedLayer,
        classification: { ...classification },
        createdAt: Date.now()
      }
      const updatedClassifications = [...previousClassifications, classificationRecord]
      await window.spark.kv.set('admin_classifications', updatedClassifications)

      setUploadedFiles(updatedFiles)
      setPreviousClassifications(updatedClassifications)
      setUploadProgress(100)
      
      // Reset form
      setTimeout(() => {
        setCurrentFile(null)
        setShowClassification(false)
        setRasterMetadata(null)
        setShapefileAttributes([])
        setIsUploading(false)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 1000)

      onStatsUpdate()
      toast.success('File uploaded successfully')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const updatedFiles = uploadedFiles.filter(f => f.id !== fileId)
      await window.spark.kv.set('admin_uploaded_files', updatedFiles)
      setUploadedFiles(updatedFiles)
      onStatsUpdate()
      toast.success('File deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete file')
    }
  }

  const applyPreviousClassification = (classificationData: any) => {
    setClassification(classificationData.classification)
    toast.success('Previous classification applied')
  }

  const renderFileCard = (file: UploadedFile) => (
    <Card key={file.id} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-muted rounded-lg">
              <File size={20} />
            </div>
            <div>
              <CardTitle className="text-sm">{file.name}</CardTitle>
              <CardDescription className="text-xs">
                {file.layerName} • {file.country} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Badge variant={file.type === 'raster' ? 'default' : file.type === 'shapefile' ? 'secondary' : 'outline'} className="text-xs">
              {file.type}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(file.id)}>
              <Trash size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</div>
          {file.metadata?.min !== undefined && (
            <div>Range: {file.metadata.min} - {file.metadata.max}</div>
          )}
          {file.classification?.designCapacityAttribute && (
            <div>Capacity Attr: {file.classification.designCapacityAttribute}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">File Upload Manager</h2>
        <p className="text-muted-foreground">Upload and manage raster files, shapefiles, and icons</p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New File</CardTitle>
          <CardDescription>Select a data layer and upload the corresponding file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="file-type">File Type</Label>
              <Select value={fileType} onValueChange={(value) => setFileType(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raster">Raster (.tif/.cog)</SelectItem>
                  <SelectItem value="shapefile">Shapefile (.zip)</SelectItem>
                  <SelectItem value="icon">Icon (.png/.jpg/.svg)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="layer">Data Layer</Label>
              <Select value={selectedLayer} onValueChange={setSelectedLayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers
                    .filter(layer => 
                      (fileType === 'raster' && (layer.type === 'climate' || layer.type === 'giri')) ||
                      (fileType === 'shapefile' && layer.type === 'energy') ||
                      (fileType === 'icon' && layer.type === 'energy')
                    )
                    .map(layer => (
                      <SelectItem key={layer.id} value={layer.id}>
                        {layer.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <div className="flex items-center space-x-4">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept={
                  fileType === 'raster' ? '.tif,.cog' :
                  fileType === 'shapefile' ? '.zip' :
                  '.png,.jpg,.jpeg,.svg'
                }
                disabled={isUploading || !selectedLayer || !selectedCountry}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {isUploading && <Progress value={uploadProgress} className="w-32" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification Panel */}
      {showClassification && currentFile && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Configure Classification</CardTitle>
            <CardDescription>
              Set up data classification and styling for {currentFile.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Previous Classifications */}
            {previousClassifications.length > 0 && (
              <div className="space-y-2">
                <Label>Use Previous Classification</Label>
                <div className="flex flex-wrap gap-2">
                  {previousClassifications
                    .filter(c => c.type === fileType)
                    .slice(-5)
                    .map(classification => (
                      <Button
                        key={classification.id}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreviousClassification(classification)}
                      >
                        {layers.find(l => l.id === classification.layerId)?.name || 'Unknown'}
                      </Button>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Raster Metadata */}
            {fileType === 'raster' && rasterMetadata && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Min Value</div>
                  <div className="text-lg font-semibold">{rasterMetadata.min}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Max Value</div>
                  <div className="text-lg font-semibold">{rasterMetadata.max}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Mean Value</div>
                  <div className="text-lg font-semibold">{rasterMetadata.mean}</div>
                </div>
              </div>
            )}

            {/* Classification Classes for Raster */}
            {fileType === 'raster' && (
              <div className="space-y-3">
                <Label>Classification Classes</Label>
                {classification.classes.map((cls, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 items-center p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={cls.min}
                        onChange={(e) => {
                          const newClasses = [...classification.classes]
                          newClasses[index].min = parseFloat(e.target.value) || 0
                          setClassification(prev => ({ ...prev, classes: newClasses }))
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={cls.max}
                        onChange={(e) => {
                          const newClasses = [...classification.classes]
                          newClasses[index].max = parseFloat(e.target.value) || 0
                          setClassification(prev => ({ ...prev, classes: newClasses }))
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input
                        type="color"
                        value={cls.color}
                        onChange={(e) => {
                          const newClasses = [...classification.classes]
                          newClasses[index].color = e.target.value
                          setClassification(prev => ({ ...prev, classes: newClasses }))
                        }}
                        className="h-8 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={cls.label}
                        onChange={(e) => {
                          const newClasses = [...classification.classes]
                          newClasses[index].label = e.target.value
                          setClassification(prev => ({ ...prev, classes: newClasses }))
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shapefile Configuration */}
            {fileType === 'shapefile' && shapefileAttributes.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Design Capacity Attribute</Label>
                  <Select 
                    value={classification.designCapacityAttribute} 
                    onValueChange={(value) => setClassification(prev => ({ ...prev, designCapacityAttribute: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select attribute for point sizing" />
                    </SelectTrigger>
                    <SelectContent>
                      {shapefileAttributes.map(attr => (
                        <SelectItem key={attr} value={attr}>{attr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Icon Configuration */}
            {fileType === 'icon' && (
              <div className="space-y-2">
                <Label>Icon Preview</Label>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Icon will be processed and made available for point shapefile styling
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowClassification(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadComplete} disabled={isUploading}>
                <UploadSimple size={16} className="mr-2" />
                Complete Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Uploaded Files ({uploadedFiles.length})</h3>
        {uploadedFiles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No files uploaded yet. Upload your first file to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {uploadedFiles.map(renderFileCard)}
          </div>
        )}
      </div>
    </div>
  )
}
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UploadSimple, File, Trash, MapPin, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface BoundaryFile {
  id: string
  name: string
  country: string
  adminLevel: number
  size: number
  attributes: string[]
  hoverAttribute: string
  uploadedAt: number
  filePath: string
  geojsonData?: any // Store the actual GeoJSON data
  metadata?: {
    featureCount: number
    bounds: [number, number, number, number] // [minX, minY, maxX, maxY]
    projection: string
  }
}

interface BoundaryManagerProps {
  onStatsUpdate: () => void
}

export function BoundaryManager({ onStatsUpdate }: BoundaryManagerProps) {
  const [boundaryFiles, setBoundaryFiles] = useState<BoundaryFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [adminLevel, setAdminLevel] = useState(1)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [shapefileAttributes, setShapefileAttributes] = useState<string[]>([])
  const [hoverAttribute, setHoverAttribute] = useState('')
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [fileMetadata, setFileMetadata] = useState<any>(null)
  const [currentGeojsonData, setCurrentGeojsonData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const countries = [
    { value: 'bhutan', label: 'Bhutan' },
    { value: 'mongolia', label: 'Mongolia' },
    { value: 'laos', label: 'Laos' }
  ]

  const adminLevels = [
    { value: 0, label: 'Country Level (ADM0)' },
    { value: 1, label: 'Province/State Level (ADM1)' },
    { value: 2, label: 'District Level (ADM2)' },
    { value: 3, label: 'Sub-district Level (ADM3)' }
  ]

  useEffect(() => {
    loadBoundaryFiles()
  }, [])

  const loadBoundaryFiles = async () => {
    try {
      const files = await window.spark.kv.get<BoundaryFile[]>('admin_boundary_files') || []
      setBoundaryFiles(files)
    } catch (error) {
      console.error('Failed to load boundary files:', error)
    }
  }

  // Analyze shapefile from zip file
  const analyzeShapefileForBoundary = async (file: File) => {
    return new Promise<{ attributes: string[]; metadata: any; geojsonData: any }>((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async function(e) {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          
          // Use JSZip to extract the zip file
          const JSZip = await import('jszip').then(m => m.default)
          const zip = new JSZip()
          const contents = await zip.loadAsync(arrayBuffer)
          
          // Find .shp, .dbf, .shx files
          let shpFile, dbfFile, shxFile
          
          for (const [filename, zipFile] of Object.entries(contents.files)) {
            if (filename.endsWith('.shp')) {
              shpFile = await zipFile.async('arraybuffer')
            } else if (filename.endsWith('.dbf')) {
              dbfFile = await zipFile.async('arraybuffer')
            } else if (filename.endsWith('.shx')) {
              shxFile = await zipFile.async('arraybuffer')
            }
          }
          
          if (!shpFile || !dbfFile) {
            throw new Error('Invalid shapefile: missing .shp or .dbf files')
          }
          
          // Use shpjs library to parse shapefile
          const shpjs = await import('shpjs').then(m => m.default)
          
          // Parse shapefile to GeoJSON
          const geojson = await shpjs.combine([
            shpjs.parseShp(shpFile),
            shpjs.parseDbf(dbfFile)
          ])
          
          console.log('Parsed GeoJSON:', geojson)
          
          if (!geojson || !geojson.features || geojson.features.length === 0) {
            throw new Error('No features found in shapefile')
          }
          
          // Extract attributes from first feature
          const firstFeature = geojson.features[0]
          const attributes = Object.keys(firstFeature.properties || {})
          
          console.log('First feature:', firstFeature)
          console.log('Attributes found:', attributes)
          
          // Calculate bounds
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          
          geojson.features.forEach((feature: any) => {
            if (feature.geometry && feature.geometry.coordinates) {
              const coords = feature.geometry.coordinates
              
              const processCoords = (coordArray: any) => {
                if (Array.isArray(coordArray[0])) {
                  coordArray.forEach(processCoords)
                } else {
                  const [x, y] = coordArray
                  minX = Math.min(minX, x)
                  maxX = Math.max(maxX, x)
                  minY = Math.min(minY, y)
                  maxY = Math.max(maxY, y)
                }
              }
              
              if (feature.geometry.type === 'Polygon') {
                coords.forEach(processCoords)
              } else if (feature.geometry.type === 'MultiPolygon') {
                coords.forEach((polygon: any) => polygon.forEach(processCoords))
              }
            }
          })
          
          const metadata = {
            featureCount: geojson.features.length,
            bounds: [minX, minY, maxX, maxY] as [number, number, number, number],
            projection: 'EPSG:4326'
          }
          
          resolve({ 
            attributes, 
            metadata,
            geojsonData: geojson
          })
          
        } catch (error) {
          console.error('Error analyzing shapefile:', error)
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedCountry) {
      toast.error('Please select a country first')
      return
    }

    if (!file.name.endsWith('.zip')) {
      toast.error('Please select a zipped shapefile (.zip)')
      return
    }

    setCurrentFile(file)
    setIsUploading(true)
    setUploadProgress(10)

    try {
      setUploadProgress(30)
      const analysis = await analyzeShapefileForBoundary(file)
      setShapefileAttributes(analysis.attributes)
      setFileMetadata(analysis.metadata)
      setCurrentGeojsonData(analysis.geojsonData)
      setUploadProgress(100) // Complete the analysis phase
      setShowConfiguration(true)
      
      // Reset upload state after showing configuration
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
      
      // Auto-select likely name attribute
      const nameAttribute = analysis.attributes.find(attr => 
        attr.toLowerCase().includes('name') || 
        attr.toLowerCase().includes('province') ||
        attr.toLowerCase().includes('district') ||
        attr.toLowerCase().includes('state')
      )
      if (nameAttribute) {
        setHoverAttribute(nameAttribute)
      }
      
      toast.success('Shapefile analyzed successfully')
    } catch (error) {
      console.error('Shapefile analysis error:', error)
      toast.error('Failed to analyze shapefile')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleUploadComplete = async () => {
    if (!currentFile || !hoverAttribute) {
      toast.error('Please select a hover attribute')
      return
    }

    try {
      setUploadProgress(90)

      const boundaryFile: BoundaryFile = {
        id: `boundary_${Date.now()}_${currentFile.name}`,
        name: currentFile.name,
        country: selectedCountry,
        adminLevel: adminLevel,
        size: currentFile.size,
        attributes: shapefileAttributes,
        hoverAttribute: hoverAttribute,
        uploadedAt: Date.now(),
        filePath: `/boundaries/${selectedCountry}/adm${adminLevel}/${currentFile.name}`,
        geojsonData: currentGeojsonData,
        metadata: fileMetadata
      }

      const updatedFiles = [...boundaryFiles, boundaryFile]
      await window.spark.kv.set('admin_boundary_files', updatedFiles)
      
      console.log('Saved boundary file:', boundaryFile)
      console.log('Total boundary files now:', updatedFiles.length)
      
      setBoundaryFiles(updatedFiles)
      setUploadProgress(100)
      
      onStatsUpdate()
      toast.success('Boundary file uploaded successfully')
      
      // Reset form immediately after successful save
      setCurrentFile(null)
      setShowConfiguration(false)
      setShapefileAttributes([])
      setHoverAttribute('')
      setFileMetadata(null)
      setCurrentGeojsonData(null)
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload boundary file')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const updatedFiles = boundaryFiles.filter(f => f.id !== fileId)
      await window.spark.kv.set('admin_boundary_files', updatedFiles)
      setBoundaryFiles(updatedFiles)
      onStatsUpdate()
      toast.success('Boundary file deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete boundary file')
    }
  }

  const renderBoundaryCard = (file: BoundaryFile) => (
    <Card key={file.id} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-muted rounded-lg">
              <MapPin size={20} />
            </div>
            <div>
              <CardTitle className="text-sm">{file.name}</CardTitle>
              <CardDescription className="text-xs">
                {countries.find(c => c.value === file.country)?.label} • ADM{file.adminLevel} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Badge variant="outline" className="text-xs">
              ADM{file.adminLevel}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(file.id)}>
              <Trash size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">Hover Attribute:</span> {file.hoverAttribute}
          </div>
          {file.metadata && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Features: {file.metadata.featureCount}</div>
              <div>Projection: {file.metadata.projection}</div>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Attributes:</span> {file.attributes.join(', ')}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Boundary Manager</h2>
        <p className="text-muted-foreground">Upload and manage administrative boundary shapefiles for each country</p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Boundary Shapefile</CardTitle>
          <CardDescription>Upload zipped shapefiles containing administrative boundaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="admin-level">Administrative Level</Label>
              <Select value={adminLevel.toString()} onValueChange={(value) => setAdminLevel(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminLevels.map(level => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="boundary-file">Select Shapefile (ZIP)</Label>
            <div className="flex items-center space-x-4">
              <Input
                ref={fileInputRef}
                id="boundary-file"
                type="file"
                onChange={handleFileSelect}
                accept=".zip"
                disabled={isUploading || !selectedCountry}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="w-32" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a zipped shapefile containing .shp, .shx, .dbf, and .prj files
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      {showConfiguration && currentFile && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Configure Boundary Display</CardTitle>
            <CardDescription>
              Set up hover attributes and display options for {currentFile.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Metadata */}
            {fileMetadata && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Features</div>
                  <div className="text-lg font-semibold">{fileMetadata.featureCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Projection</div>
                  <div className="text-lg font-semibold">{fileMetadata.projection}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Bounds</div>
                  <div className="text-xs font-mono">
                    {fileMetadata.bounds.map((b: number) => b.toFixed(2)).join(', ')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Admin Level</div>
                  <div className="text-lg font-semibold">ADM{adminLevel}</div>
                </div>
              </div>
            )}

            {/* Attribute Configuration */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Hover Attribute</Label>
                <Select value={hoverAttribute} onValueChange={setHoverAttribute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select attribute to display on hover" />
                  </SelectTrigger>
                  <SelectContent>
                    {shapefileAttributes.map(attr => (
                      <SelectItem key={attr} value={attr}>{attr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This attribute will be displayed when users hover over boundary regions
                </p>
              </div>

              <div className="space-y-2">
                <Label>Available Attributes</Label>
                <div className="p-3 border rounded-lg bg-muted/20">
                  <div className="flex flex-wrap gap-2">
                    {shapefileAttributes.map(attr => (
                      <Badge key={attr} variant="outline" className="text-xs">
                        {attr}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowConfiguration(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadComplete} disabled={!hoverAttribute}>
                <UploadSimple size={16} className="mr-2" />
                Complete Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Boundaries */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Uploaded Boundaries ({boundaryFiles.length})</h3>
        
        {boundaryFiles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No boundary files uploaded yet. Upload boundary shapefiles to enable country zooming and region hover effects.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Group by country */}
            {countries.map(country => {
              const countryBoundaries = boundaryFiles.filter(f => f.country === country.value)
              if (countryBoundaries.length === 0) return null

              return (
                <div key={country.value} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-md font-medium">{country.label}</h4>
                    <Badge variant="secondary">{countryBoundaries.length} files</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {countryBoundaries.map(renderBoundaryCard)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
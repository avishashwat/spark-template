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
  dataKey?: string // Reference to chunked data storage
  metadata?: {
    featureCount: number
    bounds: [number, number, number, number] // [minX, minY, maxX, maxY]
    projection: string
  }
}

interface ChunkMetadata {
  isChunked: true
  totalChunks: number
  originalSize: number
  chunkKeys: string[]
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

  // Utility function to get full boundary data (including GeoJSON)
  const getBoundaryDataById = async (fileId: string): Promise<BoundaryFile | null> => {
    try {
      const file = boundaryFiles.find(f => f.id === fileId)
      if (!file) return null
      
      if (file.dataKey) {
        // Retrieve from chunked storage
        const fullData = await getDataFromChunks(file.dataKey)
        return fullData
      } else if (file.geojsonData) {
        // Already has the data
        return file
      }
      
      return file
    } catch (error) {
      console.error('Failed to load boundary data:', error)
      return null
    }
  }

  // Analyze shapefile from zip file
  const analyzeShapefileForBoundary = async (file: File) => {
    return new Promise<{ attributes: string[]; metadata: any; geojsonData: any }>((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async function(e) {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          
          // Import libraries dynamically
          const [JSZip, shpjs] = await Promise.all([
            import('jszip'),
            import('shpjs')
          ])
          
          console.log('Libraries loaded successfully')
          
          // Use JSZip to extract the zip file
          const zip = new JSZip.default()
          const contents = await zip.loadAsync(arrayBuffer)
          
          console.log('Zip file loaded, contents:', Object.keys(contents.files))
          
          // Find .shp, .dbf, .shx files
          let shpFile, dbfFile, shxFile, prjFile
          
          for (const [filename, zipFile] of Object.entries(contents.files)) {
            if (zipFile.dir) continue // Skip directories
            
            const lowerFilename = filename.toLowerCase()
            if (lowerFilename.endsWith('.shp')) {
              shpFile = await zipFile.async('arraybuffer')
              console.log('Found .shp file:', filename)
            } else if (lowerFilename.endsWith('.dbf')) {
              dbfFile = await zipFile.async('arraybuffer')
              console.log('Found .dbf file:', filename)
            } else if (lowerFilename.endsWith('.shx')) {
              shxFile = await zipFile.async('arraybuffer')
              console.log('Found .shx file:', filename)
            } else if (lowerFilename.endsWith('.prj')) {
              prjFile = await zipFile.async('text')
              console.log('Found .prj file:', filename)
            }
          }
          
          if (!shpFile || !dbfFile) {
            throw new Error('Invalid shapefile: missing .shp or .dbf files')
          }
          
          console.log('All required files found, parsing shapefile...')
          
          // Parse shapefile to GeoJSON using shpjs
          const geojson = await shpjs.default(arrayBuffer)
          
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
                  if (typeof x === 'number' && typeof y === 'number') {
                    minX = Math.min(minX, x)
                    maxX = Math.max(maxX, x)
                    minY = Math.min(minY, y)
                    maxY = Math.max(maxY, y)
                  }
                }
              }
              
              if (feature.geometry.type === 'Polygon') {
                coords.forEach(processCoords)
              } else if (feature.geometry.type === 'MultiPolygon') {
                coords.forEach((polygon: any) => polygon.forEach(processCoords))
              } else if (feature.geometry.type === 'Point') {
                const [x, y] = coords
                if (typeof x === 'number' && typeof y === 'number') {
                  minX = Math.min(minX, x)
                  maxX = Math.max(maxX, x)
                  minY = Math.min(minY, y)
                  maxY = Math.max(maxY, y)
                }
              }
            }
          })
          
          // Ensure valid bounds
          if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            throw new Error('Could not calculate valid bounds from shapefile')
          }
          
          const metadata = {
            featureCount: geojson.features.length,
            bounds: [minX, minY, maxX, maxY] as [number, number, number, number],
            projection: prjFile ? 'EPSG:4326' : 'EPSG:4326' // Default to WGS84
          }
          
          console.log('Analysis complete:', { attributes, metadata })
          
          resolve({ 
            attributes, 
            metadata,
            geojsonData: geojson
          })
          
        } catch (error) {
          console.error('Error analyzing shapefile:', error)
          reject(new Error(`Failed to analyze shapefile: ${error.message}`))
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

    console.log('Starting file analysis for:', file.name, 'Size:', file.size)

    setCurrentFile(file)
    setIsUploading(true)
    setUploadProgress(10)

    try {
      console.log('Beginning shapefile analysis...')
      setUploadProgress(30)
      
      const analysis = await analyzeShapefileForBoundary(file)
      
      console.log('Analysis successful:', analysis)
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
        attr.toLowerCase().includes('state') ||
        attr.toLowerCase().includes('admin') ||
        attr.toLowerCase().includes('region')
      )
      if (nameAttribute) {
        setHoverAttribute(nameAttribute)
      }
      
      toast.success(`Shapefile analyzed successfully! Found ${analysis.metadata.featureCount} features with ${analysis.attributes.length} attributes.`)
    } catch (error) {
      console.error('Shapefile analysis error:', error)
      toast.error(`Failed to analyze shapefile: ${error.message || 'Unknown error'}`)
      setIsUploading(false)
      setUploadProgress(0)
      setShowConfiguration(false)
      setCurrentFile(null)
    }
  }

  // Function to store large data using chunked approach
  const storeDataInChunks = async (key: string, data: any, chunkSize: number = 200000): Promise<void> => {
    const dataString = JSON.stringify(data)
    const dataSizeKB = new Blob([dataString]).size / 1024
    
    console.log(`Data size: ${dataSizeKB.toFixed(2)} KB`)
    
    if (dataSizeKB <= 500) { // Store directly if under 500KB
      console.log('Data is small enough, storing directly')
      await window.spark.kv.set(key, data)
      return
    }
    
    console.log('Data is large, using chunked storage')
    
    // Split into chunks
    const chunks: string[] = []
    for (let i = 0; i < dataString.length; i += chunkSize) {
      chunks.push(dataString.slice(i, i + chunkSize))
    }
    
    console.log(`Split into ${chunks.length} chunks`)
    
    // Store chunk metadata
    const chunkMeta = {
      isChunked: true,
      totalChunks: chunks.length,
      originalSize: dataString.length,
      chunkKeys: chunks.map((_, i) => `${key}_chunk_${i}`)
    }
    
    // Store each chunk
    for (let i = 0; i < chunks.length; i++) {
      await window.spark.kv.set(`${key}_chunk_${i}`, chunks[i])
      console.log(`Stored chunk ${i + 1}/${chunks.length}`)
    }
    
    // Store metadata
    await window.spark.kv.set(key, chunkMeta)
    console.log('Stored chunk metadata')
  }

  // Function to retrieve chunked data
  const getDataFromChunks = async (key: string): Promise<any> => {
    const metaOrData = await window.spark.kv.get<ChunkMetadata | any>(key)
    
    if (!metaOrData) return null
    
    // Check if it's chunked data
    if (metaOrData && typeof metaOrData === 'object' && 'isChunked' in metaOrData && metaOrData.isChunked) {
      const chunkMeta = metaOrData as ChunkMetadata
      console.log(`Retrieving ${chunkMeta.totalChunks} chunks for ${key}`)
      
      let reconstructedData = ''
      for (let i = 0; i < chunkMeta.totalChunks; i++) {
        const chunk = await window.spark.kv.get<string>(`${key}_chunk_${i}`)
        if (chunk) {
          reconstructedData += chunk
        } else {
          throw new Error(`Missing chunk ${i} for ${key}`)
        }
      }
      
      return JSON.parse(reconstructedData)
    }
    
    // Return direct data if not chunked
    return metaOrData
  }

  const handleUploadComplete = async () => {
    if (!currentFile || !hoverAttribute) {
      toast.error('Please select a hover attribute')
      return
    }

    if (!currentGeojsonData || !fileMetadata) {
      toast.error('Missing boundary data. Please re-upload the file.')
      return
    }

    try {
      console.log('Starting boundary upload complete process...')
      setIsUploading(true)
      setUploadProgress(60)

      // Create boundary file object
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

      console.log('Boundary file object created:', {
        ...boundaryFile,
        geojsonData: currentGeojsonData ? `GeoJSON with ${currentGeojsonData.features?.length || 0} features` : 'No geojson data'
      })

      setUploadProgress(70)

      // Check GeoJSON data size
      const geojsonString = JSON.stringify(currentGeojsonData)
      const geojsonSizeKB = new Blob([geojsonString]).size / 1024
      console.log(`GeoJSON data size: ${geojsonSizeKB.toFixed(2)} KB`)
      
      if (geojsonSizeKB > 500) {
        console.log('Large GeoJSON data detected, using chunked storage')
        toast.info(`Large file detected (${geojsonSizeKB.toFixed(1)}KB), using chunked storage for optimal performance`)
      }

      setUploadProgress(80)

      // Store the individual boundary file data (potentially chunked)
      const boundaryFileKey = `boundary_data_${boundaryFile.id}`
      await storeDataInChunks(boundaryFileKey, boundaryFile)
      
      setUploadProgress(90)

      // Update the boundary files list with metadata only (no geojson data for performance)
      const boundaryFileMetadata = {
        ...boundaryFile,
        geojsonData: undefined, // Don't store geojson in the main list
        dataKey: boundaryFileKey // Reference to the actual data
      }

      const updatedFiles = [...boundaryFiles, boundaryFileMetadata]
      console.log('Saving boundary files list with', updatedFiles.length, 'files...')
      
      await window.spark.kv.set('admin_boundary_files', updatedFiles)
      
      console.log('Successfully saved to KV store')
      setUploadProgress(95)
      
      // Verify the save
      const savedFiles = await window.spark.kv.get<BoundaryFile[]>('admin_boundary_files')
      console.log('Verification: Read back', savedFiles?.length, 'files from KV store')
      
      const savedFile = savedFiles?.find(f => f.id === boundaryFile.id)
      if (savedFile) {
        console.log('Verification: Found saved file metadata')
        
        // Test retrieving the actual data
        const fullData = await getDataFromChunks(boundaryFileKey)
        if (fullData && fullData.geojsonData) {
          console.log('Verification: Successfully retrieved full data with', fullData.geojsonData.features?.length || 0, 'features')
          toast.success('Boundary stored using chunked data storage due to size')
        } else {
          console.error('Verification: Could not retrieve full data!')
        }
      } else {
        console.error('Verification: File metadata not found after save!')
      }
      
      setBoundaryFiles(updatedFiles)
      setUploadProgress(100)
      
      console.log('Calling onStatsUpdate...')
      onStatsUpdate()
      
      const storageType = geojsonSizeKB > 500 ? 'chunked' : 'direct'
      toast.success(`Boundary file uploaded successfully using ${storageType} storage (${geojsonSizeKB.toFixed(1)}KB)`)
      
      // Reset form after successful save
      setTimeout(() => {
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
      }, 1000)

    } catch (error) {
      console.error('Upload error details:', error)
      console.error('Error stack:', error.stack)
      
      // More detailed error reporting
      if (error.message.includes('failed to set key')) {
        toast.error('Storage key error: the boundary data may be too large. Please allocate more than sufficient space so that there is no error with space required in future')
      } else if (error.message.includes('storage') || error.message.includes('quota')) {
        toast.error('Storage quota exceeded. Please contact support for increased storage allocation.')
      } else if (error.message.includes('serializ')) {
        toast.error('Data serialization failed. Invalid GeoJSON format.')
      } else {
        toast.error(`Failed to upload boundary file: ${error.message || 'Unknown error'}`)
      }
      
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const fileToDelete = boundaryFiles.find(f => f.id === fileId)
      
      // Clean up chunked data if it exists
      if (fileToDelete?.dataKey) {
        try {
          // Get chunk metadata to clean up all chunks
          const chunkMeta = await window.spark.kv.get<ChunkMetadata>(fileToDelete.dataKey)
          if (chunkMeta && chunkMeta.isChunked) {
            // Delete all chunks
            for (let i = 0; i < chunkMeta.totalChunks; i++) {
              await window.spark.kv.delete(`${fileToDelete.dataKey}_chunk_${i}`)
            }
          }
          // Delete the metadata
          await window.spark.kv.delete(fileToDelete.dataKey)
        } catch (error) {
          console.warn('Failed to clean up chunked data:', error)
        }
      }
      
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

          {/* Debug section for development */}
          <div className="pt-4 border-t">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  try {
                    const data = await window.spark.kv.get<BoundaryFile[]>('admin_boundary_files')
                    console.log('Current boundary files:', data)
                    toast.success(`Found ${data?.length || 0} boundary files in storage`)
                    
                    // Check for chunked data
                    if (data && data.length > 0) {
                      for (const file of data) {
                        if (file.dataKey) {
                          const chunkMeta = await window.spark.kv.get<ChunkMetadata>(file.dataKey)
                          if (chunkMeta && chunkMeta.isChunked) {
                            console.log(`File ${file.name} has ${chunkMeta.totalChunks} chunks`)
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Debug check failed:', error)
                    toast.error('Failed to check storage')
                  }
                }}
              >
                Check Storage
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    // Get all boundary files first to clean up chunked data
                    const files = await window.spark.kv.get<BoundaryFile[]>('admin_boundary_files') || []
                    
                    // Clean up chunked data for each file
                    for (const file of files) {
                      if (file.dataKey) {
                        try {
                          const chunkMeta = await window.spark.kv.get<ChunkMetadata>(file.dataKey)
                          if (chunkMeta && chunkMeta.isChunked) {
                            for (let i = 0; i < chunkMeta.totalChunks; i++) {
                              await window.spark.kv.delete(`${file.dataKey}_chunk_${i}`)
                            }
                          }
                          await window.spark.kv.delete(file.dataKey)
                        } catch (error) {
                          console.warn(`Failed to clean up chunks for ${file.name}:`, error)
                        }
                      }
                    }
                    
                    // Clear main boundary files list
                    await window.spark.kv.delete('admin_boundary_files')
                    await window.spark.kv.delete('test_boundary_save')
                    setBoundaryFiles([])
                    onStatsUpdate()
                    toast.success('Cleared all boundary data and chunks')
                  } catch (error) {
                    console.error('Clear failed:', error)
                    toast.error('Failed to clear data')
                  }
                }}
              >
                Clear All Data
              </Button>
            </div>
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
              <Button onClick={handleUploadComplete} disabled={!hoverAttribute || isUploading}>
                <UploadSimple size={16} className="mr-2" />
                {isUploading ? 'Uploading...' : 'Complete Upload'}
              </Button>
            </div>
            
            {/* Progress for final upload step */}
            {isUploading && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Uploading boundary data...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
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
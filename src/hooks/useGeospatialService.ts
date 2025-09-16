import { useEffect, useState, useCallback } from 'react'

interface GeospatialService {
  isConnected: boolean
  isProcessing: boolean
  processingProgress: number
  error: string | null
}

interface UploadJob {
  id: string
  fileName: string
  fileType: 'raster' | 'shapefile' | 'boundary'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: any
  error?: string
}

export function useGeospatialService() {
  const [service, setService] = useState<GeospatialService>({
    isConnected: false,
    isProcessing: false,
    processingProgress: 0,
    error: null
  })
  
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([])
  
  // Check service health - Mock version for demo
  const checkServiceHealth = useCallback(async () => {
    try {
      // Mock successful connection for demo
      setService(prev => ({
        ...prev,
        isConnected: true,
        error: null
      }))
      
      return true
    } catch (error) {
      setService(prev => ({
        ...prev,
        isConnected: false,
        error: 'Service not available in demo mode'
      }))
      return false
    }
  }, [])
  
  // Upload and process raster file - Mock version for demo
  const uploadRaster = useCallback(async (
    file: File, 
    metadata: {
      country: string
      variable: string
      scenario?: string
      timePeriod?: string
      season?: string
      classification?: any
      styleInfo?: any
    }
  ): Promise<string> => {
    // Mock upload process for demo
    const jobId = `mock-raster-${Date.now()}`
    
    // Simulate upload processing
    setTimeout(() => {
      setUploadJobs(prev => [...prev, {
        id: jobId,
        fileName: file.name,
        fileType: 'raster',
        status: 'completed',
        progress: 100,
        result: { layerName: `${metadata.country}_${metadata.variable}` }
      }])
    }, 2000)
    
    return jobId
  }, [])
  
  // Upload and process shapefile - Mock version for demo
  const uploadShapefile = useCallback(async (
    file: File,
    metadata: {
      country: string
      infrastructureType?: string
      capacityField?: string
      nameField?: string
      iconType?: string
    }
  ): Promise<string> => {
    // Mock upload process for demo
    const jobId = `mock-shapefile-${Date.now()}`
    
    // Simulate upload processing
    setTimeout(() => {
      setUploadJobs(prev => [...prev, {
        id: jobId,
        fileName: file.name,
        fileType: 'shapefile',
        status: 'completed',
        progress: 100,
        result: { layerName: `${metadata.country}_${metadata.infrastructureType}` }
      }])
    }, 2000)
    
    return jobId
  }, [])
  
  // Upload boundary shapefile - Mock version for demo
  const uploadBoundary = useCallback(async (
    file: File,
    metadata: {
      country: string
      adminLevel: number
      nameField: string
    }
  ): Promise<string> => {
    // Mock upload process for demo
    const jobId = `mock-boundary-${Date.now()}`
    
    // Simulate upload processing
    setTimeout(() => {
      setUploadJobs(prev => [...prev, {
        id: jobId,
        fileName: file.name,
        fileType: 'boundary',
        status: 'completed',
        progress: 100,
        result: { layerName: `${metadata.country}_boundary` }
      }])
    }, 2000)
    
    return jobId
  }, [])
  
  // Get job status - Mock version for demo
  const getJobStatus = useCallback(async (jobId: string): Promise<UploadJob | null> => {
    try {
      // Return mock job status
      const existingJob = uploadJobs.find(job => job.id === jobId)
      return existingJob || null
    } catch (error) {
      console.error('Failed to get job status:', error)
      return null
    }
  }, [uploadJobs])
  
  // Get available datasets - Mock version for demo
  const getAvailableDatasets = useCallback(async (country: string) => {
    try {
      // Return mock datasets for demo
      return {
        climate: [
          { name: 'Maximum Temperature', variable: 'max_temp', scenarios: ['Historical', 'SSP1', 'SSP2'] },
          { name: 'Minimum Temperature', variable: 'min_temp', scenarios: ['Historical', 'SSP1', 'SSP2'] },
          { name: 'Precipitation', variable: 'precipitation', scenarios: ['Historical', 'SSP1', 'SSP2'] }
        ],
        giri: [
          { name: 'Flood Risk', variable: 'flood', scenarios: ['Existing', 'SSP1', 'SSP5'] },
          { name: 'Drought Risk', variable: 'drought', scenarios: ['Existing', 'SSP1', 'SSP5'] }
        ],
        energy: [
          { name: 'Hydro Power Plants', type: 'hydro' },
          { name: 'Solar Power Plants', type: 'solar' },
          { name: 'Wind Power Plants', type: 'wind' }
        ],
        boundaries: [
          { name: `${country} Administrative Boundaries`, level: 1 }
        ]
      }
    } catch (error) {
      console.error('Failed to get available datasets:', error)
      return { climate: [], giri: [], energy: [], boundaries: [] }
    }
  }, [])
  
  // Get WMS URL for raster layer - Mock version for demo
  const getWMSUrl = useCallback((layerName: string) => {
    // Return OpenStreetMap tile service for demo (no WMS needed)
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  }, [])
  
  // Get WFS URL for vector layer - Mock version for demo
  const getWFSUrl = useCallback((layerName: string) => {
    // Return mock URL for demo
    return 'https://demo.geoserver.org/wfs'
  }, [])
  
  // Monitor job progress via WebSocket or polling
  const monitorJob = useCallback((jobId: string, onUpdate?: (job: UploadJob) => void) => {
    let intervalId: NodeJS.Timeout
    
    const pollStatus = async () => {
      const job = await getJobStatus(jobId)
      if (job) {
        setUploadJobs(prev => {
          const existingIndex = prev.findIndex(j => j.id === jobId)
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = job
            return updated
          } else {
            return [...prev, job]
          }
        })
        
        onUpdate?.(job)
        
        // Stop polling when job is complete
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(intervalId)
        }
      }
    }
    
    // Start polling
    intervalId = setInterval(pollStatus, 1000)
    
    // Initial poll
    pollStatus()
    
    // Return cleanup function
    return () => clearInterval(intervalId)
  }, [getJobStatus])
  
  // Initialize service connection
  useEffect(() => {
    checkServiceHealth()
    
    // Check health periodically
    const healthInterval = setInterval(checkServiceHealth, 30000)
    
    return () => clearInterval(healthInterval)
  }, [checkServiceHealth])
  
  return {
    service,
    uploadJobs,
    uploadRaster,
    uploadShapefile,
    uploadBoundary,
    getJobStatus,
    getAvailableDatasets,
    getWMSUrl,
    getWFSUrl,
    monitorJob,
    checkServiceHealth
  }
}
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Upload, 
  Database, 
  HardDrives as Server, 
  Activity, 
  Gear as Settings, 
  Users,
  MapPin,
  Stack as Layers,
  Globe,
  Lightning as Zap,
  CheckCircle,
  Warning,
  Clock,
  ArrowLeft
} from '@phosphor-icons/react'

// GeoServer Configuration Component
const GeoServerConfig = () => {
  const [config, setConfig] = useState({
    url: 'http://localhost:8080/geoserver',
    username: 'admin',
    password: '',
    workspace: 'un_escap'
  })
  const [isConnected, setIsConnected] = useState(false)
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    try {
      // Test GeoServer connection using the geospatial service
      const { geospatialService } = await import('@/services/geospatialService')
      const success = await geospatialService.setGeoServerConfig(config)
      if (success) {
        setIsConnected(true)
        toast.success('GeoServer connection successful')
      } else {
        toast.error('Failed to connect to GeoServer')
      }
    } catch (error) {
      toast.error('Failed to connect to GeoServer')
    }
    setTesting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          GeoServer Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="geoserver-url">GeoServer URL</Label>
            <Input
              id="geoserver-url"
              value={config.url}
              onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:8080/geoserver"
            />
          </div>
          <div>
            <Label htmlFor="workspace">Workspace</Label>
            <Input
              id="workspace"
              value={config.workspace}
              onChange={(e) => setConfig(prev => ({ ...prev, workspace: e.target.value }))}
              placeholder="un_escap"
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={config.username}
              onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={config.password}
              onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={testConnection} disabled={testing}>
            {testing ? <Clock className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Test Connection
          </Button>
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// PostGIS Configuration Component
const PostGISConfig = () => {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'un_escap_gis',
    username: 'postgres',
    password: ''
  })
  const [isConnected, setIsConnected] = useState(false)
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    try {
      // Test PostGIS connection using the geospatial service
      const { geospatialService } = await import('@/services/geospatialService')
      const success = await geospatialService.setPostGISConfig(config)
      if (success) {
        setIsConnected(true)
        toast.success('PostGIS connection successful')
      } else {
        toast.error('Failed to connect to PostGIS')
      }
    } catch (error) {
      toast.error('Failed to connect to PostGIS')
    }
    setTesting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          PostGIS Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              value={config.host}
              onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              value={config.port}
              onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="database">Database</Label>
            <Input
              id="database"
              value={config.database}
              onChange={(e) => setConfig(prev => ({ ...prev, database: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="db-username">Username</Label>
            <Input
              id="db-username"
              value={config.username}
              onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="db-password">Password</Label>
          <Input
            id="db-password"
            type="password"
            value={config.password}
            onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={testConnection} disabled={testing}>
            {testing ? <Clock className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Test Connection
          </Button>
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Data Processing Pipeline Component
const DataProcessingPipeline = () => {
  const [processingStats, setProcessingStats] = useState({
    totalFiles: 0,
    processed: 0,
    failed: 0,
    inProgress: 0
  })

  const [recentProcessing, setRecentProcessing] = useState<any[]>([])

  useEffect(() => {
    // Load processing data from geospatial service
    const loadProcessingData = async () => {
      try {
        const { geospatialService } = await import('@/services/geospatialService')
        const [stats, jobs] = await Promise.all([
          geospatialService.getProcessingStats(),
          geospatialService.getProcessingJobs()
        ])
        
        setProcessingStats(stats)
        setRecentProcessing(jobs.slice(-5)) // Show last 5 jobs
      } catch (error) {
        console.error('Failed to load processing data:', error)
      }
    }

    loadProcessingData()
    
    // Refresh every 5 seconds
    const interval = setInterval(loadProcessingData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />
      case 'failed':
        return <Warning className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Processing Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-semibold">{processingStats.totalFiles}</p>
              </div>
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-semibold text-green-600">{processingStats.processed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-semibold text-blue-600">{processingStats.inProgress}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-semibold text-red-600">{processingStats.failed}</p>
              </div>
              <Warning className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Processing Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Processing Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentProcessing.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium">{item.filename}</p>
                    <p className="text-sm text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Progress value={item.progress} className="w-20 h-2" />
                    <span className="text-sm">{item.progress}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.startTime ? new Date(item.startTime).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// WebSocket Management Component
const WebSocketManagement = () => {
  const [connections, setConnections] = useState([
    { id: 1, user: 'admin@un.org', country: 'Bhutan', maps: 2, lastActivity: '2 min ago', status: 'active' },
    { id: 2, user: 'analyst@escap.org', country: 'Mongolia', maps: 4, lastActivity: '5 min ago', status: 'active' },
    { id: 3, user: 'researcher@un.org', country: 'Laos', maps: 1, lastActivity: '15 min ago', status: 'idle' }
  ])

  const [wsStats, setWsStats] = useState({
    activeConnections: 3,
    totalSessions: 156,
    dataTransferred: '2.4 GB',
    avgResponseTime: '45ms'
  })

  return (
    <div className="space-y-6">
      {/* WebSocket Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-semibold">{wsStats.activeConnections}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-semibold">{wsStats.totalSessions}</p>
              </div>
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Transferred</p>
                <p className="text-2xl font-semibold">{wsStats.dataTransferred}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-semibold">{wsStats.avgResponseTime}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Active WebSocket Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${conn.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div>
                    <p className="font-medium">{conn.user}</p>
                    <p className="text-sm text-muted-foreground">Viewing {conn.country} • {conn.maps} maps</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={conn.status === 'active' ? 'default' : 'secondary'}>
                    {conn.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{conn.lastActivity}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const GeospatialInfrastructure = () => {
  const [activeTab, setActiveTab] = useState('overview')

  // Function to navigate back to main app
  const navigateToApp = () => {
    window.location.href = window.location.pathname.replace(/admin.*/, '') + '?admin=false'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToApp}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
            <Separator orientation="vertical" className="h-6 bg-primary-foreground/20" />
            <h1 className="text-xl font-semibold">Geospatial Infrastructure Management</h1>
          </div>
          <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground">
            Enhanced Architecture
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Infrastructure
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="websockets" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Real-time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      PostGIS Database
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Status</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Storage</span>
                        <span className="text-sm font-medium">15.2 GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tables</span>
                        <span className="text-sm font-medium">47</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-green-600" />
                      GeoServer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Status</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Running
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Layers</span>
                        <span className="text-sm font-medium">23</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Workspaces</span>
                        <span className="text-sm font-medium">3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-600" />
                      WebSocket Server
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Status</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Connections</span>
                        <span className="text-sm font-medium">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Uptime</span>
                        <span className="text-sm font-medium">99.9%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Architecture Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Data Flow Pipeline</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          <span>Upload → Format Validation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full" />
                          <span>TIF → COG Conversion</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full" />
                          <span>Shapefile → Vector Tiles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-600 rounded-full" />
                          <span>PostGIS Storage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-600 rounded-full" />
                          <span>GeoServer Publication</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Performance Benefits</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Layer Load Time</span>
                          <span className="font-medium text-green-600">50-100x faster</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Multi-map Sync</span>
                          <span className="font-medium text-green-600">Real-time</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Concurrent Users</span>
                          <span className="font-medium text-green-600">100+</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Data Size Support</span>
                          <span className="font-medium text-green-600">Multi-GB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="infrastructure">
            <div className="space-y-6">
              <PostGISConfig />
              <GeoServerConfig />
            </div>
          </TabsContent>

          <TabsContent value="processing">
            <DataProcessingPipeline />
          </TabsContent>

          <TabsContent value="websockets">
            <WebSocketManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { SignOut, Database, Upload, MapPin, Gear } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DataLayerManager } from './DataLayerManager'
import { FileUploadManager } from './FileUploadManager'
import { BoundaryManager } from './BoundaryManager'
import { SystemSettings } from './SystemSettings'

export function AdminPanel() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalRasters: 0,
    totalShapefiles: 0,
    totalBoundaries: 0,
    totalCountries: 3
  })

  useEffect(() => {
    loadUserInfo()
    loadStats()
  }, [])

  const loadUserInfo = async () => {
    try {
      const userData = await window.spark.user()
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user info:', error)
    }
  }

  const loadStats = async () => {
    try {
      // Load statistics from storage
      const rasters = await window.spark.kv.get<any[]>('admin_rasters') || []
      const shapefiles = await window.spark.kv.get<any[]>('admin_shapefiles') || []
      const boundaries = await window.spark.kv.get<any[]>('admin_boundaries') || []
      
      setStats({
        totalRasters: rasters.length,
        totalShapefiles: shapefiles.length,
        totalBoundaries: boundaries.length,
        totalCountries: 3
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await window.spark.kv.delete('admin_authenticated')
      toast.success('Signed out successfully')
      window.location.reload()
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Database size={24} className="text-primary" />
              <h1 className="text-xl font-semibold">UN ESCAP Data Management</h1>
            </div>
            <Badge variant="secondary">Admin Panel</Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2 text-sm">
                <img 
                  src={user.avatarUrl} 
                  alt={user.login}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-muted-foreground">Welcome, {user.login}</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <SignOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Stats Overview */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Rasters</p>
                  <p className="text-2xl font-bold">{stats.totalRasters}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin size={16} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Shapefiles</p>
                  <p className="text-2xl font-bold">{stats.totalShapefiles}</p>
                </div>
                <div className="h-8 w-8 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Upload size={16} className="text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Boundaries</p>
                  <p className="text-2xl font-bold">{stats.totalBoundaries}</p>
                </div>
                <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <Database size={16} className="text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Countries</p>
                  <p className="text-2xl font-bold">{stats.totalCountries}</p>
                </div>
                <div className="h-8 w-8 bg-warning/10 rounded-full flex items-center justify-center">
                  <Gear size={16} className="text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="layers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="layers">Data Layers</TabsTrigger>
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="boundaries">Boundaries</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="layers" className="space-y-4">
            <DataLayerManager onStatsUpdate={loadStats} />
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <FileUploadManager onStatsUpdate={loadStats} />
          </TabsContent>
          
          <TabsContent value="boundaries" className="space-y-4">
            <BoundaryManager onStatsUpdate={loadStats} />
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { SignOut, Upload, Gear, Database, FileText } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DataUpload } from './DataUpload'
import { LayerManagement } from './LayerManagement'
import { TemplateManagement } from './TemplateManagement'

interface UserInfo {
  avatarUrl: string
  email: string
  id: string
  isOwner: boolean
  login: string
}

interface AdminPanelProps {
  onLogout: () => void
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userInfo = await (window as any).spark.user()
        setUser(userInfo)
      } catch (error) {
        console.error('Failed to load user info:', error)
        toast.error('Failed to load user information')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user?.isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You do not have administrative privileges to access this panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onLogout} variant="outline" className="w-full">
              Return to Main Application
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Gear className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">UN ESCAP Admin Panel</h1>
                  <p className="text-sm text-muted-foreground">Climate & Energy Risk Data Management</p>
                </div>
              </div>
              <Badge variant="secondary" className="ml-4">
                Administrator
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={user.avatarUrl} 
                  alt={user.login}
                  className="w-8 h-8 rounded-full"
                />
                <div className="text-right">
                  <p className="text-sm font-medium">{user.login}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button 
                onClick={onLogout} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <SignOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Data Upload
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <Database className="w-4 h-4" />
              Layer Management
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Upload Geospatial Data</h2>
              <p className="text-muted-foreground mb-6">
                Upload raster TIF files or point shapefiles with automatic classification and organization.
              </p>
              <DataUpload />
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Manage Data Layers</h2>
              <p className="text-muted-foreground mb-6">
                View, edit, and delete existing data layers and their configurations.
              </p>
              <LayerManagement />
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Template Management</h2>
              <p className="text-muted-foreground mb-6">
                Create and manage reusable templates for classifications, color schemes, and configurations.
              </p>
              <TemplateManagement />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
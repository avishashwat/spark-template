import React, { useState, useEffect } from 'react'
import { AdminAuth } from './admin/AdminAuth'
import { AdminPanel } from './admin/AdminPanel'
import { GeospatialInfrastructure } from './GeospatialInfrastructure'
import { Button } from '@/components/ui/button'
import { HardDrives } from '@phosphor-icons/react'

export function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showInfrastructure, setShowInfrastructure] = useState(false)

  useEffect(() => {
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async () => {
    try {
      const authData = await window.spark.kv.get<any>('admin_authenticated')
      
      if (authData && authData.expires > Date.now()) {
        // Check if user is still owner
        const user = await window.spark.user()
        if (user?.isOwner) {
          setIsAuthenticated(true)
        } else {
          // Clean up invalid auth
          await window.spark.kv.delete('admin_authenticated')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthenticated = () => {
    setIsAuthenticated(true)
  }

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

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticated} />
  }

  if (showInfrastructure) {
    return (
      <div>
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            onClick={() => setShowInfrastructure(false)}
            className="flex items-center gap-2"
          >
            <HardDrives className="w-4 h-4" />
            Back to Admin Panel
          </Button>
        </div>
        <GeospatialInfrastructure />
      </div>
    )
  }

  return <AdminPanel onShowInfrastructure={() => setShowInfrastructure(true)} />
}
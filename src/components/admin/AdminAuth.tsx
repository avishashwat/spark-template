import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eye, EyeSlash, Shield } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AdminAuthProps {
  onAuthenticated: () => void
}

export function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Get current user to verify if they are the owner
      const user = await window.spark.user()
      
      if (!user || !user.isOwner) {
        toast.error('Access denied. Only the application owner can access the admin panel.')
        setIsLoading(false)
        return
      }

      // Simple credential check for demo - in production, use proper authentication
      if (credentials.username === 'admin' && credentials.password === 'escap2024') {
        // Store auth status
        await window.spark.kv.set('admin_authenticated', {
          userId: user?.id,
          timestamp: Date.now(),
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        })
        
        toast.success('Authentication successful')
        onAuthenticated()
      } else {
        toast.error('Invalid credentials')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      toast.error('Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield size={32} className="text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            Enter your credentials to access the UN ESCAP Data Management Panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-xs text-muted-foreground">
            <p><strong>Demo Credentials:</strong></p>
            <p>Username: admin</p>
            <p>Password: escap2024</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
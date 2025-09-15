import React, { useEffect, useState } from 'react'
import { useCollaboration } from '@/hooks/useCollaboration'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, WifiHigh, WifiX, ArrowClockwise } from '@phosphor-icons/react'

interface CollaborationPanelProps {
  onSessionStart?: (sessionId: string) => void
}

export function CollaborationPanel({ onSessionStart }: CollaborationPanelProps) {
  const [sessionId, setSessionId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const collaboration = useCollaboration()
  
  // Generate random session ID
  const generateSessionId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    setSessionId(id)
    return id
  }
  
  // Auto-generate session ID and user name
  useEffect(() => {
    if (!sessionId) {
      generateSessionId()
    }
    if (!userName) {
      setUserName(`User-${Math.random().toString(36).substring(2, 6)}`)
    }
  }, [sessionId, userName])
  
  const handleJoinSession = () => {
    if (sessionId.trim()) {
      collaboration.connect(sessionId.trim(), { 
        id: userName || 'anonymous',
        name: userName 
      })
      onSessionStart?.(sessionId.trim())
    }
  }
  
  const handleLeaveSession = () => {
    collaboration.disconnect()
  }
  
  const getConnectionIcon = () => {
    if (collaboration.isReconnecting) {
      return <ArrowClockwise className="animate-spin" size={16} />
    }
    return collaboration.isConnected ? <WifiHigh size={16} /> : <WifiX size={16} />
  }
  
  const getConnectionStatus = () => {
    if (collaboration.isReconnecting) return 'Reconnecting...'
    if (collaboration.isConnected) return 'Connected'
    return 'Disconnected'
  }
  
  const getConnectionColor = () => {
    if (collaboration.isReconnecting) return 'warning'
    if (collaboration.isConnected) return 'accent'
    return 'destructive'
  }
  
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Users size={20} className="text-primary" />
        <h3 className="font-semibold text-sm">Real-time Collaboration</h3>
      </div>
      
      {!collaboration.sessionId ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Session ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                placeholder="Enter session ID"
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background font-mono"
                maxLength={6}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateSessionId}
                className="px-3"
              >
                New
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleJoinSession}
            disabled={!sessionId.trim() || !userName.trim()}
            className="w-full"
            size="sm"
          >
            Start Collaboration
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Session</div>
              <div className="font-mono text-sm font-semibold">{collaboration.sessionId}</div>
            </div>
            <Badge 
              variant={getConnectionColor() as any}
              className="flex items-center gap-1 text-xs"
            >
              {getConnectionIcon()}
              {getConnectionStatus()}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Participants ({collaboration.participants.length})
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {collaboration.participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className="flex items-center gap-2 text-xs p-1 rounded bg-muted/50"
                >
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="truncate">{participant.name || participant.id}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleLeaveSession}
            className="w-full"
            size="sm"
          >
            Leave Session
          </Button>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground border-t pt-3">
        <p className="mb-1">🔄 Real-time map synchronization</p>
        <p className="mb-1">👥 Multi-user collaboration</p>
        <p>⚡ Instant layer updates</p>
      </div>
    </div>
  )
}
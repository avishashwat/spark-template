import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface CollaborationUser {
  id: string
  name?: string
  avatar?: string
  cursor?: {
    x: number
    y: number
    mapId: string
  }
}

interface CollaborationState {
  sessionId: string | null
  participants: CollaborationUser[]
  isConnected: boolean
  isReconnecting: boolean
}

interface MapViewSync {
  center: [number, number]
  zoom: number
  mapId: string
  userId: string
  timestamp: number
}

interface LayerSync {
  mapId: string
  layers: any
  action: string
  userId: string
  timestamp: number
}

export function useCollaboration() {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<CollaborationState>({
    sessionId: null,
    participants: [],
    isConnected: false,
    isReconnecting: false
  })
  
  // Debounce view changes to prevent spam
  const viewChangeTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  const connect = useCallback((sessionId: string, user?: { id: string; name?: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect()
    }
    
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? `${window.location.protocol}//${window.location.host}/ws`
      : 'http://localhost:3001'
    
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    })
    
    const socket = socketRef.current
    
    // Connection events
    socket.on('connect', () => {
      console.log('Connected to collaboration server')
      setState(prev => ({ ...prev, isConnected: true, isReconnecting: false }))
      
      // Join session
      socket.emit('join_session', { sessionId, user })
    })
    
    socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server')
      setState(prev => ({ ...prev, isConnected: false }))
    })
    
    socket.on('reconnect', () => {
      console.log('Reconnected to collaboration server')
      setState(prev => ({ ...prev, isReconnecting: false }))
      socket.emit('join_session', { sessionId, user })
    })
    
    socket.on('reconnect_attempt', () => {
      setState(prev => ({ ...prev, isReconnecting: true }))
    })
    
    // Session events
    socket.on('session_joined', (data) => {
      console.log('Joined collaboration session:', data)
      setState(prev => ({ 
        ...prev, 
        sessionId: data.sessionId,
        participants: data.participants.map((id: string) => ({ id }))
      }))
      
      // Sync initial state
      if (data.mapState) {
        window.dispatchEvent(new CustomEvent('collaboration_sync_view', {
          detail: data.mapState
        }))
      }
      
      if (data.activeLayers) {
        window.dispatchEvent(new CustomEvent('collaboration_sync_layers', {
          detail: data.activeLayers
        }))
      }
    })
    
    socket.on('participant_joined', (data) => {
      setState(prev => ({
        ...prev,
        participants: data.participants.map((id: string) => ({ id }))
      }))
    })
    
    socket.on('participant_left', (data) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== data.userId)
      }))
    })
    
    // Map synchronization events
    socket.on('sync_map_view', (data: MapViewSync) => {
      // Ignore our own changes
      if (data.userId === user?.id) return
      
      console.log('Syncing map view from collaboration:', data)
      window.dispatchEvent(new CustomEvent('collaboration_sync_view', {
        detail: {
          center: data.center,
          zoom: data.zoom,
          mapId: data.mapId,
          fromCollaboration: true
        }
      }))
    })
    
    socket.on('sync_layer_change', (data: LayerSync) => {
      // Ignore our own changes
      if (data.userId === user?.id) return
      
      console.log('Syncing layer change from collaboration:', data)
      window.dispatchEvent(new CustomEvent('collaboration_sync_layers', {
        detail: {
          mapId: data.mapId,
          layers: data.layers,
          action: data.action,
          fromCollaboration: true
        }
      }))
    })
    
    socket.on('sync_country_change', (data) => {
      // Ignore our own changes
      if (data.userId === user?.id) return
      
      console.log('Syncing country change from collaboration:', data)
      window.dispatchEvent(new CustomEvent('collaboration_sync_country', {
        detail: {
          country: data.country,
          fromCollaboration: true
        }
      }))
    })
    
    socket.on('sync_cursor', (data) => {
      // Update cursor positions
      setState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === data.userId 
            ? { ...p, cursor: { ...data.position, mapId: data.mapId } }
            : p
        )
      }))
    })
    
    socket.on('error', (error) => {
      console.error('Collaboration error:', error)
    })
    
  }, [])
  
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setState({
      sessionId: null,
      participants: [],
      isConnected: false,
      isReconnecting: false
    })
  }, [])
  
  const broadcastViewChange = useCallback((center: [number, number], zoom: number, mapId: string) => {
    if (!socketRef.current?.connected) return
    
    // Debounce view changes
    const key = `${mapId}_view`
    const existingTimeout = viewChangeTimeouts.current.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    const timeout = setTimeout(() => {
      socketRef.current?.emit('map_view_change', { center, zoom, mapId })
      viewChangeTimeouts.current.delete(key)
    }, 100) // 100ms debounce
    
    viewChangeTimeouts.current.set(key, timeout)
  }, [])
  
  const broadcastLayerChange = useCallback((mapId: string, layers: any, action: string = 'update') => {
    if (!socketRef.current?.connected) return
    
    socketRef.current.emit('layer_change', { mapId, layers, action })
  }, [])
  
  const broadcastCountryChange = useCallback((country: string) => {
    if (!socketRef.current?.connected) return
    
    socketRef.current.emit('country_change', { country })
  }, [])
  
  const broadcastCursorMove = useCallback((position: { x: number; y: number }, mapId: string) => {
    if (!socketRef.current?.connected) return
    
    // Throttle cursor updates
    socketRef.current.emit('cursor_move', { position, mapId })
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
      // Clear all timeouts
      viewChangeTimeouts.current.forEach(timeout => clearTimeout(timeout))
      viewChangeTimeouts.current.clear()
    }
  }, [disconnect])
  
  return {
    ...state,
    connect,
    disconnect,
    broadcastViewChange,
    broadcastLayerChange,
    broadcastCountryChange,
    broadcastCursorMove
  }
}
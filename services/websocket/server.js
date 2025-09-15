const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('redis');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: '/app/logs/websocket.log' }),
    new winston.transports.Console()
  ]
});

// Initialize Express app
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

const server = createServer(app);

// Initialize Socket.IO with Redis adapter for scaling
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Redis clients
let redisClient, redisSubscriber, redisPublisher;

async function initializeRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = Redis.createClient({ url: redisUrl });
    redisSubscriber = Redis.createClient({ url: redisUrl });
    redisPublisher = Redis.createClient({ url: redisUrl });
    
    await Promise.all([
      redisClient.connect(),
      redisSubscriber.connect(),
      redisPublisher.connect()
    ]);
    
    logger.info('Redis connections established');
    
    // Set up Redis adapter for Socket.IO clustering
    const { createAdapter } = require('@socket.io/redis-adapter');
    io.adapter(createAdapter(redisPublisher, redisSubscriber));
    
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Collaboration state management
const collaborationSessions = new Map();
const userSessions = new Map();

class CollaborationManager {
  constructor() {
    this.sessions = new Map();
    this.users = new Map();
  }
  
  async createSession(sessionId, userId, initialState = {}) {
    const session = {
      id: sessionId,
      participants: new Set([userId]),
      mapState: {
        center: initialState.center || [90.433601, 27.514162],
        zoom: initialState.zoom || 7.5,
        country: initialState.country || 'bhutan'
      },
      activeLayers: {},
      lastActivity: Date.now(),
      createdAt: Date.now()
    };
    
    this.sessions.set(sessionId, session);
    
    // Store in Redis for persistence
    await redisClient.hSet('collaboration_sessions', sessionId, JSON.stringify({
      participants: Array.from(session.participants),
      mapState: session.mapState,
      activeLayers: session.activeLayers,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    }));
    
    logger.info(`Created collaboration session: ${sessionId}`);
    return session;
  }
  
  async joinSession(sessionId, userId) {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      // Try to load from Redis
      const sessionData = await redisClient.hGet('collaboration_sessions', sessionId);
      if (sessionData) {
        const data = JSON.parse(sessionData);
        session = {
          id: sessionId,
          participants: new Set(data.participants),
          mapState: data.mapState,
          activeLayers: data.activeLayers,
          lastActivity: data.lastActivity,
          createdAt: data.createdAt
        };
        this.sessions.set(sessionId, session);
      } else {
        // Create new session
        session = await this.createSession(sessionId, userId);
      }
    }
    
    session.participants.add(userId);
    session.lastActivity = Date.now();
    
    // Update Redis
    await redisClient.hSet('collaboration_sessions', sessionId, JSON.stringify({
      participants: Array.from(session.participants),
      mapState: session.mapState,
      activeLayers: session.activeLayers,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    }));
    
    logger.info(`User ${userId} joined session: ${sessionId}`);
    return session;
  }
  
  async leaveSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants.delete(userId);
      session.lastActivity = Date.now();
      
      if (session.participants.size === 0) {
        // Archive empty session
        this.sessions.delete(sessionId);
        await redisClient.hDel('collaboration_sessions', sessionId);
        logger.info(`Archived empty session: ${sessionId}`);
      } else {
        // Update Redis
        await redisClient.hSet('collaboration_sessions', sessionId, JSON.stringify({
          participants: Array.from(session.participants),
          mapState: session.mapState,
          activeLayers: session.activeLayers,
          lastActivity: session.lastActivity,
          createdAt: session.createdAt
        }));
      }
      
      logger.info(`User ${userId} left session: ${sessionId}`);
    }
  }
  
  async updateMapState(sessionId, mapState, userId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.mapState = { ...session.mapState, ...mapState };
      session.lastActivity = Date.now();
      
      // Update Redis
      await redisClient.hSet('collaboration_sessions', sessionId, JSON.stringify({
        participants: Array.from(session.participants),
        mapState: session.mapState,
        activeLayers: session.activeLayers,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      }));
      
      return session.mapState;
    }
    return null;
  }
  
  async updateActiveLayers(sessionId, mapId, layers, userId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activeLayers[mapId] = layers;
      session.lastActivity = Date.now();
      
      // Update Redis
      await redisClient.hSet('collaboration_sessions', sessionId, JSON.stringify({
        participants: Array.from(session.participants),
        mapState: session.mapState,
        activeLayers: session.activeLayers,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      }));
      
      return session.activeLayers;
    }
    return null;
  }
}

const collaborationManager = new CollaborationManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  let currentSessionId = null;
  let userId = null;
  
  // Join collaboration session
  socket.on('join_session', async (data) => {
    try {
      const { sessionId, user } = data;
      userId = user?.id || socket.id;
      currentSessionId = sessionId;
      
      const session = await collaborationManager.joinSession(sessionId, userId);
      
      // Join Socket.IO room
      await socket.join(sessionId);
      
      // Send current session state to the new participant
      socket.emit('session_joined', {
        sessionId,
        mapState: session.mapState,
        activeLayers: session.activeLayers,
        participants: Array.from(session.participants)
      });
      
      // Notify other participants
      socket.to(sessionId).emit('participant_joined', {
        userId,
        participants: Array.from(session.participants)
      });
      
      logger.info(`Socket ${socket.id} joined collaboration session: ${sessionId}`);
      
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });
  
  // Handle map view changes
  socket.on('map_view_change', async (data) => {
    try {
      if (!currentSessionId) return;
      
      const { center, zoom, mapId } = data;
      const mapState = await collaborationManager.updateMapState(
        currentSessionId, 
        { center, zoom }, 
        userId
      );
      
      if (mapState) {
        // Broadcast to other participants with debouncing
        socket.to(currentSessionId).emit('sync_map_view', {
          center,
          zoom,
          mapId,
          userId,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      logger.error('Error handling map view change:', error);
    }
  });
  
  // Handle layer changes
  socket.on('layer_change', async (data) => {
    try {
      if (!currentSessionId) return;
      
      const { mapId, layers, action } = data;
      const activeLayers = await collaborationManager.updateActiveLayers(
        currentSessionId,
        mapId,
        layers,
        userId
      );
      
      if (activeLayers) {
        // Broadcast layer changes
        socket.to(currentSessionId).emit('sync_layer_change', {
          mapId,
          layers,
          action,
          userId,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      logger.error('Error handling layer change:', error);
    }
  });
  
  // Handle country changes
  socket.on('country_change', async (data) => {
    try {
      if (!currentSessionId) return;
      
      const { country } = data;
      const mapState = await collaborationManager.updateMapState(
        currentSessionId,
        { country },
        userId
      );
      
      if (mapState) {
        socket.to(currentSessionId).emit('sync_country_change', {
          country,
          userId,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      logger.error('Error handling country change:', error);
    }
  });
  
  // Handle cursor/pointer events for real-time collaboration
  socket.on('cursor_move', (data) => {
    if (!currentSessionId) return;
    
    socket.to(currentSessionId).emit('sync_cursor', {
      userId,
      position: data.position,
      mapId: data.mapId,
      timestamp: Date.now()
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', async () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    if (currentSessionId && userId) {
      try {
        await collaborationManager.leaveSession(currentSessionId, userId);
        
        // Notify other participants
        socket.to(currentSessionId).emit('participant_left', {
          userId,
          timestamp: Date.now()
        });
        
      } catch (error) {
        logger.error('Error handling disconnect:', error);
      }
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sessions: collaborationManager.sessions.size
  });
});

// Get active sessions
app.get('/sessions', async (req, res) => {
  try {
    const sessions = Array.from(collaborationManager.sessions.values()).map(session => ({
      id: session.id,
      participants: Array.from(session.participants),
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    }));
    
    res.json({ sessions });
  } catch (error) {
    logger.error('Error getting sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Cleanup inactive sessions periodically
setInterval(async () => {
  const now = Date.now();
  const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of collaborationManager.sessions) {
    if (now - session.lastActivity > inactiveThreshold) {
      collaborationManager.sessions.delete(sessionId);
      await redisClient.hDel('collaboration_sessions', sessionId);
      logger.info(`Cleaned up inactive session: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Start server
async function startServer() {
  try {
    await initializeRedis();
    
    const port = process.env.PORT || 3001;
    server.listen(port, () => {
      logger.info(`WebSocket collaboration server running on port ${port}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  
  // Close Redis connections
  if (redisClient) await redisClient.quit();
  if (redisSubscriber) await redisSubscriber.quit();
  if (redisPublisher) await redisPublisher.quit();
  
  // Close HTTP server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();
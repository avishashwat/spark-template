import asyncio
import json
import uuid
from typing import Dict, Set, Any, Optional
from datetime import datetime
import websockets
import redis.asyncio as redis
import structlog
import os

logger = structlog.get_logger()

class CollaborationManager:
    """Real-time collaboration manager for multi-user map synchronization"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = None
        self.pubsub = None
        
        # Active connections: {session_id: {user_id: websocket}}
        self.active_sessions: Dict[str, Dict[str, websockets.WebSocketServerProtocol]] = {}\
        
        # Session metadata
        self.session_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Event types
        self.event_types = {
            "VIEW_CHANGE": "view_change",
            "LAYER_CHANGE": "layer_change", 
            "COUNTRY_CHANGE": "country_change",
            "USER_JOIN": "user_join",
            "USER_LEAVE": "user_leave",
            "CURSOR_MOVE": "cursor_move",
            "ANNOTATION": "annotation"
        }
    
    async def start(self):
        """Start collaboration manager"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            
            # Test connection
            await self.redis_client.ping()
            
            # Start pubsub listener
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe("escap_collaboration")
            
            # Start background task to handle pubsub messages
            asyncio.create_task(self._handle_pubsub_messages())
            
            logger.info("Collaboration manager started successfully")
            
        except Exception as e:
            logger.error("Failed to start collaboration manager", error=str(e))
            raise
    
    async def stop(self):
        """Stop collaboration manager"""
        if self.pubsub:
            await self.pubsub.unsubscribe("escap_collaboration")
            await self.pubsub.close()
        
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Collaboration manager stopped")
    
    async def handle_connection(self, websocket: websockets.WebSocketServerProtocol, session_id: str):
        """Handle new WebSocket connection"""
        user_id = str(uuid.uuid4())
        
        try:
            # Add to active sessions
            if session_id not in self.active_sessions:
                self.active_sessions[session_id] = {}
                self.session_metadata[session_id] = {
                    "created_at": datetime.utcnow().isoformat(),
                    "user_count": 0
                }
            
            self.active_sessions[session_id][user_id] = websocket
            self.session_metadata[session_id]["user_count"] += 1
            
            # Notify other users in session
            await self._broadcast_to_session(session_id, {
                "type": self.event_types["USER_JOIN"],
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "user_count": self.session_metadata[session_id]["user_count"]
            }, exclude_user=user_id)
            
            # Send current session state to new user
            await self._send_session_state(websocket, session_id)
            
            logger.info("User joined collaboration session", 
                       session_id=session_id, user_id=user_id)
            
            # Handle messages from this user
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_user_message(session_id, user_id, data)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON received", user_id=user_id)
                except Exception as e:
                    logger.error("Error handling user message", 
                               user_id=user_id, error=str(e))
        
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed", user_id=user_id)
        
        finally:
            # Clean up on disconnect
            await self._handle_user_disconnect(session_id, user_id)
    
    async def _handle_user_disconnect(self, session_id: str, user_id: str):
        """Handle user disconnect"""
        try:
            if session_id in self.active_sessions:
                if user_id in self.active_sessions[session_id]:
                    del self.active_sessions[session_id][user_id]
                    self.session_metadata[session_id]["user_count"] -= 1
                
                # Notify other users
                await self._broadcast_to_session(session_id, {
                    "type": self.event_types["USER_LEAVE"],
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "user_count": self.session_metadata[session_id]["user_count"]
                })
                
                # Clean up empty sessions
                if not self.active_sessions[session_id]:
                    del self.active_sessions[session_id]
                    del self.session_metadata[session_id]
                    logger.info("Session cleaned up", session_id=session_id)
            
            logger.info("User disconnected", session_id=session_id, user_id=user_id)
            
        except Exception as e:
            logger.error("Error handling user disconnect", 
                        session_id=session_id, user_id=user_id, error=str(e))
    
    async def _handle_user_message(self, session_id: str, user_id: str, data: Dict[str, Any]):
        """Handle message from user"""
        
        message_type = data.get("type")
        timestamp = datetime.utcnow().isoformat()
        
        # Add metadata to message
        enriched_data = {
            **data,
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": timestamp
        }
        
        # Store in Redis for persistence
        await self._store_session_event(session_id, enriched_data)
        
        # Broadcast to other users in session
        await self._broadcast_to_session(session_id, enriched_data, exclude_user=user_id)
        
        # Publish to Redis for cross-server synchronization
        await self.redis_client.publish("escap_collaboration", json.dumps(enriched_data))
        
        logger.debug("User message processed", 
                    session_id=session_id, user_id=user_id, type=message_type)
    
    async def _broadcast_to_session(
        self, 
        session_id: str, 
        data: Dict[str, Any], 
        exclude_user: Optional[str] = None
    ):
        """Broadcast message to all users in a session"""
        
        if session_id not in self.active_sessions:
            return
        
        message = json.dumps(data)
        
        # Get all websockets in session
        websockets_to_send = []
        for uid, websocket in self.active_sessions[session_id].items():
            if exclude_user and uid == exclude_user:
                continue
            websockets_to_send.append(websocket)
        
        # Send to all websockets concurrently
        if websockets_to_send:
            await asyncio.gather(
                *[self._safe_send(ws, message) for ws in websockets_to_send],
                return_exceptions=True
            )
    
    async def _safe_send(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Safely send message to websocket"""
        try:
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            # Connection closed, will be handled by disconnect handler
            pass
        except Exception as e:
            logger.warning("Failed to send message to websocket", error=str(e))
    
    async def _send_session_state(self, websocket: websockets.WebSocketServerProtocol, session_id: str):
        """Send current session state to new user"""
        try:
            # Get recent session events from Redis
            events = await self._get_session_events(session_id, limit=50)
            
            state_message = {
                "type": "session_state",
                "session_id": session_id,
                "events": events,
                "user_count": self.session_metadata.get(session_id, {}).get("user_count", 0)
            }
            
            await websocket.send(json.dumps(state_message))
            
        except Exception as e:
            logger.error("Failed to send session state", session_id=session_id, error=str(e))
    
    async def _store_session_event(self, session_id: str, event_data: Dict[str, Any]):
        """Store session event in Redis"""
        try:
            # Store in a Redis list with TTL
            key = f"session:{session_id}:events"
            await self.redis_client.lpush(key, json.dumps(event_data))
            
            # Keep only last 1000 events
            await self.redis_client.ltrim(key, 0, 999)
            
            # Set TTL for 24 hours
            await self.redis_client.expire(key, 86400)
            
        except Exception as e:
            logger.warning("Failed to store session event", 
                          session_id=session_id, error=str(e))
    
    async def _get_session_events(self, session_id: str, limit: int = 50) -> list:
        """Get recent session events"""
        try:
            key = f"session:{session_id}:events"
            events = await self.redis_client.lrange(key, 0, limit - 1)
            return [json.loads(event) for event in events]
        except Exception as e:
            logger.warning("Failed to get session events", 
                          session_id=session_id, error=str(e))
            return []
    
    async def _handle_pubsub_messages(self):
        """Handle Redis pubsub messages for cross-server synchronization"""
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        session_id = data.get("session_id")
                        user_id = data.get("user_id")
                        
                        # Broadcast to local session users (except the originator)
                        if session_id in self.active_sessions:
                            await self._broadcast_to_session(session_id, data, exclude_user=user_id)
                            
                    except json.JSONDecodeError:
                        logger.warning("Invalid JSON in pubsub message")
                    except Exception as e:
                        logger.error("Error handling pubsub message", error=str(e))
                        
        except Exception as e:
            logger.error("Error in pubsub message handler", error=str(e))
    
    async def get_active_sessions(self) -> Dict[str, Any]:
        """Get list of active collaboration sessions"""
        sessions = {}
        
        for session_id, users in self.active_sessions.items():
            metadata = self.session_metadata.get(session_id, {})
            sessions[session_id] = {
                "user_count": len(users),
                "created_at": metadata.get("created_at"),
                "users": list(users.keys())
            }
        
        return {
            "total_sessions": len(sessions),
            "total_users": sum(s["user_count"] for s in sessions.values()),
            "sessions": sessions
        }
    
    async def create_session(self) -> str:
        """Create a new collaboration session"""
        session_id = str(uuid.uuid4())
        
        # Store session metadata in Redis
        session_data = {
            "id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": "system"
        }
        
        await self.redis_client.setex(
            f"session:{session_id}:metadata",
            86400,  # 24 hours TTL
            json.dumps(session_data)
        )
        
        logger.info("New collaboration session created", session_id=session_id)
        return session_id
    
    async def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        try:
            # Get from Redis
            metadata = await self.redis_client.get(f"session:{session_id}:metadata")
            if metadata:
                session_info = json.loads(metadata)
                
                # Add current activity
                session_info["active_users"] = len(self.active_sessions.get(session_id, {}))
                session_info["is_active"] = session_id in self.active_sessions
                
                return session_info
                
        except Exception as e:
            logger.warning("Failed to get session info", session_id=session_id, error=str(e))
        
        return None
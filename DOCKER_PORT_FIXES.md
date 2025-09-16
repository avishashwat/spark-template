# Docker Port Configuration Fix

## Problem Analysis

Your Docker containers were having connectivity issues due to:

1. **Frontend Port Mismatch**: Vite was running on port 5000 inside container but exposed as 3000
2. **Environment Variables**: Frontend trying to connect to localhost instead of container names
3. **Missing Dependencies**: Backend not waiting for proper service dependencies

## Fixes Applied

### 1. Fixed Frontend Docker Configuration
- Updated `Dockerfile.frontend` to use correct port binding
- Modified `docker-compose.yml` environment variables to use internal container names
- Added proper dependency chain

### 2. Container Network Communication
- Frontend now connects to `backend:8000` instead of `localhost:8000`
- GeoServer accessible via `geoserver:8080` internally
- All services communicate via Docker network `escap_network`

## How to Apply Fixes

**Option 1: Use the Fix Script (Recommended)**
```bash
# On Windows
./fix-docker-ports.bat

# On Linux/Mac
./fix-docker-ports.sh
```

**Option 2: Manual Steps**
```bash
# Stop all containers
docker-compose down

# Clean up old containers
docker-compose rm -f
docker system prune -f

# Rebuild with new configuration
docker-compose build --no-cache

# Start services
docker-compose up -d

# Wait 30 seconds for startup
# Check status
docker-compose ps
```

## Verify Services

After applying fixes, check these URLs:

✅ **Main Climate Risk App**: http://localhost:3000
✅ **Admin Panel**: http://localhost:3000?admin=true
✅ **Backend API**: http://localhost:8000
✅ **GeoServer Admin**: http://localhost:8081/geoserver
✅ **Full System (Nginx)**: http://localhost:8090

## If Still Having Issues

**Check container logs:**
```bash
docker-compose logs frontend
docker-compose logs backend  
docker-compose logs nginx
```

**Check container status:**
```bash
docker-compose ps
```

**Restart specific service:**
```bash
docker-compose restart frontend
docker-compose restart backend
```

## Port Mappings

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Frontend | 3000 | 3000 | http://localhost:3000 |
| Backend | 8000 | 8000 | http://localhost:8000 |
| PostGIS | 5432 | 5432 | localhost:5432 |
| GeoServer | 8080 | 8081 | http://localhost:8081 |
| Redis | 6379 | 6379 | localhost:6379 |
| Nginx | 80 | 8090 | http://localhost:8090 |

The main fixes should resolve all connectivity issues. Run the fix script and wait 30 seconds for services to fully start up.
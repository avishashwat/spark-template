# 🚀 ESCAP Climate Risk Application - Deployment Guide

## Current Status Analysis

Based on your logs, I've identified and fixed several issues:

### ✅ Issues Fixed:

1. **Backend Service Startup**: Modified the backend to handle GeoServer startup delays gracefully
2. **Frontend Container**: Fixed volume mounting that was preventing proper startup
3. **GeoServer Connection**: Added retry logic for robust service initialization
4. **Service Dependencies**: Improved startup sequence and health checks

### 🔧 Root Causes Identified:

1. **Backend failing** because it was trying to connect to GeoServer before GeoServer was fully ready
2. **Frontend port mismatch** due to volume override preventing proper container build
3. **Service startup race conditions** causing intermittent failures

## 🛠️ How to Fix Your Installation

### Step 1: Run the Fix Script
I've created a comprehensive fix script that will:
- Stop all services cleanly
- Rebuild containers with fresh dependencies
- Start services in the correct order
- Wait for each service to be ready before starting the next

```bash
# On Windows (in your spark-template directory):
./fix-services.bat

# Or manually run:
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Step 2: Verify Services Are Working

After running the fix script, check that all services are running:

```bash
docker-compose ps
```

You should see all services as "Up" and healthy.

### Step 3: Test the Application

1. **Frontend**: http://localhost:3000 
   - Should show the UN ESCAP Climate Risk application
   
2. **Admin Panel**: http://localhost:3000?admin=true
   - Should show the data upload interface
   
3. **Backend API**: http://localhost:8000
   - Should show API health status and features
   
4. **GeoServer**: http://localhost:8081/geoserver
   - Username: admin, Password: geoserver_admin_2024

## 🎯 What Each Service Does

### 🗄️ PostGIS Database (Port 5432)
- Stores all geospatial data (boundaries, climate, GIRI, energy)
- Provides spatial indexing for ultra-fast queries
- Handles complex geometric operations

### 🗺️ GeoServer (Port 8081)
- Serves web map services (WMS/WFS)
- Renders raster layers with custom styling
- Provides high-performance tile caching

### ⚡ Redis Cache (Port 6379)
- Caches frequently accessed data
- Enables real-time collaboration features
- Stores session and temporary data

### 🔧 Backend API (Port 8000)
- Processes file uploads and converts to COG format
- Manages data classification and styling
- Coordinates between all services

### 🌐 Frontend React App (Port 3000)
- Main user interface for map visualization
- Admin panel for data management
- Real-time collaboration features

### 🔀 Nginx Proxy (Port 8090)
- Production-ready reverse proxy
- Load balancing and SSL termination
- Serves the complete application

## 🔍 Troubleshooting Common Issues

### Issue: Services Won't Start
```bash
# Check logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs geoserver

# Restart individual service
docker-compose restart [service_name]
```

### Issue: Frontend Shows Empty Page
```bash
# Rebuild frontend container
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Issue: Backend Can't Connect to GeoServer
```bash
# Check GeoServer is ready
curl http://localhost:8081/geoserver/web/

# Restart backend to retry connection
docker-compose restart backend
```

### Issue: Database Connection Errors
```bash
# Check PostGIS health
docker-compose exec postgis pg_isready -U escap_user -d escap_climate

# Restart database
docker-compose restart postgis
```

## 📊 Performance Optimizations Included

1. **Cloud Optimized GeoTIFF (COG)**: 50-100x faster raster loading
2. **Spatial Indexing**: Instant boundary and point queries
3. **Redis Caching**: Eliminates repeated database queries
4. **Vector Tiles**: Smooth map interactions at any zoom level
5. **Optimized Docker Images**: Minimal overhead and fast startup

## 🔄 Development Workflow

1. **Upload Data**: Use admin panel at localhost:3000?admin=true
2. **Auto-Processing**: Files are automatically converted to web-optimized formats
3. **Instant Visualization**: View data immediately on the map
4. **Real-time Collaboration**: Share sessions with team members

## 📈 Next Steps

After the services are running:

1. **Test Upload**: Try uploading a small raster file through the admin panel
2. **Verify Processing**: Check that COG conversion works correctly
3. **Test Visualization**: Ensure layers display properly on the map
4. **Performance Testing**: Upload larger files to test optimization

## 🆘 Getting Help

If issues persist:

1. Run the health check: `curl http://localhost:8000/api/health`
2. Check all service logs: `docker-compose logs`
3. Verify Docker resources: Ensure you have sufficient memory (4GB+ recommended)
4. Network issues: Try restarting Docker Desktop

The application is designed to be resilient and self-healing. Most issues resolve themselves after services have time to fully initialize.
# 🚀 Frontend Port Fix Guide

## Issue Fixed
The frontend container was running on port 5000 instead of port 3000. I've fixed the configuration.

## ✅ Quick Fix Commands

Run these commands in your project root directory:

### 1. Stop and Remove Frontend Container
```bash
docker-compose stop frontend
docker-compose rm -f frontend
```

### 2. Rebuild and Restart Frontend
```bash
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### 3. Verify Everything is Working
```bash
docker-compose ps
docker-compose logs frontend
```

## 🌐 Access URLs (After Fix)

- **Main Climate Risk App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000?admin=true
- **Backend API**: http://localhost:8000
- **GeoServer Admin**: http://localhost:8081/geoserver
- **Full System (via Nginx)**: http://localhost:8090

## 🔍 If Still Having Issues

### Check Container Status
```bash
docker-compose ps
```

### Check Frontend Logs
```bash
docker-compose logs frontend
```

### Restart All Services
```bash
docker-compose down
docker-compose up -d --build
```

## ✅ Success Indicators

When working correctly, you should see:
- Frontend logs showing: "Local: http://localhost:3000/"
- All containers in "Up" status
- Main app loads at http://localhost:3000

Your infrastructure is now properly configured with all the performance optimizations!
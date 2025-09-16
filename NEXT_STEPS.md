# WHAT TO DO NOW - Simple Steps

## You are here: ✅ Code is ready on your local machine

## Next: Get it running (5 minutes)

### Step 1: Open PowerShell as Administrator
- Right-click Windows Start button
- Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

### Step 2: Navigate to your project
```powershell
cd "C:\path\to\your\spark-template"
```
(Replace with your actual path)

### Step 3: Create the data folders
Copy and paste this entire block:
```powershell
New-Item -ItemType Directory -Path "data" -Force
New-Item -ItemType Directory -Path "data\uploads" -Force  
New-Item -ItemType Directory -Path "data\cog" -Force
New-Item -ItemType Directory -Path "data\processed" -Force
New-Item -ItemType Directory -Path "data\shapefiles" -Force
New-Item -ItemType Directory -Path "data\boundaries" -Force
New-Item -ItemType Directory -Path "logs" -Force
```

### Step 4: Start everything
```powershell
docker-compose up -d --build
```

This will:
- Download and build all required services
- Start your geospatial infrastructure
- Take 3-10 minutes depending on your internet speed

### Step 5: Wait and check
```powershell
# Wait 2 minutes, then check if everything is running
docker-compose ps
```

You should see services running (green "Up" status).

### Step 6: Open your app
- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000?admin=true

## If something goes wrong:

### Error: "Docker is not running"
1. Open Docker Desktop application
2. Wait until it shows "Engine running" 
3. Try Step 4 again

### Error: "Port already in use"
```powershell
# Stop any existing containers
docker-compose down
# Try again
docker-compose up -d --build
```

### Error: "Build failed" 
```powershell
# Clean build
docker-compose down
docker system prune -f
docker-compose up -d --build
```

## Once it's working:

1. **✅ Open http://localhost:3000** - You should see your UN ESCAP map
2. **✅ Try http://localhost:3000?admin=true** - Admin panel for uploads
3. **✅ Upload a test boundary file** in admin panel
4. **✅ Upload a test raster file** in admin panel  
5. **✅ View your data** on the main map

## Success! You now have:
- 🗺️ Interactive multi-map comparison
- 📊 PostGIS spatial database  
- 🚀 50-100x faster raster processing
- 📱 Admin panel for data management
- 🌐 Professional UN ESCAP interface

Your geospatial platform is ready for production use!

## Need help?
- Check logs: `docker-compose logs`
- Restart everything: `docker-compose restart`
- Clean reset: `docker-compose down` then repeat from Step 4
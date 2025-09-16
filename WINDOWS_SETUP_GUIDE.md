# Windows Setup Guide for UN ESCAP Climate Risk Platform

## Quick Start (Recommended)

### Prerequisites
1. **Install Docker Desktop**: Download from https://www.docker.com/products/docker-desktop/
2. **Start Docker Desktop**: Make sure it's running (you'll see the Docker whale icon in your system tray)
3. **Enable WSL 2**: Docker Desktop will guide you through this if needed

### One-Click Setup

#### Option 1: PowerShell (Recommended)
1. Open **PowerShell** as Administrator
2. Navigate to your project folder:
   ```powershell
   cd path\to\your\spark-template
   ```
3. Run the setup script:
   ```powershell
   .\scripts\setup-windows.ps1
   ```

#### Option 2: Command Prompt
1. Open **Command Prompt** as Administrator
2. Navigate to your project folder:
   ```cmd
   cd path\to\your\spark-template
   ```
3. Run the setup script:
   ```cmd
   scripts\setup-windows.bat
   ```

That's it! The script will:
- ✅ Check Docker is running
- ✅ Create all necessary folders
- ✅ Build and start all services
- ✅ Show you access URLs

## Manual Setup (Alternative)

If you prefer to run commands manually:

### 1. Create Directories (PowerShell)
```powershell
New-Item -ItemType Directory -Path "data" -Force
New-Item -ItemType Directory -Path "data\uploads" -Force
New-Item -ItemType Directory -Path "data\cog" -Force
New-Item -ItemType Directory -Path "data\processed" -Force
New-Item -ItemType Directory -Path "data\shapefiles" -Force
New-Item -ItemType Directory -Path "data\boundaries" -Force
New-Item -ItemType Directory -Path "logs" -Force
```

### 1. Create Directories (Command Prompt)
```cmd
mkdir data
mkdir data\uploads
mkdir data\cog  
mkdir data\processed
mkdir data\shapefiles
mkdir data\boundaries
mkdir logs
```

### 2. Start Infrastructure
```cmd
docker-compose up -d --build
```

### 3. Check Status
```cmd
docker-compose ps
```

## Access Your Application

Once setup is complete, access these URLs:

- **🌍 Main Application**: http://localhost:3000
- **⚙️ Admin Panel**: http://localhost:3000?admin=true
- **🗺️ GeoServer**: http://localhost:8080/geoserver
  - Username: `admin`
  - Password: `geoserver_admin_2024`
- **🗄️ Database**: localhost:5432
  - Database: `escap_climate`
  - Username: `escap_user`
  - Password: `escap_password_2024`

## What's Running?

Your infrastructure includes:
- **Frontend**: React app with OpenLayers maps
- **Backend**: FastAPI with geospatial processing
- **Database**: PostGIS for spatial data
- **GeoServer**: Map tile server
- **Redis**: Caching layer
- **Nginx**: Reverse proxy

## Testing Your Setup

1. **Open the app**: http://localhost:3000
2. **Switch to admin**: Add `?admin=true` to the URL
3. **Upload test data**: Try uploading a small raster or shapefile
4. **View on map**: Switch back to main app to see your data

## Troubleshooting

### Docker Issues
```cmd
# Restart Docker Desktop and try again
docker-compose down
docker-compose up -d --build
```

### Port Conflicts
If ports are already in use, edit `docker-compose.yml` to change:
- `3000:3000` → `3001:3000` (frontend)
- `8000:8000` → `8001:8000` (backend)
- `5432:5432` → `5433:5432` (database)

### Check Logs
```cmd
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs geoserver
docker-compose logs postgis
```

### Clean Start
```cmd
# Stop everything
docker-compose down

# Remove old data (⚠️ Warning: This deletes all uploaded data)
rmdir /s data
rmdir /s logs

# Start fresh
.\scripts\setup-windows.ps1
```

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Performance Optimization

For better performance on Windows:
1. **Enable WSL 2**: Much faster than Hyper-V
2. **Allocate resources**: Docker Desktop → Settings → Resources
   - Memory: 4GB+ recommended
   - CPU: 2+ cores recommended
3. **Store project in WSL**: Move your project to `\\wsl$\Ubuntu\home\username\` for faster file access

## Next Steps

1. **Upload your first dataset** via admin panel
2. **Test map visualization** with your data
3. **Configure country boundaries** for your regions
4. **Set up classification schemes** for your rasters

Your geospatial infrastructure is now ready for production use! 🚀

## Common Windows-Specific Issues

### File Path Issues
- Use backslashes `\` in Windows paths
- Use forward slashes `/` in Docker volume paths
- Avoid spaces in folder names

### WSL Integration
If using WSL 2 with Docker:
```bash
# In WSL terminal
cd /mnt/c/path/to/your/project
./scripts/deploy.sh
```

### Antivirus Software
Some antivirus software blocks Docker operations:
- Add Docker Desktop to exceptions
- Add project folder to exceptions
- Temporarily disable real-time protection during setup
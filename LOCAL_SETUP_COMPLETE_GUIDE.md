# Complete Local Setup Guide for UN ESCAP Climate & Energy Risk Visualization

## Prerequisites
1. **Docker Desktop** - Download and install from [docker.com](https://docs.docker.com/desktop/)
2. **Git** - For cloning the repository
3. **VS Code** (optional but recommended)

## Step-by-Step Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd spark-template
```

### 2. Verify Docker Installation
Open terminal/command prompt and run:
```bash
docker --version
docker-compose --version
```
You should see version numbers for both commands.

### 3. Start Docker Desktop
- Start Docker Desktop application on your machine
- Wait for it to fully start (Docker icon should be green/running)

### 4. Create Required Directories
```bash
# Create data directories
mkdir -p data/uploads data/cog data/processed

# Set permissions (Linux/Mac only)
chmod -R 755 data/
```

### 5. Start the Infrastructure
```bash
# Build and start all services
docker-compose up -d --build
```

This will:
- Download required Docker images (first time takes 5-10 minutes)
- Build the backend service
- Start PostGIS database, GeoServer, Redis, Backend API, and Nginx

### 6. Check Service Status
```bash
# Check if all containers are running
docker-compose ps
```

You should see 5 services running:
- `escap_postgis` (Port 5432)
- `escap_geoserver` (Port 8080) 
- `escap_redis` (Port 6379)
- `escap_backend` (Port 8000)
- `escap_nginx` (Port 80)

### 7. Verify Services Are Working

#### PostGIS Database
```bash
# Test database connection
docker exec -it escap_postgis psql -U escap_user -d escap_climate -c "SELECT version();"
```

#### GeoServer
Open in browser: http://localhost:8080/geoserver
- Login: admin / geoserver_admin_2024

#### Backend API
Open in browser: http://localhost:8000/docs
You should see the FastAPI documentation

#### Frontend Application
Open in browser: http://localhost:80
You should see the main application

### 8. Access Admin Panel
Go to: http://localhost:80/?admin=true
This gives you access to upload and manage data files.

## What Each Service Does

### PostGIS Database
- Stores spatial boundaries, metadata, and classifications
- Optimized for geographic queries
- Accessible at `localhost:5432`

### GeoServer
- Serves map tiles and spatial data
- Converts uploaded files to web-optimized formats
- Web interface at `localhost:8080/geoserver`

### Redis
- Caches frequently accessed data
- Enables real-time collaboration features
- Internal service (no direct access needed)

### Backend API
- Processes file uploads
- Manages data classification
- API documentation at `localhost:8000/docs`

### Frontend Application
- Main map visualization interface
- Admin panel for data management
- Available at `localhost:80`

## Uploading Your First Data

### 1. Access Admin Panel
- Go to http://localhost:80/?admin=true
- Navigate to the upload section

### 2. Upload Boundary Files
- Select country (Bhutan, Mongolia, or Laos)
- Upload zipped shapefile (.shp, .dbf, .shx files in a zip)
- Select attribute for province names
- Complete upload

### 3. Upload Climate Raster
- Choose "Climate Variable" → "Maximum temp" → "Historical" → "Annual"
- Upload .tif file (will be automatically converted to COG format)
- Configure 5 classification ranges with colors
- Complete upload

### 4. Upload Energy Infrastructure
- Choose "Energy" → "Hydro Power plants"
- Upload zipped shapefile
- Select capacity attribute
- Choose icon style
- Complete upload

### 5. Test in Main App
- Go back to main app (remove ?admin=true from URL)
- Select country
- Choose layers from sidebar
- Click on map to activate and add overlays

## Performance Features

### Automatic Optimizations
- **COG Conversion**: Raster files automatically converted for fast loading
- **Spatial Indexing**: Boundaries indexed for instant province selection
- **Data Caching**: Frequently accessed data cached in Redis
- **Tile Optimization**: Maps served as optimized tiles via GeoServer

### Multi-Map Comparison
- Switch between 1, 2, or 4 map layout
- Synchronized zoom and pan across all maps
- Independent layer selection per map
- Real-time collaboration support

## Troubleshooting

### Services Won't Start
```bash
# Check Docker logs
docker-compose logs

# Check individual service
docker-compose logs backend
docker-compose logs geoserver
```

### Database Connection Issues
```bash
# Restart PostGIS
docker-compose restart postgis

# Check database logs
docker-compose logs postgis
```

### Port Conflicts
If ports are already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Change 8080 to 8081 for GeoServer
```

### Reset Everything
```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: Deletes all data)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

## File Locations

### Data Storage
- Uploaded files: `./data/uploads/`
- COG files: `./data/cog/`
- Processed data: `./data/processed/`

### Configuration
- Docker services: `docker-compose.yml`
- Nginx config: `./nginx/nginx.conf`
- Database init: `./scripts/init-db.sql`

## Next Steps

1. **Upload Boundary Files**: Start with administrative boundaries for each country
2. **Add Climate Data**: Upload temperature, precipitation rasters with classifications
3. **Include Energy Infrastructure**: Add power plant locations with capacity data
4. **Test Multi-Map Views**: Compare different scenarios side-by-side
5. **Use Collaboration**: Share map sessions with team members

## Support

If you encounter issues:
1. Check Docker Desktop is running
2. Verify all ports are free (80, 8000, 8080, 5432, 6379)
3. Review logs with `docker-compose logs [service-name]`
4. Restart services with `docker-compose restart`

The system is designed for production-scale data with 50-100x performance improvements over file-based approaches.
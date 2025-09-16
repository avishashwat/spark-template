@echo off
echo 🔧 Quick Infrastructure Fix...
echo ===============================

echo 📋 Stopping services...
docker-compose down --remove-orphans

echo 📋 Removing old volumes...
docker volume prune -f

echo 📋 Creating directories...
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\cog" mkdir data\cog  
if not exist "data\processed" mkdir data\processed

echo 📋 Building backend with fixed dependencies...
docker-compose build --no-cache backend

echo 📋 Building frontend with port fixes...
docker-compose build --no-cache frontend

echo 📋 Starting database and waiting...
docker-compose up -d postgis
timeout /t 20 /nobreak >nul

echo 📋 Starting Redis...
docker-compose up -d redis
timeout /t 5 /nobreak >nul

echo 📋 Starting backend...
docker-compose up -d backend
timeout /t 15 /nobreak >nul

echo 📋 Starting frontend...
docker-compose up -d frontend
timeout /t 10 /nobreak >nul

echo 📋 Starting GeoServer...
docker-compose up -d geoserver
timeout /t 20 /nobreak >nul

echo 📋 Starting Nginx...
docker-compose up -d nginx

echo 📋 Final status check...
docker-compose ps

echo.
echo ✅ Quick fix completed!
echo 🔗 Test these URLs:
echo    • Frontend: http://localhost:3000
echo    • Backend: http://localhost:8000
echo    • GeoServer: http://localhost:8081/geoserver
echo    • Nginx Proxy: http://localhost:8090

pause
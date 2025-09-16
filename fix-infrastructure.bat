@echo off
echo 🔧 Fixing ESCAP Infrastructure Issues...
echo =======================================

echo 📋 Step 1: Stopping all containers...
docker-compose down

echo 📋 Step 2: Removing old volumes...
docker volume prune -f

echo 📋 Step 3: Creating required directories...
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\cog" mkdir data\cog
if not exist "data\processed" mkdir data\processed

echo 📋 Step 4: Fixing backend configuration...
echo Updating backend dependencies...

echo 📋 Step 5: Building fresh images...
docker-compose build --no-cache backend frontend

echo 📋 Step 6: Starting services in order...
echo Starting database first...
docker-compose up -d postgis

echo Waiting for database to be ready...
timeout /t 15 /nobreak >nul

echo Starting Redis...
docker-compose up -d redis

echo Waiting for Redis to be ready...
timeout /t 5 /nobreak >nul

echo Starting backend...
docker-compose up -d backend

echo Waiting for backend to be ready...
timeout /t 10 /nobreak >nul

echo Starting frontend...
docker-compose up -d frontend

echo Waiting for frontend to be ready...
timeout /t 10 /nobreak >nul

echo Starting GeoServer...
docker-compose up -d geoserver

echo Waiting for GeoServer to be ready...
timeout /t 20 /nobreak >nul

echo Starting Nginx...
docker-compose up -d nginx

echo 📋 Step 7: Checking service status...
docker-compose ps

echo ✅ Infrastructure fix completed!
echo.
echo 🔗 Your services should now be available at:
echo    • Main App: http://localhost:3000
echo    • Admin Panel: http://localhost:3000?admin=true
echo    • Backend API: http://localhost:8000
echo    • GeoServer: http://localhost:8081/geoserver
echo    • Full System: http://localhost:8090

pause
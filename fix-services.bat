@echo off
echo =====================================================
echo 🔧 ESCAP Climate Risk Application - Service Fix
echo =====================================================

echo.
echo 🛑 Stopping all services...
docker-compose down

echo.
echo 🧹 Cleaning up containers and images...
docker-compose rm -f
docker system prune -f

echo.
echo 📦 Rebuilding containers with fresh dependencies...
docker-compose build --no-cache --parallel

echo.
echo 🚀 Starting services with proper startup order...
echo.

echo 📊 Starting database and cache services first...
docker-compose up -d postgis redis

echo.
echo ⏳ Waiting for database to be ready...
timeout /t 15 /nobreak > nul

echo.
echo 🗺️  Starting GeoServer...
docker-compose up -d geoserver

echo.
echo ⏳ Waiting for GeoServer to initialize...
timeout /t 20 /nobreak > nul

echo.
echo 🔧 Starting backend API...
docker-compose up -d backend

echo.
echo ⏳ Waiting for backend to start...
timeout /t 10 /nobreak > nul

echo.
echo 🌐 Starting frontend...
docker-compose up -d frontend

echo.
echo 🔀 Starting nginx proxy...
docker-compose up -d nginx

echo.
echo ⏳ Waiting for all services to stabilize...
timeout /t 15 /nobreak > nul

echo.
echo 📋 Checking service status...
docker-compose ps

echo.
echo ✅ Service fix completed!
echo.
echo 🔗 Available URLs:
echo    • Main App: http://localhost:3000
echo    • Admin Panel: http://localhost:3000?admin=true
echo    • Backend API: http://localhost:8000
echo    • GeoServer: http://localhost:8081/geoserver
echo    • Full System: http://localhost:8090
echo.
echo 📝 To check logs: docker-compose logs [service_name]
echo 📝 To restart a service: docker-compose restart [service_name]
echo.
pause
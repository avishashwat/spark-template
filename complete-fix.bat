@echo off
echo 🚀 Complete Infrastructure Fix and Restart
echo ==========================================

echo 🛑 Stopping all services...
docker-compose down

echo 🗑️ Cleaning up containers and images...
docker-compose rm -f
docker system prune -f

echo 📁 Creating required directories...
if not exist "data\uploads" mkdir data\uploads
if not exist "data\cog" mkdir data\cog  
if not exist "data\processed" mkdir data\processed

echo 🔨 Rebuilding all services with latest changes...
docker-compose build --no-cache

echo 🚀 Starting all services...
docker-compose up -d

echo ⏳ Waiting for services to initialize...
timeout /t 30

echo 📊 Checking service status...
docker-compose ps

echo 🔍 Checking service health...
echo.
echo Checking backend health...
curl -s http://localhost:8000/health || echo Backend not ready yet

echo.
echo Checking frontend...
curl -s http://localhost:3000 || echo Frontend not ready yet

echo.
echo ✅ Services should now be available at:
echo    • Main Climate Risk App: http://localhost:3000
echo    • Admin Panel: http://localhost:3000?admin=true  
echo    • Backend API: http://localhost:8000
echo    • GeoServer Admin: http://localhost:8081/geoserver
echo    • Full System (via Nginx): http://localhost:8090

echo.
echo 📝 If there are still issues, check logs with:
echo    docker-compose logs [service-name]

pause
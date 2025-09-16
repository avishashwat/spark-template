@echo off
echo 🚀 Deploying ESCAP Climate Risk Infrastructure with Frontend...
echo ============================================================

echo 🛑 Stopping existing containers...
docker-compose down

echo 🧹 Cleaning up old resources...
docker system prune -f

echo 📁 Creating directory structure...
if not exist "data\uploads" mkdir data\uploads
if not exist "data\cog" mkdir data\cog  
if not exist "data\processed" mkdir data\processed

echo 🏗️ Building and starting all services...
docker-compose up -d --build

echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak > nul

echo 📊 Checking service status...
docker-compose ps

echo.
echo ✅ Infrastructure deployment complete!
echo.
echo 🌐 Access points:
echo   📱 Main Climate Risk App: http://localhost:3000
echo   🔧 Admin Panel: http://localhost:3000?admin=true  
echo   🗺️ GeoServer Admin: http://localhost:8081/geoserver
echo      - Username: admin
echo      - Password: geoserver_admin_2024
echo   🔗 Backend API: http://localhost:8000
echo   🌍 Full System (via Nginx): http://localhost:8090
echo.
echo 📈 To monitor logs: docker-compose logs -f [service_name]
echo 🛑 To stop all services: docker-compose down
echo.
echo 🎉 Your climate risk visualization platform is now ready!
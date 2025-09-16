@echo off
echo 🏥 ESCAP Climate Risk Application - Health Check
echo ================================================

echo.
echo 📊 Checking Docker services...
docker-compose ps

echo.
echo 🌐 Testing service endpoints...

echo.
echo 🔧 Backend API Health:
curl -s -w "Status: %%{http_code}\n" http://localhost:8000 -o nul

echo.
echo 📊 Backend Detailed Health:
curl -s http://localhost:8000/api/health

echo.
echo 🗺️  GeoServer Status:
curl -s -w "Status: %%{http_code}\n" http://localhost:8081/geoserver/web/ -o nul

echo.
echo 💾 Database Connection:
docker-compose exec -T postgis pg_isready -U escap_user -d escap_climate

echo.
echo 🚀 Frontend Status:
curl -s -w "Status: %%{http_code}\n" http://localhost:3000 -o nul

echo.
echo 🔀 Nginx Proxy Status:
curl -s -w "Status: %%{http_code}\n" http://localhost:8090 -o nul

echo.
echo ===============================================
echo ✅ Health check completed!
echo.
echo 🔗 If all services show status 200, try these URLs:
echo    • Main App: http://localhost:3000
echo    • Admin Panel: http://localhost:3000?admin=true  
echo    • Backend API: http://localhost:8000
echo    • GeoServer: http://localhost:8081/geoserver
echo.
pause
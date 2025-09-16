@echo off
echo 🔍 Checking Service Connectivity...
echo ==================================

echo Testing Frontend (port 3000)...
curl -s -o nul -w "Frontend: %%{http_code}\n" http://localhost:3000 || echo Frontend: FAILED

echo Testing Backend API (port 8000)...
curl -s -o nul -w "Backend: %%{http_code}\n" http://localhost:8000 || echo Backend: FAILED

echo Testing GeoServer (port 8081)...
curl -s -o nul -w "GeoServer: %%{http_code}\n" http://localhost:8081/geoserver || echo GeoServer: FAILED

echo Testing Nginx Proxy (port 8090)...
curl -s -o nul -w "Nginx: %%{http_code}\n" http://localhost:8090 || echo Nginx: FAILED

echo.
echo 📊 Container Status:
docker-compose ps

echo.
echo ℹ️  If any service shows FAILED or non-200 status codes:
echo    1. Run fix-docker-ports.bat
echo    2. Wait 30 seconds for startup
echo    3. Run this script again

pause
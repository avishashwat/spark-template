@echo off
echo 🔍 Infrastructure Status Check
echo ==============================

echo 📊 Docker Compose Status:
docker-compose ps

echo.
echo 🌐 Service Health Checks:
echo.

echo Checking Main App (Frontend)...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3000 && echo " ✅ Frontend OK" || echo " ❌ Frontend Failed"

echo Checking Backend API...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8000 && echo " ✅ Backend OK" || echo " ❌ Backend Failed"

echo Checking GeoServer...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8081/geoserver && echo " ✅ GeoServer OK" || echo " ❌ GeoServer Failed"

echo Checking Nginx Proxy...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8090 && echo " ✅ Nginx OK" || echo " ❌ Nginx Failed"

echo.
echo 📝 Available URLs:
echo    • Main App: http://localhost:3000
echo    • Admin Panel: http://localhost:3000?admin=true
echo    • Backend API: http://localhost:8000  
echo    • GeoServer: http://localhost:8081/geoserver
echo    • Full System: http://localhost:8090

echo.
echo 📋 To check logs for a specific service:
echo    docker-compose logs [frontend^|backend^|geoserver^|nginx^|postgis^|redis]

pause
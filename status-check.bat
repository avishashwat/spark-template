@echo off
echo 🔍 Infrastructure Status Check
echo ==============================

echo 📋 Container Status:
docker-compose ps

echo.
echo 📋 Service Health Checks:
echo.

echo Checking Frontend (port 3000)...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3000
if %ERRORLEVEL%==0 (
    echo ✅ Frontend OK
) else (
    echo ❌ Frontend Failed
)
echo.

echo Checking Backend (port 8000)...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8000
if %ERRORLEVEL%==0 (
    echo ✅ Backend OK
) else (
    echo ❌ Backend Failed
)
echo.

echo Checking Backend Health...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8000/api/health
if %ERRORLEVEL%==0 (
    echo ✅ Backend Health OK
) else (
    echo ❌ Backend Health Failed
)
echo.

echo Checking GeoServer (port 8081)...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8081/geoserver
if %ERRORLEVEL%==0 (
    echo ✅ GeoServer OK
) else (
    echo ❌ GeoServer Failed
)
echo.

echo Checking Nginx Proxy (port 8090)...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8090
if %ERRORLEVEL%==0 (
    echo ✅ Nginx OK
) else (
    echo ❌ Nginx Failed
)
echo.

echo 📋 Latest Container Logs (last 5 lines each):
echo.
echo Backend logs:
docker-compose logs --tail=5 backend
echo.
echo Frontend logs:
docker-compose logs --tail=5 frontend
echo.

echo ==============================
echo 🔗 Available URLs:
echo    • Main App: http://localhost:3000
echo    • Admin Panel: http://localhost:3000?admin=true
echo    • Backend API: http://localhost:8000
echo    • GeoServer: http://localhost:8081/geoserver
echo    • Full System: http://localhost:8090

pause
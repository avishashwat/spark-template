@echo off
echo 🔧 Fixing backend dependencies...
echo =====================================

echo 🛑 Stopping backend service...
docker-compose stop backend

echo 🗑️ Removing existing backend container...
docker-compose rm -f backend

echo 🔨 Rebuilding backend with new dependencies...
docker-compose build --no-cache backend

echo 🚀 Starting backend service...
docker-compose up -d backend

echo ⏳ Waiting for backend to start...
timeout /t 10

echo 📊 Checking service status...
docker-compose ps

echo ✅ Backend should now be working!
echo 🌐 You can test it at: http://localhost:8000

echo 📝 Checking backend logs...
docker-compose logs --tail=20 backend

pause
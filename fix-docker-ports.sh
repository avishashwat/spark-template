#!/bin/bash

echo "🔧 Fixing Docker Configuration Issues..."
echo "====================================="

echo "📦 Stopping all containers..."
docker-compose down

echo "🧹 Removing old containers and images..."
docker-compose rm -f
docker system prune -f

echo "🔨 Rebuilding containers with correct configuration..."
docker-compose build --no-cache

echo "🚀 Starting infrastructure..."
docker-compose up -d

echo "⏱️ Waiting for services to start..."
sleep 30

echo "📊 Checking container status..."
docker-compose ps

echo "✅ Services should now be available at:"
echo "   • Main App: http://localhost:3000"
echo "   • Admin Panel: http://localhost:3000?admin=true"  
echo "   • Backend API: http://localhost:8000"
echo "   • GeoServer: http://localhost:8081/geoserver"
echo "   • Full System (Nginx): http://localhost:8090"

echo "🔍 Checking logs if any issues..."
docker-compose logs --tail=20 frontend
docker-compose logs --tail=20 backend
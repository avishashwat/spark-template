#!/bin/bash

# Quick Deploy Script with Frontend Support
# This script will build and start all services including the React frontend

echo "🚀 Setting up ESCAP Climate Risk Infrastructure with Frontend..."
echo "============================================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || docker compose down

# Clean up old containers and images (optional)
echo "🧹 Cleaning up old resources..."
docker system prune -f

# Create required directories
echo "📁 Creating directory structure..."
mkdir -p data/uploads data/cog data/processed

# Set permissions
echo "🔒 Setting permissions..."
chmod -R 755 data/

# Build and start all services
echo "🏗️ Building and starting all services..."
docker-compose up -d --build || docker compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose ps || docker compose ps

echo ""
echo "✅ Infrastructure deployment complete!"
echo ""
echo "🌐 Access points:"
echo "  📱 Main Climate Risk App: http://localhost:3000"
echo "  🔧 Admin Panel: http://localhost:3000?admin=true"  
echo "  🗺️ GeoServer Admin: http://localhost:8081/geoserver"
echo "     - Username: admin"
echo "     - Password: geoserver_admin_2024"
echo "  🔗 Backend API: http://localhost:8000"
echo "  🌍 Full System (via Nginx): http://localhost:8090"
echo ""
echo "📈 To monitor logs: docker-compose logs -f [service_name]"
echo "🛑 To stop all services: docker-compose down"
echo ""
echo "🎉 Your climate risk visualization platform is now ready!"
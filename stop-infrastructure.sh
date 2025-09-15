#!/bin/bash

echo "🛑 Stopping UN ESCAP Geospatial Infrastructure..."

# Stop all services
docker-compose down

echo "🧹 Cleaning up containers..."
docker-compose down --volumes --remove-orphans

echo "✅ Infrastructure stopped successfully"
echo ""
echo "💡 To restart the infrastructure, run:"
echo "   ./deploy-infrastructure.sh"
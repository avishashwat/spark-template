🔧 Docker Fix for GitHub Codespaces
=====================================

## The Problem
Docker in Codespaces needs special permission setup. You're getting "permission denied" errors.

## Quick Fix Commands
Run these commands one by one in your Codespaces terminal:

```bash
# Fix permissions
sudo chmod 666 /var/run/docker.sock

# Start Docker daemon
sudo dockerd --group=docker > /dev/null 2>&1 &

# Wait a moment
sleep 8

# Test if Docker works
docker info
```

## If That Doesn't Work
Try this alternative:

```bash
# Add yourself to docker group
sudo usermod -aG docker $USER

# Restart the shell (or just run)
newgrp docker

# Start docker
sudo dockerd > /dev/null 2>&1 &
sleep 5

# Test
docker info
```

## Once Docker Works
When you see Docker info without errors, run:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy the infrastructure
./scripts/deploy.sh
```

## What This Gives You
- ⚡ PostGIS database for instant boundary loading
- 🗺️ GeoServer for 50-100x faster raster rendering  
- 🔄 Real-time collaboration features
- 📊 Automated data processing pipeline

## If Problems Persist
Sometimes Codespaces needs a restart:
1. Close this codespace
2. Start a new one
3. Try the commands again

The infrastructure will give you massive performance improvements for your geospatial data!
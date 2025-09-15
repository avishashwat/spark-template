## Codespaces Docker Fix Guide

### The Problem
The Docker daemon is not running in your Codespaces environment. While Docker was installed, the service needs to be started manually.

### Quick Fix (Run these commands in your Codespaces terminal):

1. **Start Docker daemon:**
```bash
sudo dockerd > /dev/null 2>&1 &
```

2. **Wait 5 seconds for Docker to start:**
```bash
sleep 5
```

3. **Verify Docker is running:**
```bash
docker info
```

4. **If step 3 works, run the deployment:**
```bash
./scripts/deploy.sh
```

### Alternative if the above doesn't work:

1. **Try systemctl method:**
```bash
sudo systemctl start docker
sleep 3
docker info
```

2. **Or try service method:**
```bash
sudo service docker start
sleep 3
docker info
```

### Once Docker is running:

Run the deployment script:
```bash
cd /workspaces/spark-template
./scripts/deploy.sh
```

### Expected Results:
- All Docker containers will start
- Your app will be available at `http://localhost:3000`
- Admin panel at `http://localhost:3000?admin=true`
- GeoServer at `http://localhost:8080/geoserver`

### Troubleshooting:
If you still get errors, run:
```bash
docker-compose ps
docker-compose logs
```

This will show you which services are running and any error messages.

### Why This Happens:
GitHub Codespaces sometimes requires manual Docker daemon startup. This is normal and just needs to be done once per Codespaces session.
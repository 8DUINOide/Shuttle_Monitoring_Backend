#!/bin/bash

# Configuration
APP_DIR="/root/shuttle-monitoring-backend" # Change this to your app directory on the server
BRANCH="main"

echo "Starting deployment..."

# Navigate to app directory
cd $APP_DIR || { echo "Directory $APP_DIR not found"; exit 1; }

# Pull latest code
echo "Pulling latest changes from $BRANCH..."
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# Build and restart with Docker
echo "Building and restarting with Docker Compose..."
docker compose down
docker compose up -d --build

# Optional: Cleanup unused images to save space
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment finished successfully!"


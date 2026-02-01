# --- CONFIGURATION ---
$SERVER_IP = "188.166.176.16"
$SERVER_USER = "root"
$REMOTE_PATH = "~/shuttle-monitoring"
# ---------------------

Write-Host "--- Starting Fast Local Build & Deploy ---" -ForegroundColor Cyan

# Step 1: Build the JAR locally (using your computer's power!)
Write-Host "Step 1: Building project locally..." -ForegroundColor Green
mvn clean package -DskipTests

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please fix errors and try again." -ForegroundColor Red
    exit
}

# Step 2: Upload source code to server
Write-Host "Step 2: Uploading source code to server via SCP..." -ForegroundColor Green
# First ensure the directory exists
ssh "${SERVER_USER}@${SERVER_IP}" "mkdir -p ${REMOTE_PATH}"
# Upload src directory (this contains script.js and java files)
scp -r src "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/"
# Upload pom.xml and docker-compose.yml in case they changed
scp pom.xml docker-compose.yml "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/"

# Step 3: Trigger deployment on server
Write-Host "Step 3: Building and restarting containers on server..." -ForegroundColor Green
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${REMOTE_PATH} && docker compose up -d --build"

Write-Host "--- Deployment Complete! ---" -ForegroundColor Cyan
Write-Host "App is running at http://${SERVER_IP}:8080/"

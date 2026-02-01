# Server Deployment Guide

This guide explains how to deploy and update the Shuttle Monitoring Backend on your DigitalOcean server using the automated `deploy.sh` script.

## 🚀 One-Time Server Setup

If you are setting up a **new server**, follow these steps:

1.  **SSH into your server:**
    ```bash
    ssh root@188.166.176.16
    ```
2.  **Install Docker (if not already installed):**
    ```bash
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2
    sudo systemctl start docker
    sudo systemctl enable docker
    ```
3.  **Clone the repository:**
    ```bash
    git clone https://github.com/8DUINOide/Shuttle_Monitoring_Backend.git shuttle-monitoring
    cd shuttle-monitoring
    ```
4.  **Make the script executable:**
    ```bash
    chmod +x deploy.sh
    ```

---

## 🔄 How to Update the Server

Every time you push new code to the `main` branch on GitHub, follow these 2 steps to update your server:

### Step 1: Push Locally
On your **local computer**, run:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

### Step 2: Deploy on Server
On your **DigitalOcean server**, run:
```bash
cd ~/shuttle-monitoring
./deploy.sh
```

---

## 🛠️ What `deploy.sh` Does
When you run `./deploy.sh`, the script automatically:
1.  **Pulls** the latest code from GitHub (`git reset --hard origin/main`).
2.  **Rebuilds** the application using the `Dockerfile`.
3.  **Restarts** the Docker containers (`app` and `db`).
4.  **Performs Cleanup** by removing old Docker images to save disk space.

---

## 📂 Data Storage & Persistence
- **Database:** All data is stored in a Docker volume called `postgres_data`. It is **persistent**, meaning your data will not be lost when you update the app or restart the server.
- **Uploads:** Files uploaded to the app are stored in the `./uploads` directory on the server and are also persistent.

---

## 🔍 Troubleshooting
- **View Logs:** `docker compose logs -f app`
- **Check Status:** `docker compose ps`
- **Restart Everything:** `docker compose restart`

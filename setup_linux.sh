#!/bin/bash

# Vision Sentinel - Linux Setup Script
echo "--- Aegis Vision AI: Linux Initialization ---"

# 1. Update System
echo "[1/4] Updating package list..."
sudo apt-get update -y

# 2. Install System Dependencies (OpenCV & Python)
echo "[2/4] Installing system dependencies..."
sudo apt-get install -y python3-pip python3-dev libgl1-mesa-glx libglib2.0-0

# 3. Install Python Dependencies
echo "[3/4] Installing Python requirements..."
pip3 install -r requirements.txt

# 4. Permissions for Camera
echo "[4/4] Setting camera permissions..."
sudo usermod -a -G video $USER

echo "--- Setup Complete ---"
echo "Run the application with: python3 app.py"

@echo off
cd /d "%~dp0"
docker rm -f capstone_backend 2>nul
docker build -t capstone_backend .
docker run --rm -it -p 8000:8000 -v "%cd%:/app" --name capstone_backend capstone_backend
pause
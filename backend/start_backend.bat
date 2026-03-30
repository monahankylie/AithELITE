@echo off
cd /d "%~dp0"
docker run --rm -it -p 8000:8000 -v "%cd%:/app" --name capstone_backend capstone_backend
pause
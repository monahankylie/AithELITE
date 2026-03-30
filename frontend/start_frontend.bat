@echo off
cd /d "%~dp0"
docker rm -f frontend 2>nul
docker build -t frontend .
docker run --rm -it -p 3000:3000 --name frontend frontend
pause
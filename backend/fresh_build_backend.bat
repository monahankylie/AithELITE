@echo off
set CURRENT_DIR=%cd%
docker rm -f capstone_backend || true   
docker build -t capstone_backend .
echo Starting Backend Container...
docker run --rm -it ^
  -p 8000:8000 ^
  -v "%CURRENT_DIR%:/app" ^
  --name capstone_backend ^
  capstone_backend
pause
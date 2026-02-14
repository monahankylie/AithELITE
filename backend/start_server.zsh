docker rm -f capstone_backend || true   
docker build -t capstone_backend .
docker run --rm -it -p 8000:8000 --name capstone_backend capstone_backend
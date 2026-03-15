docker rm -f frontend || true   
docker build -t frontend .
docker run --rm -it -p 3000:3000 --name frontend frontend
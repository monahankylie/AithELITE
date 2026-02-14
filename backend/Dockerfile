FROM python:3.12-slim AS capstone_backend

WORKDIR /app

COPY requirements.txt /app

RUN pip install -r requirements.txt


CMD [ "python","server.py" ]
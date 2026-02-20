import requests
import firebase_admin
from firebase_admin import credentials, firestore, auth
import uvicorn  
from fastapi import FastAPI, BackgroundTasks, HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], #frontend on 3000 for testing
    allow_methods=["*"],
    allow_headers=["*"],
)

cred = credentials.Certificate("fbACC.json")  
firebase_admin.initialize_app(cred)
db = firestore.client()

def scrape_and_store(url):
    ##TODO
    return

@app.get("/")
def health_check():
    return {"status": "ok"}

def run_server():
    ##start server and listen for requests
    uvicorn.run(app, 
                 host="0.0.0.0", 
                 port=8000)


if __name__ == "__main__":
    run_server()


    
import requests
from data_structures.Scraper import Scraper_Task
import firebase_admin
from firebase_admin import credentials, firestore, auth
import uvicorn  
from fastapi import FastAPI, BackgroundTasks, HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
background_tasks = BackgroundTasks()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], #frontend on 3000 for testing
    allow_methods=["*"],
    allow_headers=["*"],
)

cred = credentials.Certificate("fbACC.json")  
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.get("/scrape")
async def scrape(background_tasks: BackgroundTasks):
    ##TODO
    ##add scraper automation function here
    Scraper_Task.load_structure("Resources/SiteInfo.json") #<-- load the structure file that has a scraper presets.
    scrapeCA = Scraper_Task('maxpreps2')# <-- an instance of scraper given maxpreps preset(i will change name later). look in SiteInfo.json for what it does.
    scrapeCA.seed({"state":"ca","sport":"basketball"}) 
    background_tasks.add_task(scrapeCA.start_scrape)
    return {"Scrape": "started"}

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


    
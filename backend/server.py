import requests
from data_structures.Scraper import Scraper_Task
from data_structures.AthleteParsingClass import AthletesParsingClass
import firebase_admin
from firebase_admin import credentials, firestore, auth
import uvicorn  
from fastapi import FastAPI, BackgroundTasks, HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from specific_scripts import parse_script, push_athletes

app = FastAPI()
background_tasks = BackgroundTasks()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], #frontend on 3000 for testing
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase ONLY if not already initialized
try:
    firebase_admin.get_app()
except ValueError:
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

@app.get("/scrape_games") #move to post soon, just testing with get for now
async def scrape(background_tasks: BackgroundTasks):
    ##TODO: add a way to stop the scraper once it is started. maybe add a status field to the scraper class and have a separate endpoint to change it to stop. then, within the scraper, check for this status field and if it is stop, break out of the loop and end the scraper.
    Scraper_Task.load_structure("Resources/SiteInfo.json") #<-- load the structure file that has a scraper presets.
    scrapeCA = Scraper_Task('maxpreps_games')# <-- an instance of scraper given maxpreps preset(i will change name later). look in SiteInfo.json for what it does.
    scrapeCA.seed({"state":"ca","sport":"basketball"})
    background_tasks.add_task(scrapeCA.start_scrape)
    return {"Scrape": "started",
            "Target:":scrapeCA.site_url,
            "Config:":scrapeCA.site_cfg}

@app.get("/parse")
async def parse(background_tasks: BackgroundTasks):
    parse_script.test_parse()
    return {"it has started":"parse"}

@app.get("/push")
async def push(background_tasks: BackgroundTasks):
    # This pushes all pending files in PlayerStats directly to Firestore
    # We use background tasks so the client doesn't time out if there are many files
    background_tasks.add_task(push_athletes.push_all_pending)
    return {"status": "Push task added to queue"}

@app.get("/test")
def something():
    pass

@app.get("/")
def health_check():
    return {"status": "ok"}

def run_server():
    ##start server and listen for requests
    uvicorn.run(app ,
                 host="0.0.0.0", 
                 port=8000)    


if __name__ == "__main__":
    run_server()


    
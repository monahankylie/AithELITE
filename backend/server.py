import requests
from data_structures.Scraper import Scraper_Task
from data_structures.AthleticsParsingInfo import AthleticsParsingInfo
import firebase_admin
from firebase_admin import credentials, firestore, auth
import uvicorn  
from fastapi import FastAPI, BackgroundTasks, HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from specific_scripts import hardcodedparse_script

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

@app.get("/parse")
async def parse(background_tasks: BackgroundTasks):
    athlete_parse_struct = AthleticsParsingInfo(
    **{
        "sport_type": "Basketball",
        "player_mapping": "Resources/player_val_mappings.json",
        "team_mapping":  "Resources/team_val_mappings.json"
    }
    )
    hardcodedparse_script.run_parse("/PlayerStats",athlete_parse_struct)
    return {"your parse struct": f"{athlete_parse_struct.model_dump()}"}

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


    
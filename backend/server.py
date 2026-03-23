import requests
from data_structures.Scraper import Scraper_Task
from data_structures.AthleteParsingClass import AthletesParsingClass
import firebase_admin
from firebase_admin import credentials, firestore, auth
import uvicorn  
from fastapi import FastAPI, BackgroundTasks, HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from specific_scripts import parse_script, push_athletes, parse_boxscores, push_games

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

@app.post("/scrape")
async def scrape(background_tasks: BackgroundTasks):
    Scraper_Task.load_structure("Resources/SiteInfo.json")
    scrapeCA = Scraper_Task('maxpreps2')
    scrapeCA.seed({"state":"ca","sport":"basketball"}) 
    background_tasks.add_task(scrapeCA.start_scrape)
    return {"Scrape": "started"}

@app.post("/scrape_games")
async def scrape_games_endpoint(background_tasks: BackgroundTasks):
    Scraper_Task.load_structure("Resources/SiteInfo.json")
    scrapeCA = Scraper_Task('maxpreps_games')
    scrapeCA.seed({"state":"ca","sport":"basketball"})
    background_tasks.add_task(scrapeCA.start_scrape)
    return {"Scrape": "started",
            "Target:":scrapeCA.site_url,
            "Config:":scrapeCA.site_cfg}

@app.post("/json_dump_stats")
async def parse(background_tasks: BackgroundTasks):
    parse_script.test_parse()
    return {"it has started":"parse"}

@app.post("/json_dump_scores")
async def parse_boxscores_endpoint(background_tasks: BackgroundTasks):
    CONTEXT_DIR = "BoxScoresContext"
    DOM_DIR = "BoxScoresDOM"
    OUTPUT_DIR = "ParsedGames"
    
    def run_full_parse():
        parse_boxscores.run_boxscore_parse(CONTEXT_DIR, DOM_DIR, OUTPUT_DIR)

    background_tasks.add_task(run_full_parse)
    return {"status": "Box score parsing started"}

@app.post("/push_athletes")
async def push(background_tasks: BackgroundTasks):
    background_tasks.add_task(push_athletes.push_all_pending)
    return {"status": "Push task added to queue"}

@app.post("/push_games")
async def push_games_endpoint(background_tasks: BackgroundTasks):
    background_tasks.add_task(push_games.push_all_pending)
    return {"status": "Game push task added to queue"}

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


    
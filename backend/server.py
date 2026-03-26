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
async def parse_boxscores_endpoint(request: Request, background_tasks: BackgroundTasks):
    CONTEXT_DIR = "BoxScoresContext"
    DOM_DIR = "BoxScoresDOM"
    OUTPUT_DIR = "ParsedGames"
    
    start_letter = None
    try:
        data = await request.json()
        start_letter = data.get("start_letter")
    except Exception:
        # No body or invalid JSON, proceed without start_letter
        pass

    background_tasks.add_task(parse_boxscores.run_boxscore_parse, CONTEXT_DIR, DOM_DIR, OUTPUT_DIR, start_letter)
    return {"status": "Box score parsing started", "start_letter": start_letter}

@app.post("/push_athletes")
async def push(background_tasks: BackgroundTasks):
    background_tasks.add_task(push_athletes.push_all_pending)
    return {"status": "Push task added to queue"}

@app.post("/push_games")
async def push_games_endpoint(request: Request, background_tasks: BackgroundTasks):
    start_letter = None
    try:
        data = await request.json()
        start_letter = data.get("start_letter")
    except Exception:
        # No body or invalid JSON, proceed without start_letter
        pass
        
    background_tasks.add_task(push_games.push_all_pending, start_letter)
    return {"status": "Game push task added to queue", "start_letter": start_letter}

@app.post("/test_scrape")
async def scrape(background_tasks: BackgroundTasks):
    Scraper_Task.load_structure("Resources/SiteInfo.json")
    scrapeCA = Scraper_Task('single_url')
    background_tasks.add_task(scrapeCA.start_scrape)
    return {"Scrape": "started"}

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


    
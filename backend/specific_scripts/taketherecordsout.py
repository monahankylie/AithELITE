#pull all players
#extract their records array
#see if a subcollection called records exists-- if not, create it
#for each record in the records array, make the athleteid its name
#sort by year

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from .push_athletes import push_player_to_firestore
from data_structures.player_class import Player

# Official data structures
from data_structures.AthleteParsingClass import AthletesParsingClass
from data_structures.player_class import Player
from data_structures.team_class import Team

# Path Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FB_ACC_PATH = os.path.join(BASE_DIR, "fbACC.json")

try:
    firebase_admin.get_app()
except ValueError:
    if not os.path.exists(FB_ACC_PATH):
        FB_ACC_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fbACC.json")
    try:
        cred = credentials.Certificate(FB_ACC_PATH)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"[ERROR] Firebase init failed: {e}")

db = firestore.client()

def pull_athletes(n:int=1):
    return (list(db.collection("athletes").limit(n).stream()))

def model_from_doc(lst:list, obj = Player):
    new_lst = []
    for doc in lst:
        data = doc.to_dict()
        an_obj = obj(**data)
        new_lst.append(an_obj)
    return new_lst

def put_back_to_fs(lst:list):
    for doc in lst:
        push_player_to_firestore(doc)


def test():
    athletes = pull_athletes(4915)
    athlete_objs = model_from_doc(athletes, Player)
    put_back_to_fs(athlete_objs)



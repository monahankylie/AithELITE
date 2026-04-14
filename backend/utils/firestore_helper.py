#pull all players
#extract their records array
#see if a subcollection called records exists-- if not, create it
#for each record in the records array, make the athleteid its name
#sort by year

import os
import json
from data_structures import player_class
import firebase_admin
from firebase_admin import credentials, firestore
from specific_scripts.push_athletes import push_player_to_firestore
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

def pull_athletes(n:int=1): #maybe memory issue lol
    if n == -1:
        return db.collection("athletes").stream()
    return db.collection("athletes").limit(n).stream()

#useless for new schema since records in subcollections now
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

def get_records_by_sport(record_type : player_class.SeasonRecord,n:int=1 ) -> list:
    if n < 0:
        records = db.collection_group("sport_records").stream() #this is a generator that yields documents in the sport_records subcollections across all athletes
    else:
        records = db.collection_group("sport_records").limit(n).stream()
    lst = []
    for record in records:
        record_dict = record.to_dict()
        record_dict["base_player_id"] = record.reference.parent.parent.id  # Get athlete ID from parent document reference
        lst.append(record_type(**record_dict))
    return lst

def put_in_csv(list : list, filename : str):
    import csv
    if not list:
        print("[WARNING] Empty list provided to put_in_csv.")
        return
    keys = list[0].__fields__.keys()  # Get field names from the first object
    with open(filename, 'w', newline='') as output_file:
        dict_writer = csv.DictWriter(output_file, fieldnames=keys)
        dict_writer.writeheader()
        for item in list:
            dict_writer.writerow(item.model_dump())  # Convert Pydantic model to dict
def test():
    athletes = list(pull_athletes(4915))
    athlete_objs = model_from_doc(athletes, Player)
    put_back_to_fs(athlete_objs)



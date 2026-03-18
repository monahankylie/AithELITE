import os
import json
import time
import firebase_admin
from firebase_admin import credentials, firestore

# Official data structures
from data_structures.AthleticsParsingInfo import AthleticsParsingInfo
from data_structures.player_class import Player
from data_structures.team_class import Team

# Path Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYER_STATS_DIR = os.path.join(BASE_DIR, "PlayerStats")
FB_ACC_PATH = os.path.join(BASE_DIR, "fbACC.json")

# Initialize Firebase
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

# Official Parser Setup
ATHLETE_PARSER = AthleticsParsingInfo(
    sport_type="Basketball",
    player_mapping=os.path.join(BASE_DIR, "Resources/player_bio.json"),
    record_mapping=os.path.join(BASE_DIR, "Resources/bball_record.json"),
    team_mapping=os.path.join(BASE_DIR, "Resources/team_val_mappings.json")
)

def merge_records(existing_records, new_records):
    """Combines records lists by (sport, year)."""
    if not existing_records: return new_records
    if not new_records: return existing_records
    
    merged = {(str(r.get("sport")).lower(), str(r.get("year"))): r for r in existing_records}
    for nr in new_records:
        key = (str(nr.get("sport")).lower(), str(nr.get("year")))
        if key in merged:
            merged[key].update(nr)
        else:
            merged[key] = nr
            
    return list(merged.values())

def push_player_to_firestore(player: Player):
    """Pipeline: Pydantic Obj -> Firestore (Auto-ID, Matched by MaxPreps ID)"""
    try:
        mp_id = player.maxpreps_career_id
        if not mp_id: return None

        # Query for existing player
        query = db.collection("athletes").where("maxpreps_career_id", "==", mp_id).limit(1).get()
        
        player_doc = player.model_dump(by_alias=True)
        player_doc.pop("base_player_id", None) # Clean up
        
        if query:
            existing_ref = query[0].reference
            existing_data = query[0].to_dict()
            player_doc["records"] = merge_records(existing_data.get("records", []), player_doc.get("records", []))
            existing_ref.set(player_doc, merge=True)
            return existing_ref
        else:
            _, new_ref = db.collection("athletes").add(player_doc)
            return new_ref
    except Exception as e:
        print(f"[ERROR] Player push failed: {e}")
        return None

def push_team_to_firestore(team: Team, player_ref):
    """Pipeline: Team Obj -> Firestore (Auto-ID, Matched by MaxPreps Team ID)"""
    try:
        mpt_id = team.maxpreps_team_id
        
        # 1. Lookup existing team
        query = None
        if mpt_id:
            query = db.collection("teams").where("maxpreps_team_id", "==", mpt_id).limit(1).get()
        
        team_doc = team.model_dump(by_alias=True)
        team_doc.pop("team_id", None) # Clean up
        team_doc.pop("roster", None)
        
        if query:
            team_ref = query[0].reference
            team_ref.set(team_doc, merge=True)
        else:
            # New Team: Create with Auto-ID
            _, team_ref = db.collection("teams").add(team_doc)
            
        # 2. Update Roster
        if player_ref:
            team_ref.update({"roster": firestore.ArrayUnion([player_ref])})
            
        return True
    except Exception as e:
        print(f"[ERROR] Team push failed: {e}")
        return False

def process_file(filepath):
    """Direct Flow: Raw JSON -> Parser -> Push -> NO DELETE"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            blob = json.load(f)
        team_obj, player_obj = ATHLETE_PARSER.assemble_player(blob)
        if player_obj:
            p_ref = push_player_to_firestore(player_obj)
            if p_ref and team_obj:
                push_team_to_firestore(team_obj, p_ref)
            if p_ref:
                print(f"[DONE] {player_obj.first_name} {player_obj.last_name}")
                return True
        return False
    except Exception as e:
        print(f"[CRITICAL] Failed processing {os.path.basename(filepath)}: {e}")
        return False

def push_all_pending():
    files = [f for f in os.listdir(PLAYER_STATS_DIR) if f.endswith(".json")]
    print(f"[PUSH] Processing {len(files)} files...")
    count = 0
    for f in files:
        if process_file(os.path.join(PLAYER_STATS_DIR, f)):
            count += 1
    return count

if __name__ == "__main__":
    while True:
        push_all_pending()
        time.sleep(5)

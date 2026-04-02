import os
import json
import time
import firebase_admin
from firebase_admin import credentials, firestore

# Official data structures
from data_structures.AthleteParsingClass import AthletesParsingClass
from data_structures.player_class import Player
from data_structures.team_class import Team

# Path Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYER_STATS_DIR = os.path.join(BASE_DIR, "PlayerStats")
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

ATHLETE_PARSER = AthletesParsingClass(
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

def push_player_to_firestore(player: Player, team: Team):
    try:
        p_id = player.base_player_id
        if not p_id: return None

        player_doc = player.model_dump(by_alias=True)
        
        # Denormalize Team Info only inside each record (Historical Integrity)
        if team:
            for record in player_doc.get("records", []):
                record["school_name"] = team.school_name
                record["mascot"] = team.mascot
                record["city"] = team.city
                record["state"] = team.state
                record["sport"] = team.sport
                record["team_id"] = team.team_id

        # Use stable base_player_id as Document ID
        player_ref = db.collection("athletes").document(p_id)
        existing = player_ref.get()
        
        if existing.exists:
            existing_data = existing.to_dict()
            player_doc["records"] = merge_records(existing_data.get("records", []), player_doc.get("records", []))
            
        player_ref.set(player_doc, merge=True)
        return player_ref
    except Exception as e:
        print(f"[ERROR] Player push failed: {e}")
        return None

def push_team_to_firestore(team: Team, player_ref):
    """Pipeline: Team Obj -> Firestore (Stable ID, Matched by team_id)"""
    try:
        t_id = team.team_id
        if not t_id: return False
        
        team_doc = team.model_dump(by_alias=True)
        team_doc.pop("roster", None)
        
        # Use team_id as document ID to ensure aggregation
        team_ref = db.collection("teams").document(t_id)
        team_ref.set(team_doc, merge=True)
            
        # Update Roster
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
            p_ref = push_player_to_firestore(player_obj, team_obj)
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
    if files:
        print(f"[PUSH] Processing {len(files)} files...")
    count = 0
    for f in files:
        if process_file(os.path.join(PLAYER_STATS_DIR, f)):
            count += 1
    
    if count > 0:
        print(f"\n" + "="*40)
        print(f"PUSH COMPLETE: {count} players pushed to Firestore")
        print("="*40 + "\n")
    else:
        print("[PUSH] No new players were pushed.")
        
    return count

if __name__ == "__main__":
    while True:
        push_all_pending()
        time.sleep(5)

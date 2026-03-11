import json
import os
from data_structures.AthleticsParsingInfo import AthleticsParsingInfo
from utils.IO import save_json

def run_parse(root_path: str, Athletics: AthleticsParsingInfo, PARSE_ALL=True):
    unique_teams = {}
    player_records = []
    errors = 0
    
    path = root_path if os.path.exists(root_path) else root_path.lstrip('/')
    if not os.path.exists(path):
        return [], [], 0

    for filename in os.listdir(path):
        if not filename.endswith(".json"): continue
        
        try:
            with open(os.path.join(path, filename), "r") as f:
                json_blob = json.load(f)
            
            # Use the centralized assembly logic
            team, player = Athletics.assemble_player(json_blob)
            
            if player:
                player_records.append(player)
                if team and team.team_id not in unique_teams:
                    unique_teams[team.team_id] = team
            else:
                errors += 1
        except Exception as e:
            errors += 1
            print(f"[DEBUG] Exception in run_parse for {filename}: {e}")
            continue
            
        if not PARSE_ALL and len(player_records) > 0: break

    return list(unique_teams.values()), player_records, errors

def test_parse():
    # Use separate bio and stats mappings
    athlete_parse_struct = AthleticsParsingInfo(
        sport_type="Basketball",
        player_mapping="Resources/player_bio.json",
        record_mapping="Resources/bball_record.json",
        team_mapping="Resources/team_val_mappings.json"
    )
    
    test_path = "PlayerStats" if os.path.exists("PlayerStats") else "Resources"
    teams, players, errors = run_parse(test_path, athlete_parse_struct, PARSE_ALL=True)
    
    # Save results
    if players: 
        for p in players:
            save_json(p.model_dump(), "ParsedPlayers2", p.base_player_id)
            
    if teams:
        for t in teams:
            save_json(t.model_dump(), "ParsedTeams", t.team_id)
    
    print(f"\n" + "="*40)
    print(f"PARSE COMPLETE")
    print(f"Success: {len(players)} players")
    print(f"Teams:   {len(teams)} unique teams")
    print(f"Skipped: {errors} files (no match or invalid)")
    print(f"="*40 + "\n")

if __name__ == "__main__":
    test_parse()

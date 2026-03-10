import json
import os
from data_structures.AthleticsParsingInfo import AthleticsParsingInfo
from data_structures.player_class import Player, BasketballRecord
from data_structures.team_class import Team
from utils.parsing_functions import traverse_paths
from utils.IO import save_json

def extract_raw_blob(json_blob, mapping):
    """
    Extracts data using traverse_paths.
    If the mapping points to a single container (dict/list), it returns that container.
    Otherwise, it returns the full dictionary of results.
    """
    m = mapping
    # Skip top-level wrapper keys (e.g., {"ball": {...}})
    if len(m) == 1 and isinstance(next(iter(m.values())), dict):
        m = next(iter(m.values()))
    
    res = traverse_paths(json_blob, m)
    
    # If single path results in a container, return the container itself
    if len(res) == 1:
        val = next(iter(res.values()))
        if isinstance(val, (dict, list)):
            return val
    return res

def get_best_team_match(teams_raw, target_sport):
    """
    Selects the most recent team matching the target sport.
    """
    if not isinstance(teams_raw, list):
        return teams_raw if isinstance(teams_raw, dict) else None
    
    sport_key = target_sport.lower()
    matches = [
        t for t in teams_raw 
        if isinstance(t, dict) and t.get("sport") and sport_key in t["sport"].lower()
    ]
    
    if not matches: return None
    
    # Sort by year descending to get the latest season
    try:
        matches.sort(key=lambda x: str(x.get("year", "")), reverse=True)
    except: pass
    
    return matches[0]

def parse_athlete_file(json_blob, Athletics: AthleticsParsingInfo):
    """
    Converts raw JSON blob into validated Team and Player objects.
    """
    player_raw = extract_raw_blob(json_blob, Athletics.player_mapping)
    teams_raw_all = extract_raw_blob(json_blob, Athletics.team_mapping)
    
    # Determine the team (with fallback logic)
    team_raw = get_best_team_match(teams_raw_all, Athletics.sport_type)
    if team_raw:
        team_obj = Team(**team_raw)
    else:
        # User-provided fallback ID
        team_obj = Team(
            sport=Athletics.sport_type, 
            team_id="6c68b5d21cab449d9140bd7c8adb2791", 
            school_name="Unknown Fallback"
        )

    if not isinstance(player_raw, dict):
        return team_obj, None
        
    # Merge data and let Pydantic handle aliases and types
    final_player_data = player_raw | team_obj.model_dump()
    player_obj = Athletics.sport_record_maker(final_player_data)
    
    return team_obj, player_obj

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
            
            team, player = parse_athlete_file(json_blob, Athletics)
            
            if team and player:
                if team.team_id not in unique_teams:
                    unique_teams[team.team_id] = team
                player_records.append(player)
            else:
                errors += 1
        except Exception as e:
            errors += 1
            continue
            
        if not PARSE_ALL and len(player_records) > 0: break

    return list(unique_teams.values()), player_records, errors

def test_parse():
    # Use fallback mapping for maximum data retrieval
    athlete_parse_struct = AthleticsParsingInfo(
        sport_type="Basketball",
        player_mapping="Resources/bball_stats_fallback.json",
        team_mapping="Resources/team_val_mappings.json"
    )
    
    test_path = "PlayerStats" if os.path.exists("PlayerStats") else "Resources"
    teams, players, errors = run_parse(test_path, athlete_parse_struct, PARSE_ALL=True)
    
    # Save results using the generic IO utility
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

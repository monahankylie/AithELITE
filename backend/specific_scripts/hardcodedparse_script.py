import json
from data_structures.AthleticsParsingInfo import AthleticsParsingInfo
from data_structures.player_class import Player, BasketballRecord, extract_and_parse_player
from data_structures.team_class import Team, extract_and_parse as extract_and_parse_teams
import os


def run_parse(root_path:str, Athletics : AthleticsParsingInfo, PARSE_ALL = True):
    """
    Goes through each JSON file in root_path, parses it using the AthleticsParsingInfo mapping,
    and returns two lists: (teams, players).
    """
    unique_teams = {}
    player_records = []
    
    path = root_path
    if not os.path.exists(path):
        # Fallback for local execution
        path = root_path.lstrip('/')
        if not os.path.exists(path):
            print(f"Path {root_path} and {path} do not exist.")
            return [], []
    
    # Iterate through all files in the directory
    for filename in os.listdir(path):
        if not filename.endswith(".json"):
            continue
            
        file_path = os.path.join(path, filename)
        try:
            with open(file_path, "r") as f:
                json_blob = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading {file_path}: {e}")
            continue

        try:
            # 1. Extract and Parse Teams using standalone helper
            team_root_cfg = Athletics.team_mapping.get("team_mapping")
            team_struct_cfg = Athletics.team_mapping.get("team_structure")
            
            recent_team_val = {}
            current_team_obj = None

            if team_root_cfg and team_struct_cfg:
                # Use helper to get raw and objects
                raw_teams, teams_objs = extract_and_parse_teams(json_blob, team_root_cfg, team_struct_cfg)
                
                if raw_teams:
                    # Filter for the most recent team matching the target sport
                    target_sport = Athletics.sport_type.lower()
                    for raw, obj in zip(raw_teams, teams_objs):
                        if obj.sport and target_sport in obj.sport.lower():
                            current_team_obj = obj
                            recent_team_val = raw | obj.model_dump()
                            break
                    
                    if not current_team_obj:
                        print(f"No team matching sport '{target_sport}' found in {filename}")
                        continue
                        
                    # Store unique teams across the entire run
                    if current_team_obj.team_id not in unique_teams:
                        unique_teams[current_team_obj.team_id] = current_team_obj
                else:
                    print(f"No teams found in {filename}")
                    continue
            else:
                # Basic fallback
                from utils.parsing_functions import traverse_paths
                recent_team_val = traverse_paths(json_blob, Athletics.team_mapping)
                if "sport" not in recent_team_val:
                    recent_team_val["sport"] = Athletics.sport_type
                current_team_obj = Team(**recent_team_val)
                recent_team_val = current_team_obj.model_dump()
                if current_team_obj.team_id not in unique_teams:
                    unique_teams[current_team_obj.team_id] = current_team_obj

            # 2. Extract and Parse Player Data using standalone helper
            combined_player_data = extract_and_parse_player(json_blob, Athletics.player_mapping)

            # 3. Combine and Finalize
            final_data = combined_player_data | recent_team_val
            
            # Height calculation
            if "height_ft" in final_data and "height_in" in final_data:
                h_ft = final_data.get("height_ft")
                h_in = final_data.get("height_in")
                if h_ft is not None and h_in is not None:
                    try:
                        final_data["height"] = 12 * float(h_ft) + float(h_in)
                    except (ValueError, TypeError):
                        pass

            # Athletics.sport_record_maker returns the appropriate model instance
            record = Athletics.sport_record_maker(final_data)
            player_records.append(record)

        except Exception as e:
            print(f"Failed to parse data from {filename}: {e}")
            continue

        if not PARSE_ALL and len(player_records) > 0:
            break

    return list(unique_teams.values()), player_records

def test_parse():
    print("Starting test parse...")
    athlete_parse_struct = AthleticsParsingInfo(
        **{
            "sport_type": "Basketball",
            "player_mapping": "Resources/player_val_mappings.json",
            "team_mapping":  "Resources/team_val_mappings.json"
        }
    )
    
    test_path = "PlayerStats"
    if not os.path.exists(test_path) or not os.listdir(test_path):
        print(f"No files in {test_path}, checking Resources for examples...")
        test_path = "Resources"

    teams, players = run_parse(test_path, athlete_parse_struct, PARSE_ALL=True)
    
    print(f"\n--- Results ---")
    print(f"Total Unique Teams Found: {len(teams)}")
    for team in teams:
        print(f"  - Team: {team.school_name} {team.mascot} ({team.team_id})")
        
    print(f"Total Players Parsed: {len(players)}")
    for record in players:
        print(f"  - Player: {record.first_name} {record.last_name} (Team ID: {record.team_id})")
    print(f"---------------\n")

if __name__ == "__main__":
    test_parse()

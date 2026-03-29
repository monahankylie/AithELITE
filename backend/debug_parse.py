
import json
import os
from data_structures.AthleteParsingClass import AthletesParsingClass
from data_structures.player_class import Player
from utils.parsing_functions import traverse_paths

def test_single_file():
    athlete_parse_struct = AthletesParsingClass(
        sport_type="Basketball",
        player_mapping="Resources/player_bio.json",
        record_mapping="Resources/bball_record.json",
        team_mapping="Resources/team_val_mappings.json"
    )
    
    file_path = "PlayerStats/002af01e-2bb2-11f1-b836-ce1d60b80398.json"
    if not os.path.exists(file_path):
        print(f"File {file_path} not found")
        return

    try:
        with open(file_path, "r") as f:
            content = f.read()
            print(f"File content start: {content[:100]}")
            
            # Try to load as JSON
            try:
                json_blob = json.loads(content)
                print(f"Loaded json_blob type: {type(json_blob)}")
                if isinstance(json_blob, str):
                    print("json_blob is a string! Attempting second load...")
                    # If it's a string that looks like a python dict, json.loads won't work on it if it has single quotes
                    # But if it was json.dump(str(dict), f), it's a JSON string.
                    # Wait, if it has single quotes, it's NOT valid JSON.
                    # If Scraper did json.dump(str(data), f), the file would contain a JSON string.
                    # e.g. "{"a": 1}" -> file contains ""{"a": 1}""
                    
                    # Let's try to evaluate it if it's a python repr
                    import ast
                    try:
                        json_blob = ast.literal_eval(json_blob)
                        print(f"After ast.literal_eval, type: {type(json_blob)}")
                    except Exception as e:
                        print(f"ast.literal_eval failed: {e}")
            except json.JSONDecodeError as e:
                print(f"JSON decode failed: {e}")
                # Try ast.literal_eval directly on content if it starts with ' or " followed by {
                import ast
                try:
                    json_blob = ast.literal_eval(content)
                    print(f"After direct ast.literal_eval, type: {type(json_blob)}")
                except Exception as e:
                    print(f"Direct ast.literal_eval failed: {e}")
                    return

            team, player = athlete_parse_struct.assemble_player(json_blob)
            if player:
                print(f"Successfully assembled player: {player.first_name} {player.last_name}")
            else:
                print("Failed to assemble player")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_single_file()

import os
import json
import uuid
import re
from data_structures.BoxScoreParsingClass import BoxScoreParsingClass
from data_structures.game_class import Game, TeamGameBoxScore
from specific_scripts.save_writes import get_start_indices
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTEXT_DIR = os.path.join(BASE_DIR, "BoxScoresContext")
DOM_DIR = os.path.join(BASE_DIR, "BoxScoresDOM")
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

def push_single_game(game: Game):
    try:
        game_id = game.base_game_id
        if not game_id:
            print("[ERROR] Game is missing a base_game_id, skipping.")
            return False

        game_ref = db.collection("games").document(game_id)
        
        # Keep team totals, exclude per-player stats and TBD team_id
        main_game_doc = game.model_dump(
            exclude={"home_team": {"player_stats", "team_id"}, "away_team": {"player_stats", "team_id"}, "winner_team_id": True}
        )
        game_ref.set(main_game_doc, merge=True)
        
        batch = db.batch()
        for team in [game.home_team, game.away_team]:
            for p_stat in team.player_stats:
                if not p_stat.player_name: continue
                
                clean_player_name = re.sub(r'[^a-zA-Z0-9]', '', p_stat.player_name)
                stat_doc_id = f"{clean_player_name}{game_id}"
                stat_ref = db.collection("game_stats").document(stat_doc_id)
                
                stat_doc = p_stat.model_dump()
                stat_doc["game_id"] = game_id # Add reference back to game
                stat_doc["team_name"] = team.team_name
                
                batch.set(stat_ref, stat_doc, merge=True)
        
        batch.commit()
        return True
    except Exception as e:
        print(f"[ERROR] Game push failed for {getattr(game, 'base_game_id', 'Unknown')}: {e}")
        return False

def push_all_pending(start_letter: str = None):
    file_skip_count, anchor_skip_count = 0, 0
    if start_letter:
        print(f"[PUSH] Received start_letter: {start_letter}. Calculating offset...")
        file_skip_count, anchor_skip_count = get_start_indices(start_letter)
        if file_skip_count == 0 and anchor_skip_count == 0:
            print(f"[WARN] No games found starting with letter '{start_letter}'. Starting from the beginning.")
        else:
            print(f"[PUSH] Skipping {file_skip_count} files and {anchor_skip_count} games.")

    parser = BoxScoreParsingClass()
    
    if not os.path.exists(CONTEXT_DIR) or not os.path.exists(DOM_DIR):
        print(f"[WARN] Directory not found: {CONTEXT_DIR} or {DOM_DIR}")
        return 0

    context_files = [f for f in os.listdir(CONTEXT_DIR) if f.endswith(".txt")]
    context_files.sort(key=lambda x: os.path.getmtime(os.path.join(CONTEXT_DIR, x)))
    
    dom_files = [f for f in os.listdir(DOM_DIR) if f.endswith(".txt")]
    dom_files.sort(key=lambda x: os.path.getmtime(os.path.join(DOM_DIR, x)))

    # Apply file-level skip
    context_files = context_files[file_skip_count:]
    
    # Correctly adjust the DOM queue based on total anchors skipped
    total_dom_files_to_skip = 0
    temp_anchor_count = 0
    
    # Re-calculate how many DOM files to skip.
    # This assumes a 1-to-1 mapping of summary anchors to DOM files.
    all_summaries = []
    temp_context_files = [f for f in os.listdir(CONTEXT_DIR) if f.endswith(".txt")]
    temp_context_files.sort(key=lambda x: os.path.getmtime(os.path.join(CONTEXT_DIR, x)))

    for i, ctx_file in enumerate(temp_context_files):
        if i < file_skip_count:
            filepath = os.path.join(CONTEXT_DIR, ctx_file)
            with open(filepath, "r") as f:
                context_html = f.read()
            # Count how many DOMs are in the files we skip entirely
            total_dom_files_to_skip += len(parser.parse_context_game(context_html))

    # Add the final anchor skip count from the target file
    total_dom_files_to_skip += anchor_skip_count
    
    dom_queue = list(dom_files)[total_dom_files_to_skip:]

    if not context_files:
        print("[PUSH] No pending context files to process after skipping.")
        return 0
        
    print(f"[PUSH] Processing {len(context_files)} context files against {len(dom_queue)} DOM files...")
    count = 0
    is_first_file = True

    for ctx_file in context_files:
        filepath = os.path.join(CONTEXT_DIR, ctx_file)
        with open(filepath, "r") as f:
            context_html = f.read()
        
        summaries = parser.parse_context_game(context_html)
        
        if is_first_file:
            # Apply anchor-level skip only on the first processed file
            summaries = summaries[anchor_skip_count:]
            is_first_file = False
        
        for summary in summaries:
            game = None
            try:
                if dom_queue:
                    dom_filename = dom_queue.pop(0)
                    dom_file_path = os.path.join(DOM_DIR, dom_filename)
                    with open(dom_file_path, 'r') as f:
                        dom_html = f.read()
                    
                    game = parser.assemble_game(summary, dom_html)
                else:
                    dom_html = "NONEFOUND"
                    game = parser.assemble_game(summary, dom_html)
                
                if game and push_single_game(game):
                    count += 1
                    
            except Exception as e:
                print(f"[CRITICAL] Failed to process game for summary {summary['url']}: {e}")

    print(f"[SUCCESS] Pushed {count} games.")
    return count


if __name__ == "__main__":
    push_all_pending()

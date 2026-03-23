import os
import json
import uuid
import re
from data_structures.BoxScoreParsingClass import BoxScoreParsingClass
from data_structures.game_class import Game, TeamGameBoxScore
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
        
        # Keep team totals, exclude per-player stats lists
        main_game_doc = game.model_dump(
            exclude={"home_team": {"player_stats"}, "away_team": {"player_stats"}}
        )
        game_ref.set(main_game_doc, merge=True)
        
        batch = db.batch()
        for team in [game.home_team, game.away_team]:
            for p_stat in team.player_stats:
                if not p_stat.player_name: continue
                
                # ID format: {playername}{gameid}
                clean_player_name = re.sub(r'[^a-zA-Z0-9]', '', p_stat.player_name)
                stat_doc_id = f"{clean_player_name}{game_id}"
                stat_ref = db.collection("game_stats").document(stat_doc_id)
                
                stat_doc = p_stat.model_dump()
                stat_doc["game_id"] = game_id # Add reference back to game
                stat_doc["team_name"] = team.team_name
                
                batch.set(stat_ref, stat_doc, merge=True) # Use merge=True for safety
        
        batch.commit()
        return True
    except Exception as e:
        print(f"[ERROR] Game push failed for {getattr(game, 'base_game_id', 'Unknown')}: {e}")
        return False

def push_all_pending():
    parser = BoxScoreParsingClass()
    
    if not os.path.exists(CONTEXT_DIR) or not os.path.exists(DOM_DIR):
        print(f"[WARN] Directory not found: {CONTEXT_DIR} or {DOM_DIR}")
        return 0

    context_files = [f for f in os.listdir(CONTEXT_DIR) if f.endswith(".txt")]
    context_files.sort(key=lambda x: os.path.getmtime(os.path.join(CONTEXT_DIR, x)))
    
    dom_files = [f for f in os.listdir(DOM_DIR) if f.endswith(".txt")]
    dom_files.sort(key=lambda x: os.path.getmtime(os.path.join(DOM_DIR, x)))

    if not context_files:
        print("[PUSH] No pending context files to process.")
        return 0
        
    print(f"[PUSH] Processing {len(context_files)} context files...")
    count = 0
    dom_index = 0
    
    for ctx_file in context_files:
        filepath = os.path.join(CONTEXT_DIR, ctx_file)
        with open(filepath, "r") as f:
            context_html = f.read()
        
        summaries = parser.parse_context_game(context_html)
        
        for summary in summaries:
            game = None
            try:
                has_stats = False
                dom_html = None
                
                if dom_index < len(dom_files):
                    dom_file_path = os.path.join(DOM_DIR, dom_files[dom_index])
                    with open(dom_file_path, 'r') as f:
                        temp_html = f.read()
                    
                    if parser.teams_match(summary, temp_html):
                        dom_html = temp_html
                        has_stats = True
                        dom_index += 1
                
                if has_stats and dom_html:
                    game = parser.assemble_game(summary, dom_html)
                else:
                    game = Game(
                        maxpreps_game_id=summary['maxpreps_game_id'],
                        date=summary['date'],
                        level=summary.get('level', 'Varsity'),
                        final_score=summary['score'] or "0-0",
                        maxpreps_url=summary['url'],
                        home_team=TeamGameBoxScore(team_id="unknown", team_name=summary['primary_slug']),
                        away_team=TeamGameBoxScore(team_id="unknown", team_name=summary['opponent_slug'])
                    )
                    if summary['result'] == 'W':
                        game.winner_team_id = game.home_team.team_id
                        game.winner_team_name = game.home_team.team_name
                    elif summary['result'] == 'L':
                        game.winner_team_id = game.away_team.team_id
                        game.winner_team_name = game.away_team.team_name
                
                if game and push_single_game(game):
                    count += 1
                    
            except Exception as e:
                print(f"[CRITICAL] Failed to process game for summary {summary['url']}: {e}")

    print(f"[SUCCESS] Pushed {count} games.")
    return count

if __name__ == "__main__":
    push_all_pending()

import os
import json
import uuid
from bs4 import BeautifulSoup
from data_structures.BoxScoreParsingClass import BoxScoreParsingClass
from data_structures.game_class import Game, TeamGameBoxScore
from utils.IO import save_json

def run_boxscore_parse(context_dir: str, dom_dir: str, output_dir: str):
    parser = BoxScoreParsingClass()
    all_games = []
    
    if not os.path.exists(context_dir) or not os.path.exists(dom_dir):
        print(f"Directory not found: {context_dir} or {dom_dir}")
        return []
        
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # Sort files strictly by modification time for a guaranteed chronological sequence
    context_files = [f for f in os.listdir(context_dir) if f.endswith(".txt")]
    context_files.sort(key=lambda x: os.path.getmtime(os.path.join(context_dir, x)))
    
    dom_files = [f for f in os.listdir(dom_dir) if f.endswith(".txt")]
    dom_files.sort(key=lambda x: os.path.getmtime(os.path.join(dom_dir, x)))
    
    dom_queue = list(dom_files)
    print(f"[INIT] {len(dom_queue)} DOM files ready for processing.")
    
    for ctx_file in context_files:
        with open(os.path.join(context_dir, ctx_file), 'r') as f:
            context_html = f.read()
            
        summaries = parser.parse_context_game(context_html)
        
        for summary in summaries:
            game = None
            try:
                # STRICT SEQUENTIAL MAPPING - WITH A SANITY CHECK
                if dom_queue:
                    dom_filename = dom_queue.pop(0)
                    dom_file_path = os.path.join(dom_dir, dom_filename)
                    with open(dom_file_path, 'r') as f:
                        dom_html = f.read()

                    # Sanity check: Does this DOM file belong to this game summary?
                    if parser.teams_match(summary, dom_html):
                        game = parser.assemble_game(summary, dom_html)
                    else:
                        # SEQUENCE MISMATCH
                        print(f"[ERROR] SEQUENCE MISMATCH: DOM {dom_filename} does not match summary for {summary['away_slug']} vs {summary['home_slug']}.")
                        # Put the DOM file back in the queue in case it matches the next summary
                        dom_queue.insert(0, dom_filename) 
                        dom_html = "NONEFOUND" # Treat as no stats for this summary
                        game = parser.assemble_game(summary, dom_html)

                else:
                    # Fallback for if we run out of DOM files
                    dom_html = "NONEFOUND"
                    game = parser.assemble_game(summary, dom_html)
                
                all_games.append(game)
                game_data = game.model_dump(mode='json')
                save_json(game_data, output_dir, f"game_{game.maxpreps_game_id}")
                
                # Save verification file (JSON + DOM) for each game
                verify_file = os.path.join(output_dir, f"game_{game.maxpreps_game_id}_verify.txt")
                with open(verify_file, 'w') as vf:
                    vf.write("="*50 + "\nGAME JSON:\n")
                    vf.write(json.dumps(game_data, indent=2))
                    vf.write("\n\n" + "="*50 + "\nDOM HTML:\n")
                    vf.write(dom_html or "NO DOM HTML FOUND")
                    vf.write("\n" + "="*50 + "\n")
            
            except Exception as e:
                print(f"Error parsing game {summary['url']}: {e}")
            
    return all_games
                
if __name__ == "__main__":
    CONTEXT_DIR = "BoxScoresContext"
    DOM_DIR = "BoxScoresDOM"
    OUTPUT_DIR = "ParsedGames"
    
    if not os.path.exists(CONTEXT_DIR):
        CONTEXT_DIR = os.path.join("backend", CONTEXT_DIR)
        DOM_DIR = os.path.join("backend", DOM_DIR)
        OUTPUT_DIR = os.path.join("backend", OUTPUT_DIR)

    games = run_boxscore_parse(CONTEXT_DIR, DOM_DIR, OUTPUT_DIR)
    
    print(f"Successfully parsed {len(games)} games.")

import os
import json
import uuid
from bs4 import BeautifulSoup
from data_structures.BoxScoreParsingClass import BoxScoreParsingClass
from data_structures.game_class import Game, TeamGameBoxScore
from utils.IO import save_json
from specific_scripts.save_writes import get_start_indices

def run_boxscore_parse(context_dir: str, dom_dir: str, output_dir: str, start_letter: str = None):
    file_skip_count, anchor_skip_count = 0, 0
    if start_letter:
        print(f"[PARSE] Received start_letter: {start_letter}. Calculating offset...")
        file_skip_count, anchor_skip_count = get_start_indices(start_letter)
        if file_skip_count == 0 and anchor_skip_count == 0:
            print(f"[WARN] No games found starting with letter '{start_letter}'. Starting from the beginning.")
        else:
            print(f"[PARSE] Skipping {file_skip_count} files and {anchor_skip_count} games.")

    parser = BoxScoreParsingClass()
    all_games = []
    
    if not os.path.exists(context_dir) or not os.path.exists(dom_dir):
        print(f"Directory not found: {context_dir} or {dom_dir}")
        return []
        
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    context_files = [f for f in os.listdir(context_dir) if f.endswith(".txt")]
    context_files.sort(key=lambda x: os.path.getmtime(os.path.join(context_dir, x)))
    
    dom_files = [f for f in os.listdir(dom_dir) if f.endswith(".txt")]
    dom_files.sort(key=lambda x: os.path.getmtime(os.path.join(dom_dir, x)))
    
    # Apply file-level skip
    context_files = context_files[file_skip_count:]

    # Correctly adjust the DOM queue based on total anchors skipped
    total_dom_files_to_skip = 0
    temp_context_files = [f for f in os.listdir(context_dir) if f.endswith(".txt")]
    temp_context_files.sort(key=lambda x: os.path.getmtime(os.path.join(context_dir, x)))

    for i, ctx_file in enumerate(temp_context_files):
        if i < file_skip_count:
            filepath = os.path.join(context_dir, ctx_file)
            with open(filepath, "r") as f:
                context_html = f.read()
            total_dom_files_to_skip += len(parser.parse_context_game(context_html))

    total_dom_files_to_skip += anchor_skip_count
    
    dom_queue = list(dom_files)[total_dom_files_to_skip:]
    print(f"[INIT] {len(dom_queue)} DOM files ready for processing after skipping.")
    
    is_first_file = True
    for ctx_file in context_files:
        with open(os.path.join(context_dir, ctx_file), 'r') as f:
            context_html = f.read()
            
        summaries = parser.parse_context_game(context_html)
        
        if is_first_file:
            summaries = summaries[anchor_skip_count:]
            is_first_file = False
        
        for summary in summaries:
            game = None
            try:
                if dom_queue:
                    dom_filename = dom_queue.pop(0)
                    dom_file_path = os.path.join(dom_dir, dom_filename)
                    with open(dom_file_path, 'r') as f:
                        dom_html = f.read()

                    if parser.teams_match(summary, dom_html):
                        game = parser.assemble_game(summary, dom_html)
                    else:
                        print(f"[ERROR] SEQUENCE MISMATCH: DOM {dom_filename} does not match summary for {summary['away_slug']} vs {summary['home_slug']}.")
                        dom_queue.insert(0, dom_filename) 
                        dom_html = "NONEFOUND"
                        game = parser.assemble_game(summary, dom_html)

                else:
                    dom_html = "NONEFOUND"
                    game = parser.assemble_game(summary, dom_html)
                
                all_games.append(game)
                game_data = game.model_dump(mode='json')
                save_json(game_data, output_dir, f"game_{game.maxpreps_game_id}")
                
                verify_file = os.path.join(output_dir, f"game_{game.maxpreps_game_id}_verify.txt")
                with open(verify_file, 'w') as vf:
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

import os
import json
import uuid
from bs4 import BeautifulSoup
from data_structures.BoxScoreParsingClass import BoxScoreParsingClass
from data_structures.game_class import Game, TeamGameBoxScore
from utils.IO import save_json

def cleanup_context_files(context_dir: str):
    if not os.path.exists(context_dir):
        return
        
    for filename in os.listdir(context_dir):
        if not filename.endswith(".txt"): continue
        
        file_path = os.path.join(context_dir, filename)
        with open(file_path, 'r') as f:
            content = f.read()
            
        soup = BeautifulSoup(content, 'html.parser')
        
        with open(file_path, 'w') as f:
            f.write(soup.prettify())

def run_boxscore_parse(context_dir: str, dom_dir: str, output_dir: str):
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
    
    dom_index = 0
    
    for ctx_file in context_files:
        with open(os.path.join(context_dir, ctx_file), 'r') as f:
            context_html = f.read()
            
        summaries = parser.parse_context_game(context_html)
        
        for summary in summaries:
            try:
                has_stats = False
                dom_html = None
                
                if dom_index < len(dom_files):
                    dom_file_path = os.path.join(dom_dir, dom_files[dom_index])
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
                
                all_games.append(game)
                # This script is no longer used for pushing, only parsing to files
                # so we can keep the save_json call
                save_json(game.model_dump(mode='json'), output_dir, f"game_{game.maxpreps_game_id}")
            
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

    cleanup_context_files(CONTEXT_DIR)
    
    games = run_boxscore_parse(CONTEXT_DIR, DOM_DIR, OUTPUT_DIR)
    
    print(f"Successfully parsed {len(games)} games.")

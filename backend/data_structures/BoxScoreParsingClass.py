from typing import List, Optional, Tuple, Dict, Any, Type, ClassVar
from pydantic import BaseModel, Field, model_validator
from .game_class import Game, TeamGameBoxScore, BasketballGameStats, TeamTotalsStats
from .team_class import Team
from bs4 import BeautifulSoup
import re
from datetime import datetime
import uuid
from utils.html_utils import clean_html_text, extract_numeric_value, find_table_by_header

class BoxScoreParsingClass(BaseModel):

    def parse_context_game(self, context_html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(context_html, 'html.parser')
        game_links = soup.find_all('a', href=True)
        summaries = []
        
        for link in game_links:
            url = link['href']
            result_span = link.find('span', class_='result')
            score_span = link.find('span', class_='score')
            
            result = clean_html_text(result_span.text) if result_span else None
            score = clean_html_text(score_span.text) if score_span else None
            
            # MaxPreps URL Structure: .../away-vs-home.htm
            match = re.search(r'/([^/]+)-vs-([^/]+)\.htm', url)
            away_slug = match.group(1) if match else "unknown"
            home_slug = match.group(2) if match else "unknown"
            
            # Extract MaxPreps Game ID (query param 'c' or part of path)
            game_id_match = re.search(r'[?&]c=([^&]+)', url)
            if not game_id_match:
                game_id_match = re.search(r'/games/[^/]+/[^/]+/([^/.]+)\.htm', url)
            maxpreps_game_id = game_id_match.group(1) if game_id_match else "unknown"
            
            # Extract date from URL: .../1-23-2026/...
            date_match = re.search(r'/(\d{1,2}-\d{1,2}-\d{4})/', url)
            game_date_str = date_match.group(1) if date_match else "01-01-2000"
            game_date = datetime.strptime(game_date_str, '%m-%d-%Y')
            
            # Extract level from URL if present (e.g., .../varsity-basketball-25-26/...)
            level_match = re.search(r'/([a-z-]+)-basketball-', url)
            level = level_match.group(1).title() if level_match else "Varsity"
            
            summaries.append({
                "url": url,
                "result": result,
                "score": score,
                "away_slug": away_slug,
                "home_slug": home_slug,
                "date": game_date,
                "level": level,
                "maxpreps_game_id": maxpreps_game_id
            })
            
        return summaries

    def teams_match(self, summary: Dict[str, Any], dom_html: str) -> bool:
        """
        Validates if the DOM file matches the team slugs in the game summary.
        """
        if dom_html == "NONEFOUND": return True # Sequential matching bypass
        
        soup = BeautifulSoup(dom_html, 'html.parser')
        team_name_elements = soup.find_all('h3', class_='team-list__team-name')
        if not team_name_elements: return False
            
        dom_team_names = []
        for element in team_name_elements:
            team_link = element.find('a')
            if team_link:
                name = re.sub(r'[^a-z0-9]', '', team_link.text.lower())
                dom_team_names.append(name)
        
        away = re.sub(r'[^a-z0-9]', '', summary['away_slug'].lower())
        home = re.sub(r'[^a-z0-9]', '', summary['home_slug'].lower())
        
        for dom_name in dom_team_names:
            if away in dom_name or home in dom_name:
                return True
                
        return False

    def _parse_single_table(self, table, headers, player_data_dict, totals_dict):
        """Helper to parse a single stats table (Shooting, Totals, etc.)."""
        tbody = table.find('tbody')
        if not tbody: return
        
        for tr in tbody.find_all('tr'):
            tds = tr.find_all('td')
            if not tds: continue

            player_name_link = tds[1].find('a')
            class_year_abbr = tds[1].find('abbr', class_='class-year')
            
            player_name = clean_html_text(player_name_link.text) if player_name_link else None
            class_year = clean_html_text(class_year_abbr.text).strip('()') if class_year_abbr else None

            if not player_name or player_name == "Team Totals":
                continue

            if player_name not in player_data_dict:
                player_data_dict[player_name] = {"player_name": player_name, "class_year": class_year}
                if player_name_link and 'athleteid=' in player_name_link['href']:
                    athlete_id_match = re.search(r'athleteid=([a-f0-9-]+)', player_name_link['href'])
                    if athlete_id_match:
                        player_data_dict[player_name]["player_id"] = athlete_id_match.group(1)
            
            for i, td in enumerate(tds):
                if i >= len(headers): continue
                header_title = headers[i]
                val = td.text.strip()
                player_data_dict[player_name][header_title] = val

        # Parse footer (totals)
        tfoot = table.find('tfoot')
        if tfoot:
            tr = tfoot.find('tr')
            if tr:
                tds = tr.find_all('td')
                for i, td in enumerate(tds):
                    if i >= len(headers): continue
                    header_title = headers[i]
                    val = td.text.strip()
                    totals_dict[header_title] = val

    def parse_dom_stats(self, dom_html: str) -> Tuple[Optional[TeamGameBoxScore], Optional[TeamGameBoxScore]]:
        """
        Parses the detailed BoxScoresDOM file using a three-pass strategy.
        Supports both single-team-per-header and combined header structures.
        """
        if dom_html == "NONEFOUND": return None, None
        
        soup = BeautifulSoup(dom_html, 'html.parser')
        
        # Pass 1: Identify All Teams and create buckets
        # MaxPreps sometimes puts each team in its own 'team-list--team-header' div,
        # and sometimes puts both in one 'team-list--team-header' div with 'team-list__team' children.
        team_buckets = {}
        team_elements = [] # Store (team_el, container_el)
        
        raw_header_divs = soup.find_all('div', class_='team-list--team-header')
        for rh in raw_header_divs:
            inner_teams = rh.find_all('div', class_='team-list__team')
            if inner_teams:
                for it in inner_teams:
                    team_elements.append((it, rh))
            else:
                team_elements.append((rh, rh))
        
        if not team_elements: return None, None

        for header_el, container_el in team_elements:
            team_link_h3 = header_el.find('h3', class_='team-list__team-name')
            if not team_link_h3: continue
            team_link = team_link_h3.find('a')
            if not team_link: continue
            
            raw_team_name = clean_html_text(team_link.text)
            
            # TEAM ID is TBD, will be redone later from a canonical source
            team_id = "TBD"
            
            # Extract year like (25-26) and clean the name
            year_match = re.search(r'\((\d{2}-\d{2})\)$', raw_team_name)
            team_year = year_match.group(1) if year_match else None
            team_name = re.sub(r'\s*\(\d{2}-\d{2}\)$', '', raw_team_name).strip()
            
            # Robust Check for no-data: Search all siblings of the container until the next team header
            has_no_data = False
            curr = container_el.find_next_sibling()
            while curr and 'team-list--team-header' not in curr.get('class', []):
                if 'no-data' in curr.get('class', []):
                    has_no_data = True
                    break
                curr = curr.find_next_sibling()

            team_buckets[raw_team_name] = {
                "team_id": team_id,
                "team_name": team_name,
                "team_year": team_year,
                "player_data_dict": {},
                "totals_dict": {},
                "has_no_data": has_no_data
            }

        # Pass 2: Assign All Stats Tables
        stat_categories = soup.find_all('div', class_='stat-category')
        for category in stat_categories:
            # Each stat category might contain multiple teams (usually 2)
            team_sections = category.find_all('div', class_='team-list__team')
            if not team_sections:
                team_sections = [category] # Fallback for flat structures
                
            for section in team_sections:
                school_span = section.find('span', class_='school')
                if not school_span: continue
                
                target_raw_name = clean_html_text(school_span.text)
                # Find the best bucket match: case-insensitive partial match
                best_match = None
                target_norm = re.sub(r'[^a-z0-9]', '', target_raw_name.lower())
                
                for raw_name in team_buckets.keys():
                    bucket_norm = re.sub(r'[^a-z0-9]', '', raw_name.lower())
                    if target_norm in bucket_norm or bucket_norm in target_norm:
                        best_match = raw_name
                        break
                
                if not best_match: continue
                
                table = section.find('table')
                if not table: continue
                
                headers = [clean_html_text(th.text) for th in table.find('thead').find_all('th')]
                self._parse_single_table(
                    table, 
                    headers, 
                    team_buckets[best_match]["player_data_dict"], 
                    team_buckets[best_match]["totals_dict"]
                )

        # Pass 3: Assemble Models
        team_boxscores = []
        for i, (header_el, _) in enumerate(team_elements):
            team_link_h3 = header_el.find('h3', class_='team-list__team-name')
            if not team_link_h3: continue
            team_link = team_link_h3.find('a')
            if not team_link: continue
            
            raw_name = clean_html_text(team_link.text)
            if raw_name not in team_buckets: continue
            
            bucket = team_buckets[raw_name]
            is_home = (i == 1) # Default MaxPreps order is Away, then Home
            
            if bucket["has_no_data"] or not bucket["player_data_dict"]:
                team_boxscores.append(TeamGameBoxScore(
                    team_id=bucket["team_id"], 
                    team_name=bucket["team_name"], 
                    team_year=bucket["team_year"],
                    is_home=is_home
                ))
            else:
                player_stats = [BasketballGameStats(**s) for s in bucket["player_data_dict"].values()]
                team_totals = TeamTotalsStats(**bucket["totals_dict"]) if bucket["totals_dict"] else None
                team_boxscores.append(TeamGameBoxScore(
                    team_id=bucket["team_id"], 
                    team_name=bucket["team_name"],
                    team_year=bucket["team_year"],
                    is_home=is_home,
                    player_stats=player_stats,
                    team_totals=team_totals
                ))

        if len(team_boxscores) >= 2: return team_boxscores[0], team_boxscores[1]
        elif len(team_boxscores) == 1: return team_boxscores[0], None
        return None, None

    def assemble_game(self, context_summary: Dict[str, Any], dom_html: str) -> Game:
        """
        Combines summary and detailed stats into a Game object.
        Uses name-based matching to align DOM boxes with summary slugs.
        """
        box1, box2 = self.parse_dom_stats(dom_html)
        boxes = [b for b in [box1, box2] if b is not None]
        
        away_slug_norm = re.sub(r'[^a-z0-9]', '', context_summary['away_slug'].lower())
        home_slug_norm = re.sub(r'[^a-z0-9]', '', context_summary['home_slug'].lower())
        
        final_away_box = None
        final_home_box = None
        
        # Match boxes to slugs by name
        for box in boxes:
            box_name_norm = re.sub(r'[^a-z0-9]', '', box.team_name.lower())
            if away_slug_norm in box_name_norm or box_name_norm in away_slug_norm:
                final_away_box = box
                final_away_box.is_home = False
            elif home_slug_norm in box_name_norm or box_name_norm in home_slug_norm:
                final_home_box = box
                final_home_box.is_home = True
        
        # Fallback placeholders for missing boxes
        if not final_away_box:
            final_away_box = TeamGameBoxScore(
                team_id="unknown", 
                team_name=context_summary['away_slug'].replace('-', ' ').title(),
                is_home=False
            )
        if not final_home_box:
            final_home_box = TeamGameBoxScore(
                team_id="unknown", 
                team_name=context_summary['home_slug'].replace('-', ' ').title(),
                is_home=True
            )
            
        game = Game(
            maxpreps_game_id=context_summary['maxpreps_game_id'],
            date=context_summary['date'],
            level=context_summary.get('level', 'Varsity'),
            final_score=context_summary['score'] or "0-0",
            maxpreps_url=context_summary['url'],
            away_team=final_away_box,
            home_team=final_home_box
        )
        
        if context_summary['result'] == 'W':
            game.winner_team_name = game.away_team.team_name
            game.winner_team_id = game.away_team.team_id
        elif context_summary['result'] == 'L':
            game.winner_team_name = game.home_team.team_name
            game.winner_team_id = game.home_team.team_id
            
        return game

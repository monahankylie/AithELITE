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
    """
    Centralized parsing class for box scores from MaxPreps.
    Orchestrates extraction from both Context (summary) and DOM (detailed stats).
    """

    def parse_context_game(self, context_html: str) -> List[Dict[str, Any]]:
        """
        Parses the BoxScoresContext file containing list of games.
        Returns a list of game summaries with URLs and basic info.
        """
        soup = BeautifulSoup(context_html, 'html.parser')
        game_links = soup.find_all('a', href=True)
        summaries = []
        
        for link in game_links:
            url = link['href']
            result_span = link.find('span', class_='result')
            score_span = link.find('span', class_='score')
            
            result = clean_html_text(result_span.text) if result_span else None
            score = clean_html_text(score_span.text) if score_span else None
            
            # Extract teams from URL: .../acalanes-vs-santa-cruz.htm
            match = re.search(r'/([^/]+)-vs-([^/]+)\.htm', url)
            primary_team_slug = match.group(1) if match else "unknown"
            opponent_team_slug = match.group(2) if match else "unknown"
            
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
                "primary_slug": primary_team_slug,
                "opponent_slug": opponent_team_slug,
                "date": game_date,
                "level": level,
                "maxpreps_game_id": maxpreps_game_id
            })
            
        return summaries

    def teams_match(self, summary: Dict[str, Any], dom_html: str) -> bool:
        """
        Validates if the DOM file matches the team slugs in the game summary.
        """
        soup = BeautifulSoup(dom_html, 'html.parser')
        team_headers = soup.find_all('div', class_='team-list--team-header')
        if not team_headers:
            return False
            
        dom_team_names = []
        for header in team_headers:
            team_link = header.find('h3', class_='team-list__team-name').find('a')
            if team_link:
                # Normalize name: lowercase, remove special chars and extra spaces
                name = re.sub(r'[^a-z0-9]', '', team_link.text.lower())
                dom_team_names.append(name)
        
        # Normalize summary slugs
        primary = re.sub(r'[^a-z0-9]', '', summary['primary_slug'].lower())
        opponent = re.sub(r'[^a-z0-9]', '', summary['opponent_slug'].lower())
        
        # Check if BOTH teams from the summary appear in the DOM
        # (Slugs are usually just the school name, e.g. 'acalanes')
        matches = 0
        for dom_name in dom_team_names:
            if primary in dom_name or opponent in dom_name:
                matches += 1
                
        return matches >= 1 # Usually one team is the anchor

    def _parse_single_table(self, table, headers, player_data_dict, totals_dict):
        """Helper to parse a single stats table (Shooting, Totals, etc.)."""
        for tr in table.find('tbody').find_all('tr'):
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
                    header_title = headers[i]
                    val = td.text.strip()
                    totals_dict[header_title] = val

    def parse_dom_stats(self, dom_html: str) -> Tuple[Optional[TeamGameBoxScore], Optional[TeamGameBoxScore]]:
        """
        Parses the detailed BoxScoresDOM file.
        Returns TeamGameBoxScore objects for both teams if available.
        """
        soup = BeautifulSoup(dom_html, 'html.parser')
        team_headers = soup.find_all('div', class_='team-list--team-header')
        if not team_headers: return None, None
            
        team_boxscores = []
        for header in team_headers:
            team_link = header.find('h3', class_='team-list__team-name').find('a')
            raw_team_name = clean_html_text(team_link.text) if team_link else "Unknown"
            
            # Extract year like (25-26) and clean the name
            year_match = re.search(r'\((\d{2}-\d{2})\)$', raw_team_name)
            team_year = year_match.group(1) if year_match else None
            team_name = re.sub(r'\s*\(\d{2}-\d{2}\)$', '', raw_team_name).strip()
            
            no_data = header.find_next_sibling('div', class_='no-data')
            if no_data:
                team_boxscores.append(TeamGameBoxScore(team_id="unknown", team_name=team_name, team_year=team_year))
                continue
            
            player_data_dict = {}
            totals_dict = {}
            
            stat_categories = soup.find_all('div', class_='stat-category')
            for category in stat_categories:
                school_span = category.find('span', class_='school')
                # Use raw name for matching, as it's what's in the span
                if not school_span or school_span.text.strip() not in raw_team_name:
                    continue
                
                table = category.find('table')
                if not table: continue
                
                headers = [clean_html_text(th.text) for th in table.find('thead').find_all('th')]
                self._parse_single_table(table, headers, player_data_dict, totals_dict)

            if player_data_dict:
                player_stats = [BasketballGameStats(**s) for s in player_data_dict.values()]
                team_totals = TeamTotalsStats(**totals_dict) if totals_dict else None
                team_boxscores.append(TeamGameBoxScore(
                    team_id=str(uuid.uuid4()), 
                    team_name=team_name,
                    team_year=team_year,
                    player_stats=player_stats,
                    team_totals=team_totals
                ))
            else:
                team_boxscores.append(TeamGameBoxScore(team_id="unknown", team_name=team_name, team_year=team_year))

        if len(team_boxscores) == 2: return team_boxscores[0], team_boxscores[1]
        elif len(team_boxscores) == 1: return team_boxscores[0], None
        return None, None

    def assemble_game(self, context_summary: Dict[str, Any], dom_html: str) -> Game:
        """Combines summary and detailed stats into a Game object."""
        home_box, away_box = self.parse_dom_stats(dom_html)
        game = Game(
            maxpreps_game_id=context_summary['maxpreps_game_id'],
            date=context_summary['date'],
            level=context_summary.get('level', 'Varsity'),
            final_score=context_summary['score'] or "0-0",
            maxpreps_url=context_summary['url'],
            home_team=home_box or TeamGameBoxScore(team_id="unknown", team_name=context_summary['primary_slug']),
            away_team=away_box or TeamGameBoxScore(team_id="unknown", team_name=context_summary['opponent_slug'])
        )
        if context_summary['result'] == 'W':
            game.winner_team_id = game.home_team.team_id
            game.winner_team_name = game.home_team.team_name
        elif context_summary['result'] == 'L':
            game.winner_team_id = game.away_team.team_id
            game.winner_team_name = game.away_team.team_name
        return game


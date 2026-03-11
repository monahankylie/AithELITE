from .player_class import Player, Record, BasketballRecord
from .team_class import Team
from utils.parsing_functions import traverse_paths
import json 
import os
from typing import Optional, Callable, Dict, Any, ClassVar, Tuple, List
from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices

class AthleticsParsingInfo(BaseModel):

    rec_func_dict: ClassVar[Dict[Optional[str], Callable]] = {
        None : lambda raw: Record(**raw),
        "basketball": lambda raw: BasketballRecord(**raw),
    }
    sport_type : Optional[str] = Field(alias = "sport",validation_alias = AliasChoices("stype","sport_type"))
    player_mapping : dict = Field(validation_alias = AliasChoices("player_mapping"))
    record_mapping : dict = Field(validation_alias = AliasChoices("record","record_mapping"))
    team_mapping : dict = Field(validation_alias = AliasChoices("team_mapping"))

    @property
    def sport_record_maker(self):
        stype = self.sport_type.lower().strip() if self.sport_type else None
        return self.rec_func_dict.get(stype, self.rec_func_dict[None])

    def _get_best_team_match(self, teams_raw: List[Dict]) -> Optional[Team]:
        """Selects the most recent team matching the target sport."""
        print(f"  [DEBUG] _get_best_team_match received teams_raw (type: {type(teams_raw)}): {teams_raw[:200]}{'...' if len(str(teams_raw)) > 200 else ''}") # Truncate for readability
        if not isinstance(teams_raw, list):
            print(f"  [DEBUG] teams_raw is not a list. Returning None.")
            return None
        
        sport_key = self.sport_type.lower() if self.sport_type else ""
        matches = [
            t for t in teams_raw 
            if isinstance(t, dict) and t.get("sport") and sport_key in t["sport"].lower()
        ]
        
        if not matches: 
            print(f"  [DEBUG] No matching teams found for sport '{sport_key}'. Returning None.")
            
            return None
        
        try:
            matches.sort(key=lambda x: str(x.get("year", "")), reverse=True)
        except: pass
        
        print(f"  [DEBUG] Found matching team: {matches[0].get('schoolName') if isinstance(matches[0], dict) else matches[0]}")
        return Team(**matches[0])

    def assemble_player(self, json_blob: dict) -> Tuple[Optional[Team], Optional[Player]]:
        """
        Main entry point for parsing an athlete.
        Returns (Team, Player) tuple.
        """
        # Step 1: Team Parsing
        team_list_raw = traverse_paths(json_blob, self.team_mapping)
        teams_list = team_list_raw.get("team_root", []) if isinstance(team_list_raw, dict) else team_list_raw
        team = self._get_best_team_match(teams_list)
        if not team:
            team = Team(sport=self.sport_type, team_id="6c68b5d21cab449d9140bd7c8adb2791", school_name="Unknown Fallback")

        # Step 2: Player Bio Parsing
        player_raw = traverse_paths(json_blob, self.player_mapping)
        if not player_raw:
            return team, None
        
        try:
            player = Player(**player_raw)
        except Exception as e:
            print(f"  [DEBUG] Player validation failed: {e}")
            return team, None

        # Step 3: Sport Records Parsing
        if self.record_mapping:
            rec_raw = traverse_paths(json_blob, self.record_mapping)
            if rec_raw:
                rec_raw["team_id"] = team.team_id
                record = self.sport_record_maker(rec_raw)
                if not getattr(record, 'is_empty', False):
                    player.add_record(record)
        
        return team, player

    @field_validator("sport_type", mode="before")
    @classmethod
    def normalize_sport(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower().strip()
        return v
    
    @model_validator(mode='before')
    @classmethod
    def setup_data(cls, data: Any) -> Any:
        def _load_json(val):
            if isinstance(val, str) and val.strip().lower().endswith('.json'):
                if os.path.exists(val):
                    with open(val, 'r', encoding='utf-8') as f:
                        return json.load(f)
            return val

        data = _load_json(data)
        
        if isinstance(data, dict):
            for key in ["player_mapping", "record_mapping", "team_mapping"]:
                if key in data:
                    try:
                        data[key] = _load_json(data[key])
                    except (json.JSONDecodeError, IOError) as e:
                        raise ValueError(f"Failed to load external mapping for '{key}': {e}")
            return data
        return data





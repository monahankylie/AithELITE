from .player_class import Player, Record, BasketballRecord
from .team_class import Team
from utils.parsing_functions import traverse_paths
import json 
import os
from typing import Optional, Callable, Dict, Any, ClassVar, Tuple, List, Type
from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices

class AthleticsParsingInfo(BaseModel):

    rec_func_dict: ClassVar[Dict[Optional[str], Type[BaseModel]]] = { # Changed to store types
        None : Record,
        "basketball": BasketballRecord,
    }
    sport_type : Optional[str] = Field(alias = "sport",validation_alias = AliasChoices("stype","sport_type"))
    player_mapping : dict = Field(validation_alias = AliasChoices("player_mapping"))
    record_mapping : dict # Changed from Any
    team_mapping : dict = Field(validation_alias = AliasChoices("team_mapping"))

    @property
    def sport_record_class(self) -> Type[BaseModel]: # New property to get the class
        stype = self.sport_type.lower().strip() if self.sport_type else None
        return self.rec_func_dict.get(stype, self.rec_func_dict[None])

    @property
    def sport_record_maker(self) -> Callable: # Keep this as a factory for instances
        Klass = self.sport_record_class
        return lambda raw: Klass(**raw)

    def _get_best_team_match(self, teams_raw: List[Dict]) -> Optional[Dict]:
        if not isinstance(teams_raw, list): return None
        sport_key = self.sport_type.lower() if self.sport_type else ""
        matches = [
            t for t in teams_raw 
            if isinstance(t, dict) and t.get("sport") and sport_key in t["sport"].lower()
        ]
        if not matches: return None
        try:
            matches.sort(key=lambda x: str(x.get("year", "")), reverse=True)
        except: pass
        return matches[0]

    def _process_stats_by_year(self, stat_roots: Dict) -> Dict[str, Dict]:
        yearly_stats = {}
        
        # Create a reverse map from alias -> field_name
        record_model_class = self.sport_record_class # Use the class directly
        alias_map = {}
        for field_name, model_field in record_model_class.model_fields.items(): # Use model_fields directly
            if model_field.validation_alias:
                if isinstance(model_field.validation_alias, AliasChoices):
                    for alias in model_field.validation_alias.choices:
                        alias_map[alias] = field_name
                else:
                    alias_map[model_field.validation_alias] = field_name
        
        for root_key, seasons_list in stat_roots.items():
            if not isinstance(seasons_list, list): continue
            
            for season_data in seasons_list:
                year = season_data.get("year")
                if not year: continue

                if year not in yearly_stats:
                    yearly_stats[year] = {"year": year}
                
                stats_list = season_data.get("stats", [])
                for stat_item in stats_list:
                    stat_alias = stat_item.get("name")
                    field_name = alias_map.get(stat_alias, stat_alias) # Fallback to stat_alias if not in map
                    
                    if field_name:
                       yearly_stats[year][field_name] = stat_item.get("value")

        return yearly_stats

    def assemble_player(self, json_blob: dict) -> Tuple[Optional[Team], Optional[Player]]:
        # Step 1: Team Parsing
        team_list_raw = traverse_paths(json_blob, self.team_mapping)
        teams_list = team_list_raw.get("team_root", []) if isinstance(team_list_raw, dict) else team_list_raw
        raw_team_data = self._get_best_team_match(teams_list)
        
        team_obj = Team(**raw_team_data) if raw_team_data else Team(sport=self.sport_type, team_id="fallback", school_name="Unknown")

        # Step 2: Player Bio Parsing
        player_raw = traverse_paths(json_blob, self.player_mapping)
        if not player_raw: return team_obj, None
        
        try:
            player = Player(**player_raw)
        except Exception as e: return team_obj, None

        # Step 3: Sport Records Parsing (dynamic multi-season)
        stat_roots = traverse_paths(json_blob, self.record_mapping)
        all_yearly_stats = self._process_stats_by_year(stat_roots)

        for year, year_stats in all_yearly_stats.items():
            if raw_team_data:
                year_stats = {**raw_team_data, **year_stats}
            
            year_stats["team_id"] = team_obj.team_id
            record = self.sport_record_maker(year_stats)
            
            if not getattr(record, 'is_empty', False):
                player.add_record(record)
        
        return team_obj, player

    @field_validator("sport_type", mode="before")
    @classmethod
    def normalize_sport(cls, v: Any) -> Any:
        if isinstance(v, str): return v.lower().strip()
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

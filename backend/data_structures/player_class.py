from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices, FieldValidationInfo
from typing import Optional, Any, Union, get_args, get_origin
from datetime import datetime
from utils.parsing_functions import traverse_paths
import re

class Record(BaseModel):
    sport: Optional[str] = None
    season: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def filter_none_values(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if v is not None}
        return data

    @field_validator("*", mode="before")
    @classmethod
    def empty_str_to_zero(cls, v: Any, info: FieldValidationInfo) -> Any:
        # Pydantic v2 doesn't easily expose the field's type in a simple validator,
        # so we check if the value is an empty string and the field is in the model.
        # This is a safe assumption for this project's data.
        if v == "" and info.field_name in cls.model_fields:
            # We assume numeric fields with empty strings should be 0.
            # A more robust solution might check the field's type annotation.
            return 0
        return v

class BasketballRecord(Record):
    sport: str = "basketball"
    position: Optional[str] = None
    jersey: Optional[str] = None
    team_id: Optional[str] = None 
    
    # --- PER GAME AVERAGES ---
    games_played: int = 0
    minutes_per_game: float = 0.0
    points_per_game: float = 0.0
    off_rebounds_per_game: float = 0.0
    def_rebounds_per_game: float = 0.0
    rebounds_per_game: float = 0.0
    assists_per_game: float = 0.0
    steals_per_game: float = 0.0
    blocks_per_game: float = 0.0
    turnovers_per_game: float = 0.0
    fouls_per_game: float = 0.0

    # --- SEASON TOTALS ---
    minutes_played: int = 0
    points: int = 0
    off_rebounds: int = 0
    def_rebounds: int = 0
    rebounds: int = 0
    assists: int = 0
    steals: int = 0
    blocks: int = 0
    turnovers: int = 0
    fouls: int = 0

    # --- SHOOTING ---
    fg_made: int = 0
    fg_attempted: int = 0
    fg_pct: float = 0.0
    
    fg2_made: int = 0
    fg2_attempted: int = 0
    fg2_pct: float = 0.0

    fg3_made: int = Field(0, alias="ThreePointsMade")
    fg3_attempted: int = Field(0, alias="ThreePointAttempts")
    fg3_pct: float = Field(0.0, alias="ThreePointPercentage")
    
    ft_made: int = 0
    ft_attempted: int = 0
    ft_pct: float = 0.0
    
    points_per_shot: float = 0.0
    efg_pct: float = 0.0

    # --- ADVANCED / MISC ---
    ast_to_ratio: float = 0.0
    stl_to_ratio: float = 0.0
    stl_pf_ratio: float = 0.0
    blk_pf_ratio: float = 0.0
    charges: int = 0
    deflections: int = 0
    tech_fouls: int = 0
    double_doubles: int = 0
    triple_doubles: int = 0

    @property
    def is_empty(self) -> bool:
        """Checks if the record has any non-zero/non-default stats."""
        check_fields = ["points", "rebounds", "assists", "games_played", "points_per_game"]
        return not any(getattr(self, f, 0) for f in check_fields)

class Player(BaseModel):
    first_name: Optional[str] = Field(None,validation_alias=AliasChoices("firstName", "first_name"))
    last_name: Optional[str] = Field(None,validation_alias=AliasChoices("lastName", "last_name"))
    grad_class: int = Field(0, alias="class", validation_alias=AliasChoices("graduatingClass", "class","grad_class"))
    height: float = 0.0  # inches
    weight: float = 0.0
    scouting_report: Optional[str] = None
    maxpreps_career_id: Optional[str] = None
    id_247: Optional[str] = None
    base_player_id: Optional[str] = Field(None,validate_default=True)
    maxpreps_link: Optional[str] = Field(None)
    records: list[Any] = Field(default_factory=list)

    def add_record(self, record: Record):
        """Adds a sport record to the player's records list."""
        self.records.append(record)

    @model_validator(mode='before')
    @classmethod
    def filter_none_values(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if v is not None}
        return data

    @field_validator("base_player_id", mode="after")
    @classmethod
    def gen_id(cls, v, info):
        if v: 
            return v
        
        fn = info.data.get("first_name", "unknown")
        ln = info.data.get("last_name", "unknown")
        gc = info.data.get("grad_class", 0)
        mpid = info.data.get("maxpreps_career_id", "ABC")
        raw_id = f"{fn}{ln}{gc}{mpid}".lower().replace(" ", "")
        return re.sub(r'[^a-z0-9]', '', raw_id) 
        
    @field_validator("height", mode="before")
    @classmethod
    def parse_height(cls, v):
        if isinstance(v, str):
            height_lst = [n for n in re.findall(r'\d+\.?\d*', v)]
            height_lst = [float(p) for p in height_lst if p]
            if len(height_lst) <= 1:
                v = height_lst[0]
            else:
                v = (height_lst[0] * 12) + height_lst[1]

        return float(v) if v > 12 else float(v * 12)

    @field_validator("weight", mode="before")
    @classmethod
    def parse_weight(cls, w):
        if isinstance(w, str):
            weight_lst = [n for n in re.findall(r'\d+\.?\d*', w)]
            weight_lst = [float(p) for p in weight_lst if p]
            if re.search("kg", w, re.I):
                w = 2.2 * weight_lst[0]
            else:
                w = weight_lst[0]
        return w

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return self.base_player_id == other.base_player_id

    def __hash__(self):
        return hash(self.base_player_id)

    @model_validator(mode='before')
    @classmethod
    def handle_split_height(cls, data: Any) -> Any:
        if isinstance(data, dict):
            h_ft = data.get("heightFeet") or data.get("height_ft") or data.get("heightFeet")
            h_in = data.get("heightInches") or data.get("height_in") or data.get("heightInches")
            
            if h_ft is not None:
                try:
                    total_inches = float(h_ft) * 12 + float(h_in or 0)
                    data["height"] = total_inches
                except (ValueError, TypeError):
                    pass
        return data

def extract_and_parse_player(json_blob, mapping):
    combined = {}
    if not isinstance(mapping, dict):
        return combined
        
    is_single_set = any(isinstance(v, list) for v in mapping.values())
    
    if is_single_set:
        combined.update(traverse_paths(json_blob, mapping))
    else:
        for sub_mapping in mapping.values():
            if isinstance(sub_mapping, dict):
                combined.update(traverse_paths(json_blob, sub_mapping))
    return combined

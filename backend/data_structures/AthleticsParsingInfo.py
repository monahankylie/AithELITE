from . import player_class
from . import  team_class
import json 
import os
from typing import Optional, Callable, Dict, Any, ClassVar
from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices

class AthleticsParsingInfo(BaseModel):

    rec_func_dict: ClassVar[Dict[Optional[str], Callable]] = {
        None : lambda raw: player_class.Player(**raw),
        "basketball": lambda raw: player_class.BasketballRecord(**raw),
    }
    sport_type : Optional[str] = Field(alias = "sport",validation_alias = AliasChoices("stype","sport_type"))
    player_mapping : dict = Field(validation_alias = AliasChoices("player_mapping"))
    team_mapping : dict = Field(validation_alias = AliasChoices("team_mapping"))

    @property
    def sport_record_maker(self):
        stype = self.sport_type.lower().strip() if self.sport_type else None
        return self.rec_func_dict.get(stype, self.rec_func_dict[None])

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

        # 1. Load the primary model input if it's a path
        data = _load_json(data)
        
        # 2. Recursively check if sub-mappings (player/team) are paths
        if isinstance(data, dict):
            for key in ["player_mapping", "team_mapping"]:
                if key in data:
                    try:
                        data[key] = _load_json(data[key])
                    except (json.JSONDecodeError, IOError) as e:
                        raise ValueError(f"Failed to load external mapping for '{key}': {e}")
            return data
        return data





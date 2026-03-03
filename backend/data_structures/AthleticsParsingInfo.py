from . import player_class
from . import  team_class
import json 
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
        # 1. If input is a string, assume it is a path and load the JSON
        def _load_if_path(value):
            if isinstance(value, str) and value.endswith('.json'):
                with open(value, 'r') as f:
                    return json.load(f)
            return value
        data = _load_if_path(data)
        if isinstance(data, dict):
            try:
                if "player_mapping" in data:
                    data["player_mapping"] = _load_if_path(data.get("player_mapping"))
                if "team_mapping" in data:
                    data["team_mapping"] = _load_if_path(data.get("team_mapping"))
            except FileNotFoundError:
                raise ValueError(f"External mapping file not found")
        return data





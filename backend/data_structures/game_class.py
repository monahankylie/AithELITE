from pydantic import BaseModel, Field, AliasChoices, field_validator, model_validator, FieldValidationInfo
from typing import List, Optional, Any
from datetime import datetime
import re

class GameRecord(BaseModel):
    @model_validator(mode='before')
    @classmethod
    def filter_none_values(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if v is not None}
        return data

    @field_validator("*", mode="before")
    @classmethod
    def empty_str_to_zero(cls, v: Any, info: FieldValidationInfo) -> Any:
        if info.field_name in ["jersey", "player_name"]:
            return str(v) if v is not None else ""
            
        if v == "" and info.field_name in cls.model_fields:
            return 0
        return v

class BasketballGameStats(GameRecord):
    player_id: Optional[str] = None
    player_name: Optional[str] = Field(None, validation_alias=AliasChoices("Athlete Name", "player_name"))
    jersey: Optional[str] = Field(None, validation_alias=AliasChoices("#", "jersey"))
    class_year: Optional[str] = None
    
    minutes_played: int = Field(0, validation_alias=AliasChoices("Min", "minutes_played"))
    points: int = Field(0, validation_alias=AliasChoices("Pts", "points"))
    fg_made: int = Field(0, validation_alias=AliasChoices("FGM", "fg_made"))
    fg_attempted: int = Field(0, validation_alias=AliasChoices("FGA", "fg_attempted"))
    fg_pct: float = Field(0.0, validation_alias=AliasChoices("FG%", "fg_pct"))
    efg_pct: float = Field(0.0, validation_alias=AliasChoices("AFG%", "efg_pct"))
    fg3_made: int = Field(0, validation_alias=AliasChoices("3PM", "fg3_made"))
    fg3_attempted: int = Field(0, validation_alias=AliasChoices("3PA", "fg3_attempted"))
    fg3_pct: float = Field(0.0, validation_alias=AliasChoices("3P%", "fg3_pct"))
    ft_made: int = Field(0, validation_alias=AliasChoices("FTM", "ft_made"))
    ft_attempted: int = Field(0, validation_alias=AliasChoices("FTA", "ft_attempted"))
    ft_pct: float = Field(0.0, validation_alias=AliasChoices("FT%", "ft_pct"))
    fg2_made: int = Field(0, validation_alias=AliasChoices("2FGM", "fg2_made"))
    fg2_attempted: int = Field(0, validation_alias=AliasChoices("2FGA", "fg2_attempted"))
    fg2_pct: float = Field(0.0, validation_alias=AliasChoices("2FG%", "fg2_pct"))
    off_rebounds: int = Field(0, validation_alias=AliasChoices("OReb", "off_rebounds"))
    def_rebounds: int = Field(0, validation_alias=AliasChoices("DReb", "def_rebounds"))
    rebounds: int = Field(0, validation_alias=AliasChoices("Reb", "rebounds"))
    assists: int = Field(0, validation_alias=AliasChoices("Ast", "assists"))
    steals: int = Field(0, validation_alias=AliasChoices("Stl", "steals"))
    blocks: int = Field(0, validation_alias=AliasChoices("Blk", "blocks"))
    turnovers: int = Field(0, validation_alias=AliasChoices("TO", "turnovers"))
    fouls: int = Field(0, validation_alias=AliasChoices("PF", "fouls"))
    ast_to_ratio: float = Field(0.0, validation_alias=AliasChoices("Ast:TO", "ast_to_ratio"))
    stl_to_ratio: float = Field(0.0, validation_alias=AliasChoices("Stl:TO", "stl_to_ratio"))
    stl_pf_ratio: float = Field(0.0, validation_alias=AliasChoices("Stl:PF", "stl_pf_ratio"))
    blk_pf_ratio: float = Field(0.0, validation_alias=AliasChoices("Blk:PF", "blk_pf_ratio"))
    charges: int = Field(0, validation_alias=AliasChoices("Chr", "charges"))
    deflections: int = Field(0, validation_alias=AliasChoices("Defl", "deflections"))
    tech_fouls: int = Field(0, validation_alias=AliasChoices("TF", "tech_fouls"))

class TeamTotalsStats(GameRecord):
    # Same as BasketballGameStats but without player-specific fields
    minutes_played: int = Field(0, validation_alias=AliasChoices("Min", "minutes_played"))
    points: int = Field(0, validation_alias=AliasChoices("Pts", "points"))
    fg_made: int = Field(0, validation_alias=AliasChoices("FGM", "fg_made"))
    fg_attempted: int = Field(0, validation_alias=AliasChoices("FGA", "fg_attempted"))
    fg_pct: float = Field(0.0, validation_alias=AliasChoices("FG%", "fg_pct"))
    efg_pct: float = Field(0.0, validation_alias=AliasChoices("AFG%", "efg_pct"))
    fg3_made: int = Field(0, validation_alias=AliasChoices("3PM", "fg3_made"))
    fg3_attempted: int = Field(0, validation_alias=AliasChoices("3PA", "fg3_attempted"))
    fg3_pct: float = Field(0.0, validation_alias=AliasChoices("3P%", "fg3_pct"))
    ft_made: int = Field(0, validation_alias=AliasChoices("FTM", "ft_made"))
    ft_attempted: int = Field(0, validation_alias=AliasChoices("FTA", "ft_attempted"))
    ft_pct: float = Field(0.0, validation_alias=AliasChoices("FT%", "ft_pct"))
    fg2_made: int = Field(0, validation_alias=AliasChoices("2FGM", "fg2_made"))
    fg2_attempted: int = Field(0, validation_alias=AliasChoices("2FGA", "fg2_attempted"))
    fg2_pct: float = Field(0.0, validation_alias=AliasChoices("2FG%", "fg2_pct"))
    off_rebounds: int = Field(0, validation_alias=AliasChoices("OReb", "off_rebounds"))
    def_rebounds: int = Field(0, validation_alias=AliasChoices("DReb", "def_rebounds"))
    rebounds: int = Field(0, validation_alias=AliasChoices("Reb", "rebounds"))
    assists: int = Field(0, validation_alias=AliasChoices("Ast", "assists"))
    steals: int = Field(0, validation_alias=AliasChoices("Stl", "steals"))
    blocks: int = Field(0, validation_alias=AliasChoices("Blk", "blocks"))
    turnovers: int = Field(0, validation_alias=AliasChoices("TO", "turnovers"))
    fouls: int = Field(0, validation_alias=AliasChoices("PF", "fouls"))
    ast_to_ratio: float = Field(0.0, validation_alias=AliasChoices("Ast:TO", "ast_to_ratio"))
    stl_to_ratio: float = Field(0.0, validation_alias=AliasChoices("Stl:TO", "stl_to_ratio"))
    stl_pf_ratio: float = Field(0.0, validation_alias=AliasChoices("Stl:PF", "stl_pf_ratio"))
    blk_pf_ratio: float = Field(0.0, validation_alias=AliasChoices("Blk:PF", "blk_pf_ratio"))
    charges: int = Field(0, validation_alias=AliasChoices("Chr", "charges"))
    deflections: int = Field(0, validation_alias=AliasChoices("Defl", "deflections"))
    tech_fouls: int = Field(0, validation_alias=AliasChoices("TF", "tech_fouls"))

class TeamGameBoxScore(BaseModel):
    team_id: str
    team_name: str
    team_year: Optional[str] = None
    is_home: bool = False
    player_stats: List[BasketballGameStats] = Field(default_factory=list)
    team_totals: Optional[TeamTotalsStats] = None

class Game(BaseModel):
    maxpreps_game_id: str
    base_game_id: Optional[str] = None
    date: datetime
    sport: str = "basketball"
    level: str = "Varsity"
    home_team: TeamGameBoxScore
    away_team: TeamGameBoxScore
    winner_team_id: Optional[str] = None
    winner_team_name: Optional[str] = None
    final_score: str
    maxpreps_url: Optional[str] = None

    @model_validator(mode='after')
    def gen_id(self) -> 'Game':
        if self.base_game_id: 
            return self
        
        # Alphabetically sort team names for stable ID
        names = sorted([self.home_team.team_name, self.away_team.team_name])
        t1 = re.sub(r'[^a-z0-9]', '', names[0].lower())
        t2 = re.sub(r'[^a-z0-9]', '', names[1].lower())
        
        dt = self.date.strftime("%Y%m%d")
        mpid = self.maxpreps_game_id or "unknown"
        
        self.base_game_id = f"{t1}vs{t2}{dt}{mpid}".lower()
        return self

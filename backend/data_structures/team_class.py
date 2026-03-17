from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices
from typing import Optional, Any
from datetime import datetime
from utils.parsing_functions import traverse_paths
import re

class Team(BaseModel):
    image_link : Optional[str] = None
    sport: str
    mascot: Optional[str] = None
    school_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    maxpreps_url: Optional[str] = Field(None, validation_alias=AliasChoices("team_canonical_url", "teamCanonicalUrl","maxpreps_url"))
    maxpreps_team_id: Optional[str] = Field(None, validation_alias=AliasChoices("team_id", "teamId","maxpreps_team_id"))
    team_id: Optional[str] = None

    @model_validator(mode='after')
    def finalize_data(self) -> 'Team':
        # 1. Parse missing fields from URL (aliases already resolved by Pydantic)
        if self.maxpreps_url and isinstance(self.maxpreps_url, str):
            parts = [p for p in self.maxpreps_url.split("/") if p]
            if len(parts) >= 3:
                self.state = self.state or parts[0].lower()
                self.city = self.city or parts[1].replace("-", " ").title()
                
                name_parts = parts[2].split("-")
                if len(name_parts) > 1:
                    self.school_name = self.school_name or " ".join(name_parts[:-1]).title()
                    self.mascot = self.mascot or name_parts[-1].title()
                else:
                    self.school_name = self.school_name or name_parts[0].title()

        # 2. Generate team_id if not provided
        if not self.team_id:
            msct = self.mascot or "unknown"
            schl = self.school_name or "unknown"
            st = self.state or "unknown"
            mptid = self.maxpreps_team_id or "abc"
            raw_id = f"{msct}{schl}{st}{mptid}".lower().replace(" ", "")
            self.team_id = re.sub(r'[^a-z0-9]', '', raw_id) 

        return self
    
    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return self.team_id == other.team_id

    def __hash__(self):
        return hash(self.team_id)

def extract_all_teams(json_blob, team_mapping):
    if not team_mapping or not isinstance(team_mapping, dict):
        return []
    
    root_key = next(iter(team_mapping))
    root_path = team_mapping[root_key]
    
    traversed = traverse_paths(json_blob, {root_key: root_path})
    teams = traversed.get(root_key)
    return teams if isinstance(teams, list) else []

def parse_into_teams(teams_list, team_struct):
    if not teams_list:
        return []
    all_teams = []
    for i in range(len(teams_list)):
        team_dict = traverse_paths(teams_list[i], team_struct)
        all_teams.append(Team(**team_dict))
    return all_teams

def extract_and_parse(json_blob, team_root, inner_team_struct):
    teams = extract_all_teams(json_blob, team_root)
    teams_objs = parse_into_teams(teams, inner_team_struct)
    return teams, teams_objs

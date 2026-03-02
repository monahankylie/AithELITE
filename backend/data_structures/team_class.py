from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices
from typing import Optional, Any
from datetime import datetime
import re


class Team(BaseModel):
    sport: str
    mascot: Optional[str] = None
    school_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    maxpreps_url: Optional[str] = Field(None, validation_alias=AliasChoices("team_canonical_url", "teamCanonicalUrl","maxpreps_url"))
    maxpreps_team_id: Optional[str] = Field(None, validation_alias=AliasChoices("team_id", "teamId","maxpreps_team_id"))
    team_id: Optional[str] = Field(None,validate_default=True)
    @model_validator(mode='before')
    @classmethod
    def parse_from_url(cls, data: dict):
        url = data.get("maxpreps_url")
        if url and isinstance(url, str):
            # Format: "/state/city/school-mascot/sport/"
            parts = [p for p in url.split("/") if p]
            
            # Populate missing fields from URL parts
            if len(parts) >= 3:
                data["state"] = data.get("state") or parts[0].lower()
                data["city"] = data.get("city") or parts[1].replace("-", " ").title()
                name_parts = parts[2].split("-")
                
                if len(name_parts) > 1:
                    # [:-1] = "Rainier Beach", [-1] = "Vikings"
                    data["school_name"] = " ".join(name_parts[:-1]).title()
                    data["mascot"] = name_parts[-1].title()
                else:
                    # Fallback if there is no hyphen
                    data["school_name"] = name_parts[0].title()
        return data

    @field_validator("team_id", mode="after")
    @classmethod
    def gen_id(cls, v, info):
        if v: 
            return v
        
        # Pulling from validated data
        msct = info.data.get("mascot", "unknown")
        schl = info.data.get("school_name", "unknown")
        state = info.data.get("state", 0)
        mptid = info.data.get("maxpreps_team_id", "ABC")
        raw_id = f"{msct}{schl}{state}{mptid}".lower().replace(" ", "")
        return re.sub(r'[^a-z0-9]', '', raw_id) 
    
    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return self.team_id == other.team_id

    def __hash__(self):
        return hash(self.team_id)
    
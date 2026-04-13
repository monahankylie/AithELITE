##so one class
##multiple attributes that are records
##class has Sport_Name

from data_structures.player_class import BasketballSeasonRecord, SeasonRecord
from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices, FieldValidationInfo, ConfigDict
from typing import ClassVar, Dict, List, Optional, Any, Type, Union, get_args, get_origin, Generic, TypeVar, Optional, Union
from datetime import datetime
import re
import pandas as pd
import numpy as np
T = TypeVar("T", bound="SeasonRecord")
RECORD_DICT = {
        None : SeasonRecord,
        "basketball": BasketballSeasonRecord,
}

##BASKETBALL
#[Condition Name, Columns to Nullify, Weight, Lambda Logic]
junk_rules = [

    ##an instant DQ 

    ("bad_tech", ["tech_fouls"], 1, 
     lambda x: ~((x['tech_fouls'] <= x['fouls']) & ((x['tech_fouls'] < x['games_played']/2) | (x['tech_fouls'] < 4)))),
    
    ("bad_foul", ["fouls"], 1, 
     lambda x: x['fouls'] > (x['games_played'] * 5)),
    
    ("bad_ppg", ["points_per_game"], 1, 
     lambda x: x['points_per_game'] > 60),
    
    ("bad_efg", ["efg_pct"], 1, 
     lambda x: x['efg_pct'] > 150),
    
    ("bad_astto", ["ast_to_ratio"], 1, 
     lambda x: ((x['turnovers'] == 0) & (x['assists'] > 5)) | (x['ast_to_ratio'] > 12)),
    
    ("bad_scores", ["points", "fg2_made", "fg3_made", "ft_made"], 4, 
     lambda x: abs(x['points'] - ((x['fg2_made'] * 2) + (x['fg3_made'] * 3) + x['ft_made'])) > 2),
    
    ("bad_pps", ["points_per_shot"], 1, 
     lambda x: x['points_per_shot'] > 4),

     ("zeros", None, 10,
     lambda x: (x == 0).sum(axis=1) > len(x.columns)/2)
]



class AggRecordsClass(BaseModel,Generic[T]):
    position : Optional[str] = "All"
    avg : Optional[T] = None
    std : Optional[T] = None
    median : Optional[T] = None
    f_quartile : Optional[T] = None
    t_quartile : Optional[T] = None
    min : Optional[T] = None
    max : Optional[T] = None
    range : Optional[T] = None
    count : Optional[int] = 0
    ##histograms here!! with bins
    #so i dont forget: {stat : {points : list of points , counts : list of counts}}
    histograms: Dict[str, Dict[str, List[float]]]


class MainRecordsClass(BaseModel,Generic[T]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    sport_name: str
    data_file : Optional[str] = None
    agg_records: Dict[str, AggRecordsClass[T]] = None
    sport_record_class: Optional[type] = None
    original_data: Optional[pd.DataFrame] = None
    cleaned_data: Optional[pd.DataFrame] = None

    @field_validator("data_file", mode="before")
    def validate_data_file(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            raise ValueError("Data file given is nonexistent")
        if v.endswith('.csv'):
            return v
        raise ValueError("Data file must be a CSV") #FOR NOW
    
    def make_df(self) -> pd.DataFrame:
        if self.original_data is not None:
            return self.original_data
        if self.data_file is not None:
            try:
                self.original_data = pd.read_csv(self.data_file)
                self.cleaned_data = self.original_data.copy() #so we can keep the original data for reference
                return self.original_data
            except Exception as e:
                raise ValueError(f"Error loading data file: {e}")
        raise ValueError("No data file provided and original data not loaded.")
    
    #function to expand lists within cells, currently only for positions but can be adapted for other stats if needed
    #for now, it only fo positions not sure what other cells have lists
    def expand_lists(self) -> None:
        df = self.cleaned_data
        df = df.select_dtypes(exclude=['object'])
        df["positions"] = self.original_data["positions"].str.replace(r"[\[\]\'\s]", "", regex=True).str.split(",")
        df = df.explode("positions") #NOTE EXPLODE CREATES DUPES 
        self.cleaned_data = df

    #accumulate junk score
    def junk_detection(self) -> None:
        df = self.cleaned_data
        df['junk_score'] = 0

        
        for name, cols, weight, logic in junk_rules:
            df_n = df.select_dtypes(exclude=['object'])
            mask = logic(df_n)
            target_cols = cols

            # Apply nullification and score
            if target_cols is not None:
                df.loc[mask, target_cols] = np.nan
            df.loc[mask, 'junk_score'] += weight
        
        self.cleaned_data = df

    def drop_junk(self, threshold: int = 5) -> None:
        df = self.cleaned_data
        df = df[df['junk_score'] < threshold]
        df = df.drop(columns=['junk_score'])
        self.cleaned_data = df

    def arbitrary_drops(self) -> None:
        ##use drop conditions lambdas 
        df = self.cleaned_data
        df.drop(columns = 'minutes_played',inplace=True)
        df = df[df['games_played'] > 4]
        self.cleaned_data = df

    ##validators to make sure we have a csv first
    ##clean the data first
    ##there should be an automate function
    ##three functions: expand lists within cells, convert to numeric but put position back in, 
    ##conditions for cleaning PER sport
    ##USE THE JUNK RULES TO MAKE IT NAN FIRST ADD POINTS
    ##FINALLY DROP 
    ##so clean, then find junk, then drop



def create_agg_records_class(sport_name: str, data_file: Optional[str] = None) -> MainRecordsClass:
    record_class = RECORD_DICT.get(sport_name, SeasonRecord)
    return MainRecordsClass(sport_name=sport_name, data_file=data_file, sport_record_class=record_class)
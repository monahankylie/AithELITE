##so one class
##multiple attributes that are records
##class has Sport_Name

from data_structures.player_class import BasketballSeasonRecord, SeasonRecord
from pydantic import BaseModel, Field, field_validator, model_validator, AliasChoices, FieldValidationInfo, ConfigDict, field_serializer
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


#id should be sport and position
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
    histograms: Dict[str, Dict[str, List[float]]] = {}

    @field_validator('*',mode="before")
    def check_record_type(cls, v: Dict[str, Any], info: FieldValidationInfo) -> Dict[str, Any]:
        field_name = info.field_name
        if field_name in ['histograms', 'position', 'count']:
            return v
        try:
            v = T(**v)
        except Exception as e:
            raise ValueError(f"Error validating field '{field_name}': {e}")
    
    @classmethod
    def fill_from_df(cls, df: pd.DataFrame, T : Type[T], position: Optional[str] = "All") -> 'AggRecordsClass':
        record = cls(position=position)
        record.avg = T(**df.mean().to_dict())
        record.std = T(**df.std().to_dict())
        record.median = T(**df.median().to_dict())
        record.f_quartile = T(**df.quantile(0.25).to_dict())
        record.t_quartile = T(**df.quantile(0.75).to_dict())
        record.min = T(**df.min().to_dict())
        record.max = T(**df.max().to_dict())
        record.range = T(**(df.max() - df.min()).to_dict())
        record.count = len(df)
        #histogram logic here soon
        return record

    def create_histogram(self, df_n: pd.DataFrame, bins: int = 100) -> None:
        for stat in df_n.columns:
            counts, bin_edges = np.histogram(df_n[stat].dropna(), bins=bins)
            self.histograms[stat] = {
                "points": bin_edges.tolist(),
                "counts": counts.tolist()
            }

    @field_serializer('avg', 'std', 'median', 'f_quartile', 't_quartile', 'min', 'max', 'range')
    def serialize_stats(self, stat_record: T):
        if stat_record is None:
            return None
        
        # model_dump converts the record to a dict
        # We filter to keep only int/float and explicitly skip bools
        return {
            k: v for k, v in stat_record.model_dump().items() 
            if isinstance(v, (int, float)) and not isinstance(v, bool)
        }


class MainRecordsClass(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    sport_name: str
    data_file : Optional[str] = None
    agg_records: Dict[str, AggRecordsClass[T]] = {}
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
        df.drop(columns = ['minutes_played', 'minutes_per_game'],inplace=True)
        df = df[df['games_played'] > 4]
        self.cleaned_data = df

    def create_hist_buckets(self, pos:str):
        pass #SOON

    def create_agg_records(self):
        ##for each position, create an agg record class then for each stat, all we gotta do is:
        record_type = self.sport_record_class
        df = self.cleaned_data
        groups = list(df.groupby('positions'))
        groups.append(('All', df))
        for pos_name, subset in groups:
            if pos_name == "":
                continue
            subset_n = subset.select_dtypes(exclude=['object'])
            agg_record = AggRecordsClass.fill_from_df(subset_n, record_type, position=pos_name)
            agg_record.create_histogram(subset_n)
            self.agg_records[pos_name] = agg_record
        
    ##Done for non histogram stuff. Do histogram stuff NOW
    ##After histogram stuff, create the dang records quickry like this: for EACH position(because all sport have positions?),
    ##create an agg record class then for each stat, all we gotta do is:
    ##dataframe -> get the position -> get the mean of all stat -> turn into dict -> put in agg record class -> add to main class dict with position as key
    ##there should always be an "All" position that just takes the mean of all players regardless of position but this is less precise(bigger sameple tho)

def create_agg_records_class(sport_name: str, data_file: Optional[str] = None) -> MainRecordsClass:
    record_class = RECORD_DICT.get(sport_name, SeasonRecord)
    return MainRecordsClass(sport_name=sport_name, data_file=data_file, sport_record_class=record_class)
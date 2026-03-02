from . import player_class
from . import  team_class
import json 

class AthleticsParsingInfo():

    sport_record_maker = {
        "basketball": lambda raw_data: player_class.BasketballRecord(**raw_data)
        ##room for other sports. Also, gonna move this out into a class
    }

    def __init__(self, data_map:str,sport_type:str ):
        self.map = data_map if data_map else None #the json file containing how something is mapped
        self.sport_type = sport_type.strip().lower()
        self.sport_record_function = self.sport_record_maker[self.sport_type]
        self.mappings = self.create_mappings()
        
    
    def create_mappings(self):
        mappings = {}
        with open(self.map, "r") as f:
            mappings = json.load(f)
        return mappings



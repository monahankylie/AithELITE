from utils.parsing_functions import *
from data_structures import player_class,team_class, AthleticsParsingInfo
import os

def run_parse(root_path:str, Athletics):
    plyer_dict = {}
    path = root_path
    mappings = Athletics.mappings
    
    # Extract specific maps
    # bio_maps = maps.get("maxpreps-stats", {}) # For Player base fields
    # stat_maps = maps.get("maxpreps-basketball-stats", {}) # For stats
    
    if not os.path.exists(path):
        return {}
    
    ##this should go thru each mapping, use traverse from utils.parsing_functions
    # to generate appropriate values fo each
    ##at the end, it should look like a dictionary containing n dictionaries(depending on the number of entries)
    return plyer_dict

if __name__ == "__main__":
    run_parse()
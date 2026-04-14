
import pandas as pd
import json


from utils import firestore_helper
from data_structures import player_class, agg_records_class



def get_some_records():
    records = firestore_helper.get_records_by_sport(player_class.BasketballSeasonRecord, n=-1)
    firestore_helper.put_in_csv(records, "test.csv")

def test():
    athletes = pd.read_csv("records_per_season.csv")
    main_class = agg_records_class.create_agg_records_class("basketball", "records_per_season.csv")
    main_class.make_df()
    main_class.expand_lists()
    main_class.junk_detection()
    main_class.drop_junk()
    main_class.arbitrary_drops()
    main_class.create_agg_records()
    dump_to_json(main_class)

def dump_to_json(main_class, filename="basketball_agg.json"):
    # Convert the dictionary of Pydantic objects to a standard dictionary
    serializable_data = {
        position: record.model_dump() 
        for position, record in main_class.agg_records.items()
    }

    with open(filename, "w") as f:
        json.dump(serializable_data, f, indent=4)
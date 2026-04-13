
import pandas as pd


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
    print(main_class.cleaned_data.count())
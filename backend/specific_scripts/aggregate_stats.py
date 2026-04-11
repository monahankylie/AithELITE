
from utils import firestore_helper
from data_structures import player_class


def get_some_records():
    records = firestore_helper.get_records_by_sport(player_class.BasketballSeasonRecord, n=-1)
    firestore_helper.put_in_csv(records, "test.csv")

# push_composition_ratings.py — Step 4: write composition_rating to Firestore (athletes/{slug})
import os
import sys
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FB_ACC_PATH = os.path.join(BASE_DIR, "fbACC.json")
FLATFILE_PATH = os.path.join(BASE_DIR, "flatfile.csv")
BATCH_SIZE = 500
sys.path.insert(0, BASE_DIR)

from specific_scripts.composite_calculator import compute_composition_ratings, CSV_PATH
from specific_scripts.match_composite_to_firestore import (
    _init_firebase,
    normalize_mp_id,
    fetch_firestore_athlete_id_mapping,
    ATHLETES_COLLECTION,
)
def main():
    csv_path = FLATFILE_PATH if os.path.exists(FLATFILE_PATH) else str(CSV_PATH)
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(csv_path)
    
    db = _init_firebase()
    _, _, id_to_slug = fetch_firestore_athlete_id_mapping(db)
    
    df = pd.read_csv(csv_path, low_memory=False)
    agg = compute_composition_ratings(df)
    agg = agg.copy()
    agg["player_id_norm"] = agg["player_id"].map(normalize_mp_id)
    
    matched = agg[agg["player_id_norm"].isin(id_to_slug.keys())].copy()
    
    matched["firestore_doc_id"] = matched["player_id_norm"].map(id_to_slug)
    
    if matched.empty:
        print("No rows to write.")
        return

    batch = db.batch()
    n = 0
    total = 0

    for _, row in matched.iterrows():
        slug = row["firestore_doc_id"]
        ref = db.collection(ATHLETES_COLLECTION).document(slug)
        batch.set(
            ref,
            {
                "composition_rating": float(row["composition_rating"]),
            },
            merge=True,
        )
        n += 1
        if n >= BATCH_SIZE:
            batch.commit()
            total += n
            n = 0
            batch = db.batch()
    if n:
        batch.commit()
        total += n
    print(f"Wrote composition_rating for {total} athlete documents.")
if __name__ == "__main__":
    main()
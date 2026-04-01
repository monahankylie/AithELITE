import os
import sys

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FB_ACC_PATH = os.path.join(BASE_DIR, "fbACC.json")
FLATFILE_PATH = os.path.join(BASE_DIR, "flatfile.csv")

sys.path.insert(0, BASE_DIR)
from specific_scripts.composite_calculator import compute_composition_ratings, CSV_PATH

ATHLETES_COLLECTION = "athletes"


def _init_firebase():
    try:
        firebase_admin.get_app()
    except ValueError:
        cred_path = FB_ACC_PATH
        if not os.path.exists(cred_path):
            cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fbACC.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()


def normalize_mp_id(value) -> str | None:
    """Strip + lowercase so CSV box-score UUIDs match Firestore strings."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip().lower()
    return s if s else None


def _record_athlete_ids(record: dict) -> list[str]:
    if not isinstance(record, dict):
        return []
    keys = ("athlete_id", "AthleteID", "AthleteId", "athleteId")
    out = []
    for k in keys:
        v = record.get(k)
        n = normalize_mp_id(v)
        if n:
            out.append(n)
    return out


def fetch_firestore_athlete_id_mapping(db):
    """
    Step 1: Map MaxPreps IDs that appear in the CSV `player_id` column → Firestore doc id (slug).

    Box scores use athleteId (URL athleteid=). Bio pages use careerId, stored as maxpreps_career_id.
    Those are different UUIDs for the same person — match on athleteId from each season record,
    plus career id and any top-level aliases for completeness.
    """
    total_docs = 0
    docs_with_no_match_key = 0
    id_to_slug: dict[str, str] = {}

    for doc in db.collection(ATHLETES_COLLECTION).stream():
        total_docs += 1
        data = doc.to_dict() or {}
        keys_for_doc: list[str] = []

        cid = normalize_mp_id(data.get("maxpreps_career_id"))
        if cid:
            keys_for_doc.append(cid)

        for k in ("athlete_id", "AthleteID", "athleteId"):
            v = data.get(k)
            n = normalize_mp_id(v)
            if n:
                keys_for_doc.append(n)

        for rec in data.get("records") or []:
            keys_for_doc.extend(_record_athlete_ids(rec))

        keys_for_doc = list(dict.fromkeys(keys_for_doc))

        if not keys_for_doc:
            docs_with_no_match_key += 1
            continue

        for kid in keys_for_doc:
            if kid in id_to_slug and id_to_slug[kid] != doc.id:
                print(
                    f"[WARN] duplicate MaxPreps id {kid!r}: "
                    f"keeping doc {doc.id!r} (was {id_to_slug[kid]!r})"
                )
            id_to_slug[kid] = doc.id

    return total_docs, docs_with_no_match_key, id_to_slug


def main():
    csv_path = FLATFILE_PATH if os.path.exists(FLATFILE_PATH) else str(CSV_PATH)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(csv_path)

    db = _init_firebase()

    total_docs, docs_no_key, id_to_slug = fetch_firestore_athlete_id_mapping(db)
    print(f"[1] Firestore athlete documents: {total_docs}")
    print(f"    Indexed MaxPreps id keys (athlete/career, from records + fields): {len(id_to_slug)}")
    print(f"    Docs with no career id, no records athlete id, no top-level athlete id: {docs_no_key}")

    # Step 2 — all years in file
    df = pd.read_csv(csv_path, low_memory=False)
    agg = compute_composition_ratings(df)
    print(f"[2] Players with composite from CSV: {len(agg)}")

    # Step 3 — CSV player_id is box-score athleteId; compare normalized
    agg = agg.copy()
    agg["player_id_norm"] = agg["player_id"].map(normalize_mp_id)
    matched = agg[agg["player_id_norm"].isin(id_to_slug.keys())].copy()
    matched["firestore_doc_id"] = matched["player_id_norm"].map(id_to_slug)

    indexed_ids = set(id_to_slug.keys())
    csv_norm_ids = set(agg["player_id_norm"].dropna())
    no_csv_for_indexed = len(indexed_ids - csv_norm_ids)
    print(f"[3] Matched rows (Firestore id key in aggregate): {len(matched)}")
    print(f"    Indexed ids with no row in aggregate: {no_csv_for_indexed}")

    top = matched.sort_values("composition_rating", ascending=False).head(300)
    print(
        "\nTop 300 matched (by composition_rating):\n",
        top[["player_name", "composition_rating", "firestore_doc_id"]].to_string(index=False),
    )

    return matched, id_to_slug


if __name__ == "__main__":
    main()

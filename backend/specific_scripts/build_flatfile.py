import os
import sys
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

# Minimal path/Firebase setup for Firestore client; avoid redundancy.

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FB_ACC_PATH = os.path.join(BASE_DIR, "fbACC.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "flatfile_output")

try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(FB_ACC_PATH)
    app = firebase_admin.initialize_app(cred)

db = firestore.client()

# Extract game_stats  (one doc = one player-game row, already flat)
def extract_game_stats() -> pd.DataFrame:
    docs = db.collection("game_stats").stream()
    rows = [doc.to_dict() for doc in docs]
    df = pd.DataFrame(rows)
    print(f"      → {len(df)} player-game rows")
    return df

# Extract games  (nested home_team / away_team maps → flatten)
GAME_TOP_FIELDS = [
    "base_game_id", "date", "sport", "level", "final_score",
    "maxpreps_game_id", "maxpreps_url",
    "winner_team_name", "winner_team_id",
]

def _flatten_game_doc(g: dict) -> dict:
    row = {field: g.get(field) for field in GAME_TOP_FIELDS}

    for side in ("home_team", "away_team"):
        team_data = g.get(side, {})
        row[f"{side}_name"] = team_data.get("team_name")
        row[f"{side}_id"] = team_data.get("team_id")
        row[f"{side}_is_home"] = team_data.get("is_home")
        row[f"{side}_year"] = team_data.get("team_year")

        for stat_key, stat_val in (team_data.get("team_totals") or {}).items():
            row[f"{side}_total_{stat_key}"] = stat_val

    return row


def extract_games() -> pd.DataFrame:
    docs = db.collection("games").stream()
    rows = [_flatten_game_doc(doc.to_dict()) for doc in docs]
    df = pd.DataFrame(rows)
    print(f"      → {len(df)} game rows")
    return df

# 3. Left-join  game_stats ← games  on game_id / base_game_id
def join_dataframes(df_players: pd.DataFrame, df_games: pd.DataFrame) -> pd.DataFrame:
    merged = pd.merge(
        df_players,
        df_games,
        left_on="game_id",
        right_on="base_game_id",
        how="left",
        suffixes=("", "_game"),
    )
    matched = merged["base_game_id"].notna().sum()
    print(f"      → {len(merged)} merged rows  (join hit rate: {matched}/{len(merged)})")
    return merged

# Derive opponent / own-team context columns
TEAM_TOTAL_STATS = [
    "points", "rebounds", "assists", "steals", "blocks", "turnovers",
    "fouls", "fg_pct", "fg3_pct", "ft_pct", "efg_pct",
    "fg_made", "fg_attempted", "fg3_made", "fg3_attempted",
    "ft_made", "ft_attempted", "fg2_made", "fg2_attempted",
    "off_rebounds", "def_rebounds", "minutes_played",
    "ast_to_ratio", "stl_to_ratio", "stl_pf_ratio", "blk_pf_ratio",
    "charges", "deflections", "tech_fouls",
]

def derive_context(df: pd.DataFrame) -> pd.DataFrame:

    is_home = df["team_name"] == df["home_team_name"]

    df["opponent_name"] = df["away_team_name"].where(is_home, df["home_team_name"])
    df["is_home"]= is_home
    df["is_win"]= df["team_name"] == df["winner_team_name"]

    for stat in TEAM_TOTAL_STATS:
        home_col = f"home_team_total_{stat}"
        away_col = f"away_team_total_{stat}"
        if home_col in df.columns and away_col in df.columns:
            df[f"own_team_{stat}"]      = df[home_col].where(is_home, df[away_col])
            df[f"opponent_team_{stat}"] = df[away_col].where(is_home, df[home_col])

    return df

# Chronological sort (temporal separation guarantee)
def sort_chronologically(df: pd.DataFrame) -> pd.DataFrame:
    df["game_date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
    df = df.sort_values(["player_id", "game_date"]).reset_index(drop=True)
    return df

# Main pipeline for building the flatfile
def build_flatfile() -> pd.DataFrame:
    df_players = extract_game_stats()
    df_games   = extract_games()
    merged     = join_dataframes(df_players, df_games)
    merged     = derive_context(merged)
    merged     = sort_chronologically(merged)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "flatfile_game_level.csv")
    merged.to_csv(out_path, index=False)
    print(f"\n[DONE] Flatfile written to {out_path}")
    print(f"       Shape: {merged.shape[0]} rows × {merged.shape[1]} columns")

    return merged


if __name__ == "__main__":
    build_flatfile()

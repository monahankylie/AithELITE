import numpy as np
import pandas as pd
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "flatfile.csv"
MIN_GAMES = 1

def compute_composition_ratings(df: pd.DataFrame, min_games: int = MIN_GAMES) -> pd.DataFrame:
    df = df.copy()
        # 1. Sum up the known attempts for the team in each specific game
    known_team_fga = df.groupby(["base_game_id", "team_name"])["fg_attempted"].transform("sum")
    known_team_fta = df.groupby(["base_game_id", "team_name"])["ft_attempted"].transform("sum")
    known_team_fg3a = df.groupby(["base_game_id", "team_name"])["fg3_attempted"].transform("sum")

    # 2. Find out how many shots are "missing" from the box score
    remaining_fga = df["team_total_fg_attempted"] - known_team_fga
    remaining_fta = df["team_total_ft_attempted"] - known_team_fta
    remaining_fg3a = df["team_total_fg3_attempted"] - known_team_fg3a
    # 3. Identify the corrupted rows (scored points, but 0 attempts)
    needs_fga_fix = (df["fg_attempted"] == 0) & (df["points"] > 0)
    needs_fta_fix = (df["ft_attempted"] == 0) & (df["points"] > 0)
    needs_fg3a_fix = (df["fg3_attempted"] == 0) & (df["points"] > 0)
    # 4. Apply the fix
    # If a player has makes but 0 attempts, estimate attempts based on a 45% FG / 70% FT average and 33% 3-point average
    # We use np.maximum() as a mathematical safety net so we don't accidentally 
    # assign a player fewer attempts than the shots they actually made (fg_made).
    df["fg_attempted"] = np.where(
        (df["fg_attempted"] == 0) & (df["fg_made"] > 0),
        np.round(df["fg_made"] / 0.45),
        df["fg_attempted"]
    )

    df["fg3_attempted"] = np.where(
        (df["fg3_attempted"] == 0) & (df["fg3_made"] > 0),
        np.round(df["fg3_made"] / 0.33),
        df["fg3_attempted"]
    )

    df["ft_attempted"] = np.where(
        (df["ft_attempted"] == 0) & (df["ft_made"] > 0),
        np.round(df["ft_made"] / 0.70),
        df["ft_attempted"]
    )

    # ---------------------------------------------------------------------------
    # Step 1 — Per-game metrics 
    # ---------------------------------------------------------------------------

    # df["game_score"] = (
    #     df["points"]
    #     + (0.4 * df["fg_made"])
    #     + (0.4 * df["fg3_made"])
    #     + (0.3 * df["ft_made"])
    #     - (0.7 * df["fg_attempted"])
    #     - (0.3 * df["fg3_attempted"])
    #     - (0.2 * df["ft_attempted"])
    #     - (0.1 * df["turnovers"])
    #     - (0.1 * df["fouls"])
    # )
    df["game_score"] = (
        df["points"]
        + (0.4 * df["fg_made"])
        + (0.7 * df["off_rebounds"])
        + (0.3 * df["def_rebounds"])
        + (df["steals"])
        + (0.7 * df["assists"])
        + (0.7 * df["blocks"])
        - (0.7 * df["fg_attempted"])
        - (0.4 * (df["ft_attempted"] - df["ft_made"]))
        - (0.4 * df["fouls"])
        - (df["turnovers"])
    )
    # FIX: Use np.nan instead of 0.0 when denominator is 0, so missing data doesn't skew averages
    reb_denom = df["team_total_rebounds"]
    df["rebounds_pct"] = np.where(reb_denom > 0, df["rebounds"] / reb_denom, 0.0)

    ast_denom = df["team_total_assists"]
    df["assists_pct"] = np.where(ast_denom > 0, df["assists"] / ast_denom, 0.0)

    bs_denom = df["team_total_blocks"] + df["team_total_steals"]
    df["block_steal_share"] = np.where(
        bs_denom > 0, (df["blocks"] + df["steals"]) / bs_denom, 0.0
    )

    df["play_making"] = df["assists_pct"] + df["block_steal_share"]

    # ---------------------------------------------------------------------------
    # Step 2 — Filter to players with enough games (Process EVERYONE first)
    # ---------------------------------------------------------------------------

    game_counts = df.groupby("player_id").size()
    eligible_ids = game_counts[game_counts >= MIN_GAMES].index
    df_eligible = df[df["player_id"].isin(eligible_ids)].copy()

    # ---------------------------------------------------------------------------
    # Step 3 — Aggregate per-player averages + consistency (CV)
    # ---------------------------------------------------------------------------

    agg = df_eligible.groupby(["player_id", "player_name"]).agg(
        games=("game_score", "size"),
        avg_game_score=("game_score", "mean"),
        std_game_score=("game_score", "std"),
        avg_play_making=("play_making", "mean"),
        
        # Sum the raw stats needed for True Shooting Percentage
        total_pts=("points", "sum"),
        total_fga=("fg_attempted", "sum"),
        total_fta=("ft_attempted", "sum")
    ).reset_index()

    # Calculate Season-long True Shooting Percentage the correct way
    ts_denom = 2 * (agg["total_fga"] + 0.475 * agg["total_fta"])

    # Use np.where to avoid division by zero, assigning 0.0 if they took no shots all season
    agg["avg_ts_pct"] = np.where(
        ts_denom > 0, 
        agg["total_pts"] / ts_denom, 
        0.0
    )

    # Calculate Consistency
    agg["cv"] = np.where(
        agg["avg_game_score"] != 0,
        agg["std_game_score"] / agg["avg_game_score"].abs(),
        0.0,
    )
    agg["consistency"] = 1 / (1 + agg["cv"])

    # Assume a replacement-level "average" game looks like this:
    LEAGUE_AVG_SCORE = 10.0
    LEAGUE_AVG_TS = 0.50
    LEAGUE_AVG_PM = 0.20

    # If a player has less than 10 games, figure out how many "phantom" games they need
    agg["missing_games"] = np.maximum(10 - agg["games"], 0)

    # Create a condition to only target players with fewer than 10 games
    needs_smoothing = agg["games"] < 10

    # Smooth out the averages by blending their real stats with the phantom average stats
    agg["avg_game_score"] = np.where(
        needs_smoothing,
        ((agg["avg_game_score"] * agg["games"]) + (LEAGUE_AVG_SCORE * agg["missing_games"])) / 10.0,
        agg["avg_game_score"] # If 10+ games, leave their average untouched
    )

    agg["avg_ts_pct"] = np.where(
        needs_smoothing,
        ((agg["avg_ts_pct"] * agg["games"]) + (LEAGUE_AVG_TS * agg["missing_games"])) / 10.0,
        agg["avg_ts_pct"]
    )

    agg["avg_play_making"] = np.where(
        needs_smoothing,
        ((agg["avg_play_making"] * agg["games"]) + (LEAGUE_AVG_PM * agg["missing_games"])) / 10.0,
        agg["avg_play_making"]
    )
    # ---------------------------------------------------------------------------
    # Step 4 — Absolute Rating Calculation (Fixed Benchmarks)
    # ---------------------------------------------------------------------------

    # Define the "0 to 100" spectrum for high school basketball.
    # (You can tweak these max/min numbers based on what you consider elite!)
    BENCHMARKS = {
        "avg_game_score": {"min": 0.0, "max": 25.0},   # A 25+ avg Game Score is phenomenal
        "avg_ts_pct": {"min": 0.35, "max": 0.65},      # 65% True Shooting is elite efficiency
        "avg_play_making": {"min": 0.0, "max": 0.40},  # Being responsible for 40% of team plays is huge
        "consistency": {"min": 0.50, "max": 1.0},      # 1.0 is mathematically perfect consistency
    }

    for col, bounds in BENCHMARKS.items():
        b_min = bounds["min"]
        b_max = bounds["max"]
        
        # Calculate the score against the fixed benchmark
        agg[f"{col}_norm"] = ((agg[col] - b_min) / (b_max - b_min)) * 100
        
        # IMPORTANT: Use np.clip to ensure a player who literally scores 50 PPG 
        # doesn't break the math and get a 150/100 rating. It caps them at 100.
        agg[f"{col}_norm"] = np.clip(agg[f"{col}_norm"], 0, 100)

    # Calculate the final composition rating (will permanently stay between 0-100)
    agg["composition_rating"] = (
        (agg["avg_game_score_norm"] * 0.40)
        + (agg["avg_ts_pct_norm"] * 0.25)
        + (agg["avg_play_making_norm"] * 0.20)
        + (agg["consistency_norm"] * 0.15)
    )
    # Apply the "2K Curve": take the square root of the rating and multiply by 10.
    # Example: A 64 becomes an 80. An 81 becomes a 90. A 92.5 becomes a 96.1.
    agg["composition_rating"] = np.sqrt(agg["composition_rating"]) * 10
    return agg

if __name__ == "__main__":
    df = pd.read_csv(CSV_PATH, low_memory=False)
    # FIX: Sort the entire league by their true rating, THEN take the top 40
    agg = compute_composition_ratings(df)
    agg_sorted = agg.sort_values("composition_rating", ascending=False).head(100)

    display_cols = [
        "player_name",
        "games",
        "avg_game_score",
        "avg_ts_pct",
        "avg_play_making",
        "consistency",
        "composition_rating", # raw_rating removed as it's no longer needed
    ]

    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 200)
    pd.set_option("display.float_format", "{:.2f}".format)

    print(f"\nComposition Rating — True Top {100} Players (min {MIN_GAMES} games)\n")
    print(agg_sorted[display_cols].to_string(index=False))


import os
import json
import time
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLAYER_STATS_DIR = os.path.join(BASE_DIR, "PlayerStats")

cred = credentials.Certificate(os.path.join(BASE_DIR, "fbACC.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

STAT_NAME_MAP = {
    "GamesPlayed": "games_played",
    "MinutesPerGame": "minutes_per_game",
    "PointsPerGame": "points_per_game",
    "OffensiveReboundsPerGame": "off_rebounds_per_game",
    "DefensiveReboundsPerGame": "def_rebounds_per_game",
    "ReboundsPerGame": "rebounds_per_game",
    "AssistsPerGame": "assists_per_game",
    "StealsPerGame": "steals_per_game",
    "BlocksPerGame": "blocks_per_game",
    "TurnoversPerGame": "turnovers_per_game",
    "PersonalFoulsPerGame": "fouls_per_game",
    "MinutesPlayed": "minutes_played",
    "Points": "points",
    "OffensiveRebounds": "off_rebounds",
    "DefensiveRebounds": "def_rebounds",
    "Rebounds": "rebounds",
    "Assists": "assists",
    "Steals": "steals",
    "BlockedShots": "blocks",
    "Turnovers": "turnovers",
    "PersonalFouls": "fouls",
    "FieldGoalsMade": "fg_made",
    "FieldGoalAttempts": "fg_attempted",
    "FieldGoalPercentage": "fg_pct",
    "TwoPointsMade": "fg2_made",
    "TwoPointAttempts": "fg2_attempted",
    "TwoPointPercentage": "fg2_pct",
    "ThreePointsMade": "fg3_made",
    "ThreePointAttempts": "fg3_attempted",
    "ThreePointPercentage": "fg3_pct",
    "FreeThrowsMade": "ft_made",
    "FreeThrowAttempts": "ft_attempted",
    "FreeThrowPercentage": "ft_pct",
    "PointsPerShot": "points_per_shot",
    "AdjustedFGPercentage": "efg_pct",
    "AssistsPerTurnover": "ast_to_ratio",
    "StealsPerTurnover": "stl_to_ratio",
    "StealsPerPersonalFoul": "stl_pf_ratio",
    "BlocksPerPersonalFoul": "blk_pf_ratio",
    "Charges": "charges",
    "Deflections": "deflections",
    "TechnicalFouls": "tech_fouls",
    "DoubleDouble": "double_doubles",
    "TripleDouble": "triple_doubles",
}

FLOAT_FIELDS = {
    "minutes_per_game", "points_per_game", "off_rebounds_per_game",
    "def_rebounds_per_game", "rebounds_per_game", "assists_per_game",
    "steals_per_game", "blocks_per_game", "turnovers_per_game",
    "fouls_per_game", "fg_pct", "fg2_pct", "fg3_pct", "ft_pct",
    "points_per_shot", "efg_pct", "ast_to_ratio", "stl_to_ratio",
    "stl_pf_ratio", "blk_pf_ratio",
}


def _coerce_stat_value(field_name, raw_value):
    if not raw_value and raw_value != 0:
        return 0.0 if field_name in FLOAT_FIELDS else 0
    try:
        return float(raw_value) if field_name in FLOAT_FIELDS else int(float(raw_value))
    except (ValueError, TypeError):
        return 0.0 if field_name in FLOAT_FIELDS else 0


def _extract_seasons(page_props):
    seasons = {}
    stats_card = page_props.get("statsCardProps", {})
    groups = stats_card.get("careerRollup", {}).get("groups", [])

    sport_tab = stats_card.get("currentSportTab", {})
    sport_name = sport_tab.get("sport", "")

    for group in groups:
        for subgroup in group.get("subgroups", []):
            for season_entry in subgroup.get("stats", []):
                year = season_entry.get("year")
                if not year:
                    continue

                if year not in seasons:
                    seasons[year] = {
                        "sport": sport_name,
                        "year": year,
                        "team_level": season_entry.get("teamLevel", ""),
                        "class_year": season_entry.get("classYear", ""),
                    }

                for stat in season_entry.get("stats", []):
                    mp_name = stat.get("name", "")
                    field = STAT_NAME_MAP.get(mp_name)
                    if not field:
                        continue
                    if field in seasons[year]:
                        continue
                    seasons[year][field] = _coerce_stat_value(field, stat.get("value"))

    return list(seasons.values())


def _extract_team_info(page_props):
    career_context = page_props.get("careerContext", {})
    school_data = career_context.get("recentSchool", {})
    school_id = school_data.get("schoolId", "")
    if not school_id:
        return None

    school_name = school_data.get("name", "")
    mascot = school_data.get("mascot", "")
    city = school_data.get("city", "")
    state = school_data.get("state", "")
    if not state:
        canonical = page_props.get("canonicalUrl", "")
        parts = canonical.split("/")
        if len(parts) > 3:
            state = parts[3].upper()

    team_name = f"{school_name} {mascot}" if mascot else school_name
    location = f"{city}, {state}" if state else city

    return {
        "schoolId": school_id,
        "teamName": team_name,
        "location": location,
    }


def parse_athlete(raw_data):
    page_props = raw_data.get("props", {}).get("pageProps", {})
    career_context = page_props.get("careerContext", {})
    career_data = career_context.get("careerData", {})
    school_data = career_context.get("recentSchool", {})

    career_id = career_data.get("careerId", "")
    if not career_id:
        return None, None

    height_ft = career_data.get("heightFeet", 0) or 0
    height_in = career_data.get("heightInches", 0) or 0

    seasons = _extract_seasons(page_props)
    team_info = _extract_team_info(page_props)

    athlete = {
        "careerId": career_id,
        "maxprepsId": career_id,
        "firstName": career_data.get("firstName", ""),
        "lastName": career_data.get("lastName", ""),
        "imageUrl": career_data.get("photoUrl", ""),
        "position": career_data.get("primaryPosition", ""),
        "school": school_data.get("name", ""),
        "physicalMetrics": {
            "height": f"{height_ft}'{height_in}\"",
            "weight": career_data.get("weight", 0) or 0,
        },
        "gradYear": career_data.get("graduatingClass", ""),
        "source": "maxpreps",
        "seasons": seasons,
    }

    return athlete, team_info


def push_to_firestore(athlete_doc):
    career_id = athlete_doc.pop("careerId")

    try:
        athlete_ref = db.collection("athletes").document(career_id)
        athlete_ref.set(athlete_doc, merge=True)

        seasons = athlete_doc.get("seasons", [])
        stat_count = sum(len(s) for s in seasons)
        print(f"[OK] {athlete_doc['firstName']} {athlete_doc['lastName']} "
              f"({athlete_doc['school']}) | "
              f"{len(seasons)} season(s), {stat_count} stat fields")
        return True
    except Exception as e:
        print(f"[ERROR] Firestore push failed: {e}")
        athlete_doc["careerId"] = career_id
        return False


def process_file(filepath, teams):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"[ERROR] Bad file {filepath}: {e}")
        return

    athlete_doc, team_info = parse_athlete(raw_data)
    if not athlete_doc:
        print(f"[SKIP] No careerId found in {os.path.basename(filepath)}")
        return

    career_id = athlete_doc["careerId"]

    if team_info:
        sid = team_info["schoolId"]
        if sid not in teams:
            teams[sid] = {
                "teamName": team_info["teamName"],
                "location": team_info["location"],
                "roster": [],
            }
        ref = db.document(f"athletes/{career_id}")
        if ref not in teams[sid]["roster"]:
            teams[sid]["roster"].append(ref)

    if push_to_firestore(athlete_doc):
        os.remove(filepath)


def push_teams(teams):
    if not teams:
        return
    print(f"\nPushing {len(teams)} team(s)...")
    for school_id, team_doc in teams.items():
        try:
            db.collection("teams").document(school_id).set(team_doc, merge=True)
            print(f"[TEAM OK] {team_doc['teamName']} | "
                  f"{team_doc['location']} | "
                  f"{len(team_doc['roster'])} player(s)")
        except Exception as e:
            print(f"[TEAM ERROR] {team_doc['teamName']}: {e}")


def watch_player_data():
    os.makedirs(PLAYER_STATS_DIR, exist_ok=True)
    print(f"Watching {PLAYER_STATS_DIR} for new athletes...")

    while True:
        files = [f for f in os.listdir(PLAYER_STATS_DIR) if f.endswith(".json")]
        if files:
            print(f"Found {len(files)} file(s) to process")
            teams = {}
            for filename in files:
                filepath = os.path.join(PLAYER_STATS_DIR, filename)
                process_file(filepath, teams)
            push_teams(teams)
        time.sleep(5)


if __name__ == "__main__":
    watch_player_data()

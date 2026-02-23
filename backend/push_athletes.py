import os
import json
import time
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLAYER_DATA_DIR = os.path.join(BASE_DIR, "PlayerData")

cred = credentials.Certificate(os.path.join(BASE_DIR, "fbACC.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

AVERAGE_MAP = {
    "P/G": "ppg",
    "Reb/G": "rpg",
    "Ast/G": "apg",
    "Stl/G": "spg",
    "Blk/G": "bpg",
}

TOTALS_MAP = {
    "GP": "gp",
    "Pts": "pts",
}

QUICKSTATS_AVERAGE_MAP = {
    "Points Per Game": "ppg",
    "Rebounds Per Game": "rpg",
    "Assists Per Game": "apg",
    "Steals Per Game": "spg",
    "Blocks Per Game": "bpg",
}

QUICKSTATS_TOTALS_MAP = {
    "Games Played": "gp",
    "Points": "pts",
}


def _extract_from_quickstats(page_props):
    # Pulling averages/totals from quickStats (current-season, most up-to-date).
    averages = {}
    totals = {}
    cards = page_props.get("careerHomeCards")
    if not isinstance(cards, dict):
        return averages, totals

    for entry in cards.get("quickStats", []):
        if entry.get("sport") != "Basketball":
            continue
        for cat in entry.get("categories", []):
            name = cat.get("name", "")
            val = cat.get("seasonValue", "")
            if not val:
                continue
            if name in QUICKSTATS_AVERAGE_MAP:
                try:
                    averages[QUICKSTATS_AVERAGE_MAP[name]] = float(val)
                except ValueError:
                    pass
            if name in QUICKSTATS_TOTALS_MAP:
                try:
                    totals[QUICKSTATS_TOTALS_MAP[name]] = int(float(val))
                except ValueError:
                    pass
        break
    return averages, totals


def _extract_from_history(page_props):
    # Pulling averages/totals from the most recent basketball season 
    averages = {}
    totals = {}
    for season in page_props.get("careerHistoryData", []):
        if season.get("sport") != "Basketball":
            continue
        stats = season.get("stats", [])
        if not stats:
            continue
        for s in stats:
            header = s.get("header", "")
            val = s.get("value", "")
            if not val:
                continue
            if header in AVERAGE_MAP:
                try:
                    averages[AVERAGE_MAP[header]] = float(val)
                except ValueError:
                    pass
            if header in TOTALS_MAP:
                try:
                    totals[TOTALS_MAP[header]] = int(float(val))
                except ValueError:
                    pass
        break
    return averages, totals


def _extract_team_info(page_props):
    ## parsing team data from a player's page for the teams collection.
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

    overall_record = ""
    for item in page_props.get("careerHistoryData", []):
        if item.get("sport") == "Basketball" and item.get("teamLevel") == "Varsity":
            overall_record = item.get("overallRecord", "") or ""
            break

    team_name = f"{school_name} {mascot}" if mascot else school_name
    location = f"{city}, {state}" if state else city

    return {
        "schoolId": school_id,
        "teamName": team_name,
        "location": location,
        "overallRecord": overall_record,
    }


def parse_athlete(raw_data):
    page_props = raw_data.get("props", {}).get("pageProps", {})
    career_context = page_props.get("careerContext", {})
    career_data = career_context.get("careerData", {})
    school_data = career_context.get("recentSchool", {})
    season_data = career_context.get("recentSportSeason", {})

    career_id = career_data.get("careerId", "")
    if not career_id:
        return None, None

    height_ft = career_data.get("heightFeet", 0) or 0
    height_in = career_data.get("heightInches", 0) or 0

    qs_avg, qs_tot = _extract_from_quickstats(page_props)
    hist_avg, hist_tot = _extract_from_history(page_props)

    average_stats = {**hist_avg, **qs_avg}
    totals_stats = {**hist_tot, **qs_tot}

    team_info = _extract_team_info(page_props)

    athlete = {
        "careerId": career_id,
        "firstName": career_data.get("firstName", ""),
        "lastName": career_data.get("lastName", ""),
        "imageUrl": career_data.get("photoUrl", ""),
        "position": career_data.get("primaryPosition", ""),
        "school": school_data.get("name", ""),
        "physicalMetrics": {
            "height": f"{height_ft}'{height_in}\"",
            "weight": career_data.get("weight", 0) or 0,
        },
        "sport": season_data.get("sport", ""),
        "gradYear": career_data.get("graduatingClass", ""),
        "averages": average_stats,
        "totals": totals_stats,
        "source": "maxpreps",
    }

    return athlete, team_info


def push_to_firestore(athlete_doc):
    career_id = athlete_doc.pop("careerId")
    averages = athlete_doc.pop("averages", {})
    totals = athlete_doc.pop("totals", {})
    position = athlete_doc.pop("position", "")

    try:
        athlete_ref = db.collection("athletes").document(career_id)
        athlete_ref.set(athlete_doc, merge=True)

        bball_record = {}
        if position:
            bball_record["position"] = position
        if averages:
            bball_record["averages"] = averages
        if totals:
            bball_record["totals"] = totals
        if bball_record:
            athlete_ref.collection("sports_records").document("bball_record").set(
                bball_record, merge=True
            )

        avg_str = ", ".join(f"{k}={v}" for k, v in averages.items()) if averages else "none"
        tot_str = ", ".join(f"{k}={v}" for k, v in totals.items()) if totals else "none"
        print(f"[OK] {athlete_doc['firstName']} {athlete_doc['lastName']} "
              f"({athlete_doc['school']}) | avg: {avg_str} | tot: {tot_str}")
        return True
    except Exception as e:
        print(f"[ERROR] Firestore push failed: {e}")
        athlete_doc["careerId"] = career_id
        athlete_doc["position"] = position
        athlete_doc["averages"] = averages
        athlete_doc["totals"] = totals
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
                "overallRecord": team_info["overallRecord"],
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
                  f"{team_doc['location']} | {team_doc['overallRecord']} | "
                  f"{len(team_doc['roster'])} player(s)")
        except Exception as e:
            print(f"[TEAM ERROR] {team_doc['teamName']}: {e}")


def watch_player_data():
    os.makedirs(PLAYER_DATA_DIR, exist_ok=True)
    print(f"Watching {PLAYER_DATA_DIR} for new athletes...")

    while True:
        files = [f for f in os.listdir(PLAYER_DATA_DIR) if f.endswith(".json")]
        if files:
            print(f"Found {len(files)} file(s) to process")
            teams = {}
            for filename in files:
                filepath = os.path.join(PLAYER_DATA_DIR, filename)
                process_file(filepath, teams)
            push_teams(teams)
        time.sleep(5)


if __name__ == "__main__":
    watch_player_data()

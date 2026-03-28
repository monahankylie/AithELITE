export interface StatRecord {
  year: string;
  school_name: string;
  level: string;
  games_played: number;
  city: string;
  state: string;
  mascot: string;
  sport: string;
  team_id: string; // From your map
}

export interface BasketballStatRecord extends StatRecord {
  athlete_id: string;
  sport: "Basketball";
  // Scoring
  points: number;
  points_per_game: number;
  points_per_shot: number;
  fg_attempted: number;
  fg_made: number;
  fg_pct: number;
  fg2_attempted: number;
  fg2_made: number;
  fg2_pct: number;
  fg3_attempted: number;
  fg3_made: number;
  fg3_pct: number;
  ft_attempted: number;
  ft_made: number;
  ft_pct: number;
  efg_pct: number;
  // Box Score Stats
  rebounds: number;
  rebounds_per_game: number;
  off_rebounds: number;
  off_rebounds_per_game: number;
  def_rebounds: number;
  def_rebounds_per_game: number;
  assists: number;
  assists_per_game: number;
  steals: number;
  steals_per_game: number;
  blocks: number;
  blocks_per_game: number;
  turnovers: number;
  turnovers_per_game: number;
  // Ratios & Advanced
  ast_to_ratio: number;
  stl_to_ratio: number;
  stl_pf_ratio: number;
  blk_pf_ratio: number;
  double_doubles: number;
  triple_doubles: number;
  minutes_played: number;
  minutes_per_game: number;
  fouls: number;
  fouls_per_game: number;
  // Bio/Meta
  positions: string[];
  jersey: string;
  player_level: string;
}

export type AnySportRecord = BasketballStatRecord | StatRecord;

export interface Athlete {
  id: string; 
  base_player_id: string;
  firstName: string;
  lastName: string;
  name: string;
  height: number;
  weight: number;
  classYear: number;
  image_link: string | null;
  // Scraper Metadata
  id_247: string | null;
  maxpreps_career_id: string | null;
  maxpreps_link: string | null;
  scouting_report: string | null;
  // History
  records: AnySportRecord[];
  currentStats?: AnySportRecord;
}

export type SortKey = keyof BasketballStatRecord;

export interface AthleteFilters {
  search?: string;
  position?: string;
  gradYear?: string;
  sortBy?: SortKey;
}
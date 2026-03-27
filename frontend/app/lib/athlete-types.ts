export interface StatRecord {
    year: string;
    school_name: string;
    level: string;
    games_played: number;
    city: string;
    state: string;
    mascot: string;
    sport: string;
}

export interface BasketballStatRecord extends StatRecord {
  points: number;
  points_per_game: number;
  rebounds: number;
  rebounds_per_game: number;
  assists: number;
  assists_per_game: number;
  steals: number;
  blocks: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  positions: string[]; // Actual schema is an array
  // ... add any other specific stats you need to display
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  height: number;
  weight: number;
  classYear: number;
  records: StatRecord[];
}
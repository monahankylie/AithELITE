import type { SortKey } from './athlete-types';

export interface MetricDefinition {
  name: string;
  key: SortKey;
  max: number;
  isPercentage?: boolean; 
  category?: string;
  shortLabel?: string;
}

/**
 * COMPREHENSIVE LIST OF ALL BASKETBALL METRICS
 * This is the single source of truth for metrics across the frontend.
 * Derived from backend/basketball_agg.json capabilities.
 */
export const ALL_BASKETBALL_METRICS: MetricDefinition[] = [
  // Scoring
  { name: 'Points Per Game', key: 'points_per_game', shortLabel: 'PPG', max: 40, category: 'Scoring' },
  { name: 'Points Per Shot', key: 'points_per_shot', shortLabel: 'PPS', max: 3, category: 'Scoring' },
  { name: 'Total Points', key: 'points', shortLabel: 'PTS', max: 1000, category: 'Scoring' },
  
  // Shooting Percentages
  { name: 'Field Goal %', key: 'fg_pct', shortLabel: 'FG%', max: 100, isPercentage: true, category: 'Shooting' },
  { name: 'Effective FG %', key: 'efg_pct', shortLabel: 'eFG%', max: 100, isPercentage: true, category: 'Shooting' },
  { name: '3-Point %', key: 'fg3_pct', shortLabel: '3P%', max: 100, isPercentage: true, category: 'Shooting' },
  { name: '2-Point %', key: 'fg2_pct', shortLabel: '2P%', max: 100, isPercentage: true, category: 'Shooting' },
  { name: 'Free Throw %', key: 'ft_pct', shortLabel: 'FT%', max: 100, isPercentage: true, category: 'Shooting' },
  
  // Rebounding
  { name: 'Rebounds Per Game', key: 'rebounds_per_game', shortLabel: 'RPG', max: 20, category: 'Rebounding' },
  { name: 'Off. Rebounds Per Game', key: 'off_rebounds_per_game', shortLabel: 'ORPG', max: 10, category: 'Rebounding' },
  { name: 'Def. Rebounds Per Game', key: 'def_rebounds_per_game', shortLabel: 'DRPG', max: 15, category: 'Rebounding' },
  { name: 'Total Rebounds', key: 'rebounds', shortLabel: 'REB', max: 500, category: 'Rebounding' },
  
  // Playmaking
  { name: 'Assists Per Game', key: 'assists_per_game', shortLabel: 'APG', max: 15, category: 'Playmaking' },
  { name: 'Assist/TO Ratio', key: 'ast_to_ratio', shortLabel: 'A/TO', max: 10, category: 'Playmaking' },
  { name: 'Total Assists', key: 'assists', shortLabel: 'AST', max: 300, category: 'Playmaking' },
  
  // Defensive
  { name: 'Steals Per Game', key: 'steals_per_game', shortLabel: 'SPG', max: 5, category: 'Defense' },
  { name: 'Blocks Per Game', key: 'blocks_per_game', shortLabel: 'BPG', max: 5, category: 'Defense' },
  { name: 'Steal/TO Ratio', key: 'stl_to_ratio', shortLabel: 'S/TO', max: 5, category: 'Defense' },
  { name: 'Steal/Foul Ratio', key: 'stl_pf_ratio', shortLabel: 'S/PF', max: 5, category: 'Defense' },
  { name: 'Block/Foul Ratio', key: 'blk_pf_ratio', shortLabel: 'B/PF', max: 5, category: 'Defense' },
  { name: 'Deflections', key: 'deflections', shortLabel: 'DEFL', max: 200, category: 'Defense' },
  { name: 'Charges Taken', key: 'charges', shortLabel: 'CHG', max: 50, category: 'Defense' },
  
  // Ball Security / Discipline
  { name: 'Turnovers Per Game', key: 'turnovers_per_game', shortLabel: 'TOPG', max: 10, category: 'Discipline' },
  { name: 'Fouls Per Game', key: 'fouls_per_game', shortLabel: 'FPG', max: 5, category: 'Discipline' },
  { name: 'Tech Fouls', key: 'tech_fouls', shortLabel: 'TECH', max: 20, category: 'Discipline' },
  
  // Production
  { name: 'Double Doubles', key: 'double_doubles', shortLabel: 'DD', max: 50, category: 'Production' },
  { name: 'Triple Doubles', key: 'triple_doubles', shortLabel: 'TD', max: 10, category: 'Production' },
  { name: 'Games Played', key: 'games_played', shortLabel: 'GP', max: 40, category: 'Production' },
  { name: 'Minutes Per Game', key: 'minutes_per_game', shortLabel: 'MPG', max: 48, category: 'Production' },
];

/**
 * Position-specific metrics for Radar charts
 */
export const POSITION_METRICS: Record<string, MetricDefinition[]> = {
  PG: [
    { name: 'PPG', key: 'points_per_game', max: 35 },
    { name: 'APG', key: 'assists_per_game', max: 12 },
    { name: 'SPG', key: 'steals_per_game', max: 3.5 },
    { name: '3P%', key: 'fg3_pct', max: 50, isPercentage: true },
    { name: 'FT%', key: 'ft_pct', max: 100, isPercentage: true },
    { name: 'AST/TO', key: 'ast_to_ratio', max: 5 },
  ],
  SG: [
    { name: 'PPG', key: 'points_per_game', max: 35 },
    { name: '3P%', key: 'fg3_pct', max: 50, isPercentage: true },
    { name: 'FG%', key: 'fg_pct', max: 60, isPercentage: true },
    { name: 'EFG%', key: 'efg_pct', max: 70, isPercentage: true },
    { name: 'FT%', key: 'ft_pct', max: 100, isPercentage: true },
    { name: 'SPG', key: 'steals_per_game', max: 3.0 },
  ],
  SF: [
    { name: 'PPG', key: 'points_per_game', max: 30 },
    { name: 'RPG', key: 'rebounds_per_game', max: 12 },
    { name: 'APG', key: 'assists_per_game', max: 8 },
    { name: 'SPG', key: 'steals_per_game', max: 3.0 },
    { name: 'BPG', key: 'blocks_per_game', max: 2.5 },
    { name: 'FG%', key: 'fg_pct', max: 60, isPercentage: true },
  ],
  PF: [
    { name: 'PPG', key: 'points_per_game', max: 30 },
    { name: 'RPG', key: 'rebounds_per_game', max: 15 },
    { name: 'BPG', key: 'blocks_per_game', max: 4.0 },
    { name: 'ORB', key: 'off_rebounds_per_game', max: 6 },
    { name: 'FG%', key: 'fg_pct', max: 70, isPercentage: true },
    { name: 'DD', key: 'double_doubles', max: 30 },
  ],
  C: [
    { name: 'PPG', key: 'points_per_game', max: 30 },
    { name: 'RPG', key: 'rebounds_per_game', max: 18 },
    { name: 'BPG', key: 'blocks_per_game', max: 5.0 },
    { name: 'FG%', key: 'fg_pct', max: 75, isPercentage: true },
    { name: 'ORB', key: 'off_rebounds_per_game', max: 8 },
    { name: 'DD', key: 'double_doubles', max: 40 },
  ],
};

export const DEFAULT_METRICS: MetricDefinition[] = [
  { name: 'PPG', key: 'points_per_game', max: 35 },
  { name: 'RPG', key: 'rebounds_per_game', max: 15 },
  { name: 'APG', key: 'assists_per_game', max: 12 },
  { name: 'FG%', key: 'fg_pct', max: 100, isPercentage: true },
];

export default POSITION_METRICS;


import type { SortKey ,BasketballStatRecord } from './athlete-types';

export interface MetricDefinition {
  name: string;
  key: SortKey;
  max: number;
  isPercentage?: boolean; 
}


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

// Fallback for missing/unknown positions
export const DEFAULT_METRICS: MetricDefinition[] = [
  { name: 'PPG', key: 'points_per_game', max: 35 },
  { name: 'RPG', key: 'rebounds_per_game', max: 15 },
  { name: 'APG', key: 'assists_per_game', max: 12 },
  { name: 'FG%', key: 'fg_pct', max: 100, isPercentage: true },
];

export default POSITION_METRICS;
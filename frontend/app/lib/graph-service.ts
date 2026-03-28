import { athleteService } from './athlete-service';
import type { Athlete, BasketballStatRecord, AnySportRecord } from './athlete-types';
import { gameService } from './game-service';

/**
 * Data structure for a single series in a Radar Chart.
 */
export interface RadarSeriesData {
  label: string;
  data: number[];
  color?: string;
  hideMark?: boolean;
  fillArea?: boolean;
}

/**
 * Data structure for trend line charts (e.g., points over seasons or games).
 */
export interface TrendData {
  id: string;
  label: string;
  data: number[];
  color?: string;
  xAxisData?: string[];
}

/**
 * GraphService provides utility methods to fetch athlete data from athleteService
 * and transform it into formats suitable for various MUI X-Charts components.
 */
class GraphService {
  /**
   * Fetches data for radar charts.
   * @param playerIds List of athlete IDs to include in the graph.
   * @param metrics List of metrics to display (name and max value).
   */
  async getRadarData(playerIds: string[], metrics: { name: string; max: number }[]): Promise<RadarSeriesData[]> {
    if (!playerIds || playerIds.length === 0) return [];
    
    const players = await athleteService.fetchAthletesByIds(playerIds);
    
    return players.map(player => {
      const data = metrics.map(metric => {
        const rawVal = this.resolveMetricValue(player, metric.name);
        // Normalize to 0-100 scale based on the metric's max
        const normalizedVal = Math.min(100, Math.round((rawVal / metric.max) * 100));
        return normalizedVal;
      });

      return {
        label: player.name,
        data,
      };
    });
  }

  /**
   * Fetches trend data over seasons for a specific metric.
   * @param playerIds List of athlete IDs to include.
   * @param metricName The metric to track (e.g., 'PPG').
   */
  async getTrendData(playerIds: string[], metricName: string): Promise<TrendData[]> {
    if (!playerIds || playerIds.length === 0) return [];

    const players = await athleteService.fetchAthletesByIds(playerIds);

    // 1. Find the union of all years across all selected players
    const allYears = new Set<string>();
    players.forEach(p => {
      p.records.forEach(r => {
        if (r.year) allYears.add(r.year);
      });
    });

    // 2. Sort years chronologically
    const sortedYears = Array.from(allYears).sort((a, b) => a.localeCompare(b));

    // 3. Map each player's stats to this unified timeline
    return players.map(player => {
      const data = sortedYears.map(year => {
        const record = player.records.find(r => r.year === year);
        return record ? this.resolveSeasonMetricValue(record, metricName) : null;
      });

      return {
        id: player.id,
        label: player.name,
        data: data as number[],
        xAxisData: sortedYears,
      };
    });
  }

  /**
   * Fetches game-by-game trend data for a specific metric across multiple years.
   * @param playerIds List of athlete IDs to include.
   * @param metricName The metric to track.
   * @param gameLimit Max number of recent games to fetch total.
   * @param years Array of season years to include (e.g., ['25-26', '24-25']).
   */
  async getGameTrendData(playerIds: string[], metricName: string, gameLimit: number = 30, years: string[] = []): Promise<TrendData[]> {
    if (!playerIds || playerIds.length === 0) return [];

    const players = await athleteService.fetchAthletesByIds(playerIds);

    const playerGamesResults = await Promise.all(
      players.map(async (player) => {
        // Find all athlete_ids associated with the requested years in player records
        const internalIds = player.records
          .filter(r => years.length === 0 || years.includes(r.year))
          .map(r => (r as BasketballStatRecord).athlete_id)
          .filter(id => !!id);

        if (internalIds.length === 0) return null;

        // Fetch and aggregate games across all selected seasons
        const allGames = await gameService.fetchGamesByInternalIds(internalIds);
        
        // Take the last N games (already sorted ascending in fetchGamesByInternalIds)
        const recentGames = allGames.slice(-gameLimit);

        return {
          id: player.id,
          name: player.name,
          gameData: recentGames.map(game => Number(game[metricName.toLowerCase()] ?? 0))
        };
      })
    );

    const validResults = playerGamesResults.filter((r): r is { id: string; name: string; gameData: number[] } => r !== null);
    const xAxisSize = gameLimit;
    
    return validResults.map(res => {
      const paddingSize = Math.max(0, xAxisSize - res.gameData.length);
      const padding = Array(paddingSize).fill(null);
      
      return {
        id: res.id,
        label: res.name,
        data: [...padding, ...res.gameData],
      };
    });
  }

  /**
   * Maps metric display names to player stat values.
   * Supports standard abbreviations and common display names.
   */
  private resolveMetricValue(player: Athlete, metricName: string): number {
    const stats = player.currentStats as BasketballStatRecord;
    if (!stats) return 0;

    const name = metricName.toUpperCase();
    switch (name) {
      case 'PPG': return stats.points_per_game ?? 0;
      case 'RPG': return stats.rebounds_per_game ?? 0;
      case 'APG': return stats.assists_per_game ?? 0;
      case 'SPG': return stats.steals_per_game ?? 0;
      case 'BPG': return stats.blocks_per_game ?? 0;
      case 'FG%': return stats.fg_pct ?? 0;
      case '3P%': return stats.fg3_pct ?? 0;
      case 'FT%': return stats.ft_pct ?? 0;
      case 'TOPG': return stats.turnovers_per_game ?? 0;
      case 'ORB': return stats.off_rebounds_per_game ?? 0;
      case 'DRB': return stats.def_rebounds_per_game ?? 0;
      case 'GP': return stats.games_played ?? 0;
      case 'PTS': return stats.points ?? 0;
      case 'DD': return stats.double_doubles ?? 0;
      case 'AST/TO': return stats.ast_to_ratio ?? 0;
      default: {
        // Fallback to direct key lookup
        const lowerName = metricName.toLowerCase();
        return (stats as any)?.[lowerName] ?? 0;
      }
    }
  }

  /**
   * Maps metric names to season-specific stat values.
   */
  private resolveSeasonMetricValue(record: AnySportRecord, metricName: string): number {
    const stats = record as BasketballStatRecord;
    if (!stats) return 0;

    const name = metricName.toUpperCase();
    switch (name) {
      case 'PPG': return Number(stats.points_per_game ?? 0);
      case 'RPG': return Number(stats.rebounds_per_game ?? 0);
      case 'APG': return Number(stats.assists_per_game ?? 0);
      case 'SPG': return Number(stats.steals_per_game ?? 0);
      case 'BPG': return Number(stats.blocks_per_game ?? 0);
      case 'FG%': return Number(stats.fg_pct ?? 0);
      case '3P%': return Number(stats.fg3_pct ?? 0);
      case 'FT%': return Number(stats.ft_pct ?? 0);
      case 'PTS': return Number(stats.points ?? 0);
      case 'GP': return Number(stats.games_played ?? 0);
      default: {
        // Fallback for snake_case or camelCase keys
        const lowerName = metricName.toLowerCase();
        return Number((stats as any)[lowerName] ?? 0);
      }
    }
  }
}

export const graphService = new GraphService();

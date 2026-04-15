import { athleteService } from './athlete-service';
import type { Athlete, BasketballStatRecord, AnySportRecord } from './athlete-types';
import { gameService } from './game-service';

/**
 * Data structure for a single series in a Radar Chart.
 */
export interface RadarSeriesData {
  id?: string;
  playerId?: string; // Added to handle color matching for multiple historical records
  label: string;
  data: number[];
  rawValues?: number[]; // Added to store raw stat values for tooltips
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
   * @param metrics List of metrics to display (name, key and max value).
   */
  async getRadarData(playerIds: string[], metrics: { name: string; key?: string; max: number }[]): Promise<RadarSeriesData[]> {
    if (!playerIds || playerIds.length === 0) return [];
    
    const players = await athleteService.fetchAthletesByIds(playerIds);
    
    const radarData = players.map(player => {
      const rawValues: number[] = [];
      const data = metrics.map(metric => {
        // Use key if available, otherwise name
        const rawVal = this.resolveMetricValue(player, metric.key || metric.name);
        rawValues.push(rawVal);
        
        // LOGARITHMIC NORMALIZATION
        const logVal = Math.log10(rawVal + 1);
        const logMax = Math.log10(metric.max + 1);
        const normalizedVal = Math.min(100, Math.round((logVal / logMax) * 100));
        
        return normalizedVal;
      });

      return {
        id: player.id,
        playerId: player.id,
        label: player.name,
        data,
        rawValues,
      };
    });

    console.log("[GraphService] getRadarData output:", radarData);
    return radarData;
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

        // Fetch and aggregate games across all selected seasons (passed limit for efficiency)
        const allGames = await gameService.fetchGamesByInternalIds(internalIds, gameLimit);
        
        // Take the last N games (already limited in fetchGamesByInternalIds)
        const recentGames = allGames.slice(-gameLimit);

        return {
          id: player.id,
          name: player.name,
          gameData: recentGames.map(game => this.resolveGameMetricValue(game, metricName))
        };
      })
    );

    const validResults = playerGamesResults.filter((r): r is { id: string; name: string; gameData: (number | null)[] } => r !== null);
    const xAxisSize = gameLimit;
    
    return validResults.map(res => {
      const paddingSize = Math.max(0, xAxisSize - res.gameData.length);
      const padding = Array(paddingSize).fill(null);
      
      return {
        id: res.id,
        label: res.name,
        data: [...padding, ...res.gameData] as number[],
      };
    });
  }

  /**
   * Resolves a metric value for a single game.
   * Maps season-level keys to game-level fields.
   */
  private resolveGameMetricValue(game: any, metricName: string): number {
    const name = metricName.toLowerCase();
    
    // 1. Direct Mappings (Per Game to Total)
    if (name === 'points_per_game' || name === 'points') return Number(game.points ?? 0);
    if (name === 'rebounds_per_game' || name === 'rebounds') return Number(game.rebounds ?? 0);
    if (name === 'assists_per_game' || name === 'assists') return Number(game.assists ?? 0);
    if (name === 'steals_per_game' || name === 'steals') return Number(game.steals ?? 0);
    if (name === 'blocks_per_game' || name === 'blocks') return Number(game.blocks ?? 0);
    if (name === 'turnovers_per_game' || name === 'turnovers') return Number(game.turnovers ?? 0);
    if (name === 'minutes_per_game' || name === 'minutes_played') return Number(game.minutes_played ?? 0);
    if (name === 'fouls_per_game' || name === 'fouls') return Number(game.fouls ?? 0);
    if (name === 'off_rebounds_per_game' || name === 'off_rebounds') return Number(game.off_rebounds ?? 0);
    if (name === 'def_rebounds_per_game' || name === 'def_rebounds') return Number(game.def_rebounds ?? 0);

    // 2. Percentage Calculations (Game-specific)
    if (name === 'fg_pct') {
      return game.fg_attempted ? Math.round((game.fg_made / game.fg_attempted) * 100) : 0;
    }
    if (name === 'fg3_pct') {
      return game.fg3_attempted ? Math.round((game.fg3_made / game.fg3_attempted) * 100) : 0;
    }
    if (name === 'ft_pct') {
      return game.ft_attempted ? Math.round((game.ft_made / game.ft_attempted) * 100) : 0;
    }

    // 3. Ratios
    if (name === 'ast_to_ratio') {
      return game.turnovers ? Number((game.assists / game.turnovers).toFixed(2)) : Number(game.assists);
    }

    // 4. Default Fallback
    return Number(game[name] ?? 0);
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

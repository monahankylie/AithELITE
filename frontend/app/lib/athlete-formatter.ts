import type { Athlete, BasketballStatRecord } from "./athlete-types";

/**
 * Service to aggregate athlete records across multiple seasons/campaigns.
 * Ensures consistent calculation of all 35+ metrics.
 */
export const athleteFormatter = {
  /**
   * Aggregates stats for an athlete across specific seasons.
   * If years is undefined, aggregates all available records.
   */
  aggregateStats(athlete: Athlete, years?: string[]): Partial<BasketballStatRecord> {
    const records = (athlete.records || []) as BasketballStatRecord[];
    
    // Filter by requested years if provided
    const selectedRecords = years 
      ? records.filter(r => years.includes(r.year))
      : records;

    if (selectedRecords.length === 0) {
      return {};
    }

    const totals = {
      games_played: 0,
      points: 0,
      rebounds: 0,
      off_rebounds: 0,
      def_rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      fg_made: 0,
      fg_attempted: 0,
      fg2_made: 0,
      fg2_attempted: 0,
      fg3_made: 0,
      fg3_attempted: 0,
      ft_made: 0,
      ft_attempted: 0,
      minutes_played: 0,
      charges: 0,
      deflections: 0,
      tech_fouls: 0,
      double_doubles: 0,
      triple_doubles: 0,
    };

    selectedRecords.forEach((r) => {
      totals.games_played += (Number(r.games_played) || 0);
      totals.points += (Number(r.points) || 0);
      totals.rebounds += (Number(r.rebounds) || 0);
      totals.off_rebounds += (Number(r.off_rebounds) || 0);
      totals.def_rebounds += (Number(r.def_rebounds) || 0);
      totals.assists += (Number(r.assists) || 0);
      totals.steals += (Number(r.steals) || 0);
      totals.blocks += (Number(r.blocks) || 0);
      totals.turnovers += (Number(r.turnovers) || 0);
      totals.fouls += (Number(r.fouls) || 0);
      totals.fg_made += (Number(r.fg_made) || 0);
      totals.fg_attempted += (Number(r.fg_attempted) || 0);
      totals.fg2_made += (Number(r.fg2_made) || 0);
      totals.fg2_attempted += (Number(r.fg2_attempted) || 0);
      totals.fg3_made += (Number(r.fg3_made) || 0);
      totals.fg3_attempted += (Number(r.fg3_attempted) || 0);
      totals.ft_made += (Number(r.ft_made) || 0);
      totals.ft_attempted += (Number(r.ft_attempted) || 0);
      totals.minutes_played += (Number(r.minutes_played) || 0);
      totals.charges += (Number(r.charges) || 0);
      totals.deflections += (Number(r.deflections) || 0);
      totals.tech_fouls += (Number(r.tech_fouls) || 0);
      totals.double_doubles += (Number(r.double_doubles) || 0);
      totals.triple_doubles += (Number(r.triple_doubles) || 0);
    });

    const gp = totals.games_played || 1;

    // Derived averages and ratios
    return {
      ...totals,
      points_per_game: totals.points / gp,
      rebounds_per_game: totals.rebounds / gp,
      off_rebounds_per_game: totals.off_rebounds / gp,
      def_rebounds_per_game: totals.def_rebounds / gp,
      assists_per_game: totals.assists / gp,
      steals_per_game: totals.steals / gp,
      blocks_per_game: totals.blocks / gp,
      turnovers_per_game: totals.turnovers / gp,
      fouls_per_game: totals.fouls / gp,
      minutes_per_game: totals.minutes_played / gp,
      fg_pct: totals.fg_attempted ? (totals.fg_made / totals.fg_attempted) * 100 : 0,
      fg2_pct: totals.fg2_attempted ? (totals.fg2_made / totals.fg2_attempted) * 100 : 0,
      fg3_pct: totals.fg3_attempted ? (totals.fg3_made / totals.fg3_attempted) * 100 : 0,
      ft_pct: totals.ft_attempted ? (totals.ft_made / totals.ft_attempted) * 100 : 0,
      efg_pct: totals.fg_attempted ? ((totals.fg_made + 0.5 * totals.fg3_made) / totals.fg_attempted) * 100 : 0,
      ast_to_ratio: totals.turnovers ? totals.assists / totals.turnovers : totals.assists,
      stl_to_ratio: totals.turnovers ? totals.steals / totals.turnovers : totals.steals,
      stl_pf_ratio: totals.fouls ? totals.steals / totals.fouls : totals.steals,
      blk_pf_ratio: totals.fouls ? totals.blocks / totals.fouls : totals.blocks,
      points_per_shot: totals.fg_attempted ? totals.points / totals.fg_attempted : 0,
      positions: selectedRecords[0]?.positions || [],
    } as Partial<BasketballStatRecord>;
  },

  formatAvg(val: any): string {
    const n = Number(val);
    if (isNaN(n)) return "—";
    return n.toFixed(1);
  },

  formatStat(val: any): string {
    const n = Number(val);
    if (isNaN(n)) return "—";
    if (n > 100) return Math.round(n).toString();
    return n.toFixed(1);
  },

  formatWhole(val: any, suffix: string = ""): string {
    const n = Number(val);
    if (isNaN(n)) return "—";
    return Math.round(n).toString() + suffix;
  },

  formatHeight(inches: number): string {
    if (!inches) return "—";
    const feet = Math.floor(inches / 12);
    const rem = Math.round(inches % 12);
    return `${feet}'${rem}"`;
  },

  formatWeight(lbs: number): string {
    if (!lbs) return "—";
    return `${Math.round(lbs)} lbs`;
  },

  formatClassYear(year: number): string {
    if (!year) return "—";
    return year.toString();
  }
};

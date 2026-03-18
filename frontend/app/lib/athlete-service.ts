import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  startAfter,
  QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../firebase-config";

export type BasketballAverages = {
  ppg: number;
  rpg: number;
  apg: number;
  spg?: number;
  bpg?: number;
  turnovers?: number;
  turnovers_per_game?: number;
  fg_pct?: number;
  ft_pct?: number;
  fg3_pct?: number;
  off_rebounds_per_game?: number;
  def_rebounds_per_game?: number;
  [key: string]: number | undefined;
};

export type BasketballTotals = {
  gp?: number;
  pts?: number;
  turnovers?: number;
  fg_pct?: number;
  ft_pct?: number;
  fg3_pct?: number;
  off_rebounds?: number;
  def_rebounds?: number;
  [key: string]: number | undefined;
};

export type Season = {
  sport: string;
  year: string;
  team_level?: string;
  class_year?: string;
  // Stats
  points_per_game?: number;
  rebounds_per_game?: number;
  assists_per_game?: number;
  steals_per_game?: number;
  blocks_per_game?: number;
  turnovers_per_game?: number;
  games_played?: number;
  points?: number;
  turnovers?: number;
  fg_pct?: number;
  ft_pct?: number;
  fg3_pct?: number;
  off_rebounds_per_game?: number;
  def_rebounds_per_game?: number;
  off_rebounds?: number;
  def_rebounds?: number;
  [key: string]: any;
};

export type BasketballPlayer = {
  id: string;
  name: string;
  sport: string;
  position: string;
  school: string;
  gradYear: number | string;
  averages?: BasketballAverages;
  avatarUrl?: string;
  physicalMetrics?: {
    height?: string;
    weight?: number | string;
  };
  totals?: BasketballTotals;
  source?: string;
  seasons?: Season[];
  scoutingReport?: string;
  id247?: string;
  mascot?: string;
  city?: string;
  state?: string;
  teamId?: string;
};

export type BasketballPlayerProfile = BasketballPlayer;

export type FetchResult = {
  players: BasketballPlayer[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

class AthleteService {
  private cache: Map<string, BasketballPlayer[]> = new Map();
  private playerCache: Map<string, BasketballPlayer> = new Map();

  private mapAthleteData(
    id: string,
    athleteData: DocumentData
  ): BasketballPlayer {
    console.debug(`[AthleteService] Mapping athlete ${id}. Document keys:`, Object.keys(athleteData));
    
    // Support variations in naming, including snake_case from disjoint backend
    const rawSeasons = athleteData.seasons || athleteData.records || athleteData.stats?.seasons || [];
    const seasons = (Array.isArray(rawSeasons) ? rawSeasons : []) as Season[];
    const firstSeason = seasons.length > 0 ? seasons[0] : null;

    if (!firstSeason) {
      console.warn(`[AthleteService] No seasons/records found for athlete ${id}. Check Firestore.`, {
        keys: Object.keys(athleteData)
      });
    } else {
      console.debug(`[AthleteService] Using first season for display:`, firstSeason);
    }

    let averages: BasketballAverages | undefined = undefined;
    let totals: BasketballTotals | undefined = undefined;

    if (firstSeason) {
      // Support both camelCase and snake_case for stats
      averages = {
        ppg: Number(firstSeason.points_per_game ?? firstSeason.ppg ?? firstSeason.PointsPerGame ?? 0),
        rpg: Number(firstSeason.rebounds_per_game ?? firstSeason.rpg ?? firstSeason.ReboundsPerGame ?? 0),
        apg: Number(firstSeason.assists_per_game ?? firstSeason.apg ?? firstSeason.AssistsPerGame ?? 0),
        spg: firstSeason.steals_per_game ?? firstSeason.spg ?? firstSeason.StealsPerGame,
        bpg: firstSeason.blocks_per_game ?? firstSeason.bpg ?? firstSeason.BlocksPerGame,
        turnovers_per_game: firstSeason.turnovers_per_game ?? firstSeason.TurnoversPerGame,
        fg_pct: firstSeason.fg_pct ?? firstSeason.FieldGoalPercentage,
        ft_pct: firstSeason.ft_pct ?? firstSeason.FreeThrowPercentage,
        fg3_pct: firstSeason.fg3_pct ?? firstSeason.ThreePointPercentage,
        off_rebounds_per_game: firstSeason.off_rebounds_per_game ?? firstSeason.OffensiveReboundsPerGame,
        def_rebounds_per_game: firstSeason.def_rebounds_per_game ?? firstSeason.DefensiveReboundsPerGame,
      };

      totals = {
        gp: firstSeason.games_played ?? firstSeason.gp ?? firstSeason.GamesPlayed,
        pts: firstSeason.points ?? firstSeason.pts ?? firstSeason.Points,
        turnovers: firstSeason.turnovers ?? firstSeason.Turnovers,
        fg_pct: firstSeason.fg_pct ?? firstSeason.FieldGoalPercentage,
        ft_pct: firstSeason.ft_pct ?? firstSeason.FreeThrowPercentage,
        fg3_pct: firstSeason.fg3_pct ?? firstSeason.ThreePointPercentage,
        off_rebounds: firstSeason.off_rebounds ?? firstSeason.OffensiveRebounds,
        def_rebounds: firstSeason.def_rebounds ?? firstSeason.DefensiveRebounds,
      };
    }

    // Flexible mapping for top-level fields (snake_case fallbacks)
    const firstName = athleteData.first_name || athleteData.firstName || "";
    const lastName = athleteData.last_name || athleteData.lastName || "";
    
    const player: BasketballPlayer = {
      id,
      name: (
        athleteData.name || 
        `${firstName} ${lastName}`.trim() || 
        `Athlete ${id.slice(0, 5)}`
      ),
      sport: firstSeason?.sport || athleteData.sport || "Basketball",
      position: athleteData.position || athleteData.primaryPosition || "Prospect",
      school: firstSeason?.school_name || athleteData.school || athleteData.teamName || "Unlisted School",
      mascot: firstSeason?.mascot || athleteData.mascot || undefined,
      city: firstSeason?.city || athleteData.city || undefined,
      state: firstSeason?.state || athleteData.state || undefined,
      teamId: firstSeason?.team_id || athleteData.team_id || undefined,
      gradYear: athleteData.gradYear || athleteData.class || athleteData.graduatingClass || "—",
      averages,
      avatarUrl: athleteData.imageUrl || athleteData.image_link || athleteData.photoUrl || undefined,
      physicalMetrics: {
        height: athleteData.physicalMetrics?.height || athleteData.height || "—",
        weight: athleteData.physicalMetrics?.weight || athleteData.weight || "—",
      },
      totals,
      source: athleteData.source ?? "firebase",
      seasons,
      scoutingReport: athleteData.scouting_report || undefined,
      id247: athleteData.id_247 || undefined,
    };
    
    console.debug(`[AthleteService] Final mapped player ${id}:`, player);

    // Store in playerCache whenever we map data
    this.playerCache.set(id, player);
    return player;
  }

  async fetchBasketballPlayers(
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    if (!db) throw new Error("Firestore not initialized");

    const q = cursor
      ? query(collection(db, "athletes"), startAfter(cursor), limit(pageSize))
      : query(collection(db, "athletes"), limit(pageSize));

    const snap = await getDocs(q);

    if (snap.empty) {
      return { players: [], lastDoc: null, hasMore: false };
    }

    const players = snap.docs.map((athleteDoc) => {
      const data = athleteDoc.data();
      return this.mapAthleteData(athleteDoc.id, data);
    });

    return {
      players,
      lastDoc: snap.docs[snap.docs.length - 1],
      hasMore: snap.docs.length === pageSize,
    };
  }

  async fetchBasketballPlayerById(id: string): Promise<BasketballPlayerProfile> {
    if (!db) throw new Error("Firestore not initialized");

    // Check individual player cache first
    const cached = this.playerCache.get(id);
    if (cached) return cached;

    const athleteRef = doc(db, "athletes", id);
    const athleteSnap = await getDoc(athleteRef);

    if (!athleteSnap.exists()) {
      throw new Error(`Athlete ${id} not found`);
    }

    const athlete = athleteSnap.data();

    return this.mapAthleteData(id, athlete);
  }

  async fetchBasketballPlayersByIds(ids: string[]): Promise<BasketballPlayer[]> {
    if (!db || ids.length === 0) return [];

    // Promise.all to fetch them in parallel, fetchBasketballPlayerById will handle caching
    const players = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.fetchBasketballPlayerById(id);
        } catch (error) {
          console.error(`Failed to fetch player ${id}:`, error);
          return null;
        }
      })
    );

    return players.filter((p): p is BasketballPlayer => p !== null);
  }

  setCache(key: string, players: BasketballPlayer[]) {
    this.cache.set(key, players);
  }

  getCache(key: string): BasketballPlayer[] | null {
    return this.cache.get(key) || null;
  }
}

export const athleteService = new AthleteService();

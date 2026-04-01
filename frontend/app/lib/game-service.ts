import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../firebase-config";

export type BasketballGameStat = {
  id: string;
  player_id: string;
  game_id: string;
  date: string;
  opponent: string;
  opponent_mascot?: string;
  result?: string;
  score?: string;
  // Stats
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fg_made: number;
  fg_attempted: number;
  fg3_made: number;
  fg3_attempted: number;
  ft_made: number;
  ft_attempted: number;
  year?: string;
  [key: string]: any;
};

export type GameDetail = {
  id: string;
  date: any; // Can be Firestore Timestamp
  final_score?: string;
  winner_team_name?: string;
  home_team?: string;
  home_team_id?: string;
  away_team?: string;
  away_team_id?: string;
  [key: string]: any;
};

export type HydratedGameStat = BasketballGameStat & {
  gameDetails?: GameDetail;
};

class GameService {
  private playerGamesCache: Map<string, BasketballGameStat[]> = new Map();

  /**
   * Fetches a specific game record from the 'games' collection.
   */
  async fetchGameById(gameId: string): Promise<GameDetail | null> {
    if (!db || !gameId) return null;
    try {
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) return null;
      
      const data = gameSnap.data();
      // Convert Firestore timestamp to string if it exists
      let dateStr = data.date;
      if (data.date && typeof data.date.toDate === 'function') {
        dateStr = data.date.toDate().toLocaleDateString();
      }

      return { 
        id: gameSnap.id, 
        ...data,
        date: dateStr 
      } as GameDetail;
    } catch (error) {
      console.error(`[GameService] Error fetching game ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Fetches game stats for a specific internal athlete_id (player_id in game_stats).
   */
  async fetchGamesByPlayerId(playerId: string): Promise<BasketballGameStat[]> {
    if (!db) throw new Error("Firestore not initialized");
    if (!playerId) return [];

    const cached = this.playerGamesCache.get(playerId);
    if (cached) return cached;

    console.debug(`[GameService] Fetching games for player_id: ${playerId}`);

    const q = query(
      collection(db, "game_stats"),
      where("player_id", "==", playerId)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn(`[GameService] No games found for player_id: ${playerId}`);
      return [];
    }

    const games = snap.docs.map((doc) => {
      const data = doc.data();
      
      // Normalize date to string for consistent sorting
      let dateStr = data.date;
      if (data.date && typeof data.date.toDate === 'function') {
        dateStr = data.date.toDate().toISOString();
      } else if (data.date instanceof Date) {
        dateStr = data.date.toISOString();
      }

      return {
        id: doc.id,
        ...data,
        date: dateStr || "",
        points: Number(data.points ?? 0),
        rebounds: Number(data.rebounds ?? 0),
        assists: Number(data.assists ?? 0),
        steals: Number(data.steals ?? 0),
        blocks: Number(data.blocks ?? 0),
        turnovers: Number(data.turnovers ?? 0),
      } as BasketballGameStat;
    });

    // Sort chronologically (Oldest to Newest) using normalized ISO strings
    const sorted = games.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateA.localeCompare(dateB);
    });

    this.playerGamesCache.set(playerId, sorted);
    return sorted;
  }

  /**
   * Fetches game stats and hydrates them with details from the 'games' collection.
   */
  async fetchHydratedGamesByPlayerId(playerId: string): Promise<HydratedGameStat[]> {
    const stats = await this.fetchGamesByPlayerId(playerId);
    
    // Fetch unique game details
    const uniqueGameIds = Array.from(new Set(stats.map(s => s.game_id).filter(id => !!id)));
    const detailsMap: Record<string, GameDetail> = {};
    
    await Promise.all(
      uniqueGameIds.map(async (gid) => {
        const detail = await this.fetchGameById(gid);
        if (detail) detailsMap[gid] = detail;
      })
    );

    return stats.map(stat => ({
      ...stat,
      gameDetails: detailsMap[stat.game_id]
    }));
  }

  /**
   * Fetches all game stats for multiple internal athlete_ids.
   */
  async fetchGamesByInternalIds(internalIds: string[], gameLimit?: number): Promise<BasketballGameStat[]> {
    if (!db || internalIds.length === 0) return [];

    const allGames: BasketballGameStat[] = [];
    
    // Fetch in parallel for speed
    await Promise.all(
      internalIds.map(async (id) => {
        const games = await this.fetchGamesByPlayerId(id);
        allGames.push(...games);
      })
    );

    // Sort the aggregated list chronologically (Oldest to Newest)
    const sorted = allGames.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateA.localeCompare(dateB);
    });

    return gameLimit ? sorted.slice(-gameLimit) : sorted;
  }

  /**
   * Fetches games for multiple player internal IDs.
   */
  async fetchGamesByPlayerIds(playerIds: string[]): Promise<Record<string, BasketballGameStat[]>> {
    const results: Record<string, BasketballGameStat[]> = {};
    
    await Promise.all(
      playerIds.map(async (id) => {
        results[id] = await this.fetchGamesByPlayerId(id);
      })
    );

    return results;
  }
}

export const gameService = new GameService();

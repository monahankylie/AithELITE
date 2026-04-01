import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  orderBy,
  startAfter,
  documentId,
  QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../../firebase-config";
import type { Athlete, BasketballStatRecord, AnySportRecord, SortKey, AthleteFilters } from "./athlete-types";

export type FetchResult = {
  players: Athlete[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

class AthleteService {
  private playerCache: Map<string, Athlete> = new Map();

  private mapAthleteData(id: string, data: DocumentData): Athlete {
    const rawRecords = (data.records || []) as AnySportRecord[];
    
    // Log keys of the first document processed to help debug missing fields
    if (this.playerCache.size === 0) {
      console.log("[AthleteService] Debug - Document Keys:", Object.keys(data));
    }

    const sortedRecords = [...rawRecords].sort((a, b) => b.year.localeCompare(a.year));
    const current = sortedRecords[0];

    const firstName = data.first_name || data.firstName || "";
    const lastName = data.last_name || data.lastName || "";

    return {
      id,
      base_player_id: data.base_player_id || "",
      firstName,
      lastName,
      name: data.name || `${firstName} ${lastName}`.trim() || `Athlete ${id.slice(0, 5)}`,
      classYear: Number(data.class || data.classYear || 0),
      height: Number(data.height || 0),
      weight: Number(data.weight || 0),
      image_link: data.image_link || data.imageUrl || null,
      id_247: data.id_247 || null,
      maxpreps_career_id: data.maxpreps_career_id || null,
      maxpreps_link: data.maxpreps_link || null,
      scouting_report: data.scouting_report || null,
      records: sortedRecords,
      currentStats: current,
    };
  }

  public getStatValue(p: Athlete, key: SortKey): number {
    const s = p.currentStats as BasketballStatRecord;
    if (!s || s.sport !== "Basketball") return 0;
    return Number(s[key]) || 0;
  }

  /**
   * Standard paginated fetch for the Discover page.
   * Uses default Firestore ordering (Document ID) to ensure all documents are returned.
   */
  async fetchAthletes(
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    const constraints: QueryConstraint[] = [limit(pageSize)];
    if (cursor) constraints.push(startAfter(cursor));

    const q = query(collection(db, "athletes"), ...constraints);
    const snap = await getDocs(q);

    const players = snap.docs.map(d => this.mapAthleteData(d.id, d.data()));

    return {
      players,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  }

  /**
   * Performs global Firestore queries for the primary filter (Search or Class).
   * Remaining filters (Position, Sort) are handled in-memory.
   */
  async fetchFilteredAthletes(
    filters: AthleteFilters,
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    const constraints: QueryConstraint[] = [];

    // 1. Prioritize Global Search (Prefix Matching on first_name)
    if (filters.search) {
      const raw = filters.search.trim();
      // Normalize: Capitalize first letter (e.g. "bryan" -> "Bryan") to match Firestore indexing
      const s = raw.charAt(0).toUpperCase() + raw.slice(1);
      
      console.log(`[AthleteService] Search query (first_name) - Raw: "${raw}", Normalized: "${s}"`);
      console.log(`[AthleteService] Query bounds: >= "${s}", <= "${s}\uf8ff"`);

      constraints.push(where("first_name", ">=", s));
      constraints.push(where("first_name", "<=", s + "\uf8ff"));
      constraints.push(orderBy("first_name", "asc"));
    } 
    // 2. Fallback to Global Class Filter
    else if (filters.gradYear) {
      console.log(`[AthleteService] Filtering by Class: ${filters.gradYear}`);
      constraints.push(where("class", "==", Number(filters.gradYear)));
    }

    // Fetch a batch size that balances performance and filtering flexibility
    const batchSize = 100;
    constraints.push(limit(batchSize)); 
    if (cursor) constraints.push(startAfter(cursor));

    try {
      const q = query(collection(db, "athletes"), ...constraints);
      const snap = await getDocs(q);
      
      let players = snap.docs.map((d) => this.mapAthleteData(d.id, d.data()));

      // 3. In-memory Secondary Filters (handles the filters not prioritized above)
      if (filters.search && filters.gradYear) {
        players = players.filter(p => p.classYear === Number(filters.gradYear));
      }

      if (filters.position) {
        const pos = filters.position.toLowerCase();
        players = players.filter(p => {
          const stats = p.currentStats as BasketballStatRecord;
          return stats?.positions?.some(rp => String(rp).toLowerCase() === pos);
        });
      }

      // 4. In-memory Sort
      if (filters.sortBy) {
        players.sort((a, b) => this.getStatValue(b, filters.sortBy!) - this.getStatValue(a, filters.sortBy!));
      }

      // 5. Paginate
      const paginatedPlayers = players.slice(0, pageSize);

      return {
        players: paginatedPlayers,
        lastDoc: snap.docs[snap.docs.length - 1] || null,
        hasMore: snap.docs.length === batchSize, 
      };
    } catch (error: any) {
      console.error("[AthleteService] Filtered fetch failed:", error);
      throw error;
    }
  }

  async fetchAthleteById(id: string): Promise<Athlete> {
    const cached = this.playerCache.get(id);
    if (cached) return cached;

    const snap = await getDoc(doc(db, "athletes", id));
    if (!snap.exists()) throw new Error(`Athlete ${id} not found`);

    const mapped = this.mapAthleteData(id, snap.data());
    this.playerCache.set(id, mapped);
    return mapped;
  }

  async fetchAthletesByIds(ids: string[]): Promise<Athlete[]> {
    if (!db || ids.length === 0) return [];

    const result: Athlete[] = [];
    const idsToFetch: string[] = [];

    ids.forEach(id => {
      const cached = this.playerCache.get(id);
      if (cached) result.push(cached);
      else idsToFetch.push(id);
    });

    if (idsToFetch.length === 0) return result;

    const chunks: string[][] = [];
    for (let i = 0; i < idsToFetch.length; i += 30) {
      chunks.push(idsToFetch.slice(i, i + 30));
    }

    const fetchedPlayers = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(collection(db, "athletes"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const mapped = this.mapAthleteData(d.id, d.data());
          this.playerCache.set(d.id, mapped);
          return mapped;
        });
      })
    );

    return [...result, ...fetchedPlayers.flat()];
  }
}

export const athleteService = new AthleteService();

export const SORT_OPTIONS: { value: SortKey; label: string; category: string }[] = [
  { value: "points_per_game", label: "Points Per Game", category: "Scoring" },
  { value: "points", label: "Total Points", category: "Scoring" },
  { value: "fg_pct", label: "Field Goal %", category: "Scoring" },
  { value: "fg3_pct", label: "3-Point %", category: "Scoring" },
  { value: "ft_pct", label: "Free Throw %", category: "Scoring" },
  { value: "assists_per_game", label: "Assists Per Game", category: "Playmaking" },
  { value: "rebounds_per_game", label: "Rebounds Per Game", category: "Rebounding" },
  { value: "steals_per_game", label: "Steals Per Game", category: "Defense" },
  { value: "blocks_per_game", label: "Blocks Per Game", category: "Defense" },
  { value: "games_played", label: "Games Played", category: "General" },
];

export function hasActiveFilters(f: AthleteFilters): boolean {
  return !!(f.search || f.position || f.gradYear || f.sortBy);
}

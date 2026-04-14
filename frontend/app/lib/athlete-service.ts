import {
  collection,
  collectionGroup,
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
import type {
  Athlete,
  BasketballStatRecord,
  AnySportRecord,
  SortKey,
  DiscoverSortKey,
  AthleteFilters,
} from "./athlete-types";
import { athleteFormatter } from "./athlete-formatter";
import {
  extractCompositionRatingFromDocument,
  estimateCompositionRatingFromBasketballStats,
} from "./composition-rating";

export type FetchResult = {
  players: Athlete[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

let loggedFirstDocKeys = false;
class AthleteService {
  private mapAthleteData(id: string, data: DocumentData): Athlete {
    const rawRecords = (data.records || []) as AnySportRecord[];

    if (!loggedFirstDocKeys) {
      loggedFirstDocKeys = true;
      console.log("[AthleteService] Debug - Document Keys:", Object.keys(data));
    }

    const sortedRecords = [...rawRecords].sort((a, b) => b.year.localeCompare(a.year));
    
    // Use the most recent season record as currentStats (Recruiter's standard)
    // instead of an aggregate average to preserve single-season high-performance rankings.
    const current = sortedRecords[0] || {} as AnySportRecord;

    const firstName = data.first_name || data.firstName || "";
    const lastName = data.last_name || data.lastName || "";

    const compositionRating = (() => {
      const fromDoc = extractCompositionRatingFromDocument(data);
      if (fromDoc != null) return fromDoc;
      const stats = current as BasketballStatRecord;
      if (stats?.sport !== "Basketball") return null;
      const est = estimateCompositionRatingFromBasketballStats(stats);
      return est != null && Number.isFinite(est) ? est : null;
    })();

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
      compositionRating,
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

    const players = await Promise.all(snap.docs.map(async (d) => {
      const recordsSnap = await getDocs(collection(d.ref, "sport_records"));
      const records = recordsSnap.docs.map(rd => rd.data() as AnySportRecord);
      return this.mapAthleteData(d.id, { ...d.data(), records });
    }));

    return {
      players,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  }

  /**
   * Performs global Firestore queries for the primary filter (Search, Class, or Sort).
   * Remaining filters are handled in-memory if they cannot be combined in a single query.
   */
  async fetchFilteredAthletes(
    filters: AthleteFilters,
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    try {
      const isStatSort = filters.sortBy && filters.sortBy !== "composition_rating";
      
      // Path A: Search by name (Priority)
      if (filters.search) {
        return await this.fetchBySearch(filters, pageSize, cursor);
      } 
      
      // Path B: Sort by Stat (using collectionGroup)
      if (isStatSort) {
        return await this.fetchByStatSort(filters, pageSize, cursor);
      }

      // Path C: Sort by Composition or Class Filter (direct athletes query)
      return await this.fetchByAthleteQuery(filters, pageSize, cursor);
    } catch (error) {
      console.error("[AthleteService] fetchFilteredAthletes failed:", error);
      throw error;
    }
  }

  private async fetchBySearch(
    filters: AthleteFilters,
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    const raw = filters.search!.trim();
    const s = raw.charAt(0).toUpperCase() + raw.slice(1);
    
    const constraints: QueryConstraint[] = [
      where("first_name", ">=", s),
      where("first_name", "<=", s + "\uf8ff"),
      orderBy("first_name", "asc"),
      limit(100)
    ];
    if (cursor) constraints.push(startAfter(cursor));

    const q = query(collection(db, "athletes"), ...constraints);
    const snap = await getDocs(q);
    
    let players = await Promise.all(snap.docs.map(async (d) => {
      const recordsSnap = await getDocs(collection(d.ref, "sport_records"));
      const records = recordsSnap.docs.map(rd => rd.data() as AnySportRecord);
      return this.mapAthleteData(d.id, { ...d.data(), records });
    }));

    // Post-filter in memory
    if (filters.gradYear) {
      players = players.filter(p => p.classYear === Number(filters.gradYear));
    }
    if (filters.position) {
      const pos = filters.position.toLowerCase();
      players = players.filter(p => {
        const stats = p.currentStats as BasketballStatRecord;
        return stats?.positions?.some(rp => String(rp).toLowerCase() === pos);
      });
    }

    // In-memory sort since we can't combine name search with stat sort in Firestore
    if (filters.sortBy) {
      const order = filters.sortDirection || "desc";
      if (filters.sortBy === "composition_rating") {
        players.sort((a, b) => {
          const valA = a.compositionRating || 0;
          const valB = b.compositionRating || 0;
          return order === "desc" ? valB - valA : valA - valB;
        });
      } else {
        const sortKey = filters.sortBy as SortKey;
        players.sort((a, b) => {
          const valA = this.getStatValue(a, sortKey);
          const valB = this.getStatValue(b, sortKey);
          return order === "desc" ? valB - valA : valA - valB;
        });
      }
    }

    return {
      players: players.slice(0, pageSize),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === 100,
    };
  }

  private async fetchByStatSort(
    filters: AthleteFilters,
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    const sortKey = filters.sortBy as string;
    const order = filters.sortDirection || "desc";
    // Fetch more to account for de-duplication and class filtering
    const firestoreLimit = Math.max(pageSize * 3, 100); 
    
    const constraints: QueryConstraint[] = [
      orderBy(sortKey, order),
    ];

    // If sorting ASC, we must exclude 0/null values to get meaningful "lowest" performers.
    // Otherwise, Firestore just returns every athlete who never played or has no stats first.
    if (order === "asc") {
      constraints.push(where(sortKey, ">", 0));
    }

    constraints.push(limit(firestoreLimit));
    if (cursor) constraints.push(startAfter(cursor));

    if (filters.position) {
      constraints.push(where("positions", "array-contains", filters.position));
    }

    const q = query(collectionGroup(db, "sport_records"), ...constraints);
    const snap = await getDocs(q);

    // Keep track of the BEST record found for each athlete during this query
    const athleteBestRecord = new Map<string, AnySportRecord>();
    const athleteIds: string[] = [];

    for (const d of snap.docs) {
      const parentRef = d.ref.parent.parent;
      if (!parentRef) continue;
      const athleteId = parentRef.id;
      
      if (!athleteBestRecord.has(athleteId)) {
        athleteIds.push(athleteId);
        athleteBestRecord.set(athleteId, d.data() as AnySportRecord);
      }
    }

    // Fetch athlete parent documents and ALL their records
    const players: Athlete[] = [];
    const chunks = [];
    for (let i = 0; i < athleteIds.length; i += 30) {
      chunks.push(athleteIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const qAthletes = query(collection(db, "athletes"), where(documentId(), "in", chunk));
      const aSnap = await getDocs(qAthletes);
      
      const chunkPlayers = await Promise.all(aSnap.docs.map(async (adoc) => {
        const id = adoc.id;
        const allRecordsSnap = await getDocs(collection(adoc.ref, "sport_records"));
        const allRecords = allRecordsSnap.docs.map(rd => rd.data() as AnySportRecord);
        
        // mapAthleteData will correctly identify the most recent season as currentStats
        const athlete = this.mapAthleteData(id, { ...adoc.data(), records: allRecords });
        
        if (filters.gradYear && athlete.classYear !== Number(filters.gradYear)) {
          return null;
        }
        return athlete;
      }));
      
      for (const p of chunkPlayers) {
        if (p) players.push(p);
      }
    }

    // CRITICAL: We now re-sort the final list of athletes based on their LATEST season stats
    // (the ones actually shown on the card). This ensures that a 2.3 PPG player 
    // stays at 2.3 PPG and is ranked appropriately relative to others.
    players.sort((a, b) => {
      const valA = this.getStatValue(a, filters.sortBy as SortKey);
      const valB = this.getStatValue(b, filters.sortBy as SortKey);
      return order === "desc" ? valB - valA : valA - valB;
    });

    return {
      players: players.slice(0, pageSize),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === firestoreLimit,
    };
  }

  private async fetchByAthleteQuery(
    filters: AthleteFilters,
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    const firestoreLimit = Math.max(pageSize, 100);
    const order = filters.sortDirection || "desc";
    const constraints: QueryConstraint[] = [];
    
    if (filters.gradYear) {
      constraints.push(where("class", "==", Number(filters.gradYear)));
    }

    if (filters.sortBy === "composition_rating") {
      constraints.push(orderBy("composition_rating", order));
    }

    constraints.push(limit(firestoreLimit));
    if (cursor) constraints.push(startAfter(cursor));

    const q = query(collection(db, "athletes"), ...constraints);
    const snap = await getDocs(q);
    
    let players = await Promise.all(snap.docs.map(async (d) => {
      const recordsSnap = await getDocs(collection(d.ref, "sport_records"));
      const records = recordsSnap.docs.map(rd => rd.data() as AnySportRecord);
      return this.mapAthleteData(d.id, { ...d.data(), records });
    }));

    if (filters.position) {
      const pos = filters.position.toLowerCase();
      players = players.filter(p => {
        const stats = p.currentStats as BasketballStatRecord;
        return stats?.positions?.some(rp => String(rp).toLowerCase() === pos);
      });
    }

    // Ensure final in-memory sort matches requested order if Firestore couldn't handle it
    if (filters.sortBy === "composition_rating") {
        players.sort((a, b) => {
            const valA = a.compositionRating || 0;
            const valB = b.compositionRating || 0;
            return order === "desc" ? valB - valA : valA - valB;
        });
    }

    return {
      players: players.slice(0, pageSize),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === firestoreLimit,
    };
  }

  async fetchAthleteById(id: string): Promise<Athlete> {
    const athleteRef = doc(db, "athletes", id);
    const [athleteSnap, recordsSnap] = await Promise.all([
      getDoc(athleteRef),
      getDocs(collection(athleteRef, "sport_records"))
    ]);

    if (!athleteSnap.exists()) throw new Error(`Athlete ${id} not found`);
    
    const data = athleteSnap.data();
    const records = recordsSnap.docs.map(d => d.data() as AnySportRecord);
    
    return this.mapAthleteData(id, { ...data, records });
  }

  async fetchAthletesByIds(ids: string[]): Promise<Athlete[]> {
    if (!db || ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
      chunks.push(ids.slice(i, i + 30));
    }

    const byId = new Map<string, Athlete>();

    await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(collection(db, "athletes"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        
        await Promise.all(snap.docs.map(async (d) => {
          const recordsSnap = await getDocs(collection(d.ref, "sport_records"));
          const records = recordsSnap.docs.map(rd => rd.data() as AnySportRecord);
          byId.set(d.id, this.mapAthleteData(d.id, { ...d.data(), records }));
        }));
      }),
    );

    return ids.map((id) => byId.get(id)).filter((a): a is Athlete => a != null);
  }
}

export const athleteService = new AthleteService();

// Expose to window for index generation scripts and debugging
if (typeof window !== "undefined") {
  (window as any).athleteService = athleteService;
}

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

/** Discover sort dropdown: stat sorts + composition (best rating first) */
export const DISCOVER_SORT_OPTIONS: { value: DiscoverSortKey; label: string; category: string }[] = [
  ...SORT_OPTIONS,
  {
    value: "composition_rating",
    label: "Composition rating",
    category: "Ratings",
  },
];

export function hasActiveFilters(f: AthleteFilters): boolean {
  return !!(f.search || f.position || f.gradYear || f.sortBy || f.sortDirection);
}

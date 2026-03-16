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
};

export type BasketballTotals = {
  gp?: number;
  pts?: number;
};

export type BasketballPlayer = {
  id: string;
  name: string;
  sport: string;
  position: string;
  school: string;
  gradYear: number | string;
  averages: BasketballAverages;
  avatarUrl?: string;
  physicalMetrics?: {
    height?: string;
    weight?: number | string;
  };
  totals?: BasketballTotals;
  source?: string;
};

export type BasketballPlayerProfile = BasketballPlayer;

export type FetchResult = {
  players: BasketballPlayer[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

class AthleteService {
  private cache: Map<string, BasketballPlayer[]> = new Map();

  async fetchBasketballPlayers(
    pageSize: number = 20,
    cursor: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<FetchResult> {
    if (!db) throw new Error("Firestore not initialized");

    let fetchedPlayers: BasketballPlayer[] = [];
    let currentCursor = cursor;
    let hasMore = true;
    let iterations = 0;

    while (fetchedPlayers.length < pageSize && iterations < 5) {
      const q = currentCursor
        ? query(collection(db, "athletes"), startAfter(currentCursor), limit(40))
        : query(collection(db, "athletes"), limit(40));

      const snap = await getDocs(q);

      if (snap.empty) {
        hasMore = false;
        break;
      }

      currentCursor = snap.docs[snap.docs.length - 1];

      const rows = await Promise.all(
        snap.docs.map(async (athleteDoc) => {
          const data = athleteDoc.data();

          try {
            const recordSnap = await getDoc(
              doc(db, "athletes", athleteDoc.id, "sports_records", "bball_record")
            );

            if (!recordSnap.exists()) return null;

            const record = recordSnap.data();
            if (record.averages?.ppg == null) return null;

            return {
              id: athleteDoc.id,
              name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
              sport: data.sport ?? "Basketball",
              position: record.position ?? "",
              school: data.school ?? "",
              gradYear: data.gradYear ?? "",
              averages: record.averages,
              avatarUrl: data.imageUrl || undefined,
              physicalMetrics: data.physicalMetrics ?? undefined,
              totals: record.totals ?? undefined,
              source: data.source ?? "firebase",
            } as BasketballPlayer;
          } catch (error) {
            console.error("Failed to parse athlete row:", athleteDoc.id, error);
            return null;
          }
        })
      );

      const validBatch = rows.filter((p): p is BasketballPlayer => p !== null);
      fetchedPlayers = [...fetchedPlayers, ...validBatch];

      if (snap.docs.length < 40) {
        hasMore = false;
        break;
      }

      iterations++;
    }

    return {
      players: fetchedPlayers.slice(0, pageSize),
      lastDoc: currentCursor,
      hasMore,
    };
  }

  async fetchBasketballPlayerById(id: string): Promise<BasketballPlayerProfile> {
    if (!db) throw new Error("Firestore not initialized");

    const athleteRef = doc(db, "athletes", id);
    const athleteSnap = await getDoc(athleteRef);

    if (!athleteSnap.exists()) {
      throw new Error(`Athlete ${id} not found`);
    }

    const athlete = athleteSnap.data();

    const recordRef = doc(db, "athletes", id, "sports_records", "bball_record");
    const recordSnap = await getDoc(recordRef);

    const record = recordSnap.exists() ? recordSnap.data() : {};

    return {
      id,
      name: `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`.trim(),
      sport: athlete.sport ?? "Basketball",
      position: record.position ?? "",
      school: athlete.school ?? "",
      gradYear: athlete.gradYear ?? "",
      averages: {
        ppg: record.averages?.ppg ?? 0,
        rpg: record.averages?.rpg ?? 0,
        apg: record.averages?.apg ?? 0,
        spg: record.averages?.spg ?? 0,
        bpg: record.averages?.bpg ?? 0,
      },
      avatarUrl: athlete.imageUrl || undefined,
      physicalMetrics: athlete.physicalMetrics ?? undefined,
      totals: record.totals ?? undefined,
      source: athlete.source ?? "firebase",
    };
  }

  setCache(key: string, players: BasketballPlayer[]) {
    this.cache.set(key, players);
  }

  getCache(key: string): BasketballPlayer[] | null {
    return this.cache.get(key) || null;
  }
}

export const athleteService = new AthleteService();
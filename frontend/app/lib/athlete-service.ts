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
  averages?: BasketballAverages;
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

  private mapAthleteData(
    id: string,
    athleteData: DocumentData,
    recordData?: DocumentData
  ): BasketballPlayer {
    return {
      id,
      name: `${athleteData.firstName ?? ""} ${athleteData.lastName ?? ""}`.trim(),
      sport: athleteData.sport ?? "Basketball",
      position: recordData?.position ?? "",
      school: athleteData.school ?? "",
      gradYear: athleteData.gradYear ?? "",
      averages: recordData?.averages ?? undefined,
      avatarUrl: athleteData.imageUrl || undefined,
      physicalMetrics: athleteData.physicalMetrics ?? undefined,
      totals: recordData?.totals ?? undefined,
      source: athleteData.source ?? "firebase",
    };
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

    const players = await Promise.all(
      snap.docs.map(async (athleteDoc) => {
        const data = athleteDoc.data();
        try {
          const recordSnap = await getDoc(
            doc(db, "athletes", athleteDoc.id, "sports_records", "bball_record")
          );
          return this.mapAthleteData(
            athleteDoc.id,
            data,
            recordSnap.exists() ? recordSnap.data() : undefined
          );
        } catch (error) {
          console.error("Failed to fetch athlete record:", athleteDoc.id, error);
          return this.mapAthleteData(athleteDoc.id, data);
        }
      })
    );

    return {
      players,
      lastDoc: snap.docs[snap.docs.length - 1],
      hasMore: snap.docs.length === pageSize,
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

    return this.mapAthleteData(
      id,
      athlete,
      recordSnap.exists() ? recordSnap.data() : undefined
    );
  }

  setCache(key: string, players: BasketballPlayer[]) {
    this.cache.set(key, players);
  }

  getCache(key: string): BasketballPlayer[] | null {
    return this.cache.get(key) || null;
  }
}

export const athleteService = new AthleteService();
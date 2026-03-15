import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  limit, 
  query, 
  startAfter, 
  QueryDocumentSnapshot, 
  DocumentData 
} from "firebase/firestore";
import { db } from "../../firebase-config";

export type BasketballPlayer = {
    id: string;
    name: string;
    sport: string;
    position: string;
    school: string;
    gradYear: number | string;
    averages: {
        ppg: number;
        rpg: number;
        apg: number;
        spg?: number;
        bpg?: number;
    };
    avatarUrl?: string;
};

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
                        const recordSnap = await getDoc(doc(db, "athletes", athleteDoc.id, "sports_records", "bball_record"));
                        if (recordSnap.exists()) {
                            const record = recordSnap.data();
                            if (record.averages?.ppg != null) {
                                return {
                                    id: athleteDoc.id,
                                    name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
                                    sport: data.sport ?? "Basketball",
                                    position: record.position ?? "",
                                    school: data.school ?? "",
                                    gradYear: data.gradYear ?? "",
                                    averages: record.averages,
                                    avatarUrl: data.imageUrl || undefined,
                                } as BasketballPlayer;
                            }
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
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
            hasMore
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

import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../firebase-config";
import type { AggregatedStats } from "./athlete-types";

class AggStatsService {
  private cache: Record<string, AggregatedStats> = {};

  /**
   * Fetches aggregated statistics for a specific sport and position.
   * Uses an in-memory cache to minimize Firestore reads during the session.
   */
  async fetchAggStats(sport: string, position: string = "All"): Promise<AggregatedStats | null> {
    if (!db) return null;

    const cacheKey = `${sport.toLowerCase()}:${position}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      const docRef = doc(db, "collective_sports_stats", sport.toLowerCase(), "agg_by_pos", position);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        console.warn(`[AggStatsService] No aggregated stats found for ${sport} - ${position}`);
        return null;
      }

      const data = this.mapAggData(snap.data());
      this.cache[cacheKey] = data;
      return data;
    } catch (error) {
      console.error(`[AggStatsService] Failed to fetch agg stats for ${sport} - ${position}:`, error);
      return null;
    }
  }

  /**
   * Fetches all position-based aggregated statistics for a sport.
   * Returns a map where keys are position names.
   */
  async fetchAllAggStats(sport: string): Promise<Record<string, AggregatedStats>> {
    if (!db) return {};

    try {
      const colRef = collection(db, "collective_sports_stats", sport.toLowerCase(), "agg_by_pos");
      const snap = await getDocs(colRef);

      const results: Record<string, AggregatedStats> = {};
      snap.docs.forEach((d) => {
        results[d.id] = this.mapAggData(d.data());
      });

      return results;
    } catch (error) {
      console.error(`[AggStatsService] Failed to fetch all agg stats for ${sport}:`, error);
      return {};
    }
  }

  private mapAggData(data: DocumentData): AggregatedStats {
    return {
      position: data.position || "Unknown",
      count: Number(data.count || 0),
      avg: (data.avg || {}) as any,
      std: (data.std || {}) as any,
      median: (data.median || {}) as any,
      f_quartile: (data.f_quartile || {}) as any,
      t_quartile: (data.t_quartile || {}) as any,
      min: (data.min || {}) as any,
      max: (data.max || {}) as any,
      range: (data.range || {}) as any,
      histograms: (data.histograms || {}) as any,
    };
  }
}

export const aggStatsService = new AggStatsService();

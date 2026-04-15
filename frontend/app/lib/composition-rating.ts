import type { DocumentData } from "firebase/firestore";
import type { BasketballStatRecord } from "./athlete-types";

const COMPOSITION_KEYS = [
  "composition_rating",
  "compositionRating",
  "composite_rating",
  "compositeRating",
] as const;

/**
 * Parse a Firestore value that may be number, numeric string, or missing.
 */
function parseCompositionValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Read composition from top-level fields, then from newest season record (some pipelines
 * only denormalize onto `records[]`).
 */
export function extractCompositionRatingFromDocument(
  data: DocumentData,
  recordsOverride?: any[]
): number | null {
  for (const k of COMPOSITION_KEYS) {
    const v = parseCompositionValue(data[k]);
    if (v != null) return v;
  }

  const records = recordsOverride || data.records;
  if (!Array.isArray(records)) return null;

  const sorted = [...records].sort((a, b) => {
    const ya = String((a as { year?: string }).year ?? "");
    const yb = String((b as { year?: string }).year ?? "");
    return yb.localeCompare(ya);
  });

  for (const rec of sorted) {
    if (!rec || typeof rec !== "object") continue;
    const row = rec as Record<string, unknown>;
    for (const k of COMPOSITION_KEYS) {
      const v = parseCompositionValue(row[k]);
      if (v != null) return v;
    }
  }

  return null;
}

// --- Mirrors backend/specific_scripts/composite_calculator.py (estimate when Firestore has no field) ---

const LEAGUE_AVG_SCORE = 10.0;
const LEAGUE_AVG_TS = 0.5;
const LEAGUE_AVG_PM = 0.2;

const BENCHMARKS = {
  avg_game_score: { min: 0.0, max: 25.0 },
  avg_ts_pct: { min: 0.35, max: 0.65 },
  avg_play_making: { min: 0.0, max: 0.4 },
  consistency: { min: 0.5, max: 1.0 },
} as const;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function normTo100(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

/** Per-game game_score using the same coefficients as the Python pipeline. */
function gameScoreFromPerGameStats(s: BasketballStatRecord): number {
  const gp = Math.max(s.games_played, 1);
  const pts = s.points_per_game;
  const fgMade = s.fg_made / gp;
  const fgAtt = s.fg_attempted / gp;
  const offReb = s.off_rebounds / gp;
  const defReb = s.def_rebounds / gp;
  const stl = s.steals / gp;
  const ast = s.assists / gp;
  const blk = s.blocks / gp;
  const fta = s.ft_attempted / gp;
  const ftm = s.ft_made / gp;
  const fouls = s.fouls / gp;
  const tov = s.turnovers / gp;

  return (
    pts +
    0.4 * fgMade +
    0.7 * offReb +
    0.3 * defReb +
    stl +
    0.7 * ast +
    0.7 * blk -
    0.7 * fgAtt -
    0.4 * (fta - ftm) -
    0.4 * fouls -
    tov
  );
}

/**
 * Team-agnostic proxy for avg_play_making (Python uses assists_pct + block_steal_share per game).
 */
function playMakingProxy(s: BasketballStatRecord): number {
  const apm = s.assists_per_game;
  const spm = s.steals_per_game;
  const bpm = s.blocks_per_game;
  const rpm = s.rebounds_per_game;
  const raw =
    (apm / 14) * 0.22 +
    ((spm + bpm) / 7) * 0.12 +
    (rpm / 14) * 0.08;
  return clamp(raw, 0, 0.45);
}

function smoothUnder10Games(games: number, raw: number, leagueAvg: number): number {
  if (games >= 10) return raw;
  const missing = Math.max(0, 10 - games);
  return (raw * games + leagueAvg * missing) / 10.0;
}

/**
 * Approximate composition_rating when `composition_rating` is not on the Firestore document
 * (e.g. unmatched MaxPreps id during batch push). Uses season aggregates only; prefers
 * `extractCompositionRatingFromDocument` when the field exists.
 */
export function estimateCompositionRatingFromBasketballStats(
  s: BasketballStatRecord,
): number | null {
  const gp = s.games_played;
  if (!gp || gp < 1) return null;

  let avgGameScore = gameScoreFromPerGameStats(s);
  const totalPts = s.points;
  const totalFga = s.fg_attempted;
  const totalFta = s.ft_attempted;
  const tsDenom = 2 * (totalFga + 0.475 * totalFta);
  let avgTsPct = tsDenom > 0 ? totalPts / tsDenom : 0;

  let avgPlayMaking = playMakingProxy(s);

  avgGameScore = smoothUnder10Games(gp, avgGameScore, LEAGUE_AVG_SCORE);
  avgTsPct = smoothUnder10Games(gp, avgTsPct, LEAGUE_AVG_TS);
  avgPlayMaking = smoothUnder10Games(gp, avgPlayMaking, LEAGUE_AVG_PM);

  // Without per-game std of game_score, approximate CV from games played (more games → stabler).
  const cv = 0.45 / Math.sqrt(gp);
  const consistency = 1 / (1 + cv);

  const gsn = normTo100(avgGameScore, BENCHMARKS.avg_game_score.min, BENCHMARKS.avg_game_score.max);
  const tsn = normTo100(avgTsPct, BENCHMARKS.avg_ts_pct.min, BENCHMARKS.avg_ts_pct.max);
  const pmn = normTo100(avgPlayMaking, BENCHMARKS.avg_play_making.min, BENCHMARKS.avg_play_making.max);
  const cn = normTo100(consistency, BENCHMARKS.consistency.min, BENCHMARKS.consistency.max);

  const rawRating = gsn * 0.4 + tsn * 0.25 + pmn * 0.2 + cn * 0.15;
  const out = Math.sqrt(rawRating) * 10;
  return Number.isFinite(out) ? out : null;
}

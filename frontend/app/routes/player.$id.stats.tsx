import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import PageLayout from "../components/page-layout";
import {
  athleteService,
  type BasketballPlayerProfile,
} from "../lib/athlete-service";

type DerivedProfile = {
  summary: string;
  strengths: string[];
  profileDetails: Array<{ label: string; value: string }>;
  spotlightStats: Array<{ label: string; value: string; accent: string }>;
  productionStats: Array<{ label: string; value: string; context: string }>;
  comparisonRows: Array<{ label: string; value: number | null; max: number }>;
  metricStrip: Array<{ label: string; value: string }>;
};

export default function PlayerStatsPage() {
  const { id } = useParams();
  const [player, setPlayer] = useState<BasketballPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPlayerProfile() {
      if (!id) {
        setError("Missing athlete id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await athleteService.fetchBasketballPlayerById(id);
        if (!isMounted) return;
        setPlayer(result);
      } catch (err) {
        console.error("Failed to load athlete profile:", err);
        if (!isMounted) return;
        setError("We couldn't load this athlete profile from Firebase.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPlayerProfile();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const derived = useMemo<DerivedProfile | null>(() => {
    if (!player) return null;

    const ppg = player.averages?.ppg ?? null;
    const rpg = player.averages?.rpg ?? null;
    const apg = player.averages?.apg ?? null;
    const spg = player.averages?.spg ?? null;
    const bpg = player.averages?.bpg ?? null;
    const gp = player.totals?.gp ?? null;
    const pts = player.totals?.pts ?? null;
    const turnovers = resolveMetricValue(player, [
      "averages.turnovers",
      "averages.turnovers_per_game",
      "totals.turnovers",
    ]);
    const fgPct = resolveMetricValue(player, ["averages.fg_pct", "totals.fg_pct"]);
    const ftPct = resolveMetricValue(player, ["averages.ft_pct", "totals.ft_pct"]);
    const fg3Pct = resolveMetricValue(player, ["averages.fg3_pct", "totals.fg3_pct"]);
    const oreb = resolveMetricValue(player, [
      "averages.off_rebounds_per_game",
      "totals.off_rebounds",
    ]);
    const dreb = resolveMetricValue(player, [
      "averages.def_rebounds_per_game",
      "totals.def_rebounds",
    ]);

    return {
      summary: buildAutoSummary(player),
      strengths: buildStrengths(player),
      profileDetails: [
        { label: "Sport", value: player.sport || "Basketball" },
        { label: "Position", value: player.position || "Unlisted" },
        { label: "School", value: player.school || "School unavailable" },
        { label: "Class", value: formatClassYear(player.gradYear) },
        { label: "Height", value: formatHeight(player.physicalMetrics?.height) },
        { label: "Weight", value: formatWeight(player.physicalMetrics?.weight) },
      ],
      spotlightStats: [
        { label: "PPG", value: formatStat(ppg), accent: "bg-[#00599c]" },
        { label: "RPG", value: formatStat(rpg), accent: "bg-slate-900" },
        { label: "APG", value: formatStat(apg), accent: "bg-[#4cb4ff]" },
        { label: "Stocks", value: formatStat(sumStats(spg, bpg)), accent: "bg-emerald-500" },
      ],
      productionStats: [
        { label: "Games Played", value: formatWholeNumber(gp), context: "sample size" },
        { label: "Total Points", value: formatWholeNumber(pts), context: "season total" },
        { label: "Steals / Game", value: formatStat(spg), context: "defensive activity" },
        { label: "Blocks / Game", value: formatStat(bpg), context: "rim protection" },
      ],
      comparisonRows: [
        { label: "Scoring Pressure", value: ppg, max: 30 },
        { label: "Rebounding Impact", value: rpg, max: 15 },
        { label: "Playmaking", value: apg, max: 10 },
        { label: "Defensive Events", value: sumStats(spg, bpg), max: 6 },
      ],
      metricStrip: [
        { label: "PPG", value: formatStat(ppg) },
        { label: "RPG", value: formatStat(rpg) },
        { label: "APG", value: formatStat(apg) },
        { label: "STL", value: formatStat(spg) },
        { label: "BLK", value: formatStat(bpg) },
        { label: "Turnovers", value: formatStat(turnovers) },
        { label: "FG %", value: formatPercent(fgPct) },
        { label: "FT %", value: formatPercent(ftPct) },
        { label: "3FG %", value: formatPercent(fg3Pct) },
        { label: "Off Reb", value: formatStat(oreb) },
        { label: "Def Reb", value: formatStat(dreb) },
        { label: "Games Played", value: formatWholeNumber(gp) },
        { label: "Total Points", value: formatWholeNumber(pts) },
      ],
    };
  }, [player]);

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#00599c]" />
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#00599c]/50">
              Loading athlete stats page
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !player || !derived) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-[32px] border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
              Stats page unavailable
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              We couldn&apos;t open this stat view.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {error ?? "This athlete record does not exist in your Firebase collection."}
            </p>
            <Link
              to="/discover"
              className="mt-6 inline-flex rounded-full bg-[#00599c] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#00497f]"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Link to="/discover" className="transition hover:text-[#00599c]">
            Discover
          </Link>
          <span>/</span>
          <Link to={`/players/${player.id}`} className="transition hover:text-[#00599c]">
            {player.name}
          </Link>
          <span>/</span>
          <span className="text-slate-900">Stats Page</span>
        </div>

        <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.35)]">
          <section className="relative overflow-hidden bg-gradient-to-br from-[#081223] via-[#0d2a52] to-[#00599c] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-blue-500 blur-3xl" />
            </div>

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-white/85">
                  Stats Profile
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="h-28 w-28 rounded-[28px] border border-white/15 object-cover shadow-2xl ring-4 ring-white/10 sm:h-36 sm:w-36"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-white/15 bg-white/10 text-4xl font-black text-white shadow-2xl ring-4 ring-white/10 sm:h-36 sm:w-36">
                      {player.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                      {player.name}
                    </h1>
                    <p className="mt-3 text-sm font-medium text-white/80 sm:text-base">
                      {player.school || "School unavailable"} · {player.sport || "Basketball"} ·{" "}
                      {player.position || "Position unlisted"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Tag>{formatClassYear(player.gradYear)}</Tag>
                      <Tag>{formatHeight(player.physicalMetrics?.height)}</Tag>
                      <Tag>{formatWeight(player.physicalMetrics?.weight)}</Tag>
                    </div>
                  </div>
                </div>

                <p className="max-w-3xl text-sm leading-7 text-white/82 sm:text-[15px]">
                  {derived.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {derived.spotlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
                  >
                    <div className={`h-1.5 w-10 rounded-full ${stat.accent}`} />
                    <div className="mt-4 text-3xl font-black tracking-tight text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 bg-[#eef4fb] px-6 py-6 sm:px-8 lg:px-10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00599c]">
                  Metric Chart
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  Scroll Through Full Stat Detail
                </h2>
              </div>
              <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                Swipe or scroll horizontally
              </p>
            </div>

            <div className="-mx-1 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-4 px-1">
                {derived.metricStrip.map((metric) => (
                  <MetricChartCard key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-6 bg-[#f5f8fc] p-6 sm:p-8 xl:grid-cols-[1.45fr_0.95fr] xl:p-10">
            <section className="space-y-6">
              <Panel eyebrow="Season Snapshot" title="Performance Breakdown">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {derived.productionStats.map((stat) => (
                    <StatTile
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      context={stat.context}
                    />
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Profile Lens" title="Production Profile">
                <div className="space-y-5">
                  {derived.comparisonRows.map((row) => (
                    <ProductionBar
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      max={row.max}
                    />
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Recruiting Notes" title="What Stands Out">
                <div className="grid gap-3">
                  {derived.strengths.map((strength) => (
                    <div
                      key={strength}
                      className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#00599c]" />
                      <p className="text-sm leading-6 text-slate-700">{strength}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <aside className="space-y-6">
              <Panel eyebrow="Player Details" title="Bio & Measurements">
                <div className="space-y-4">
                  {derived.profileDetails.map((item) => (
                    <InfoRow key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </Panel>

              <div className="pt-2">
                <Link
                  to={`/players/${player.id}`}
                  className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Back to Main Profile
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-[#00599c]">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-sm">
      {children}
    </span>
  );
}

function StatTile({
  label,
  value,
  context,
}: {
  label: string;
  value: string;
  context: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#00599c]/60">
        {context}
      </div>
    </div>
  );
}

function ProductionBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number | null;
  max: number;
}) {
  const width = value == null ? 0 : Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{label}</div>
        <div className="text-lg font-black tracking-tight text-slate-950">
          {value == null ? "N/A" : value.toFixed(1)}
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00599c] via-[#1d8be0] to-[#4cb4ff]"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Benchmarked against a {max.toFixed(0)}-point profile scale
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-none last:pb-0">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function MetricChartCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-[160px] shrink-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

function formatStat(value?: number | null) {
  return typeof value === "number" ? value.toFixed(1) : "N/A";
}

function formatWholeNumber(value?: number | null) {
  return typeof value === "number" ? String(value) : "N/A";
}

function formatPercent(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";
}

function formatClassYear(value?: number | string) {
  return value ? `Class of ${value}` : "Class year unavailable";
}

function formatHeight(value?: string | number) {
  if (value == null || value === "" || value === 0 || value === "0") {
    return "Height unavailable";
  }
  return String(value);
}

function formatWeight(value?: number | string) {
  if (value == null || value === "" || value === 0 || value === "0") {
    return "Weight unavailable";
  }
  return typeof value === "number" ? `${value} lbs` : String(value);
}

function sumStats(...values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return null;
  return filtered.reduce((total, current) => total + current, 0);
}

function resolveMetricValue(player: BasketballPlayerProfile, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[key];
    }, player);

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function buildStrengths(player: BasketballPlayerProfile): string[] {
  const strengths: string[] = [];
  const { averages, totals, position } = player;

  if ((averages?.ppg ?? 0) >= 20) {
    strengths.push("High-volume scorer with proven point production and primary-option upside.");
  }
  if ((averages?.apg ?? 0) >= 5) {
    strengths.push("Creates offense for others and adds real playmaking value in the half court.");
  }
  if ((averages?.rpg ?? 0) >= 7) {
    strengths.push("Consistently impacts possessions on the glass with strong rebound volume.");
  }
  if ((averages?.spg ?? 0) >= 2) {
    strengths.push("Generates defensive events with active hands and passing-lane disruption.");
  }
  if ((averages?.bpg ?? 0) >= 2) {
    strengths.push("Offers interior defensive presence and measurable rim-protection impact.");
  }
  if ((totals?.gp ?? 0) >= 20) {
    strengths.push("Maintains production across a meaningful game sample instead of a short stretch.");
  }

  if (strengths.length === 0) {
    strengths.push(`Profile shows developing ${position || "basketball"} production with room for deeper scouting review.`);
    strengths.push("Use this page as a live stat hub while layering film, notes, and recruiter evaluations.");
  }

  return strengths.slice(0, 4);
}

function buildAutoSummary(player: BasketballPlayerProfile) {
  const { name, position, school, averages, physicalMetrics } = player;
  const ppg = averages?.ppg ?? 0;
  const apg = averages?.apg ?? 0;
  const rpg = averages?.rpg ?? 0;
  const spg = averages?.spg ?? 0;
  const bpg = averages?.bpg ?? 0;
  const posName = position || "prospect";
  const size = formatHeight(physicalMetrics?.height).replace(" unavailable", "");
  const intro = `${name} is a ${size || "developing"} ${posName} competing for ${school || "the program"}, building a measurable profile through live production.`;

  let analysis = "";
  if (ppg >= 18) {
    analysis = `${name} looks like a primary scoring option at ${ppg.toFixed(1)} points per game, showing the ability to carry real offensive volume.`;
  } else if (ppg >= 12) {
    analysis = `${name} brings steady scoring at ${ppg.toFixed(1)} points per game and profiles as a reliable offensive contributor.`;
  } else {
    analysis = `${name} is still building the scoring profile, currently contributing ${ppg.toFixed(1)} points per game in a developing role.`;
  }

  let secondary = "";
  if (apg >= 4) {
    secondary = ` The ${apg.toFixed(1)} assists per game add legitimate creation value and suggest comfort making reads for teammates.`;
  } else if (rpg >= 8) {
    secondary = ` The ${rpg.toFixed(1)} rebounds per game point to motor, physicality, and possession-winning impact.`;
  } else if (spg + bpg >= 3) {
    secondary = ` Defensively, a combined ${(spg + bpg).toFixed(1)} stocks per game signals disruptive activity on that end.`;
  } else {
    secondary = ` The overall line stays balanced, with contributions across scoring, rebounding, and playmaking categories.`;
  }

  return `${intro} ${analysis}${secondary} Recruiters should use this profile as a stat anchor before moving into film and fit evaluation.`;
}

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import PageLayout from "../components/page-layout";
import { athleteService } from "../lib/athlete-service";
import { athleteFormatter } from "../lib/athlete-formatter";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";

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
  const [player, setPlayer] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const result = await athleteService.fetchAthleteById(id);
        setPlayer(result);
      } catch (err) {
        setError("Athlete record not found in clinical database.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const derived = useMemo<DerivedProfile | null>(() => {
    if (!player) return null;
    const s = player.currentStats as BasketballStatRecord;
    
    // Clinical Data Extraction
    const ppg = athleteService.getStatValue(player, "points_per_game");
    const rpg = athleteService.getStatValue(player, "rebounds_per_game");
    const apg = athleteService.getStatValue(player, "assists_per_game");
    const spg = athleteService.getStatValue(player, "steals_per_game");
    const bpg = athleteService.getStatValue(player, "blocks_per_game");
    const stocks = (spg || 0) + (bpg || 0);

    return {
      summary: buildAutoSummary(player),
      strengths: buildStrengths(player),
      profileDetails: [
        { label: "Sport", value: s?.sport || "Basketball" },
        { label: "Position", value: s?.positions?.join("/") || "Unlisted" },
        { label: "School", value: s?.school_name || "Unlisted" },
        { label: "Class", value: athleteFormatter.formatClassYear(player.classYear) },
        { label: "Height", value: athleteFormatter.formatHeight(player.height) },
        { label: "Weight", value: athleteFormatter.formatWeight(player.weight) },
      ],
      spotlightStats: [
        { label: "PPG", value: athleteFormatter.formatStat(ppg), accent: "bg-[#00599c]" },
        { label: "RPG", value: athleteFormatter.formatStat(rpg), accent: "bg-slate-900" },
        { label: "APG", value: athleteFormatter.formatStat(apg), accent: "bg-[#4cb4ff]" },
        { label: "Stocks", value: athleteFormatter.formatStat(stocks), accent: "bg-emerald-500" },
      ],
      productionStats: [
        { label: "Games Played", value: String(Math.round(athleteService.getStatValue(player, "games_played"))), context: "Sample" },
        { label: "Total Points", value: String(Math.round(athleteService.getStatValue(player, "points"))), context: "Season" },
        { label: "Steals", value: athleteFormatter.formatStat(spg), context: "Defense" },
        { label: "Blocks", value: athleteFormatter.formatStat(bpg), context: "Rim Prot." },
      ],
      comparisonRows: [
        { label: "Scoring Pressure", value: ppg, max: 30 },
        { label: "Glass Impact", value: rpg, max: 15 },
        { label: "Playmaking", value: apg, max: 10 },
        { label: "Defensive Events", value: stocks, max: 6 },
      ],
      metricStrip: [
        { label: "PPG", value: athleteFormatter.formatStat(ppg) },
        { label: "RPG", value: athleteFormatter.formatStat(rpg) },
        { label: "APG", value: athleteFormatter.formatStat(apg) },
        { label: "STL", value: athleteFormatter.formatStat(spg) },
        { label: "BLK", value: athleteFormatter.formatStat(bpg) },
        { label: "FG%", value: athleteFormatter.formatPercent(s?.fg_pct) },
        { label: "3P%", value: athleteFormatter.formatPercent(s?.fg3_pct) },
        { label: "FT%", value: athleteFormatter.formatPercent(s?.ft_pct) },
      ],
    };
  }, [player]);

  if (loading) return <LoadingUI />;
  if (error || !player || !derived) return <ErrorUI message={error} />;

  return (
    <PageLayout requireAuth title="Athlete Stats" subtitle={player.name} variant="hero">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumbs */}
        <div className="mb-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/50">
          <Link to="/discover" className="hover:text-white transition-colors">Discover</Link>
          <span className="opacity-30">/</span>
          <Link to={`/players/${player.id}`} className="hover:text-white transition-colors">{player.name}</Link>
          <span className="opacity-30">/</span>
          <span className="text-white">Full Analytics</span>
        </div>

        <div className="overflow-hidden rounded-[40px] border border-white/10 bg-white shadow-2xl">
          {/* Spotlight Section */}
          <section className="bg-slate-950 p-8 lg:p-12 text-white">
            <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] items-center">
              <div className="space-y-6">
                <h1 className="text-5xl font-black tracking-tighter sm:text-7xl">{player.name}</h1>
                <p className="max-w-2xl text-lg leading-relaxed text-white/60">{derived.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {derived.spotlightStats.map((s) => (
                  <div key={s.label} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div className={`h-1 w-8 rounded-full mb-4 ${s.accent}`} />
                    <div className="text-4xl font-black tracking-tight">{s.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Metric Horizontal Strip */}
          <div className="border-y border-slate-100 bg-slate-50/50 p-8">
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {derived.metricStrip.map((m) => (
                <div key={m.label} className="min-w-[160px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.label}</p>
                  <p className="mt-4 text-3xl font-black text-slate-900">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Layout: Production and Bio */}
          <div className="grid gap-8 p-8 lg:grid-cols-[1.6fr_1fr] lg:p-12">
            <div className="space-y-8">
              <Panel title="Scouting Strengths">
                <div className="grid gap-4">
                  {derived.strengths.map(s => (
                    <div key={s} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/30 p-5">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00599c]" />
                      <p className="text-sm font-bold leading-relaxed text-slate-700">{s}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Benchmark Comparison">
                <div className="space-y-8">
                  {derived.comparisonRows.map(row => (
                    <ProductionBar key={row.label} {...row} />
                  ))}
                </div>
              </Panel>
            </div>

            <aside className="space-y-8">
              <Panel title="Physical Profile">
                <div className="space-y-5">
                  {derived.profileDetails.map(d => (
                    <div key={d.label} className="flex justify-between border-b border-slate-50 pb-4 last:border-0">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">{d.label}</span>
                      <span className="text-sm font-black text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Link to={`/players/${player.id}`} className="block rounded-2xl bg-[#00599c] p-5 text-center text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl hover:bg-[#004a82] transition-all">
                Return to Full Profile
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// UI HELPER COMPONENTS
function ProductionBar({ label, value, max }: { label: string; value: number | null; max: number }) {
  const percent = Math.min(100, Math.round(((value || 0) / max) * 100));
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-3">
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className="text-xl font-black text-slate-900">{value?.toFixed(1) || "0.0"}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-slate-900 group-hover:bg-[#00599c] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00599c] mb-6">{title}</h3>
      {children}
    </div>
  );
}

function buildStrengths(player: Athlete): string[] {
  const ppg = athleteService.getStatValue(player, "points_per_game");
  const apg = athleteService.getStatValue(player, "assists_per_game");
  const s = [];
  if (ppg >= 20) s.push("Primary scoring threat with elite offensive volume.");
  if (apg >= 5) s.push("Proven floor general with high-level playmaking vision.");
  if (ppg < 10) s.push("Developing offensive game with room for role expansion.");
  return s.length ? s : ["Statistical profile indicates consistent varsity-level production."];
}

function buildAutoSummary(player: Athlete): string {
  if (player.scouting_report) return player.scouting_report;
  const ppg = athleteService.getStatValue(player, "points_per_game");
  return `${player.name} is a ${athleteFormatter.formatHeight(player.height)} prospect from ${(player.currentStats as BasketballStatRecord)?.school_name}. Currently producing ${athleteFormatter.formatStat(ppg)} PPG, providing a measurable baseline for professional evaluation.`;
}

function LoadingUI() {
  return <PageLayout requireAuth><div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#00599c]" /></div></PageLayout>;
}

function ErrorUI({ message }: { message: string | null }) {
  return <PageLayout requireAuth><div className="py-40 text-center"><h2 className="text-3xl font-black">{message || "Profile Not Found"}</h2><Link to="/discover" className="mt-8 inline-block text-xs font-black uppercase tracking-widest text-[#00599c]">Return to Database</Link></div></PageLayout>;
}
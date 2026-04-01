import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import PageLayout from "../components/page-layout";
import { athleteService } from "../lib/athlete-service";
import { athleteFormatter } from "../lib/athlete-formatter";

// ADD 'type' HERE
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import { POSITION_METRICS, DEFAULT_METRICS } from "../lib/relevant-metrics";
import WatchlistPopup from "../components/watchlist-popup";


export default function PlayerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWatchlistPopup, setShowWatchlistPopup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
        const result = await athleteService.fetchAthleteById(id);
        if (!isMounted) return;
        setPlayer(result);
      } catch (err) {
        console.error("Failed to load athlete profile:", id, err);
        if (!isMounted) return;
        setError("We couldn't load this athlete profile from Firebase.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPlayerProfile();
    return () => { isMounted = false; };
  }, [id]);

  const derived = useMemo(() => {
    if (!player) return null;

    const stats = player.currentStats as BasketballStatRecord;
    const primaryPos = (stats?.positions?.[0] || 'PG').toUpperCase();
    
    // 1. Dynamic Metric Mapping based on Position
    const activeMetrics = POSITION_METRICS[primaryPos] || DEFAULT_METRICS;
    
    // Header Metrics (The 4 lil boxes in the blue section)
    const headerMetrics = activeMetrics.slice(0, 4).map(m => ({
      label: m.name,
      value: m.isPercentage 
        ? athleteFormatter.formatWhole(athleteService.getStatValue(player, m.key), "%")
        : athleteFormatter.formatAvg(athleteService.getStatValue(player, m.key))
    }));

    // Season Production Cards (The 4 cards in the white section)
    const statCards = activeMetrics.slice(0, 8).map(m => ({
      label: m.name,
      value: m.isPercentage 
        ? athleteFormatter.formatWhole(athleteService.getStatValue(player, m.key), "%")
        : athleteFormatter.formatAvg(athleteService.getStatValue(player, m.key))
    }));

    const profileDetails = [
      { label: "Sport", value: stats?.sport || "Basketball" },
      { label: "Position", value: stats?.positions?.join("/") || "—" },
      { label: "School", value: stats?.school_name || "—" },
      { label: "Mascot", value: stats?.mascot || "—" },
      { label: "State", value: stats?.state?.toUpperCase() || "—" },
      { label: "Class Year", value: athleteFormatter.formatClassYear(player.classYear) },
      { label: "Height", value: athleteFormatter.formatHeight(player.height) },
      { label: "Weight", value: athleteFormatter.formatWeight(player.weight) },
    ];

    return { 
      headerMetrics, 
      statCards, 
      profileDetails, 
      stats, 
      strengths: buildStrengths(player), 
      summary: buildAutoSummary(player) 
    };
  }, [player]);

  if (loading) {
    return (
      <PageLayout requireAuth>
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#00599c]" />
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#00599c]/50">Loading athlete profile</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !player || !derived) {
    return (
      <PageLayout requireAuth>
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">Profile unavailable</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Error Loading Page</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{error ?? "Data corrupted."}</p>
            <Link to="/discover" className="mt-6 inline-flex rounded-full bg-[#00599c] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">Back to Discover</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout requireAuth>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Link to="/discover" className="transition hover:text-[#00599c]">Discover</Link>
          <span>/</span>
          <span className="text-slate-900">{player.name}</span>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.35)]">
          {/* Header Section */}
          <section className="relative overflow-hidden bg-gradient-to-br from-[#07111f] via-[#0e2950] to-[#00599c] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute inset-0 opacity-25">
              <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-blue-500 blur-3xl" />
            </div>

            <div className="absolute right-6 top-6 z-20">
              <button onClick={() => setShowMenu(!showMenu)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-2xl z-20">
                    <button onClick={() => { setShowMenu(false); setShowWatchlistPopup(true); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50">
                      <svg className="h-5 w-5 text-[#00599c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                      Add to Watchlist
                    </button>
                    <button onClick={() => { setShowMenu(false); navigate(`/analyze?ids=${player.id}`); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50">
                      <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Add to Analysis
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative">
                  {player.image_link ? (
                    <img src={player.image_link} alt={player.name} className="h-28 w-28 rounded-[26px] border border-white/20 object-cover shadow-2xl ring-4 ring-white/10 sm:h-36 sm:w-36" />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-[26px] bg-white/10 text-4xl font-black text-white shadow-2xl ring-4 ring-white/10 sm:h-36 sm:w-36">{player.name.charAt(0)}</div>
                  )}
                </div>

                <div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-white/85">Prospect Profile</div>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{player.name}</h1>
                  <p className="mt-3 text-sm font-medium text-white/80 sm:text-base">
                    {derived.stats?.sport || "Basketball"} / {derived.stats?.positions?.join("/") || "Unlisted"} • {derived.stats?.school_name}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag>{derived.stats?.positions?.[0] || "Position TBD"}</Tag>
                    <Tag>Class of {athleteFormatter.formatClassYear(player.classYear)}</Tag>
                    <Tag>{athleteFormatter.formatHeight(player.height)}</Tag>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 lg:items-end">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {derived.headerMetrics.map((m) => (
                    <Metric key={m.label} value={m.value} label={m.label} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Link
                    to={`/players/${player.id}/stats`}
                    className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    Stats Profile
                  </Link>
                  <Link
                    to={`/players/${player.id}/games`}
                    className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    Games Profile
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Body Content */}
          <div className="grid gap-6 bg-[#f7f9fc] p-6 sm:p-8 lg:grid-cols-[1.45fr_0.95fr] lg:p-10">
            <section className="space-y-6">
              <Panel title="Scouting Snapshot" eyebrow="Summary">
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">{derived.summary}</p>
              </Panel>

              <Panel title="Season Production" eyebrow="Performance">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {derived.statCards.map((stat) => (
                    <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{stat.label}</div>
                      <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Recruiter Takeaways" eyebrow="Insights">
                <div className="space-y-3">
                  {derived.strengths.map((strength) => (
                    <div key={strength} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#00599c]" />
                      <p className="text-sm leading-6 text-slate-700">{strength}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <aside className="space-y-6">
              <Panel title="Player Details" eyebrow="Information">
                <div className="space-y-4 text-sm">
                  {derived.profileDetails.map((item) => (
                    <InfoRow key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </Panel>

              <Panel title="Production Context" eyebrow="Totals">
                <div className="grid grid-cols-2 gap-4">
                  <MiniMetric label="Games Played" value={athleteFormatter.formatWhole(derived.stats?.games_played)} />
                  <MiniMetric label="Total Points" value={athleteFormatter.formatWhole(derived.stats?.points)} />
                  <MiniMetric label="Steals / Game" value={athleteFormatter.formatAvg(derived.stats?.steals_per_game)} />
                  <MiniMetric label="Blocks / Game" value={athleteFormatter.formatAvg(derived.stats?.blocks_per_game)} />
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      </div>

      {showWatchlistPopup && player && (
        <WatchlistPopup playerIds={[player.id]} context="single" onClose={() => setShowWatchlistPopup(false)} onSuccess={() => setShowWatchlistPopup(false)} />
      )}
    </PageLayout>
  );
}

// Sub-components
function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-[#00599c]">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
      <div className="text-2xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/60">{label}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-sm">{children}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-none last:pb-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-900">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function buildStrengths(player: Athlete): string[] {
  const strengths: string[] = [];
  
  const ppg = athleteService.getStatValue(player, "points_per_game");
  const apg = athleteService.getStatValue(player, "assists_per_game");
  const rpg = athleteService.getStatValue(player, "rebounds_per_game");
  const spg = athleteService.getStatValue(player, "steals_per_game");
  const bpg = athleteService.getStatValue(player, "blocks_per_game");
  const gp = athleteService.getStatValue(player, "games_played");

  if (ppg >= 20) strengths.push("High-volume scorer with proven point production.");
  if (apg >= 5) strengths.push("Creates offense efficiently and shows strong playmaking value.");
  if (rpg >= 7) strengths.push("Impacts the glass consistently for the position.");
  if (spg >= 2) strengths.push("Generates defensive events and disrupts passing lanes.");
  if (bpg >= 2) strengths.push("Provides real rim protection and interior defensive presence.");
  if (gp >= 20) strengths.push("Sustained production across a meaningful game sample.");

  if (strengths.length === 0) {
    strengths.push(`Profile shows developing ${player.currentStats?.sport || "basketball"} production with room for deeper scouting review.`);
    strengths.push("Use this page as a live data hub while layering film, notes, and recruiter evaluations.");
  }

  return strengths.slice(0, 4);
}

function buildAutoSummary(player: Athlete) {
  if (player.scouting_report) return player.scouting_report;

  const ppg = athleteService.getStatValue(player, "points_per_game");
  const apg = athleteService.getStatValue(player, "assists_per_game");
  const rpg = athleteService.getStatValue(player, "rebounds_per_game");
  const spg = athleteService.getStatValue(player, "steals_per_game");
  const bpg = athleteService.getStatValue(player, "blocks_per_game");
  
  const stats = player.currentStats as BasketballStatRecord;
  const posName = (stats?.positions?.[0] || "prospect").toLowerCase();
  const heightStr = athleteFormatter.formatHeight(player.height).replace("—", "");
  const school = stats?.school_name || "the program";
  
  const intro = `${player.name} is a ${heightStr ? heightStr + " " : ""}${posName} competing for ${school}, establishing a consistent presence on both ends of the floor.`;

  let analysis = "";
  if (ppg >= 18) {
    analysis = `As a primary scoring option averaging ${ppg.toFixed(1)} PPG, ${player.name} demonstrates high-level offensive instincts and the ability to carry a significant scoring load.`;
  } else if (ppg >= 12) {
    analysis = `Contributing a steady ${ppg.toFixed(1)} PPG, ${player.name} serves as a reliable offensive catalyst who finds ways to impact the scoreboard within the flow of the game.`;
  } else {
    analysis = `${player.name} currently contributes ${ppg.toFixed(1)} PPG, focusing on efficient role execution and supplementary scoring while the game matures.`;
  }

  let secondary = "";
  if (apg >= 4) {
    secondary = ` Beyond scoring, the playmaking is evident with ${apg.toFixed(1)} APG, showcasing vision and unselfishness in transition and half-court sets.`;
  } else if (rpg >= 8) {
    secondary = ` Dominance on the glass is a standout trait, as ${rpg.toFixed(1)} RPG indicates a high motor and physical toughness in the paint.`;
  } else if (spg + bpg >= 3) {
    secondary = ` Defensively, ${player.name} is a disruptor, averaging a combined ${(spg + bpg).toFixed(1)} stocks (steals + blocks) per game, highlighting quick hands and rim protection.`;
  } else {
    secondary = ` The stat line is rounded out by ${rpg.toFixed(1)} rebounds and ${apg.toFixed(1)} assists, reflecting a balanced approach to the ${posName} position.`;
  }

  const outlook = ` Recruiters should monitor ${player.name}'s development closely, as the current production profile suggests a high ceiling for growth at the next level.`;

  return `${intro} ${analysis}${secondary}${outlook}`;
}
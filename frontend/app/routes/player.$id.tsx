import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import PageLayout from "../components/page-layout";
import {
  athleteService,
  type BasketballPlayerProfile,
} from "../lib/athlete-service";

export default function PlayerProfilePage() {
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

  const derived = useMemo(() => {
    if (!player) return null;

    const ppg = player.averages?.ppg ?? 0;
    const rpg = player.averages?.rpg ?? 0;
    const apg = player.averages?.apg ?? 0;
    const spg = player.averages?.spg ?? 0;
    const bpg = player.averages?.bpg ?? 0;
    const gp = player.totals?.gp ?? 0;
    const pts = player.totals?.pts ?? 0;

    const strengths = buildStrengths(player);
    const summary = buildAutoSummary(player);
    const statCards = [
      { label: "PPG", value: formatNumber(ppg) },
      { label: "RPG", value: formatNumber(rpg) },
      { label: "APG", value: formatNumber(apg) },
      { label: "STL", value: formatNumber(spg) },
      { label: "BLK", value: formatNumber(bpg) },
      { label: "GP", value: gp ? String(gp) : "—" },
      { label: "PTS", value: pts ? String(pts) : "—" },
      { label: "CLASS", value: String(player.gradYear || "—") },
    ];

    const profileDetails = [
      { label: "Sport", value: player.sport || "Basketball" },
      { label: "Position", value: player.position || "—" },
      { label: "School", value: player.school || "—" },
      { label: "Grad Year", value: String(player.gradYear || "—") },
      { label: "Height", value: player.physicalMetrics?.height || "—" },
      { label: "Weight", value: formatWeight(player.physicalMetrics?.weight) },
    ];

    return { strengths, summary, statCards, profileDetails };
  }, [player]);

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#00599c]" />
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#00599c]/50">
              Loading athlete profile
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
          <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
              Profile unavailable
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              We couldn't open this player page.
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
          <span className="text-slate-900">{player.name}</span>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.35)]">
          <section className="relative overflow-hidden bg-gradient-to-br from-[#07111f] via-[#0e2950] to-[#00599c] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute inset-0 opacity-25">
              <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-blue-500 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative">
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="h-28 w-28 rounded-[26px] border border-white/20 object-cover shadow-2xl ring-4 ring-white/10 sm:h-36 sm:w-36"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-[26px] border border-white/15 bg-white/10 text-4xl font-black text-white shadow-2xl ring-4 ring-white/10 sm:h-36 sm:w-36">
                      {player.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-white/85">
                    Prospect Profile
                  </div>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    {player.name}
                  </h1>
                  <p className="mt-3 text-sm font-medium text-white/80 sm:text-base">
                    {player.sport || "Basketball"} / {player.position || "Unlisted"} • {player.school || "School unavailable"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag>{player.position || "Position TBD"}</Tag>
                    <Tag>Class of {player.gradYear || "—"}</Tag>
                    <Tag>{player.physicalMetrics?.height || "Height unavailable"}</Tag>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric value={player.physicalMetrics?.height || "—"} label="Height" />
                <Metric value={formatWeight(player.physicalMetrics?.weight)} label="Weight" />
                <Metric value={formatNumber(player.averages?.ppg)} label="PPG" />
                <Metric value={formatNumber(player.averages?.apg)} label="APG" />
              </div>
            </div>
          </section>

          <div className="grid gap-6 bg-[#f7f9fc] p-6 sm:p-8 lg:grid-cols-[1.45fr_0.95fr] lg:p-10">
            <section className="space-y-6">
              <Panel title="Scouting Snapshot" eyebrow="Summary">
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {derived.summary}
                </p>
              </Panel>

              <Panel title="Season Production" eyebrow="Performance">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {derived.statCards.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        {stat.label}
                      </div>
                      <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            {/* See buildStrengths() --> would be cool to swap with AI if time allows */}
              <Panel title="Recruiter Takeaways" eyebrow="Derived Insights">
                <div className="space-y-3">
                  {derived.strengths.map((strength) => (
                    <div
                      key={strength}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
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
                  <MiniMetric label="Games Played" value={player.totals?.gp ? String(player.totals.gp) : "—"} />
                  <MiniMetric label="Total Points" value={player.totals?.pts ? String(player.totals.pts) : "—"} />
                  <MiniMetric label="Steals / Game" value={formatNumber(player.averages?.spg)} />
                  <MiniMetric label="Blocks / Game" value={formatNumber(player.averages?.bpg)} />
                </div>
              </Panel>
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
      <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
        {label}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-sm">
      {children}
    </span>
  );
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
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function formatNumber(value?: number) {
  return value != null ? value.toFixed(1) : "—";
}

function formatWeight(value?: number | string) {
  if (value == null || value === "") return "—";
  return typeof value === "number" ? `${value} lbs` : String(value);
}

// temporary function to auto summary a strengths list. would be interesting to replace with AI for future iteration 
function buildStrengths(player: BasketballPlayerProfile): string[] {
  const strengths: string[] = [];
  const { averages, totals, position } = player;

  if ((averages?.ppg ?? 0) >= 20) strengths.push("High-volume scorer with proven point production.");
  if ((averages?.apg ?? 0) >= 5) strengths.push("Creates offense efficiently and shows strong playmaking value.");
  if ((averages?.rpg ?? 0) >= 7) strengths.push("Impacts the glass consistently for the position.");
  if ((averages?.spg ?? 0) >= 2) strengths.push("Generates defensive events and disrupts passing lanes.");
  if ((averages?.bpg ?? 0) >= 2) strengths.push("Provides real rim protection and interior defensive presence.");
  if ((totals?.gp ?? 0) >= 20) strengths.push("Sustained production across a meaningful game sample.");

  if (strengths.length === 0) {
    strengths.push(`Profile shows developing ${position || "basketball"} production with room for deeper scouting review.`);
    strengths.push("Use this page as a live data hub while layering film, notes, and recruiter evaluations.");
  }

  return strengths.slice(0, 4);
}

function buildAutoSummary(player: BasketballPlayerProfile) {
  const name = player.name;
  const position = player.position || "prospect";
  const school = player.school || "the listed program";
  const ppg = player.averages?.ppg;
  const apg = player.averages?.apg;
  const rpg = player.averages?.rpg;

  const scoringLine = ppg != null
    ? `${name} is currently producing ${ppg.toFixed(1)} points per game`
    : `${name} has an active Firebase athlete record`;

  const playmakingLine = apg != null && apg > 0
    ? ` while adding ${apg.toFixed(1)} assists per game`
    : "";

  const reboundingLine = rpg != null && rpg > 0
    ? ` and ${rpg.toFixed(1)} rebounds per game`
    : "";

  return `${scoringLine}${playmakingLine}${reboundingLine} for ${school}. This recruiter view expands the discover-card preview into a deeper ${position}-specific evaluation page using your stored Firebase athlete document, physical metrics, and basketball subcollection record.`;
}
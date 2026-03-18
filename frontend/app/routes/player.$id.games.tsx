import {Link, useParams} from "react-router";
import PageLayout from "../components/page-layout";

export default function PlayerGamesPage() {
  const {id} = useParams();

  return (
    <PageLayout requireAuth>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Link to="/discover" className="transition hover:text-[#00599c]">
            Discover
          </Link>
          <span>/</span>
          <Link to={`/players/${id}`} className="transition hover:text-[#00599c]">
            Player Profile
          </Link>
          <span>/</span>
          <span className="text-slate-900">Games Profile</span>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.35)]">
          <section className="relative overflow-hidden bg-gradient-to-br from-[#07111f] via-[#0e2950] to-[#00599c] px-6 py-10 text-white sm:px-8 lg:px-10 lg:py-12">
            <div className="absolute inset-0 opacity-25">
              <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-blue-500 blur-3xl" />
            </div>

            <div className="relative max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-white/85">
                Games Profile
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Game-by-game view coming soon</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                This page is ready for a future game log, matchup breakdowns, and performance trends. For now, you can keep using the
                stat-focused profile.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/players/${id}/stats`}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:-translate-y-0.5"
                >
                  Open Stats Profile
                </Link>
                <Link
                  to={`/players/${id}`}
                  className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Back to Main Profile
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

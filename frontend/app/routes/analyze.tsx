import * as React from "react";
import { useSearchParams, Link, Outlet, useLocation, useNavigate } from "react-router";
import PageLayout from "../components/page-layout";
import { 
  Box, 
  Typography,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { athleteService } from "../lib/athlete-service";
import type { Athlete } from "../lib/athlete-types";
import AddPlayersPopup from "../components/add-players-popup";
import RemovePlayersPopup from "../components/remove-players-popup";

const CHART_COLORS = [
  '#02B2AF', // Teal
  '#2E96FF', // Blue
  '#B800D8', // Magenta
  '#F97316', // Orange
  '#10B981', // Green
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#14B8A6', // Teal Dark
  '#60009B', // Purple
  '#2731C8', // Royal Blue
  '#03008D', // Navy
];

export default function AnalyzeLayout() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isPending, startTransition] = React.useTransition();
  const idsParam = searchParams.get("ids");
  const playerIds = React.useMemo(() => (idsParam ? idsParam.split(",").filter(id => id.trim() !== "") : []), [idsParam]);

  const [players, setPlayers] = React.useState<Athlete[]>([]);
  const [showAddPopup, setShowAddPopup] = React.useState(false);
  const [showRemovePopup, setShowRemovePopup] = React.useState(false);
  
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const playerColors = React.useMemo(() => {
    const map: Record<string, string> = {};
    playerIds.forEach((id, idx) => {
      map[id] = CHART_COLORS[idx % CHART_COLORS.length];
    });
    return map;
  }, [playerIds]);

  const contextValue = React.useMemo(() => ({ 
    playerIds, 
    players, 
    playerColors, 
    loading 
  }), [playerIds, players, playerColors, loading]);

  React.useEffect(() => {
    if (playerIds.length === 0) {
      setLoading(false);
      return;
    }

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);
        const fetchedPlayers = await athleteService.fetchAthletesByIds(playerIds);
        setPlayers(fetchedPlayers);
        if (fetchedPlayers.length === 0) {
          setError("No athletes found for the provided IDs.");
        }
      } catch (err: any) {
        console.error("[Analyze] Critical load failure:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [playerIds]);

  const tabValue = React.useMemo(() => {
    const path = location.pathname;
    if (path === '/analyze/radar') return 1;
    if (path === '/analyze/trend') return 2;
    if (path === '/analyze/distribution') return 3;
    return 0;
  }, [location.pathname]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const paths = ['/analyze', '/analyze/radar', '/analyze/trend', '/analyze/distribution'];
    const targetPath = `${paths[newValue]}?${searchParams.toString()}`;
    
    startTransition(() => {
      navigate(targetPath);
    });
  };

  if (playerIds.length === 0) {
    return (
      <PageLayout requireAuth title="Prospect Analysis" description="No players selected for analysis.">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm">
            <div className="space-y-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00599c]">Analysis Workspace</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">No Athletes Selected</h1>
              <p className="max-w-2xl mx-auto text-sm leading-7 text-slate-600">Select athletes from Discover to begin comparing profiles and production metrics across prospects.</p>
              <Link
                to="/discover"
                className="inline-flex rounded-full bg-[#00599c] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-[#004a82]"
              >
                Back to Discover
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout requireAuth title="Prospect Analysis" description="Something went wrong while loading the comparison.">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[32px] border border-red-200 bg-white p-10 shadow-sm">
            <div className="space-y-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-500">Load error</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Failed to Load Analysis</h1>
              <p className="max-w-2xl mx-auto text-sm leading-7 text-slate-600">{error}</p>
              <Link
                to="/discover"
                className="inline-flex rounded-full bg-[#00599c] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-[#004a82]"
              >
                Return to Discover
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      requireAuth 
      title="Prospect Analysis" 
      subtitle={`${playerIds.length} Athletes Selected`}
      description="Comparative performance profiling and production metrics."
      variant="hero"
    >
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link to="/discover" className="transition hover:text-[#00599c]">Discover</Link>
          <span>/</span>
          <span className="text-slate-900">Prospect Analysis</span>
        </div>

        <div className="overflow-hidden rounded-[40px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.35)]">
          <section className="relative overflow-hidden bg-gradient-to-br from-[#07111f] via-[#0e2950] to-[#00599c] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
              <div className="absolute -left-20 bottom-10 h-56 w-56 rounded-full bg-blue-500 blur-3xl" />
            </div>

            <div className="relative grid gap-10 lg:grid-cols-[1.5fr_0.9fr] items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/90">Analysis Workspace</div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Compare prospect performance with clarity.</h2>
                <p className="max-w-2xl text-sm leading-7 text-white/80">Switch between overview, radar, trend, and distribution modes to uncover recruitment-ready insights for your selected athletes.</p>
              </div>

              <div className="max-w-md">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/70">Selected athletes</p>
                  <p className="mt-3 text-4xl font-black tracking-tight text-white">{playerIds.length}</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">Athletes currently loaded for comparison.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00599c]">Athlete controls</p>
                <p className="mt-2 text-sm text-slate-600">Add or remove athletes from the comparison set, then choose your view.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowRemovePopup(true)}
                  className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50"
                >
                  Remove Athletes
                </button>
                <button
                  onClick={() => setShowAddPopup(true)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Add Athletes
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] bg-slate-50 p-4 shadow-sm">
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                sx={{ 
                  opacity: isPending ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  '& .MuiTabs-indicator': { backgroundColor: '#00599c', height: 4, borderRadius: '4px 4px 0 0' },
                  '& .MuiTab-root': { 
                    fontWeight: 900, 
                    fontSize: '0.75rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em',
                    color: '#64748b',
                    minWidth: 120,
                    '&.Mui-selected': { color: '#00599c' }
                  }
                }}
              >
                <Tab label="Overview" />
                <Tab label="Radar" />
                <Tab label="Trend" />
                <Tab label="Distribution" />
              </Tabs>
            </div>

            {loading ? (
              <div className="mt-10 rounded-[32px] border border-slate-200 bg-slate-50 p-10 shadow-sm">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <CircularProgress size={48} sx={{ color: '#00599c' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#00599c80' }}>
                    Crunching production data
                  </Typography>
                </Box>
              </div>
            ) : (
              <div className="mt-10">
                <Outlet context={contextValue} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddPopup && (
        <AddPlayersPopup 
          currentIds={playerIds} 
          onClose={() => setShowAddPopup(false)} 
        />
      )}

      {showRemovePopup && (
        <RemovePlayersPopup
          players={players}
          onClose={() => setShowRemovePopup(false)}
        />
      )}
    </PageLayout>
  );
}

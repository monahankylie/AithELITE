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
      <PageLayout requireAuth title="Deep Analysis" description="No players selected for analysis.">
        <Box sx={{ mx: 'auto', maxWidth: '48rem', px: 3, py: 10, textAlign: 'center' }}>
          <Box sx={{ borderRadius: '32px', border: '1px solid', borderColor: 'divider', bg: 'white', p: 6, boxShadow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>No Athletes Selected</Typography>
            <Typography sx={{ mt: 2, color: '#64748b' }}>Go to the Discover page and select athletes to compare their performance profiles.</Typography>
            <Link to="/discover" style={{ marginTop: '32px', display: 'inline-flex', borderRadius: '9999px', backgroundColor: '#00599c', padding: '16px 32px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white', textDecoration: 'none' }}>
              Back to Discover
            </Link>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout requireAuth title="Analysis Error" description="Something went wrong.">
        <Box sx={{ mx: 'auto', maxWidth: '48rem', px: 3, py: 10, textAlign: 'center' }}>
          <Box sx={{ borderRadius: '32px', border: '1px solid', borderColor: '#fee2e2', bg: 'white', p: 6, boxShadow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#dc2626' }}>Failed to Load Analysis</Typography>
            <Typography sx={{ mt: 2, color: '#64748b' }}>{error}</Typography>
            <Link to="/discover" style={{ marginTop: '32px', display: 'inline-flex', borderRadius: '9999px', backgroundColor: '#0f172a', padding: '16px 32px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white', textDecoration: 'none' }}>
              Return to Discover
            </Link>
          </Box>
        </Box>
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
      <div className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6 md:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRemovePopup(true)}
              className="rounded-2xl border-2 border-red-50 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-red-500 shadow-sm transition-all hover:border-red-500 hover:bg-red-50 active:scale-95"
            >
              Remove Athletes
            </button>
            <button
              onClick={() => setShowAddPopup(true)}
              className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:border-[#00599c] hover:bg-slate-50 active:scale-95"
            >
              Add Athletes
            </button>
          </div>

          {/* Navigation Tabs */}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 10, gap: 2 }}>
            <CircularProgress size={48} sx={{ color: '#00599c' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#00599c80' }}>
              Crunching production data
            </Typography>
          </Box>
        ) : (
          <Outlet context={contextValue} />
        )}
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

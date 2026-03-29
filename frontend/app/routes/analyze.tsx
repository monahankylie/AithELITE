import * as React from "react";
import { useSearchParams, Link } from "react-router";
import PageLayout from "../components/page-layout";
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import { graphService, type RadarSeriesData, type TrendData } from "../lib/graph-service";
import { gameService, type HydratedGameStat } from "../lib/game-service";
import { athleteService } from "../lib/athlete-service";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import { POSITION_METRICS, DEFAULT_METRICS } from "../lib/relevant-metrics";
import RadarVisualisation from "../components/radar-visualisation";
import TrendLineChart from "../components/trend-line-chart";
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const STAT_OPTIONS = [
  { value: 'points', label: 'Points' },
  { value: 'rebounds', label: 'Rebounds' },
  { value: 'assists', label: 'Assists' },
  { value: 'steals', label: 'Steals' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'turnovers', label: 'Turnovers' },
];

const YEAR_OPTIONS = [
  { value: '25-26', label: '2025-26' },
  { value: '24-25', label: '2024-25' },
  { value: '23-24', label: '2023-24' },
  { value: '22-23', label: '2022-23' },
];

const LIMIT_OPTIONS = [
  { value: 10, label: 'Last 10' },
  { value: 20, label: 'Last 20' },
  { value: 30, label: 'Last 30' },
  { value: 50, label: 'Last 50' },
  { value: 100, label: 'Last 100' },
];

const GRID_COLUMNS: GridColDef[] = [
  { field: 'name', headerName: 'PLAYER', width: 200 },
  { field: 'ppg', headerName: 'PPG', type: 'number', width: 100 },
  { field: 'rpg', headerName: 'RPG', type: 'number', width: 100 },
  { field: 'apg', headerName: 'APG', type: 'number', width: 100 },
  { field: 'spg', headerName: 'STL', type: 'number', width: 100 },
  { field: 'bpg', headerName: 'BLK', type: 'number', width: 100 },
  { field: 'fg_pct', headerName: 'FG%', type: 'number', width: 100 },
  { field: 'gp', headerName: 'GP', type: 'number', width: 100 },
];

export default function AnalyzePage() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids");
  const playerIds = React.useMemo(() => (idsParam ? idsParam.split(",").filter(id => id.trim() !== "") : []), [idsParam]);

  const [players, setPlayers] = React.useState<Athlete[]>([]);
  const [radarData, setRadarData] = React.useState<RadarSeriesData[]>([]);
  const [gameTrendData, setGameTrendData] = React.useState<TrendData[]>([]);
  const [selectedStat, setSelectedStat] = React.useState('points');
  const [selectedYears, setSelectedYears] = React.useState<string[]>(['25-26']);
  const [gameLimit, setGameLimit] = React.useState(30);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleStatChange = (event: SelectChangeEvent) => {
    setSelectedStat(event.target.value as string);
  };

  const handleYearsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedYears(typeof value === 'string' ? value.split(',') : value);
  };

  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    setGameLimit(Number(event.target.value));
  };

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
          setLoading(false);
          return;
        }

        const firstPlayer = fetchedPlayers[0];
        const stats = firstPlayer.currentStats as BasketballStatRecord;
        const primaryPos = (stats?.positions?.[0] || "PG").toUpperCase();
        const metrics = POSITION_METRICS[primaryPos] || DEFAULT_METRICS;

        const radar = await graphService.getRadarData(playerIds, metrics);
        setRadarData(radar);
      } catch (err: any) {
        console.error("[Analyze] Critical load failure:", err);
        setError(err.message || "An unexpected error occurred while loading analysis data.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [playerIds]);

  React.useEffect(() => {
    if (playerIds.length === 0 || loading || error) return;
    async function loadGameTrend() {
      try {
        const data = await graphService.getGameTrendData(playerIds, selectedStat, gameLimit, selectedYears);
        setGameTrendData(data);
      } catch (err) {
        console.error("[Analyze] Game trend load failure:", err);
      }
    }
    loadGameTrend();
  }, [playerIds, selectedStat, selectedYears, gameLimit, loading, error]);

  const gridRows = React.useMemo(() => {
    return players.map(p => {
      // For the grid, we'll show the stats for the MOST RECENT year selected
      const sortedSelectedYears = [...selectedYears].sort((a, b) => b.localeCompare(a));
      const latestYear = sortedSelectedYears[0] || '25-26';
      const record = p.records.find(r => r.year === latestYear) as BasketballStatRecord;
      
      return {
        id: p.id,
        name: p.name,
        ppg: record?.points_per_game ?? 0,
        rpg: record?.rebounds_per_game ?? 0,
        apg: record?.assists_per_game ?? 0,
        spg: record?.steals_per_game ?? 0,
        bpg: record?.blocks_per_game ?? 0,
        fg_pct: record?.fg_pct ?? 0,
        gp: record?.games_played ?? 0,
      };
    });
  }, [players, selectedYears]);

  if (playerIds.length === 0) {
    return (
      <PageLayout requireAuth title="Deep Analysis" description="No players selected for analysis.">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">No Athletes Selected</h2>
            <p className="mt-4 text-slate-500">Go to the Discover page and select athletes to compare their performance profiles.</p>
            <Link to="/discover" className="mt-8 inline-flex rounded-full bg-[#00599c] px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:-translate-y-0.5">
              Back to Discover
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout requireAuth title="Analysis Error" description="Something went wrong during data retrieval.">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-[32px] border border-red-100 bg-white p-12 shadow-sm">
            <h2 className="text-2xl font-black text-red-600">Failed to Load Analysis</h2>
            <p className="mt-4 text-slate-500">{error}</p>
            <Link to="/discover" className="mt-8 inline-flex rounded-full bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:-translate-y-0.5">
              Return to Discover
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const selectedStatLabel = STAT_OPTIONS.find(opt => opt.value === selectedStat)?.label || 'Stats';

  return (
    <PageLayout 
      requireAuth 
      title="Prospect Analysis" 
      subtitle={`${playerIds.length} Athletes Selected`}
      description="Comparative performance profiling and production metrics."
      variant="hero"
    >
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 md:px-12 lg:px-24 space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00599c] border-t-transparent" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00599c]/50">Crunching production data</p>
          </div>
        ) : (
          <>
            {/* 0. Stats Comparison Grid */}
            <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-[#00599c]">Production Summary</span>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Stats Overview</h2>
                  <p className="mt-1 text-sm font-medium text-slate-400">Comparing profile campaign averages</p>
                </div>
              </div>
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={gridRows}
                  columns={GRID_COLUMNS}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5 } },
                  }}
                  pageSizeOptions={[5, 10]}
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontSize: '0.75rem',
                      color: '#64748b',
                    },
                    '& .MuiDataGrid-cell': {
                      fontWeight: '700',
                      color: '#0f172a',
                    },
                  }}
                />
              </Box>
            </section>

            {/* 1. Radar Comparison */}
            <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-8 text-center">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-[#00599c]">Production Radar</span>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Profile Comparison</h2>
              </div>
              <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                  {radarData.length > 0 ? (
                    <RadarVisualisation 
                      metrics={POSITION_METRICS["PG"] || DEFAULT_METRICS} 
                      series={radarData} 
                      height={400} 
                    />
                  ) : (
                    <p className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-xs">Radar data unavailable for this selection</p>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Game Performance Trend */}
            <section className="rounded-[40px] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-[#00599c]">Production Trend</span>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Game-by-Game Catalyst</h2>
                  <p className="mt-2 text-sm font-medium text-slate-400">Visualizing {selectedStatLabel} across selected campaigns</p>
                </div>
                
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ minWidth: 200 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Seasons</InputLabel>
                      <Select
                        multiple
                        value={selectedYears}
                        onChange={handleYearsChange}
                        renderValue={(selected) => selected.join(', ')}
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
                          '& .MuiSelect-select': { fontWeight: 'bold', color: 'black' }
                        }}
                      >
                        {YEAR_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            <Checkbox checked={selectedYears.indexOf(opt.value) > -1} />
                            <ListItemText primary={opt.label} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ minWidth: 140 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Limit</InputLabel>
                      <Select
                        value={gameLimit}
                        label="Limit"
                        onChange={handleLimitChange as any}
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
                          '& .MuiSelect-select': { fontWeight: 'bold', color: 'black' }
                        }}
                      >
                        {LIMIT_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ minWidth: 140 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Metric</InputLabel>
                      <Select
                        value={selectedStat}
                        label="Metric"
                        onChange={handleStatChange}
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
                          '& .MuiSelect-select': { fontWeight: 'bold', color: 'black' }
                        }}
                      >
                        {STAT_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Stack>
              </div>

              {gameTrendData.length > 0 ? (
                <TrendLineChart 
                  key={`${selectedStat}-${selectedYears.join('-')}-${gameLimit}`}
                  data={gameTrendData} 
                  title={`Combined Performance Trend`} 
                  yAxisLabel={selectedStatLabel}
                  height={450}
                  hideXAxisLabels
                />
              ) : (
                <p className="text-center text-slate-400 py-20 font-bold uppercase tracking-widest text-xs">Insufficient game data for the selected filters</p>
              )}
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
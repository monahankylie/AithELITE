import * as React from "react";
import { useSearchParams, Link } from "react-router";
import PageLayout from "../components/page-layout";
import { 
  Box, 
  InputLabel, 
  MenuItem, 
  FormControl, 
  Select, 
  Stack, 
  Checkbox, 
  ListItemText, 
  FormControlLabel, 
  Typography,
  CircularProgress
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { graphService, type RadarSeriesData, type TrendData } from "../lib/graph-service";
import { gameService, type HydratedGameStat } from "../lib/game-service";
import { athleteService } from "../lib/athlete-service";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import { POSITION_METRICS, DEFAULT_METRICS } from "../lib/relevant-metrics";
import RadarVisualisation from "../components/radar-visualisation";
import TrendLineChart from "../components/trend-line-chart";
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddPlayersPopup from "../components/add-players-popup";
import RemovePlayersPopup from "../components/remove-players-popup";

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

const AVAILABLE_STATS = [
  { id: 'points_per_game', label: 'PPG' },
  { id: 'rebounds_per_game', label: 'RPG' },
  { id: 'assists_per_game', label: 'APG' },
  { id: 'steals_per_game', label: 'SPG' },
  { id: 'blocks_per_game', label: 'BPG' },
  { id: 'fg_pct', label: 'FG%' },
  { id: 'fg3_pct', label: '3P%' },
  { id: 'fg2_pct', label: '2P%' },
  { id: 'ft_pct', label: 'FT%' },
  { id: 'efg_pct', label: 'eFG%' },
  { id: 'ast_to_ratio', label: 'A/TO' },
  { id: 'turnovers_per_game', label: 'TOPG' },
  { id: 'games_played', label: 'GP' },
  { id: 'minutes_per_game', label: 'MPG' },
  { id: 'minutes_played', label: 'MIN' },
  { id: 'points_per_shot', label: 'PPS' },
  { id: 'double_doubles', label: 'DD' },
  { id: 'triple_doubles', label: 'TD' },
  { id: 'off_rebounds_per_game', label: 'ORPG' },
  { id: 'def_rebounds_per_game', label: 'DRPG' },
  { id: 'points', label: 'PTS' },
  { id: 'rebounds', label: 'REB' },
  { id: 'assists', label: 'AST' },
  { id: 'steals', label: 'STL' },
  { id: 'blocks', label: 'BLK' },
  { id: 'turnovers', label: 'TO' },
  { id: 'fouls_per_game', label: 'FPG' },
  { id: 'fouls', label: 'PF' },
];

const DEFAULT_COLUMNS = [
  'points_per_game',
  'rebounds_per_game',
  'assists_per_game',
  'steals_per_game',
  'blocks_per_game',
  'fg_pct',
  'games_played'
];

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

export default function AnalyzePage() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids");
  const playerIds = React.useMemo(() => (idsParam ? idsParam.split(",").filter(id => id.trim() !== "") : []), [idsParam]);

  const [players, setPlayers] = React.useState<Athlete[]>([]);
  const [radarData, setRadarData] = React.useState<RadarSeriesData[]>([]);
  const [gameTrendData, setGameTrendData] = React.useState<TrendData[]>([]);
  
  const [gridYear, setGridYear] = React.useState('25-26');
  const [selectedStat, setSelectedStat] = React.useState('points');
  const [selectedYears, setSelectedYears] = React.useState<string[]>(['25-26']);
  const [gameLimit, setGameLimit] = React.useState(30);
  const [hiddenIds, setHiddenIds] = React.useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(DEFAULT_COLUMNS);
  const [showAddPopup, setShowAddPopup] = React.useState(false);
  const [showRemovePopup, setShowRemovePopup] = React.useState(false);
  
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Derive stable colors for players based on their index in the original playerIds list
  const playerColors = React.useMemo(() => {
    const map: Record<string, string> = {};
    playerIds.forEach((id, idx) => {
      map[id] = CHART_COLORS[idx % CHART_COLORS.length];
    });
    return map;
  }, [playerIds]);

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

  const handleGridYearChange = (event: SelectChangeEvent) => {
    setGridYear(event.target.value as string);
  };

  const handleColumnsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedColumns(typeof value === 'string' ? value.split(',') : value);
  };

  const togglePlayerVisibility = (id: string) => {
    setHiddenIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
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
        
        // Inject stable colors into radar data
        const coloredRadar = radar.map(s => ({
          ...s,
          color: s.id ? playerColors[s.id] : undefined
        }));

        setRadarData(coloredRadar);
      } catch (err: any) {
        console.error("[Analyze] Critical load failure:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [playerIds, playerColors]);

  React.useEffect(() => {
    if (playerIds.length === 0 || loading || error) return;
    async function loadGameTrend() {
      try {
        const data = await graphService.getGameTrendData(playerIds, selectedStat, gameLimit, selectedYears);
        
        // Inject stable colors into trend data
        const coloredTrend = data.map(s => ({
            ...s,
            color: playerColors[s.id]
        }));

        setGameTrendData(coloredTrend);
      } catch (err) {
        console.error("[Analyze] Game trend load failure:", err);
      }
    }
    loadGameTrend();
  }, [playerIds, selectedStat, selectedYears, gameLimit, loading, error, playerColors]);

  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    const base: GridColDef[] = [{ field: 'name', headerName: 'PLAYER', width: 200, sticky: 'left' as any }];
    const stats = selectedColumns.map(colId => {
      const config = AVAILABLE_STATS.find(s => s.id === colId);
      return {
        field: colId,
        headerName: config?.label || colId,
        type: 'number',
        width: 100,
      } as GridColDef;
    });
    return [...base, ...stats];
  }, [selectedColumns]);

  const gridRows = React.useMemo(() => {
    return players.map(p => {
      const record = p.records.find(r => r.year === gridYear) as BasketballStatRecord;
      const row: any = {
        id: p.id,
        name: p.name,
      };
      selectedColumns.forEach(colId => {
        row[colId] = (record as any)?.[colId] ?? 0;
      });
      return row;
    });
  }, [players, gridYear, selectedColumns]);

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

  const selectedStatLabel = STAT_OPTIONS.find(opt => opt.value === selectedStat)?.label || 'Stats';

  return (
    <PageLayout 
      requireAuth 
      title="Prospect Analysis" 
      subtitle={`${playerIds.length} Athletes Selected`}
      description="Comparative performance profiling and production metrics."
      variant="hero"
      actions={
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
      }
    >
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 md:px-12 lg:px-24 space-y-12">
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 10, gap: 2 }}>
            <CircularProgress size={48} sx={{ color: '#00599c' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#00599c80' }}>
              Crunching production data
            </Typography>
          </Box>
        ) : (
          <>
            <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Summary</Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Stats Overview</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>Comparing profile campaign averages</Typography>
                </div>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 200 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Visible Stats</InputLabel>
                      <Select
                        multiple
                        value={selectedColumns}
                        onChange={handleColumnsChange as any}
                        renderValue={(selected) => {
                          const labels = (selected as string[]).map(id => AVAILABLE_STATS.find(s => s.id === id)?.label || id);
                          return labels.join(', ');
                        }}
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: '#f8fafc',
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                          '& .MuiSelect-select': { fontWeight: 'bold', color: 'black', fontSize: '0.875rem' }
                        }}
                      >
                        {AVAILABLE_STATS.map((stat) => (
                          <MenuItem key={stat.id} value={stat.id}>
                            <Checkbox checked={selectedColumns.indexOf(stat.id) > -1} />
                            <ListItemText primary={stat.label} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ minWidth: 140 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Filter Year</InputLabel>
                      <Select
                        value={gridYear}
                        label="Filter Year"
                        onChange={handleGridYearChange}
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: '#f8fafc',
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                          '& .MuiSelect-select': { fontWeight: 'bold', color: 'black', fontSize: '0.875rem' }
                        }}
                      >
                        {YEAR_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </div>
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={gridRows}
                  columns={dynamicColumns}
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

            <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-8 text-center">
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Radar</Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Profile Comparison</Typography>
              </div>
              <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                  {radarData.length > 0 ? (
                    <RadarVisualisation 
                      metrics={POSITION_METRICS[((players[0]?.currentStats as BasketballStatRecord)?.positions?.[0] || "PG").toUpperCase()] || DEFAULT_METRICS} 
                      series={radarData.filter(s => !hiddenIds.includes(s.id!))} 
                      height={400} 
                    />
                  ) : (
                    <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>
                      Radar data unavailable for this selection
                    </Typography>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[40px] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Trend</Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Game-by-Game Catalyst</Typography>
                  <Typography sx={{ mt: 1, fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8' }}>Visualizing {selectedStatLabel} across selected campaigns</Typography>
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

              {/* Custom Legend with Checkboxes */}
              <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
                {players.map((player) => (
                  <FormControlLabel
                    key={player.id}
                    control={
                      <Checkbox
                        checked={!hiddenIds.includes(player.id)}
                        onChange={() => togglePlayerVisibility(player.id)}
                        sx={{
                          color: playerColors[player.id],
                          '&.Mui-checked': {
                            color: playerColors[player.id],
                          },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a' }}>
                        {player.name}
                      </Typography>
                    }
                  />
                ))}
              </Box>

              {gameTrendData.length > 0 ? (
                <TrendLineChart 
                  key={`${selectedStat}-${selectedYears.join('-')}-${gameLimit}`}
                  data={gameTrendData} 
                  title={`Combined Performance Trend`} 
                  yAxisLabel={selectedStatLabel}
                  height={450}
                  hideXAxisLabels
                  hiddenIds={hiddenIds}
                />
              ) : (
                <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>
                  Insufficient game data for the selected filters
                </Typography>
              )}
            </section>
          </>
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
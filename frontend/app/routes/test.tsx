import * as React from "react";
import PageLayout from "../components/page-layout";
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { graphService, type RadarSeriesData, type TrendData } from "../lib/graph-service";
import { gameService, type HydratedGameStat } from "../lib/game-service";
import { athleteService } from "../lib/athlete-service";
import type { BasketballStatRecord } from "../lib/athlete-types";
import POSITION_METRICS from '../lib/relevant-metrics';
import RadarVisualisation from "../components/radar-visualisation";
import TrendLineChart from "../components/trend-line-chart";
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const COLUMNS: GridColDef[] = [
  { field: 'name', headerName: 'PLAYER', width: 180 },
  { field: 'pts', headerName: 'PTS', type: 'number', width: 80 },
  { field: 'reb', headerName: 'REB', type: 'number', width: 80 },
  { field: 'ast', headerName: 'AST', type: 'number', width: 80 },
  { field: 'stl', headerName: 'STL', type: 'number', width: 80 },
  { field: 'blk', headerName: 'BLK', type: 'number', width: 80 },
];

function MultiPlayerDataGrid() {
  const rows = React.useMemo(() => [
    { id: 1, name: 'Brooklyn Ross', pts: 22.8, reb: 7.4, ast: 1.3, stl: 0.8, blk: 0.8 },
    { id: 2, name: 'Cameron Hood', pts: 16.6, reb: 3.8, ast: 2.0, stl: 1.6, blk: 0.2 },
  ], []);

  return (
    <Box sx={{ height: 300, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={COLUMNS}
        initialState={{
          columns: { columnVisibilityModel: { id: false } },
        }}
      />
    </Box>
  );
}

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

const TestPage = () => {
  const [radarData, setRadarData] = React.useState<RadarSeriesData[]>([]);
  const [trendData, setTrendData] = React.useState<TrendData[]>([]);
  const [gameTrendData, setGameTrendData] = React.useState<TrendData[]>([]);
  const [selectedStat, setSelectedStat] = React.useState('points');
  const [selectedYear, setSelectedYear] = React.useState('25-26');
  const [playerGames, setPlayerGames] = React.useState<Record<string, {name: string, teamId: string, games: HydratedGameStat[]}>>({});
  const [loading, setLoading] = React.useState(true);

  const demoIds = [
    "brooklynross2027a400ae53cc5b499b92337ea61fcfb173",
    "cameronhood202681450a397c9f4bceb6a9c58f9f1b0232"
  ];

  const targetIds = [
    "aaronkrueger2027c0f4993dba9b4e5eaeb1a6ba4f2bb864",
    "aaronpiantino202600efc52e54e1474b90fc7383ec49c0cd"
  ];

  const handleStatChange = (event: SelectChangeEvent) => {
    setSelectedStat(event.target.value as string);
  };

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYear(event.target.value as string);
  };

  React.useEffect(() => {
    async function loadInitialData() {
      try {
        const radar = await graphService.getRadarData(demoIds, POSITION_METRICS.PG);
        const trend = await graphService.getTrendData(demoIds, "PPG");
        setRadarData(radar);
        setTrendData(trend);

        const targetPlayers = await athleteService.fetchAthletesByIds(targetIds);
        const gamesMap: Record<string, {name: string, teamId: string, games: HydratedGameStat[]}> = {};

        for (const player of targetPlayers) {
          const stats = player.currentStats as BasketballStatRecord;
          const internalId = stats?.athlete_id;
          const teamId = stats?.team_id || "";
          
          if (internalId) {
            const games = await gameService.fetchHydratedGamesByPlayerId(internalId);
            gamesMap[player.id] = { name: player.name, teamId, games };
          }
        }
        setPlayerGames(gamesMap);
      } catch (err) {
        console.error("Failed to load initial test data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  React.useEffect(() => {
    async function loadGameTrend() {
      try {
        // Fetch last 30 games with year filter
        const data = await graphService.getGameTrendData(targetIds, selectedStat, 30, selectedYear);
        setGameTrendData(data);
      } catch (err) {
        console.error("Failed to load game trend data:", err);
      }
    }
    loadGameTrend();
  }, [selectedStat, selectedYear]);

  const selectedStatLabel = STAT_OPTIONS.find(opt => opt.value === selectedStat)?.label || 'Stats';
  const selectedYearLabel = YEAR_OPTIONS.find(opt => opt.value === selectedYear)?.label || 'Season';

  return (
    <PageLayout requireAuth title="Test Page" description="Testing GraphService, GameService, and Dynamic Stat Selection.">
      <div className="mx-auto max-w-6xl px-6 pb-20 space-y-8">
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00599c] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Dynamic Game Trend Section */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="font-black uppercase tracking-widest text-[#00599c]">Game Performance Trend</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                    Visualizing {selectedStatLabel} for {selectedYearLabel}
                  </p>
                </div>
                
                <Stack direction="row" spacing={2}>
                  <Box sx={{ minWidth: 150 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="year-select-label" sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Season</InputLabel>
                      <Select
                        labelId="year-select-label"
                        id="year-select"
                        value={selectedYear}
                        label="Season"
                        onChange={handleYearChange}
                        sx={{
                          borderRadius: '12px',
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
                          '& .MuiSelect-select': { fontWeight: 'bold', color: 'black' }
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

                  <Box sx={{ minWidth: 150 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="stat-select-label" sx={{ color: 'black', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>Stat</InputLabel>
                      <Select
                        labelId="stat-select-label"
                        id="stat-select"
                        value={selectedStat}
                        label="Stat"
                        onChange={handleStatChange}
                        sx={{
                          borderRadius: '12px',
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00599c' },
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

              <TrendLineChart 
                data={gameTrendData} 
                title={`${selectedYearLabel} ${selectedStatLabel} Trend`} 
                yAxisLabel={selectedStatLabel}
              />
            </div>

            <div className="p-8 rounded-3xl bg-amber-50 border border-amber-100">
              <h3 className="text-center font-black uppercase tracking-widest text-amber-700 mb-6">Hydrated Game Log Test</h3>
              <div className="space-y-6">
                {Object.entries(playerGames).map(([pid, data]) => (
                  <div key={pid} className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
                    <h4 className="font-black text-slate-900 mb-4 uppercase tracking-tight">{data.name} - Detailed Games</h4>
                    {data.games.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-2 font-black uppercase tracking-wider text-slate-400">Matchup</th>
                              <th className="pb-2 font-black uppercase tracking-wider text-slate-400">Score</th>
                              <th className="pb-2 font-black uppercase tracking-wider text-slate-400">PTS</th>
                              <th className="pb-2 font-black uppercase tracking-wider text-slate-400">REB</th>
                              <th className="pb-2 font-black uppercase tracking-wider text-slate-400">AST</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {data.games.filter(g => !selectedYear || g.year === selectedYear).slice(0, 5).map((stat) => {
                              const detail = stat.gameDetails;
                              let opponent = stat.opponent || "—";
                              let playerTeam = "—";
                              let gameScore = detail?.final_score || stat.score || "—";
                              
                              if (detail) {
                                if (detail.home_team_id === data.teamId) {
                                    playerTeam = detail.home_team || "Home";
                                    opponent = detail.away_team || stat.opponent || "Away";
                                } else if (detail.away_team_id === data.teamId) {
                                    playerTeam = detail.away_team || "Away";
                                    opponent = detail.home_team || stat.opponent || "Home";
                                }
                              }

                              const matchup = playerTeam !== "—" ? `${playerTeam} vs ${opponent}` : opponent;

                              return (
                                <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3">
                                    <div className="font-bold text-slate-900">{matchup}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{stat.date}</div>
                                  </td>
                                  <td className="py-3 font-semibold text-slate-600">{gameScore}</td>
                                  <td className="py-3 font-black text-[#00599c]">{stat.points}</td>
                                  <td className="py-3 font-bold text-slate-700">{stat.rebounds}</td>
                                  <td className="py-3 font-bold text-slate-700">{stat.assists}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No games found for this athlete.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100">
              <h3 className="text-center font-black uppercase tracking-widest text-[#00599c] mb-6">Radar Comparison</h3>
              <RadarVisualisation metrics={POSITION_METRICS.PG} series={radarData} />
            </div>
            
            <div className="p-8 rounded-3xl bg-green-50 border border-green-100">
              <h3 className="text-center font-black uppercase tracking-widest text-green-700 mb-6">PPG Trend</h3>
              <TrendLineChart data={trendData} title="Points Progression Over Seasons" />
            </div>

            <div className="p-8 rounded-3xl bg-purple-50 border border-purple-100">
              <h3 className="text-center font-black uppercase tracking-widest text-purple-700 mb-6">Stats Grid</h3>
              <MultiPlayerDataGrid />
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default TestPage;

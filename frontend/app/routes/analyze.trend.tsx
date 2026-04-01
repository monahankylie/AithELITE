import * as React from "react";
import { useOutletContext } from "react-router";
import { 
  Box, 
  Stack, 
  Checkbox, 
  FormControlLabel, 
  Typography,
  CircularProgress
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { graphService, type TrendData } from "../lib/graph-service";
import type { Athlete } from "../lib/athlete-types";
import TrendLineChart from "../components/trend-line-chart";
import AppDropdown from "../components/app-dropdown";

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
  { value: 'positions', label: 'POS' },
  { value: 'points_per_game', label: 'PPG' },
  { value: 'rebounds_per_game', label: 'RPG' },
  { value: 'assists_per_game', label: 'APG' },
  { value: 'steals_per_game', label: 'SPG' },
  { value: 'blocks_per_game', label: 'BPG' },
  { value: 'fg_pct', label: 'FG%' },
  { value: 'fg3_pct', label: '3P%' },
  { value: 'fg2_pct', label: '2P%' },
  { value: 'ft_pct', label: 'FT%' },
  { value: 'efg_pct', label: 'eFG%' },
  { value: 'ast_to_ratio', label: 'A/TO' },
  { value: 'stl_to_ratio', label: 'S/TO' },
  { value: 'stl_pf_ratio', label: 'S/PF' },
  { value: 'blk_pf_ratio', label: 'B/PF' },
  { value: 'turnovers_per_game', label: 'TOPG' },
  { value: 'games_played', label: 'Games Played' },
  { value: 'minutes_per_game', label: 'MPG' },
  { value: 'minutes_played', label: 'MIN' },
  { value: 'points_per_shot', label: 'PPS' },
  { value: 'double_doubles', label: 'DD' },
  { value: 'triple_doubles', label: 'TD' },
  { value: 'off_rebounds_per_game', label: 'ORPG' },
  { value: 'def_rebounds_per_game', label: 'DRPG' },
  { value: 'points', label: 'PTS' },
  { value: 'rebounds', label: 'REB' },
  { value: 'assists', label: 'AST' },
  { value: 'steals', label: 'STL' },
  { value: 'blocks', label: 'BLK' },
  { value: 'turnovers', label: 'TO' },
  { value: 'fouls_per_game', label: 'FPG' },
  { value: 'fouls', label: 'PF' },
  { value: 'charges', label: 'Charges' },
  { value: 'deflections', label: 'Deflections' },
  { value: 'tech_fouls', label: 'Tech Fouls' },
];

interface AnalyzeContext {
  playerIds: string[];
  players: Athlete[];
  playerColors: Record<string, string>;
  loading: boolean;
}

export default React.memo(function AnalyzeTrend() {
  const { playerIds, players, playerColors, loading: parentLoading } = useOutletContext<AnalyzeContext>();
  const [gameTrendData, setGameTrendData] = React.useState<TrendData[]>([]);
  const [selectedStat, setSelectedStat] = React.useState('points_per_game');
  const [selectedYears, setSelectedYears] = React.useState<string[]>(['25-26']);
  const [gameLimit, setGameLimit] = React.useState(30);
  const [hiddenIds, setHiddenIds] = React.useState<string[]>([]);
  const [localLoading, setLocalLoading] = React.useState(false);

  const handleStatChange = (event: SelectChangeEvent) => {
    setSelectedStat(event.target.value as string);
  };

  const handleYearsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selected = typeof value === 'string' ? value.split(',') : value;
    const sorted = [...selected].sort((a, b) => a.localeCompare(b));
    setSelectedYears(sorted);
  };

  const handleLimitChange = (event: SelectChangeEvent<any>) => {
    setGameLimit(Number(event.target.value));
  };

  const togglePlayerVisibility = (id: string) => {
    setHiddenIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  React.useEffect(() => {
    if (playerIds.length === 0 || parentLoading) return;

    async function loadGameTrend() {
      try {
        setLocalLoading(true);
        const data = await graphService.getGameTrendData(playerIds, selectedStat, gameLimit, selectedYears);
        
        const coloredTrend = data.map(s => ({
            ...s,
            color: playerColors[s.id]
        }));

        setGameTrendData(coloredTrend);
      } catch (err) {
        console.error("[AnalyzeTrend] load failure:", err);
      } finally {
        setLocalLoading(false);
      }
    }
    loadGameTrend();
  }, [playerIds, players, playerColors, parentLoading, selectedStat, selectedYears, gameLimit]);

  if (parentLoading) return null;

  const selectedStatLabel = AVAILABLE_STATS.find(opt => opt.value === selectedStat)?.label || 'Stats';

  return (
    <section className="rounded-[40px] border border-slate-200 bg-slate-50 p-8 shadow-sm relative">
      {localLoading && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '40px' }}>
          <CircularProgress size={32} sx={{ color: '#00599c' }} />
        </Box>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Trend</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Game-by-Game Catalyst</Typography>
          <Typography sx={{ mt: 1, fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8' }}>Visualizing {selectedStatLabel} across selected campaigns</Typography>
        </div>
        
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          <AppDropdown
            label="Seasons"
            value={selectedYears}
            onChange={handleYearsChange}
            options={YEAR_OPTIONS}
            multiple
            checkbox
            minWidth={200}
          />

          <AppDropdown
            label="Limit"
            value={gameLimit}
            onChange={handleLimitChange}
            options={LIMIT_OPTIONS}
            minWidth={140}
          />

          <AppDropdown
            label="Metric"
            value={selectedStat}
            onChange={handleStatChange}
            options={AVAILABLE_STATS}
            minWidth={140}
          />
        </Stack>
      </div>

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
  );
});

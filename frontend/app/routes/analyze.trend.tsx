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
import { TREND_METRICS } from "../lib/relevant-metrics";

const YEAR_OPTIONS = [
  { value: '2025-2026', label: '2025-2026' },
  { value: '2024-2025', label: '2024-2025' },
  { value: '2023-2024', label: '2023-2024' },
  { value: '2022-2023', label: '2022-2023' },
];

const AVAILABLE_STATS = TREND_METRICS.map(m => ({
  value: m.key,
  label: m.shortLabel || m.name
}));

interface AnalyzeContext {
  playerIds: string[];
  players: Athlete[];
  playerColors: Record<string, string>;
  loading: boolean;
}

export default React.memo(function AnalyzeTrend() {
  const { playerIds, players, playerColors, loading: parentLoading } = useOutletContext<AnalyzeContext>();
  const [gameTrendData, setGameTrendData] = React.useState<TrendData[]>([]);
  const [selectedStat, setSelectedStat] = React.useState('points');
  const [selectedYears, setSelectedYears] = React.useState<string[]>(['2024-2025']);
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

  const togglePlayerVisibility = (id: string) => {
    setHiddenIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  React.useEffect(() => {
    if (playerIds.length === 0) {
      setGameTrendData([]);
      return;
    }
    
    if (parentLoading) return;

    if (selectedYears.length === 0) {
      setGameTrendData([]);
      return;
    }

    async function loadGameTrend() {
      try {
        setLocalLoading(true);
        const data = await graphService.getGameTrendData(playerIds, selectedStat, undefined, selectedYears);
        
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
  }, [playerIds, players, playerColors, parentLoading, selectedStat, selectedYears]);

  if (parentLoading) return null;

  const selectedStatLabel = AVAILABLE_STATS.find(opt => opt.value === selectedStat)?.label || 'Stats';

  // Construct dynamic title: {stat_name} from {years_old} season to {years_new} season
  const sortedYearsForTitle = [...selectedYears].sort((a, b) => a.localeCompare(b));
  const trendTitle = sortedYearsForTitle.length > 0
    ? sortedYearsForTitle.length === 1
      ? `games for ${sortedYearsForTitle[0]} season`
      : `games from ${sortedYearsForTitle[0]} season to ${sortedYearsForTitle[sortedYearsForTitle.length - 1]} season`
    : 'Performance Trend';

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
            label="Metric"
            value={selectedStat}
            onChange={handleStatChange}
            options={AVAILABLE_STATS}
            minWidth={140}
          />
        </Stack>
      </div>

      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
        {players.map((player) => {
          const trend = gameTrendData.find(t => t.id === player.id);
          const isImprovementPositive = trend && trend.improvement && trend.improvement > 0;
          const improvementText = trend && trend.improvement !== undefined 
            ? `${trend.improvement > 0 ? '+' : ''}${trend.improvement.toFixed(2)}/game`
            : null;

          return (
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
                <Stack spacing={0.5}>
                  <Typography sx={{ fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a' }}>
                    {player.name}
                  </Typography>
                  {trend && trend.improvement !== undefined && (
                    <Stack>
                      <Stack direction="row" spacing={1.5}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b' }}>
                          MIN: {trend.min?.toFixed(1)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b' }}>
                          MAX: {trend.max?.toFixed(1)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b' }}>
                          GP: {trend.gameCount}
                        </Typography>
                      </Stack>
                      <Typography 
                        sx={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 900, 
                          color: isImprovementPositive ? '#10B981' : (trend.improvement === 0 ? '#64748b' : '#EF4444'),
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        ROC: {trend.improvement > 0 ? '+' : ''}{trend.improvement.toFixed(2)}/game
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              }
            />
          );
        })}
      </Box>

      {gameTrendData.length > 0 ? (
        <TrendLineChart 
          key={`${selectedStat}-${selectedYears.join('-')}-${playerIds.join('-')}`}
          data={gameTrendData} 
          title={trendTitle} 
          yAxisLabel={selectedStatLabel}
          height={450}
          hideXAxisLabels
          hiddenIds={hiddenIds}
        />
      ) : (
        <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>
          No Games Were Found For The Player(s)
        </Typography>
      )}
    </section>
  );
});

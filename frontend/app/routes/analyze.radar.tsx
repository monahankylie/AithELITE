import * as React from "react";
import { useOutletContext } from "react-router";
import { 
  Box, 
  Checkbox, 
  FormControlLabel, 
  Typography,
  CircularProgress,
  Stack
} from '@mui/material';
import { graphService, type RadarSeriesData } from "../lib/graph-service";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import { POSITION_METRICS, DEFAULT_METRICS, ALL_BASKETBALL_METRICS, type MetricDefinition } from "../lib/relevant-metrics";
import RadarVisualisation from "../components/radar-visualisation";
import { athleteFormatter } from "../lib/athlete-formatter";
import { aggStatsService } from "../lib/agg-stats-service";
import AppDropdown from "../components/app-dropdown";

interface AnalyzeContext {
  playerIds: string[];
  players: Athlete[];
  playerColors: Record<string, string>;
  loading: boolean;
}

export default React.memo(function AnalyzeRadar() {
  const { playerIds, players, playerColors, loading: parentLoading } = useOutletContext<AnalyzeContext>();
  const [radarData, setRadarData] = React.useState<RadarSeriesData[]>([]);
  const [selectedMetricKeys, setSelectedMetricKeys] = React.useState<string[]>([]);
  const [activeMetrics, setActiveMetrics] = React.useState<MetricDefinition[]>([]);
  const [radarHiddenIds, setRadarHiddenIds] = React.useState<string[]>([]);
  const [localLoading, setLocalLoading] = React.useState(false);

  const toggleRadarPlayerVisibility = (id: string) => {
    setRadarHiddenIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  // Initialize selected metrics based on first player's position
  React.useEffect(() => {
    if (players.length > 0 && selectedMetricKeys.length === 0) {
      const firstPlayer = players[0];
      const stats = firstPlayer.currentStats as BasketballStatRecord;
      const primaryPos = (stats?.positions?.[0] || "PG").toUpperCase();
      const baseMetrics = POSITION_METRICS[primaryPos] || DEFAULT_METRICS;
      setSelectedMetricKeys(baseMetrics.map(m => m.key));
    }
  }, [players]);

  React.useEffect(() => {
    if (playerIds.length === 0 || parentLoading || selectedMetricKeys.length === 0) return;

    async function loadRadarData() {
      try {
        setLocalLoading(true);
        const firstPlayer = players[0];
        const stats = firstPlayer.currentStats as BasketballStatRecord;
        const primaryPos = (stats?.positions?.[0] || "PG").toUpperCase();
        
        // 1. Fetch Agg Stats for this position to get dynamic max values
        const aggStats = await aggStatsService.fetchAggStats("basketball", primaryPos);
        
        // 2. Map selected keys to full MetricDefinitions and update their max
        const dynamicMetrics = selectedMetricKeys.map(key => {
          const baseMetric = ALL_BASKETBALL_METRICS.find(m => m.key === key) || 
                             { name: key, key: key as any, max: 100 };
          
          const populationMax = aggStats?.max ? (aggStats.max as any)[key] : null;
          return {
            ...baseMetric,
            max: (populationMax && populationMax > 0) ? populationMax : baseMetric.max
          };
        });

        setActiveMetrics(dynamicMetrics);

        // 3. Get Radar Data with these dynamic metrics
        const radar = await graphService.getRadarData(playerIds, dynamicMetrics);
        
        const coloredRadar = radar.map(s => ({
          ...s,
          color: s.id ? playerColors[s.id] : undefined
        }));

        setRadarData(coloredRadar);
      } catch (err) {
        console.error("[AnalyzeRadar] load failure:", err);
      } finally {
        setLocalLoading(false);
      }
    }
    loadRadarData();
  }, [playerIds, players, playerColors, parentLoading, selectedMetricKeys]);

  const handleMetricChange = (event: any) => {
    const value = event.target.value;
    const keys = typeof value === 'string' ? value.split(',') : value;
    setSelectedMetricKeys(keys);
  };

  const metricOptions = React.useMemo(() => 
    ALL_BASKETBALL_METRICS.map(m => ({
      value: m.key,
      label: m.name
    })), 
  []);

  if (parentLoading) return null;

  return (
    <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm relative">
      {localLoading && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '40px' }}>
          <CircularProgress size={32} sx={{ color: '#00599c' }} />
        </Box>
      )}
      
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="text-left">
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Radar</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Profile Comparison</Typography>
        </div>

        <Box sx={{ minWidth: 240 }}>
          <AppDropdown
            label="Compare Metrics"
            value={selectedMetricKeys}
            onChange={handleMetricChange}
            options={metricOptions}
            multiple
            checkbox
          />
        </Box>
      </div>

      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
        {players.map((player) => (
          <FormControlLabel
            key={`radar-${player.id}`}
            control={
              <Checkbox
                checked={!radarHiddenIds.includes(player.id)}
                onChange={() => toggleRadarPlayerVisibility(player.id)}
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

      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          {radarData.length > 0 ? (
            <RadarVisualisation 
              metrics={activeMetrics} 
              series={radarData.filter(s => !radarHiddenIds.includes(s.id!))} 
              height={500} 
            />
          ) : (
            <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>
              Select metrics to begin comparison
            </Typography>
          )}
        </div>
      </div>
    </section>
  );
});

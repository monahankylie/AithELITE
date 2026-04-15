import * as React from "react";
import { useOutletContext } from "react-router";
import { 
  Box, 
  Checkbox, 
  FormControlLabel, 
  Typography,
  CircularProgress
} from '@mui/material';
import { graphService, type RadarSeriesData } from "../lib/graph-service";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import { POSITION_METRICS, DEFAULT_METRICS } from "../lib/relevant-metrics";
import RadarVisualisation from "../components/radar-visualisation";
import { athleteFormatter } from "../lib/athlete-formatter";

interface AnalyzeContext {
  playerIds: string[];
  players: Athlete[];
  playerColors: Record<string, string>;
  loading: boolean;
}

export default React.memo(function AnalyzeRadar() {
  const { playerIds, players, playerColors, loading: parentLoading } = useOutletContext<AnalyzeContext>();
  const [radarData, setRadarData] = React.useState<RadarSeriesData[]>([]);
  const [radarHiddenIds, setRadarHiddenIds] = React.useState<string[]>([]);
  const [localLoading, setLocalLoading] = React.useState(false);

  const toggleRadarPlayerVisibility = (id: string) => {
    setRadarHiddenIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  React.useEffect(() => {
    if (playerIds.length === 0 || parentLoading) return;

    async function loadRadarData() {
      try {
        setLocalLoading(true);
        const firstPlayer = players[0];
        const stats = athleteFormatter.aggregateStats(firstPlayer);
        const primaryPos = (stats?.positions?.[0] || "PG").toUpperCase();
        const metrics = POSITION_METRICS[primaryPos] || DEFAULT_METRICS;

        const radar = await graphService.getRadarData(playerIds, metrics);
        
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
  }, [playerIds, players, playerColors, parentLoading]);

  if (parentLoading) return null;

  return (
    <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm relative">
      {localLoading && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '40px' }}>
          <CircularProgress size={32} sx={{ color: '#00599c' }} />
        </Box>
      )}
      <div className="mb-8 text-center">
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Radar</Typography>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Profile Comparison</Typography>
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
              metrics={POSITION_METRICS[((players[0]?.currentStats as BasketballStatRecord)?.positions?.[0] || "PG").toUpperCase()] || DEFAULT_METRICS} 
              series={radarData.filter(s => !radarHiddenIds.includes(s.id!))} 
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
  );
});

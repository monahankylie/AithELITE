import * as React from "react";
import { useOutletContext, Link } from "react-router";
import { 
  Box, 
  Typography,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  type SelectChangeEvent
} from '@mui/material';
import type { Athlete, AggregatedStats } from "../lib/athlete-types";
import { aggStatsService } from "../lib/agg-stats-service";
import StatHistogramChart from "../components/stat-histogram-chart";
import { DEFAULT_METRICS, ALL_BASKETBALL_METRICS } from "../lib/relevant-metrics";
import { athleteFormatter } from "../lib/athlete-formatter";

interface AnalyzeContext {
  players: Athlete[];
  loading: boolean;
  playerColors: Record<string, string>;
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function AnalyzeDistribution() {
  const { players, loading, playerColors } = useOutletContext<AnalyzeContext>();
  const [aggData, setAggData] = React.useState<AggregatedStats | null>(null);
  const [fetchingAgg, setFetchingAgg] = React.useState(false);
  const [selectedPosition, setSelectedPosition] = React.useState<string>("All");
  const [selectedMetric, setSelectedMetric] = React.useState<string>("points_per_game");
  const [binWindow, setBinWindow] = React.useState<number>(1);
  const [hiddenIds, setHiddenIds] = React.useState<string[]>([]);

  const togglePlayerVisibility = (id: string) => {
    setHiddenIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  // Determine available positions based on selected athletes
  const availablePositions = React.useMemo(() => {
    const posSet = new Set<string>(["All"]);
    players.forEach(p => {
      const stats = p.currentStats as any;
      if (stats?.positions && Array.isArray(stats.positions)) {
        stats.positions.forEach((pos: string) => {
          if (pos && typeof pos === 'string') {
            posSet.add(pos);
          }
        });
      }
    });
    return Array.from(posSet).sort();
  }, [players]);

  // Load aggregated stats when selected position changes
  React.useEffect(() => {
    async function loadAgg() {
      setFetchingAgg(true);
      try {
        const data = await aggStatsService.fetchAggStats("basketball", selectedPosition);
        setAggData(data);
      } catch (error) {
        console.error(`[AnalyzeDistribution] Error loading aggregate stats:`, error);
        setAggData(null);
      } finally {
        setFetchingAgg(false);
      }
    }
    loadAgg();
  }, [selectedPosition]);

  const handlePositionChange = (event: SelectChangeEvent) => {
    setSelectedPosition(event.target.value);
  };

  const handleMetricChange = (event: SelectChangeEvent) => {
    setSelectedMetric(event.target.value);
  };

  const handleBinWindowChange = (event: SelectChangeEvent) => {
    setBinWindow(Number(event.target.value));
  };

  if (loading) return null;

  const histogram = aggData?.histograms[selectedMetric];
  const metricName = DEFAULT_METRICS.find(m => m.key === selectedMetric)?.name || selectedMetric;

  const markers = React.useMemo(() => {
    if (!histogram || !histogram.counts || !histogram.points) return [];
    
    const totalCount = histogram.counts.reduce((a, b) => a + b, 0);
    if (totalCount === 0) return [];

    return players
      .filter(p => !hiddenIds.includes(p.id))
      .map(p => {
        // USE MOST RECENT DATA (currentStats) instead of aggregateStats
        const stats = p.currentStats || athleteFormatter.aggregateStats(p);
        const val = (stats as any)?.[selectedMetric];
        if (typeof val !== 'number') return null;

        // Calculate Percentile
        let countBelow = 0;
        const { points, counts } = histogram;
        for (let i = 0; i < counts.length; i++) {
          if (val > points[i + 1]) {
            countBelow += counts[i];
          } else {
            // Linear interpolation for more accuracy within the bin
            const binWidth = points[i + 1] - points[i];
            if (binWidth > 0) {
              const fraction = (val - points[i]) / binWidth;
              countBelow += counts[i] * Math.max(0, Math.min(1, fraction));
            }
            break;
          }
        }
        
        const percentile = (countBelow / totalCount) * 100;
        const roundedPercentile = Math.round(percentile);
        const percentileLabel = percentile > 99 ? "Top 1%" : `${getOrdinalSuffix(roundedPercentile)}`;

        return {
          value: val,
          color: playerColors[p.id],
          label: `${p.lastName || p.name.split(' ').pop() || ''} (${percentileLabel})`,
          percentile: percentile
        };
      }).filter((m): m is { value: number; color: string; label: string; percentile: number } => m !== null);
  }, [players, histogram, selectedMetric, playerColors, hiddenIds]);

  return (
    <Box sx={{ 
      borderRadius: '40px', 
      border: '1px solid', 
      borderColor: 'divider', 
      backgroundColor: 'white', 
      p: '5px', // Exact 5px padding from box edge
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Header Section */}
      <Box sx={{ p: 3, pb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-end', justifyContent: 'between', gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>
            Benchmark Distribution
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Production Spread
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Smoothness</InputLabel>
            <Select value={String(binWindow)} label="Smoothness" onChange={handleBinWindowChange} sx={{ borderRadius: '12px', fontWeight: 700 }}>
              <MenuItem value="1">Original (100)</MenuItem>
              <MenuItem value="2">Smooth (50)</MenuItem>
              <MenuItem value="4">Blocky (25)</MenuItem>
              <MenuItem value="10">Aggressive (10)</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Position Group</InputLabel>
            <Select value={selectedPosition} label="Position Group" onChange={handlePositionChange} sx={{ borderRadius: '12px', fontWeight: 700 }}>
              {availablePositions.map(pos => <MenuItem key={pos} value={pos}>{pos === "All" ? "All Players" : pos}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Metric</InputLabel>
            <Select value={selectedMetric} label="Metric" onChange={handleMetricChange} sx={{ borderRadius: '12px', fontWeight: 700 }}>
              {ALL_BASKETBALL_METRICS.map(m => (
                <MenuItem key={m.key} value={m.key}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {fetchingAgg ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={40} sx={{ color: '#00599c' }} /></Box>
      ) : aggData && histogram ? (
        <Box sx={{ display: 'flex', gap: '5px', alignItems: 'stretch', width: '100%', height: 700 }}>
          {/* Main Chart Area - Maximum Width */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Typography className="text-black font-black uppercase tracking-widest mb-2" textAlign="center" fontSize="0.75rem">
              {metricName} Distribution - {selectedPosition} Benchmark
            </Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <StatHistogramChart 
                histogram={histogram} 
                metricLabel={metricName}
                color="#00599c"
                markers={markers}
                binWindow={binWindow}
              />
            </Box>
          </Box>

          {/* Legend / Sidebar - Right Side */}
          <Box sx={{ 
            width: '280px', 
            flexShrink: 0, 
            backgroundColor: '#f8fafc', 
            borderRadius: '32px', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', mb: 2 }}>
                Athlete Placement
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'auto' }}>
                {players.map(p => {
                  // USE MOST RECENT DATA (currentStats) instead of aggregateStats
                  const stats = p.currentStats || athleteFormatter.aggregateStats(p);
                  const val = (stats as any)?.[selectedMetric];
                  const formattedVal = typeof val === 'number' ? (selectedMetric.includes('pct') ? `${val.toFixed(1)}%` : val.toFixed(1)) : 'N/A';
                  const isHidden = hiddenIds.includes(p.id);
                  
                  // Calculate Percentile for sidebar display
                  const marker = markers.find(m => m.label.startsWith(p.lastName || p.name.split(' ').pop() || ''));
                  const percentileText = marker ? marker.label.split(' (').pop()?.replace(')', '') : '';

                  return (
                    <Box 
                      key={p.id} 
                      sx={{ 
                        display: 'flex', alignItems: 'center', px: 1, py: 1, borderRadius: '12px', 
                        backgroundColor: isHidden ? '#f8fafc' : 'white', 
                        border: '2px solid', 
                        borderColor: isHidden ? '#e2e8f0' : playerColors[p.id],
                        boxShadow: isHidden ? 'none' : '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s',
                        opacity: isHidden ? 0.6 : 1,
                      }}
                    >
                      <Checkbox 
                        size="small"
                        checked={!isHidden}
                        onChange={() => togglePlayerVisibility(p.id)}
                        sx={{ 
                          color: playerColors[p.id],
                          p: 0.5,
                          '&.Mui-checked': { color: playerColors[p.id] }
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0, mr: 1, ml: 0.5 }}>
                        <Link 
                          to={`/players/${p.id}`}
                          style={{ textDecoration: 'none' }}
                        >
                          <Typography sx={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 900, 
                            color: isHidden ? '#94a3b8' : '#0f172a', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            '&:hover': { color: '#00599c' }
                          }}>
                            {p.lastName || p.name.split(' ').pop()}
                          </Typography>
                        </Link>
                        {!isHidden && percentileText && (
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {percentileText} Percentile
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: isHidden ? '#cbd5e1' : playerColors[p.id] }}>
                        {formattedVal}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', mb: 0.5 }}>
                  Group Average
                </Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                  {(aggData.avg as any)[selectedMetric]?.toFixed(2) || '—'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ py: 10, textAlign: 'center' }}><Typography sx={{ color: '#64748b' }}>No distribution data available.</Typography></Box>
      )}
    </Box>
  );
}

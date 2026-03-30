import * as React from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { RadarChart } from '@mui/x-charts/RadarChart';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { RadarSeriesData } from '../lib/graph-service';

interface RadarVisualisationProps {
  metrics: { name: string; max: number }[];
  series: RadarSeriesData[];
  height?: number;
  showControls?: boolean;
}

const RadarVisualisation: React.FC<RadarVisualisationProps> = ({ 
  metrics, 
  series, 
  height = 300,
  showControls = true 
}) => {
  const [hideMark, setHideMark] = React.useState(true);
  const [fillArea, setFillArea] = React.useState(true);

  const processedSeries = React.useMemo(() => 
    series.map(s => ({
      ...s,
      hideMark: s.hideMark ?? hideMark,
      fillArea: s.fillArea ?? fillArea
    })), 
  [series, hideMark, fillArea]);

  return (
    <Box sx={{ width: '100%' }}>
      <RadarChart
        height={height}
        radar={{ 
          metrics: metrics.map(m => ({ ...m, max: 100 })) 
        }}
        series={processedSeries.map(s => ({
          ...s,
          valueFormatter: (v: number | null) => v !== null ? `${v}% of Profile Max` : "",
        }))}
        sx={{
          '& text': { 
            fontFamily: 'Inter !important', 
            fontWeight: '600 !important',
            fill: 'black !important' 
          }
        }}
      />
      {showControls && (
        <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={!hideMark} 
                onChange={(e) => setHideMark(!e.target.checked)} 
                sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }}
              />
            }
            label={<span className="text-black text-xs font-bold uppercase tracking-widest">Show Marks</span>}
          />
          <FormControlLabel
            control={
              <Checkbox 
                checked={fillArea} 
                onChange={(e) => setFillArea(e.target.checked)} 
                sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }}
              />
            }
            label={<span className="text-black text-xs font-bold uppercase tracking-widest">Fill Area</span>}
          />
        </Stack>
      )}
    </Box>
  );
};

export default RadarVisualisation;

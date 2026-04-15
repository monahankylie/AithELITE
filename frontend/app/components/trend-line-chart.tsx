import * as React from "react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { LineChart } from '@mui/x-charts/LineChart';
import { TrendData } from '../lib/graph-service';

interface TrendLineChartProps {
  title?: string;
  data: TrendData[];
  height?: number;
  yAxisLabel?: string;
  hideXAxisLabels?: boolean;
  hiddenIds?: string[];
}
const TrendLineChart: React.FC<TrendLineChartProps> = ({ 
  title, 
  data, 
  height = 300,
  yAxisLabel = "Value",
  hideXAxisLabels = false,
  hiddenIds = []
}) => {
  // Use the maximum length across all series to define the x-axis spread.
  const maxPointCount = React.useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => d.data?.length || 0));
  }, [data]);

  const xAxisData = React.useMemo(() => 
    Array.from({ length: maxPointCount }, (_, i) => i),
  [maxPointCount]);

  return (
    <Box sx={{ width: '100%' }}>
      <LineChart
        series={data.map(item => ({
          id: item.id,
          curve: "linear",
          label: item.label,
          data: item.data,
          color: item.color,
          connectNulls: true,
          showMark: true,
          valueFormatter: (v: number | null) => v !== null ? String(v) : "N/A",
        })).filter(s => !hiddenIds.includes(s.id!))}
        xAxis={[{ 
          data: xAxisData,
          scaleType: 'linear',
          min: 0,
          max: Math.max(0, maxPointCount - 1),
          disableTicks: true,
          label: title,
          labelStyle: {
            fill: 'black',
            fontWeight: 900,
            fontSize: 10,
            textTransform: 'uppercase'
          },
          valueFormatter: () => ""
        }]}
        yAxis={[{ 
          label: yAxisLabel,
          labelStyle: {
            fill: 'black',
            fontWeight: 900,
            fontSize: 10,
            textTransform: 'uppercase'
          }
        }]}
        height={height}
        margin={{ left: 60, right: 20, top: 40, bottom: 60 }}
        slotProps={{
          legend: {
            hidden: true // Hide default legend to use custom checkboxes
          }
        }}
        sx={{
          '& .MuiChartsAxis-left .MuiChartsAxis-label': {
            transform: 'translateX(-15px)',
          },
          '& text': { 
            fontFamily: 'Inter !important', 
            fontWeight: '600 !important',
            fill: 'black !important'
          }
        }}
      />
    </Box>
  );
};

export default TrendLineChart;

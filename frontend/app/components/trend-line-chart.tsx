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
  // Use the length of the data to define the x-axis spread.
  const pointCount = data.length > 0 && data[0].data ? data[0].data.length : 30;
  const xAxisData = Array.from({ length: pointCount }, (_, i) => i);

  return (
    <Box sx={{ width: '100%' }}>
      {title && (
        <Typography className="text-black font-black uppercase tracking-widest mb-4" textAlign="center" fontSize="0.75rem">
          {title}
        </Typography>
      )}
      <LineChart
        series={data.map(item => ({
          id: item.id,
          curve: "linear",
          label: item.label,
          data: item.data,
          color: item.color, // Pass color from data
          connectNulls: true,
          showMark: true,
          valueFormatter: (v: number | null) => v !== null ? String(v) : "N/A",
        })).filter(s => !hiddenIds.includes(s.id!))}
        xAxis={[{ 
          data: xAxisData,
          scaleType: 'linear',
          min: 0,
          max: Math.max(0, pointCount - 1),
          disableTicks: true,
          label: "",
          valueFormatter: (v) => hideXAxisLabels ? "" : String(v)
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
        margin={{ left: 60, right: 20, top: 40, bottom: 40 }}
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

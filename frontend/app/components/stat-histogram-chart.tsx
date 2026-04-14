import * as React from "react";
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import type { StatHistogram } from '../lib/athlete-types';

interface StatHistogramChartProps {
  histogram: StatHistogram;
  height?: number;
  metricLabel?: string;
  color?: string;
  markers?: { value: number; color: string; label: string }[];
  binWindow?: number;
}

const StatHistogramChart: React.FC<StatHistogramChartProps> = ({
  histogram,
  height: initialHeight,
  metricLabel = "Value",
  color = "#00599c",
  markers = [],
  binWindow = 1,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: initialHeight || 400 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
      window.requestAnimationFrame(() => {
        if (!entries[0]) return;
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setSize({ width, height });
        }
      });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Process data for the chart
  const { chartData, xAxisData } = React.useMemo(() => {
    const { counts, points } = histogram;
    
    if (!counts || !points || counts.length === 0) {
      return { chartData: [], xAxisData: [] };
    }

    const aggregatedCounts: number[] = [];
    const aggregatedLabels: string[] = [];

    for (let i = 0; i < counts.length; i += binWindow) {
      const windowCounts = counts.slice(i, i + binWindow);
      const sum = windowCounts.reduce((a, b) => a + b, 0);
      aggregatedCounts.push(sum);

      const start = points[i];
      const nextEdgeIdx = Math.min(i + binWindow, points.length - 1);
      const end = points[nextEdgeIdx];
      
      // Use the midpoint as the label for the band
      const mid = ((start + end) / 2).toFixed(2);
      aggregatedLabels.push(mid);
    }

    return { 
      chartData: aggregatedCounts, 
      xAxisData: aggregatedLabels 
    };
  }, [histogram, binWindow]);

  // Safety guard: Don't render if no data or no size
  if (xAxisData.length === 0 || size.width === 0) {
    return (
      <Box 
        ref={containerRef} 
        sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Placeholder if needed */}
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'block',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <BarChart
        width={size.width}
        height={size.height}
        xAxis={[{
          id: 'h-axis',
          data: xAxisData,
          scaleType: 'band',
          label: metricLabel,
          labelStyle: { 
            fill: 'black', 
            fontWeight: 900, 
            fontSize: 10, 
            textTransform: 'uppercase' 
          },
          valueFormatter: (v) => Number(v).toFixed(1),
        }]}
        series={[{
          xAxisId: 'h-axis',
          data: chartData,
          label: 'Frequency',
          color: color,
          valueFormatter: (v) => `${v} athletes`,
        }]}
        margin={{ left: 40, right: 10, top: 10, bottom: 40 }}
        slotProps={{
          legend: { hidden: true },
          bar: { style: { rx: 0, ry: 0 } }
        }}
        sx={{
          '& .MuiChartsAxis-bottom .MuiChartsAxis-label': { transform: 'translateY(5px)' },
          '& .MuiChartsAxis-left .MuiChartsAxis-label': { transform: 'translateX(-5px)' },
          '& text': { fontFamily: 'Inter !important', fontWeight: '600 !important', fill: 'black !important' },
          '& .MuiBarElement-root': { rx: 0, ry: 0 }
        }}
      >
        {markers.map((m, idx) => {
          const { points } = histogram;
          
          // 1. Find which raw bin the value falls into
          let binIdx = -1;
          for (let i = 0; i < points.length - 1; i++) {
            if (m.value >= points[i] && m.value < points[i+1]) {
              binIdx = i;
              break;
            }
          }
          // Special case: value is exactly the max point
          if (binIdx === -1 && m.value >= points[points.length - 1]) {
            binIdx = points.length - 2;
          }

          if (binIdx === -1) return null;

          // 2. Map to the processed (aggregated) bin index
          // Shifted +1 because it was appearing "one back"
          const processedBinIdx = Math.min(
            Math.floor((binIdx + 1) / binWindow),
            xAxisData.length - 1
          );
          
          // 3. Get the exact label used in xAxis.data
          const targetLabel = xAxisData[processedBinIdx];

          if (targetLabel === undefined) return null;

          return (
            <ChartsReferenceLine
              key={`marker-${idx}-${targetLabel}`}
              x={targetLabel}
              lineStyle={{ stroke: m.color, strokeWidth: 3, strokeDasharray: '4 4' }}
              label={m.label}
              labelStyle={{ fontSize: 10, fontWeight: 900, fill: m.color }}
            />
          );
        })}
      </BarChart>
    </Box>
  );
};

export default StatHistogramChart;

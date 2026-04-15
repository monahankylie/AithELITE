import * as React from "react";
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import { useXScale, useChartId } from '@mui/x-charts/hooks';
import type { StatHistogram } from '../lib/athlete-types';

interface StatHistogramChartProps {
  histogram: StatHistogram;
  height?: number;
  metricLabel?: string;
  color?: string;
  markers?: { value: number; color: string; label: string }[];
  binWindow?: number;
}

/**
 * Custom component to render labels with vertical offsets to prevent overlap.
 * Uses a greedy layout algorithm to avoid collisions even across nearby bins.
 */
const MarkerLabel = ({ 
  xValue, 
  label, 
  color, 
  layer
}: { 
  xValue: string; 
  label: string; 
  color: string; 
  layer: number;
}) => {
  const chartId = useChartId();
  const xScale = useXScale('h-axis');
  
  if (!xScale || !chartId) return null;

  const xPos = (xScale(xValue) ?? 0) + (xScale.bandwidth?.() ?? 0) / 2;
  
  // Stagger labels vertically based on their assigned layer.
  // Base offset is 30px from top, each layer adds 18px of depth.
  const baseTop = 30; 
  const offsetPerLayer = 18;
  const yPos = baseTop + (layer * offsetPerLayer);

  return (
    <g>
      {/* Small tick mark to connect label to the dashed line if deeply staggered */}
      {layer > 0 && (
        <line 
          x1={xPos} y1={baseTop} 
          x2={xPos} y2={yPos - 8} 
          stroke={color} 
          strokeWidth={1} 
          strokeOpacity={0.4}
        />
      )}
      <text
        x={xPos}
        y={yPos}
        fill={color}
        textAnchor="middle"
        style={{ 
          fontSize: 10, 
          fontWeight: 900, 
          fontFamily: 'Inter',
          paintOrder: 'stroke',
          stroke: 'white',
          strokeWidth: 3,
          strokeLinejoin: 'round'
        }}
      >
        {label}
      </text>
    </g>
  );
};

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
      
      const mid = ((start + end) / 2).toFixed(2);
      aggregatedLabels.push(mid);
    }

    return { 
      chartData: aggregatedCounts, 
      xAxisData: aggregatedLabels 
    };
  }, [histogram, binWindow]);

  /**
   * COLLISION AVOIDANCE LOGIC
   * Groups markers and assigns vertical "layers" based on pixel proximity.
   */
  const markersWithLayers = React.useMemo(() => {
    const { points } = histogram;
    const chartWidth = size.width - 50; // Approximating usable chart width
    const binWidthPx = xAxisData.length > 0 ? chartWidth / xAxisData.length : 0;
    const MIN_LABEL_GAP_PX = 65; // Minimum horizontal space a name needs

    // 1. Map all valid markers to their bin index and approximate X pixel position
    const placed: { label: string; color: string; xPos: number; xValue: string; originalIdx: number; layer: number }[] = [];

    markers.forEach((m, idx) => {
      let binIdx = -1;
      for (let i = 0; i < points.length - 1; i++) {
        if (m.value >= points[i] && m.value < points[i+1]) {
          binIdx = i;
          break;
        }
      }
      if (binIdx === -1 && m.value >= points[points.length - 1]) {
        binIdx = points.length - 2;
      }

      if (binIdx !== -1) {
        const processedBinIdx = Math.min(Math.floor(binIdx / binWindow), xAxisData.length - 1);
        const xValue = xAxisData[processedBinIdx];
        const xPosPx = processedBinIdx * binWidthPx;
        
        placed.push({ ...m, xPos: xPosPx, xValue, originalIdx: idx, layer: 0 });
      }
    });

    // 2. Sort by X position so we can process left-to-right
    placed.sort((a, b) => a.xPos - b.xPos);

    // 3. Assign layers greedily. If a marker is too close to anyone in a lower layer, bump it up.
    placed.forEach((current, i) => {
      let layer = 0;
      let collision = true;

      while (collision) {
        collision = false;
        // Check previous markers that might overlap at this layer
        for (let j = 0; j < i; j++) {
          const prev = placed[j];
          if (prev.layer === layer) {
            const distance = Math.abs(current.xPos - prev.xPos);
            if (distance < MIN_LABEL_GAP_PX) {
              collision = true;
              layer++;
              break;
            }
          }
        }
      }
      current.layer = layer;
    });

    return placed;
  }, [histogram, markers, binWindow, xAxisData, size.width]);

  if (xAxisData.length === 0 || size.width === 0) {
    return (
      <Box 
        ref={containerRef} 
        sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
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
        {/* Draw the reference lines */}
        {markersWithLayers.map((m) => (
          <ChartsReferenceLine
            key={`line-${m.originalIdx}`}
            x={m.xValue}
            lineStyle={{ 
              stroke: m.color, 
              strokeWidth: 2, 
              strokeDasharray: '4 4' 
            }}
          />
        ))}

        {/* Draw the labels with collision-aware layers */}
        {markersWithLayers.map((m) => (
          <MarkerLabel
            key={`label-${m.originalIdx}`}
            xValue={m.xValue}
            label={m.label}
            color={m.color}
            layer={m.layer}
          />
        ))}
      </BarChart>
    </Box>
  );
};

export default StatHistogramChart;

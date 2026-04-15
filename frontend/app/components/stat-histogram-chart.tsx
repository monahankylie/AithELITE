import * as React from "react";
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { useXScale, useChartId, useDrawingArea } from '@mui/x-charts/hooks';
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
 * Now also handles the centered vertical reference line.
 */
const MarkerLabel = ({ 
  xValue, 
  label, 
  color, 
  layer,
  isHovered,
  onHover,
  onLeave
}: { 
  xValue: string; 
  label: string; 
  color: string; 
  layer: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) => {
  const chartId = useChartId();
  const xScale = useXScale('h-axis');
  const drawingArea = useDrawingArea();
  
  if (!xScale || !chartId || !drawingArea) return null;

  const { height } = drawingArea;
  const xPos = (xScale(xValue) ?? 0) + (xScale.bandwidth?.() ?? 0) / 2;
  
  // Stagger labels vertically based on their assigned layer.
  const baseTop = 30; 
  const offsetPerLayer = 18;
  const yPos = baseTop + (layer * offsetPerLayer);

  return (
    <g 
      onMouseEnter={onHover} 
      onMouseLeave={onLeave} 
      style={{ cursor: 'pointer' }}
    >
      {/* The Vertical Reference Line - PERFECTLY CENTERED */}
      <line 
        x1={xPos} y1={0} 
        x2={xPos} y2={height} 
        stroke={color} 
        strokeWidth={isHovered ? 3 : 2} 
        strokeDasharray={isHovered ? 'none' : '4 4'}
        strokeOpacity={isHovered ? 1 : 0.6}
        style={{ transition: 'all 0.2s', pointerEvents: 'none' }}
      />

      {/* Small tick mark to connect label to the dashed line if deeply staggered */}
      {layer > 0 && (
        <line 
          x1={xPos} y1={baseTop} 
          x2={xPos} y2={yPos - 8} 
          stroke={color} 
          strokeWidth={isHovered ? 2 : 1} 
          strokeOpacity={isHovered ? 1 : 0.4}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <text
        x={xPos}
        y={yPos}
        fill={color}
        textAnchor="middle"
        style={{ 
          fontSize: isHovered ? 11 : 10, 
          fontWeight: 900, 
          fontFamily: 'Inter',
          paintOrder: 'stroke',
          stroke: 'white',
          strokeWidth: isHovered ? 4 : 3,
          strokeLinejoin: 'round',
          opacity: isHovered ? 1 : 0.8,
          transition: 'all 0.2s'
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
  const [hoveredMarkerIdx, setHoveredMarkerIdx] = React.useState<number | null>(null);

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
      
      // Use range labels as requested: "start-end"
      const label = `${start.toFixed(1)}-${end.toFixed(1)}`;
      aggregatedLabels.push(label);
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
    
    // INCREASED GAP: Full names + Position + Percentile need more horizontal room
    const MIN_LABEL_GAP_PX = 150; 

    // 1. Map all valid markers to their bin index and approximate X pixel position
    const placed: { label: string; color: string; xPos: number; xValue: string; originalIdx: number; layer: number }[] = [];

    markers.forEach((m, idx) => {
      let binIdx = -1;
      for (let i = 0; i < points.length - 1; i++) {
        const isLastBin = i === points.length - 2;
        if (m.value >= points[i] && (isLastBin ? m.value <= points[i+1] : m.value < points[i+1])) {
          binIdx = i;
          break;
        }
      }

      if (binIdx !== -1) {
        const processedBinIdx = Math.min(Math.floor(binIdx / binWindow), xAxisData.length - 1);
        const xValue = xAxisData[processedBinIdx];
        
        // Calculate center of bin for X position
        const xPosPx = (processedBinIdx * binWidthPx) + (binWidthPx / 2);
        
        placed.push({ ...m, xPos: xPosPx, xValue, originalIdx: idx, layer: 0 });
      }
    });

    // 2. Sort by X position so we can process left-to-right
    placed.sort((a, b) => a.xPos - b.xPos);

    // 3. Assign layers greedily. 
    // If a marker is too close to anyone in ANY existing layer, find the first free layer.
    placed.forEach((current, i) => {
      let layer = 0;
      let foundLayer = false;

      while (!foundLayer) {
        let hasCollisionInLayer = false;
        for (let j = 0; j < i; j++) {
          const prev = placed[j];
          if (prev.layer === layer) {
            const distance = Math.abs(current.xPos - prev.xPos);
            if (distance < MIN_LABEL_GAP_PX) {
              hasCollisionInLayer = true;
              break;
            }
          }
        }
        
        if (!hasCollisionInLayer) {
          foundLayer = true;
        } else {
          layer++;
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
          // Remove number formatter as these are now "X.X-Y.Y" strings
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
        {/* Draw the labels with collision-aware layers and integrated centered reference lines */}
        {markersWithLayers.map((m) => (
          <MarkerLabel
            key={`label-${m.originalIdx}`}
            xValue={m.xValue}
            label={m.label}
            color={m.color}
            layer={m.layer}
            isHovered={hoveredMarkerIdx === m.originalIdx}
            onHover={() => setHoveredMarkerIdx(m.originalIdx)}
            onLeave={() => setHoveredMarkerIdx(null)}
          />
        ))}
      </BarChart>
    </Box>
  );
};

export default StatHistogramChart;

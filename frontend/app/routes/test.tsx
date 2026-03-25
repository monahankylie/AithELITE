import * as React from "react";
import PageLayout from "../components/page-layout";
import {useAuth} from "../auth-context";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { RadarChart, RadarSeries } from '@mui/x-charts/RadarChart';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { LineChart } from '@mui/x-charts/LineChart';
import POSITION_CONFIGS from '../lib/relevant-metrics'
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

function TrendLineChart(){
  return (
    <Box sx={{ width: '100%' }}>
      <Typography className = "text-black" textAlign="center">
        points of selected players over the last 10 games played
      </Typography>
      <LineChart
        series={[
          {curve:"linear", label: "bronny", data: [1, 5, 2, 6, 3, 9.3] },
          {curve:"linear",  label: "lebronny", data: [6, 3, 7, 9.5, 4, 2] },
        ]}
        yAxis={[{ label: 'Points' }]}
        height={300}
        sx={{
          '& text': { fontFamily: 'Inter !important', fontWeight: '600 !important' }
        }}
      />
    </Box>
  );
}

// 1. Move columns OUTSIDE the component
const COLUMNS: GridColDef[] = [
  { field: 'name', headerName: 'PLAYER', width: 180 },
  { field: 'pts', headerName: 'PTS', type: 'number', width: 80 },
  { field: 'reb', headerName: 'REB', type: 'number', width: 80 },
  { field: 'ast', headerName: 'AST', type: 'number', width: 80 },
  { field: 'stl', headerName: 'STL', type: 'number', width: 80 },
  { field: 'blk', headerName: 'BLK', type: 'number', width: 80 },
];

function DemoRadarVisualisation() {
  const metrics = POSITION_CONFIGS.PG;
  const [hideMark, setHideMark] = React.useState(false);
  const [fillArea, setFillArea] = React.useState(false);

  // 2. Memoize the series data
  const series = React.useMemo(() => [
    { label: 'Bronny', data: [5, 5, 6, 7, 5, 5], hideMark, fillArea },
    { label: 'Bart', data: [6, 7, 6, 7, 6, 7], hideMark, fillArea },
  ], [hideMark, fillArea]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* ... Stack and Controls ... */}
      <RadarChart
        height={300}
        radar={{ metrics }}
        series={series}
        // Removed heavy font overrides
      />
    </Box>
  );
}

function MultiPlayerDataGrid() {
  const rows = React.useMemo(() => [
    { id: 1, name: 'Bronny James', pts: 4.8, reb: 2.8, ast: 2.1, stl: 0.8, blk: 0.2 },
    { id: 2, name: 'LeBron James', pts: 25.7, reb: 7.3, ast: 8.3, stl: 1.3, blk: 0.5 },
  ], []);

  return (
    <Box sx={{ height: 300, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={COLUMNS}
        initialState={{
          columns: { columnVisibilityModel: { id: false } },
        }}
      />
    </Box>
  );
}

const TestPage = () => {
  return (
    <PageLayout requireAuth title="Test Page" description="Testing fonts and basketball stats.">
      <div className="mx-auto max-w-6xl px-6 pb-20 space-y-8">
        <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100">
          <DemoRadarVisualisation  />
        </div>
        <div className="p-8 rounded-3xl bg-green-50 border border-green-100">
          <TrendLineChart/>
        </div>
        <div className="p-8 rounded-3xl bg-purple-50 border border-purple-100">
          <MultiPlayerDataGrid />
        </div>
      </div>
    </PageLayout>
  );
};

export default TestPage;

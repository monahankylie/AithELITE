import * as React from "react";
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { GridPlayerData } from '../lib/graph-service';

const COLUMNS: GridColDef[] = [
  { field: 'name', headerName: 'PLAYER', width: 180 },
  { field: 'pts', headerName: 'PTS', type: 'number', width: 80, valueFormatter: (params: number) => params.toFixed(1) },
  { field: 'reb', headerName: 'REB', type: 'number', width: 80, valueFormatter: (params: number) => params.toFixed(1) },
  { field: 'ast', headerName: 'AST', type: 'number', width: 80, valueFormatter: (params: number) => params.toFixed(1) },
  { field: 'stl', headerName: 'STL', type: 'number', width: 80, valueFormatter: (params: number) => params.toFixed(1) },
  { field: 'blk', headerName: 'BLK', type: 'number', width: 80, valueFormatter: (params: number) => params.toFixed(1) },
];

interface PlayerDataGridProps {
  rows: GridPlayerData[];
  height?: number;
}

const PlayerDataGrid: React.FC<PlayerDataGridProps> = ({ 
  rows, 
  height = 300 
}) => {
  return (
    <Box sx={{ height: height, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={COLUMNS}
        initialState={{
          columns: { columnVisibilityModel: { id: false } },
        }}
      />
    </Box>
  );
};

export default PlayerDataGrid;

import * as React from "react";
import { useOutletContext, Link } from "react-router";
import { 
  Box, 
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import AppDropdown from "../components/app-dropdown";
import { ALL_BASKETBALL_METRICS } from "../lib/relevant-metrics";
import { athleteFormatter } from "../lib/athlete-formatter";

const YEAR_OPTIONS = [
  { value: '25-26', label: '2025-26' },
  { value: '24-25', label: '2024-25' },
  { value: '23-24', label: '2023-24' },
  { value: '22-23', label: '2022-23' },
];

const AVAILABLE_STATS = [
  { value: 'positions', label: 'POS' },
  ...ALL_BASKETBALL_METRICS.map(m => ({
    value: m.key,
    label: m.shortLabel || m.name
  }))
];

const DEFAULT_COLUMNS = [
  'positions',
  'points_per_game',
  'rebounds_per_game',
  'assists_per_game',
  'steals_per_game',
  'blocks_per_game',
  'fg_pct',
  'games_played'
];

interface AnalyzeContext {
  players: Athlete[];
  loading: boolean;
}

export default React.memo(function AnalyzeOverview() {
  const { players, loading } = useOutletContext<AnalyzeContext>();
  const [gridYears, setGridYears] = React.useState<string[]>(['25-26']);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(DEFAULT_COLUMNS);

  const handleGridYearChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selected = typeof value === 'string' ? value.split(',') : value;
    const sorted = [...selected].sort((a, b) => a.localeCompare(b));
    setGridYears(sorted);
  };

  const handleColumnsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedColumns(typeof value === 'string' ? value.split(',') : value);
  };

  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    const base: GridColDef[] = [
      { 
        field: 'name', 
        headerName: 'PLAYER', 
        width: 200,
        renderCell: (params: GridRenderCellParams) => (
          <Link 
            to={`/players/${params.row.id}`} 
            className="text-[#00599c] hover:underline transition-all"
          >
            {params.value}
          </Link>
        )
      }
    ];
    const stats = selectedColumns.map(colId => {
      const config = AVAILABLE_STATS.find(s => s.value === colId);
      return {
        field: colId,
        headerName: config?.label || colId,
        type: colId === 'positions' ? 'string' : 'number',
        width: 100,
        valueFormatter: (v: any) => {
          if (v === null || v === undefined) return '—';
          if (colId === 'positions') return v;
          if (typeof v !== 'number') return v;
          if (colId.includes('pct')) return `${Math.round(v)}%`;
          if (colId.includes('_per_game') || colId.includes('ratio')) return v.toFixed(1);
          return Math.round(v);
        }
      } as GridColDef;
    });
    return [...base, ...stats];
  }, [selectedColumns]);

  const gridRows = React.useMemo(() => {
    return players.map(p => {
      const stats = athleteFormatter.aggregateStats(p, gridYears);
      const primaryPos = (stats.positions?.[0] || "—");

      return {
        id: p.id,
        name: p.name,
        ...stats,
        positions: primaryPos,
      };
    });
  }, [players, gridYears]);

  if (loading) return null; // Parent handles loading

  return (
    <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>Production Summary</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Stats Overview</Typography>
          <Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>Comparing profile campaign averages</Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <AppDropdown
            label="Visible Stats"
            value={selectedColumns}
            onChange={handleColumnsChange}
            options={AVAILABLE_STATS}
            multiple
            checkbox
            minWidth={220}
          />

          <AppDropdown
            label="Aggregate Seasons"
            value={gridYears}
            onChange={handleGridYearChange}
            options={YEAR_OPTIONS}
            multiple
            checkbox
            minWidth={180}
          />
        </Box>
      </div>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={gridRows}
          columns={dynamicColumns}
          initialState={{
            pagination: { paginationModel: { pageSize: 5 } },
          }}
          pageSizeOptions={[5, 10]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
              color: '#64748b',
            },
            '& .MuiDataGrid-cell': {
              fontWeight: '700',
              color: '#0f172a',
            },
          }}
        />
      </Box>
    </section>
  );
});

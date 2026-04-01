import * as React from "react";
import { Link, useParams } from "react-router";
import type { SelectChangeEvent } from "@mui/material";
import { Box, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import PageLayout from "../components/page-layout";
import AppDropdown from "../components/app-dropdown";
import { athleteService } from "../lib/athlete-service";
import { athleteFormatter } from "../lib/athlete-formatter";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";

type DerivedProfile = {
  summary: string;
  strengths: string[];
  profileDetails: Array<{ label: string; value: string }>;
  spotlightStats: Array<{ label: string; value: string; accent: string }>;
  comparisonRows: Array<{ label: string; value: number | null; max: number }>;
};

const AVAILABLE_STATS = [
  { value: 'positions', label: 'POS' },
  { value: 'points_per_game', label: 'PPG' },
  { value: 'rebounds_per_game', label: 'RPG' },
  { value: 'assists_per_game', label: 'APG' },
  { value: 'steals_per_game', label: 'SPG' },
  { value: 'blocks_per_game', label: 'BPG' },
  { value: 'fg_pct', label: 'FG%' },
  { value: 'fg3_pct', label: '3P%' },
  { value: 'ft_pct', label: 'FT%' },
  { value: 'games_played', label: 'Games Played' },
  { value: 'minutes_per_game', label: 'MPG' },
  { value: 'points', label: 'PTS' },
  { value: 'rebounds', label: 'REB' },
  { value: 'assists', label: 'AST' },
  { value: 'steals', label: 'STL' },
  { value: 'blocks', label: 'BLK' },
  { value: 'turnovers', label: 'TO' },
  { value: 'fouls', label: 'PF' },
];

const DEFAULT_COLUMNS = [
  'positions',
  'points_per_game',
  'rebounds_per_game',
  'assists_per_game',
  'steals_per_game',
  'blocks_per_game',
  'fg_pct',
  'games_played',
];

export default function PlayerStatsPage() {
  const { id } = useParams();
  const [player, setPlayer] = React.useState<Athlete | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(DEFAULT_COLUMNS);
  const [gridYears, setGridYears] = React.useState<string[]>(['25-26']);

  React.useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const result = await athleteService.fetchAthleteById(id);
        setPlayer(result);
      } catch (err) {
        setError('Athlete record not found in clinical database.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const availableYears = React.useMemo(() => {
    if (!player) return [{ value: '25-26', label: '2025-26' }];

    const years = [...new Set(player.records.map((record) => record.year))]
      .sort((a, b) => b.localeCompare(a));

    return years.map((year) => ({
      value: year,
      label: `20${year.slice(0, 2)}-20${year.slice(3, 5)}`,
    }));
  }, [player]);

  React.useEffect(() => {
    if (!availableYears.length) return;
    setGridYears((current) => {
      const validSelections = current.filter((year) => availableYears.some((option) => option.value === year));
      return validSelections.length ? validSelections : [availableYears[0].value];
    });
  }, [availableYears]);

  const handleColumnsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedColumns(typeof value === 'string' ? value.split(',') : value);
  };

  const handleGridYearChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selected = typeof value === 'string' ? value.split(',') : value;
    const sorted = [...selected].sort((a, b) => a.localeCompare(b));
    setGridYears(sorted);
  };

  const derived = React.useMemo<DerivedProfile | null>(() => {
    if (!player) return null;
    const s = player.currentStats as BasketballStatRecord;
    const ppg = athleteService.getStatValue(player, 'points_per_game');
    const rpg = athleteService.getStatValue(player, 'rebounds_per_game');
    const apg = athleteService.getStatValue(player, 'assists_per_game');
    const spg = athleteService.getStatValue(player, 'steals_per_game');
    const bpg = athleteService.getStatValue(player, 'blocks_per_game');
    const stocks = (spg || 0) + (bpg || 0);

    return {
      summary: buildAutoSummary(player),
      strengths: buildStrengths(player),
      profileDetails: [
        { label: 'Sport', value: s?.sport || 'Basketball' },
        { label: 'Position', value: s?.positions?.join('/') || 'Unlisted' },
        { label: 'School', value: s?.school_name || 'Unlisted' },
        { label: 'Class', value: athleteFormatter.formatClassYear(player.classYear) },
        { label: 'Height', value: athleteFormatter.formatHeight(player.height) },
        { label: 'Weight', value: athleteFormatter.formatWeight(player.weight) },
      ],
      spotlightStats: [
        { label: 'PPG', value: athleteFormatter.formatStat(ppg), accent: 'bg-[#00599c]' },
        { label: 'RPG', value: athleteFormatter.formatStat(rpg), accent: 'bg-slate-900' },
        { label: 'APG', value: athleteFormatter.formatStat(apg), accent: 'bg-[#4cb4ff]' },
        { label: 'Stocks', value: athleteFormatter.formatStat(stocks), accent: 'bg-emerald-500' },
      ],
      comparisonRows: [
        { label: 'Scoring Pressure', value: ppg, max: 30 },
        { label: 'Glass Impact', value: rpg, max: 15 },
        { label: 'Playmaking', value: apg, max: 10 },
        { label: 'Defensive Events', value: stocks, max: 6 },
      ],
    };
  }, [player]);

  const gridColumns = React.useMemo<GridColDef[]>(() => {
    const base: GridColDef[] = [{ field: 'seasonLabel', headerName: 'SEASON', width: 140 }];

    const stats = selectedColumns.map((colId) => {
      const config = AVAILABLE_STATS.find((option) => option.value === colId);
      return {
        field: colId,
        headerName: config?.label || colId,
        type: colId === 'positions' ? 'string' : 'number',
        width: colId === 'games_played' ? 130 : 110,
        valueFormatter: (value: any) => {
          if (value === null || value === undefined) return '—';
          if (colId === 'positions') return value;
          if (typeof value !== 'number') return value;
          if (colId.includes('pct')) return `${Math.round(value)}%`;
          if (colId.includes('_per_game')) return value.toFixed(1);
          return Math.round(value);
        },
      } as GridColDef;
    });

    return [...base, ...stats];
  }, [selectedColumns]);

  const gridRows = React.useMemo(() => {
    if (!player) return [];

    const selectedRecords = player.records
      .filter((record) => gridYears.includes(record.year))
      .sort((a, b) => b.year.localeCompare(a.year)) as BasketballStatRecord[];

    return selectedRecords.map((record) => ({
      id: record.year,
      seasonLabel: `20${record.year.slice(0, 2)}-20${record.year.slice(3, 5)}`,
      positions: record.positions?.join('/') || '—',
      games_played: record.games_played || 0,
      points: record.points || 0,
      rebounds: record.rebounds || 0,
      assists: record.assists || 0,
      steals: record.steals || 0,
      blocks: record.blocks || 0,
      turnovers: record.turnovers || 0,
      fouls: record.fouls || 0,
      minutes_played: record.minutes_played || 0,
      points_per_game: record.points_per_game || 0,
      rebounds_per_game: record.rebounds_per_game || 0,
      assists_per_game: record.assists_per_game || 0,
      steals_per_game: record.steals_per_game || 0,
      blocks_per_game: record.blocks_per_game || 0,
      minutes_per_game: record.minutes_per_game || 0,
      fg_pct: record.fg_pct || 0,
      fg3_pct: record.fg3_pct || 0,
      ft_pct: record.ft_pct || 0,
    }));
  }, [gridYears, player]);

  if (loading) return <LoadingUI />;
  if (error || !player || !derived) return <ErrorUI message={error} />;

  return (
    <PageLayout requireAuth variant="hero">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Link to="/discover" className="transition hover:text-[#00599c]">
            Discover
          </Link>
          <span>/</span>
          <Link to={`/players/${id}`} className="transition hover:text-[#00599c]">
            Player Profile
          </Link>
          <span>/</span>
          <span className="text-slate-900">Stats Profile</span>
        </div>

        <div className="overflow-hidden rounded-[40px] border border-white/10 bg-white shadow-2xl">
          <section className="bg-slate-950 p-4 lg:p-12 text-white">
            <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] items-center">
              <div className="space-y-6">
                <h1 className="text-5xl font-black tracking-tighter sm:text-7xl">{player.name}</h1>
                <p className="max-w-2xl text-lg leading-relaxed text-white/60">{derived.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {derived.spotlightStats.map((s) => (
                  <div key={s.label} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div className={`mb-4 h-1 w-8 rounded-full ${s.accent}`} />
                    <div className="text-4xl font-black tracking-tight">{s.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-y border-slate-100 bg-slate-50/50 p-6 lg:px-5 lg:py-4">
            <div className="rounded-[40px] border border-slate-200 bg-white px-8 pt-8 pb-5 shadow-sm">
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#00599c' }}>
                    Production Summary
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Stats Overview
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>
                    Season-by-season production snapshot for this athlete.
                  </Typography>
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
                    options={availableYears}
                    multiple
                    checkbox
                    minWidth={190}
                  />
                </Box>
              </div>

              <Box sx={{ width: '100%' }}>
                <DataGrid
                  autoHeight
                  rowHeight={52}
                  columnHeaderHeight={56}
                  rows={gridRows}
                  columns={gridColumns}
                  hideFooter
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    minHeight: 'unset !important',
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
                    '& .MuiDataGrid-row:hover': {
                      backgroundColor: '#f8fafc',
                    },
                  }}
                />
              </Box>
            </div>
          </section>

          <div className="grid gap-8 p-4 lg:grid-cols-[1.6fr_1fr] lg:p-6">
            <div className="space-y-8">
              <Panel title="Scouting Strengths">
                <div className="grid gap-4">
                  {derived.strengths.map((strength) => (
                    <div key={strength} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/30 p-5">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00599c]" />
                      <p className="text-sm font-bold leading-relaxed text-slate-700">{strength}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Benchmark Comparison">
                <div className="space-y-8">
                  {derived.comparisonRows.map((row) => (
                    <ProductionBar key={row.label} {...row} />
                  ))}
                </div>
              </Panel>
            </div>

            <aside className="space-y-8">
              <Panel title="Physical Profile">
                <div className="space-y-5">
                  {derived.profileDetails.map((detail) => (
                    <div key={detail.label} className="flex justify-between border-b border-slate-50 pb-4 last:border-0">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">{detail.label}</span>
                      <span className="text-sm font-black text-slate-900">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Link to={`/players/${player.id}`} className="block rounded-2xl bg-[#00599c] p-5 text-center text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:bg-[#004a82]">
                Return to Full Profile
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function ProductionBar({ label, value, max }: { label: string; value: number | null; max: number }) {
  const percent = Math.min(100, Math.round(((value || 0) / max) * 100));
  return (
    <div className="group">
      <div className="mb-3 flex items-end justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className="text-xl font-black text-slate-900">{value?.toFixed(1) || '0.0'}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-slate-900 transition-all duration-500 group-hover:bg-[#00599c]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[32px] border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-[#00599c]">{title}</h3>
      {children}
    </div>
  );
}

function buildStrengths(player: Athlete): string[] {
  const ppg = athleteService.getStatValue(player, 'points_per_game');
  const apg = athleteService.getStatValue(player, 'assists_per_game');
  const strengths = [];
  if (ppg >= 20) strengths.push('Primary scoring threat with elite offensive volume.');
  if (apg >= 5) strengths.push('Proven floor general with high-level playmaking vision.');
  if (ppg < 10) strengths.push('Developing offensive game with room for role expansion.');
  return strengths.length ? strengths : ['Statistical profile indicates consistent varsity-level production.'];
}

function buildAutoSummary(player: Athlete): string {
  if (player.scouting_report) return player.scouting_report;
  const ppg = athleteService.getStatValue(player, 'points_per_game');
  return `${player.name} is a ${athleteFormatter.formatHeight(player.height)} prospect from ${(player.currentStats as BasketballStatRecord)?.school_name}. Currently producing ${athleteFormatter.formatStat(ppg)} PPG, providing a measurable baseline for professional evaluation.`;
}

function LoadingUI() {
  return <PageLayout requireAuth><div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#00599c]" /></div></PageLayout>;
}

function ErrorUI({ message }: { message: string | null }) {
  return <PageLayout requireAuth><div className="py-40 text-center"><h2 className="text-3xl font-black">{message || 'Profile Not Found'}</h2><Link to="/discover" className="mt-8 inline-block text-xs font-black uppercase tracking-widest text-[#00599c]">Return to Database</Link></div></PageLayout>;
}

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import PageLayout from "../components/page-layout";
import AthleteList from "../components/athlete-list";
import AppDropdown from "../components/app-dropdown";
import SelectionActions from "../components/selection-actions";

// Import values/logic
import { athleteService, hasActiveFilters, DISCOVER_SORT_OPTIONS } from "../lib/athlete-service";
import { usePlayerSelection } from "../lib/use-player-selection";

// Import types only
import type { Athlete, AthleteFilters, DiscoverSortKey } from "../lib/athlete-types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

import WatchlistPopup from "../components/watchlist-popup";

const POSITIONS = ["PG", "SG", "SF", "PF", "C", "G", "F", "MB", "OH", "S", "L"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028"];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingIds = searchParams.get("existing")?.split(",").filter(Boolean) || [];
  
  const [players, setPlayers] = useState<Athlete[]>([]);
  const { 
    selectedIds, 
    isSelectMode, 
    toggleSelectMode, 
    togglePlayer, 
    clearSelection,
    setSelectedIds 
  } = usePlayerSelection(existingIds);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showWatchlistPopup, setShowWatchlistPopup] = useState(false);

  const [filters, setFilters] = useState<AthleteFilters>({});
  const [searchInput, setSearchInput] = useState("");

  const filtersActive = useMemo(() => hasActiveFilters(filters), [filters]);

  const activeChips = useMemo(() => {
    const chips: {key: keyof AthleteFilters; label: string; display: string}[] = [];
    if (filters.search) chips.push({key: "search", label: "Search", display: `"${filters.search}"`});
    if (filters.position) chips.push({key: "position", label: "Position", display: filters.position});
    if (filters.gradYear) chips.push({key: "gradYear", label: "Class", display: filters.gradYear});
    if (filters.sortBy) {
      const opt = DISCOVER_SORT_OPTIONS.find((o) => o.value === filters.sortBy);
      chips.push({key: "sortBy", label: "Sorted by", display: opt?.label ?? filters.sortBy});
    }
    return chips;
  }, [filters]);

  const removeFilter = useCallback((key: keyof AthleteFilters) => {
    setFilters((prev) => {
      const next = {...prev};
      delete next[key];
      return next;
    });
    if (key === "search") setSearchInput("");
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchInput("");
  }, []);

  const fetchPage = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const result = filtersActive
          ? await athleteService.fetchFilteredAthletes(filters, 200, isLoadMore ? lastDoc : null)
          : await athleteService.fetchAthletes(20, isLoadMore ? lastDoc : null);
        
        setPlayers((prev) => (isLoadMore ? [...prev, ...result.players] : result.players));
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Discover load failed:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastDoc, filters, filtersActive],
  );

  const applySearch = useCallback(() => {
    const trimmed = searchInput.trim();
    setFilters((prev) => {
      const next = {...prev};
      if (trimmed) next.search = trimmed;
      else delete next.search;
      return next;
    });
  }, [searchInput]);

  const [filterVersion, setFilterVersion] = useState(0);
  useEffect(() => {
    setLastDoc(null);
    setPlayers([]);
    setFilterVersion((v) => v + 1);
  }, [filters]);

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVersion]);

  const currentSport = players.length > 0 ? (players[0].currentStats?.sport || "Basketball") : "Basketball";

  const dropdownSortOptions = useMemo(
    () =>
      DISCOVER_SORT_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        category: opt.category,
      })),
    [],
  );

  const dropdownPositionOptions = useMemo(() => 
    POSITIONS.map(p => ({ value: p, label: p })), 
  []);

  const dropdownGradYearOptions = useMemo(() => 
    GRAD_YEARS.map(y => ({ value: y, label: y })), 
  []);

  const handleWatchlistSuccess = () => {
    setShowWatchlistPopup(false);
    clearSelection();
  };

  const handleAnalyze = () => {
    if (selectedIds.size === 0) return;
    const idsString = Array.from(selectedIds).join(",");
    navigate(`/analyze?ids=${idsString}`);
  };

  return (
    <PageLayout
      requireAuth
      title={`Discover ${currentSport}`}
      subtitle="Prospects"
      description={
        isSelectMode
          ? `${selectedIds.size} Athletes Selected for Review`
          : `Browse the top performing ${currentSport.toLowerCase()} talent.`
      }
      variant="hero"
    >
      <div className="pb-20 px-4 sm:px-6 md:px-12 lg:px-24">
        {/* ── Sticky Actions & Filters ── */}
        <div className="sticky top-0 z-30 mb-6 bg-gray-50/95 pt-2 pb-4 backdrop-blur-sm space-y-4">
          
          {/* ── Search Bar ── */}
          <div className="">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or school..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#00599c] focus:outline-none"
                />
              </div>
              <button
                onClick={applySearch}
                className="rounded-2xl bg-[#00599c] px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#004a82] active:scale-95"
              >
                Search
              </button>
            </div>
          </div>

          {/* ── Filter Row: Position · Grad Year · Sort By · Selection ── */}
          <div className="flex flex-wrap items-end gap-3">
            <AppDropdown
              label="Position"
              value={filters.position || ""}
              onChange={(e) =>
                setFilters((f) => {
                  const next = {...f};
                  if (e.target.value) next.position = e.target.value;
                  else delete next.position;
                  return next;
                })
              }
              options={dropdownPositionOptions}
              placeholder="All Positions"
              minWidth={160}
            />

            <AppDropdown
              label="Class"
              value={filters.gradYear || ""}
              onChange={(e) =>
                setFilters((f) => {
                  const next = {...f};
                  if (e.target.value) next.gradYear = e.target.value;
                  else delete next.gradYear;
                  return next;
                })
              }
              options={dropdownGradYearOptions}
              placeholder="All Classes"
              minWidth={140}
            />

            <AppDropdown
              label="Sort by"
              value={filters.sortBy || ""}
              onChange={(e) =>
                setFilters((f) => {
                  const next = {...f};
                  if (e.target.value) next.sortBy = e.target.value as DiscoverSortKey;
                  else delete next.sortBy;
                  return next;
                })
              }
              options={dropdownSortOptions}
              placeholder="Select sort"
              minWidth={200}
            />

            {filtersActive && (
              <div className="flex flex-col">
                <div className="h-[18px]" /> {/* Spacer matching dropdown labels */}
                <button
                  onClick={clearAllFilters}
                  className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all active:scale-95"
                >
                  Clear All
                </button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {isSelectMode ? (
                <SelectionActions
                  selectedCount={selectedIds.size}
                  onAnalyze={handleAnalyze}
                  onSave={() => setShowWatchlistPopup(true)}
                  onCancel={toggleSelectMode}
                />
              ) : (
                <button
                  onClick={toggleSelectMode}
                  className="rounded-xl bg-white text-slate-900 border-slate-200 border-2 px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm hover:border-slate-900 hover:bg-slate-50 whitespace-nowrap"
                >
                  Select Players
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Active Filter Chips ── */}
        {activeChips.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#00599c]/10 px-3.5 py-1.5 text-xs font-bold text-[#00599c]"
              >
                {chip.label}: {chip.display}
                <button
                  onClick={() => removeFilter(chip.key)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[#00599c]/20 transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <AthleteList
          players={players}
          loading={loading}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          onToggle={togglePlayer}
          emptyMessage={filtersActive ? "No prospects match your filters." : "No prospects found."}
        />

        {hasMore && players.length > 0 && (
          <div className="mt-16 flex justify-center">
            <button
              onClick={() => fetchPage(true)}
              disabled={loadingMore}
              className="w-full rounded-2xl bg-white border-2 border-slate-200 py-5 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:border-[#00599c] hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingMore ? "Loading Prospect Pool..." : "Explore More Prospects"}
            </button>
          </div>
        )}
      </div>

      {showWatchlistPopup && (
        <WatchlistPopup
          playerIds={Array.from(selectedIds)}
          onClose={() => setShowWatchlistPopup(false)}
          onSuccess={handleWatchlistSuccess}
        />
      )}
    </PageLayout>
  );
}
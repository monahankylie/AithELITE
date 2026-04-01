import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router";
import PageLayout from "../components/page-layout";
import { useAuth } from "../auth-context";
import { watchlistService, type UserList } from "../lib/watchlist-service";
import { athleteService } from "../lib/athlete-service";
import type { Athlete } from "../lib/athlete-types";
import AthleteList from "../components/athlete-list";
import SelectionActions from "../components/selection-actions";
import { usePlayerSelection } from "../lib/use-player-selection";
import WatchlistPopup from "../components/watchlist-popup";
import { useNotification } from "../notification-context";

export default function WatchlistDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  
  const [list, setList] = useState<UserList | null>(null);
  const [players, setPlayers] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showWatchlistPopup, setShowWatchlistPopup] = useState(false);

  const mode = searchParams.get("mode"); // e.g., "select"
  const existing = searchParams.get("existing"); // current IDs
  const existingIds = React.useMemo(() => existing ? existing.split(",").filter(Boolean) : [], [existing]);

  const { 
    selectedIds, 
    isSelectMode, 
    toggleSelectMode, 
    togglePlayer, 
    clearSelection 
  } = usePlayerSelection(existingIds, mode === "select");

  const loadList = useCallback(async () => {
    if (!user || !id) return;
    try {
      setLoading(true);
      const listData = await watchlistService.fetchListById(user.uid, id);
      if (listData) {
        setList(listData);
        if (listData.playerIds.length > 0) {
          const fetchedPlayers = await athleteService.fetchAthletesByIds(listData.playerIds);
          setPlayers(fetchedPlayers);
        } else {
          setPlayers([]);
        }
      }
    } catch (err) {
      console.error("Failed to load watchlist:", err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleDelete = async () => {
    if (!user || !id || deleting) return;
    if (!window.confirm(`Are you sure you want to delete "${list?.name}"? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      await watchlistService.deleteList(user.uid, id);
      navigate("/watchlists");
    } catch (err) {
      console.error("Delete failed:", err);
      showNotification("Failed to delete list", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (!user || !id || selectedIds.size === 0) return;
    if (!window.confirm(`Remove ${selectedIds.size} player(s) from this list?`)) return;

    try {
      setLoading(true);
      await watchlistService.removePlayersFromList(user.uid, id, Array.from(selectedIds));
      showNotification(`${selectedIds.size} player(s) removed`, "success");
      clearSelection();
      await loadList();
    } catch (err) {
      console.error("Remove failed:", err);
      showNotification("Failed to remove players", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (selectedIds.size === 0) return;
    const idsString = Array.from(selectedIds).join(",");
    navigate(`/analyze?ids=${idsString}`);
  };

  const handleAddToAnalysis = () => {
    const newIds = list?.playerIds || [];
    const oldIds = existing ? existing.split(",") : [];
    // Combine and remove duplicates
    const combined = Array.from(new Set([...oldIds, ...newIds])).join(",");
    navigate(`/analyze?ids=${combined}`);
  };

  const handleWatchlistSuccess = () => {
    setShowWatchlistPopup(false);
    clearSelection();
    loadList();
  };

  if (loading && players.length === 0) {
    return (
      <PageLayout requireAuth title="Watchlist">
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#00599c] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!list) {
    return (
      <PageLayout requireAuth title="Watchlist Not Found">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-slate-500 mb-8">This watchlist doesn't exist or you don't have access to it.</p>
          <Link to="/watchlists" className="rounded-2xl bg-[#00599c] px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#004a82]">
            Back to All Watchlists
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      requireAuth 
      title={list.name} 
      subtitle={`${list.playerIds.length} Athletes`}
      variant="hero"
      actions={
        <div className="flex items-center gap-3">
          {isSelectMode ? (
            <SelectionActions
              selectedCount={selectedIds.size}
              onAnalyze={handleAnalyze}
              onSave={() => setShowWatchlistPopup(true)}
              onRemove={handleRemoveSelected}
              removeLabel="Remove"
              onCancel={toggleSelectMode}
            />
          ) : (
            <>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-2xl border-2 border-red-100 bg-red-50 px-6 py-3 text-xs font-black uppercase tracking-widest text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white active:scale-95 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete List"}
              </button>

              <button
                onClick={toggleSelectMode}
                className="rounded-2xl bg-white text-slate-900 border-slate-200 border-2 px-6 py-3 text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:border-slate-900 active:scale-95"
              >
                Select Players
              </button>

              {mode === "select" ? (
                <button
                  onClick={handleAddToAnalysis}
                  className="rounded-2xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-amber-600 transition-all active:scale-95"
                >
                  Add All to Analysis
                </button>
              ) : (
                <Link
                  to={`/analyze?ids=${list.playerIds.join(",")}`}
                  className="rounded-2xl bg-[#00599c] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-[#004a82] transition-all active:scale-95"
                >
                  Analyze Collection
                </Link>
              )}
            </>
          )}
        </div>
      }
    >
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 md:px-12 lg:px-24">
        {list.playerIds.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 mb-8 uppercase font-black tracking-widest">This collection is empty</p>
            <Link 
              to="/discover" 
              className="rounded-2xl bg-[#00599c] px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#004a82]"
            >
              Discover Athletes
            </Link>
          </div>
        ) : (
          <AthleteList 
            players={players} 
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            onToggle={togglePlayer}
            loading={loading}
          />
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

import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router";
import PageLayout from "../components/page-layout";
import { useAuth } from "../auth-context";
import { watchlistService, type UserList } from "../lib/watchlist-service";
import { athleteService } from "../lib/athlete-service";
import type { Athlete } from "../lib/athlete-types";
import AthleteList from "../components/athlete-list";

export default function WatchlistDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [list, setList] = useState<UserList | null>(null);
  const [players, setPlayers] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const mode = searchParams.get("mode"); // e.g., "select"
  const returnTo = searchParams.get("returnTo"); // e.g., "analyze"
  const existing = searchParams.get("existing"); // current IDs

  useEffect(() => {
    if (!user || !id) return;

    async function loadList() {
      try {
        setLoading(true);
        const listData = await watchlistService.fetchListById(user.uid, id);
        if (listData) {
          setList(listData);
          if (listData.playerIds.length > 0) {
            const fetchedPlayers = await athleteService.fetchAthletesByIds(listData.playerIds);
            setPlayers(fetchedPlayers);
          }
        }
      } catch (err) {
        console.error("Failed to load watchlist:", err);
      } finally {
        setLoading(false);
      }
    }

    loadList();
  }, [user, id]);

  const handleDelete = async () => {
    if (!user || !id || deleting) return;
    if (!window.confirm(`Are you sure you want to delete "${list?.name}"? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      await watchlistService.deleteList(user.uid, id);
      navigate("/watchlists");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete list.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddToAnalysis = () => {
    const newIds = list?.playerIds || [];
    const oldIds = existing ? existing.split(",") : [];
    // Combine and remove duplicates
    const combined = Array.from(new Set([...oldIds, ...newIds])).join(",");
    return `/analyze?ids=${combined}`;
  };

  if (loading) {
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
           <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-2xl border-2 border-red-100 bg-red-50 px-6 py-3 text-xs font-black uppercase tracking-widest text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white active:scale-95 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete List"}
          </button>

          {mode === "select" ? (
            <Link
              to={handleAddToAnalysis()}
              className="rounded-2xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-amber-600 transition-all active:scale-95"
            >
              Add All to Analysis
            </Link>
          ) : (
            <Link
              to={`/analyze?ids=${list.playerIds.join(",")}`}
              className="rounded-2xl bg-[#00599c] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-[#004a82] transition-all active:scale-95"
            >
              Analyze Collection
            </Link>
          )}
        </div>
      }
    >
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 md:px-12 lg:px-24">
        <AthleteList players={players} />
      </div>
    </PageLayout>
  );
}

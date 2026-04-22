/**
 * DASHBOARD PAGE
 * Clinical Refactor: Restores "Aithelite" aesthetic with new data pipeline.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import PageLayout from "../components/page-layout";
import AthleteList from "../components/athlete-list";
import PlayerCard from "../components/playercard";
import { useAuth } from "../auth-context";

import { athleteService } from "../lib/athlete-service";
import { watchlistService } from "../lib/watchlist-service";
import type { Athlete } from "../lib/athlete-types";

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const userName = profile?.firstName || "Recruiter";
  
  const [players, setPlayers] = useState<Athlete[]>([]);
  const [watchlistPlayers, setWatchlistPlayers] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  // 1. Fetch Top Prospects
  useEffect(() => {
    async function fetchInitial() {
      setLoading(true);
      try {
        // Updated to use standardized clinical method with sorting
        const result = await athleteService.fetchFilteredAthletes({
          sortBy: "composition_rating",
          sortDirection: "desc"
        }, 10);
        setPlayers(result.players);
      } catch (error) {
        console.error("Dashboard athlete load failed:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, []);

  // 2. Fetch Active Watchlist
  useEffect(() => {
    async function fetchWatchlist() {
      if (!user || !profile?.watchlistIndex) {
        setWatchlistPlayers([]);
        setLoadingWatchlist(false);
        return;
      }

      const listIds = Object.keys(profile.watchlistIndex);
      if (listIds.length === 0) {
        setWatchlistPlayers([]);
        setLoadingWatchlist(false);
        return;
      }

      const dashboardListEntry =
        Object.entries(profile.watchlistIndex).find(([, value]) => value.favorite) ||
        Object.entries(profile.watchlistIndex)[0];

      const firstListId = dashboardListEntry?.[0];
      if (!firstListId) {
        setWatchlistPlayers([]);
        setLoadingWatchlist(false);
        return;
      }

      try {
        const list = await watchlistService.fetchListById(user.uid, firstListId);
        if (list && list.playerIds.length > 0) {
          // Clinical batch fetch using Promise.all to ensure type safety
          const fetched = await Promise.all(
            list.playerIds.map(id => athleteService.fetchAthleteById(id))
          );
          
          // Sort watchlist players by composition rating descending
          const sorted = [...fetched].sort((a, b) => {
            const valA = a.compositionRating ?? 0;
            const valB = b.compositionRating ?? 0;
            return valB - valA;
          });
          
          setWatchlistPlayers(sorted);
        } else {
          setWatchlistPlayers([]);
        }
      } catch (error) {
        console.error("Failed to fetch watchlist for dashboard:", error);
        setWatchlistPlayers([]);
      } finally {
        setLoadingWatchlist(false);
      }
    }

    fetchWatchlist();
  }, [user, profile?.watchlistIndex]);

  const firstListName = (() => {
    if (!profile?.watchlistIndex || Object.keys(profile.watchlistIndex).length === 0) {
      return "Watchlist";
    }

    const dashboardListEntry =
      Object.entries(profile.watchlistIndex).find(([, value]) => value.favorite) ||
      Object.entries(profile.watchlistIndex)[0];

    return dashboardListEntry?.[1].name ?? "Watchlist";
  })();

  return (
    <PageLayout 
      requireAuth 
      title="Welcome back," 
      subtitle={userName} 
      description="Your recruiting activity and top prospects." 
      variant="hero"
    >
      <div className="pb-20">
        <div className="space-y-16">
          
          {/* Section: Horizontal Watchlist */}
          <section className="space-y-6">
            <div className="px-4 sm:px-6 md:px-12 lg:px-24">
              <div className="px-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                  <span className="text-[#00599c]">{firstListName}:</span>
                </h2>
              </div>
            </div>

            {loadingWatchlist ? (
              <div className="px-4 sm:px-6 md:px-12 lg:px-24">
                <div className="rounded-[40px] border border-black/5 bg-white/50 backdrop-blur-sm p-16 text-center shadow-sm">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-[#00599c] border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              </div>
            ) : watchlistPlayers.length > 0 ? (
              <div
                className="
                  flex w-full gap-6 overflow-x-auto pb-8 pt-6
                  px-4 sm:px-6 md:px-12 lg:px-24
                  snap-x snap-mandatory scroll-smooth scroll-px-4
                  scrollbar-hide
                "
              >
                {watchlistPlayers.map((p) => (
                  <Link 
                    key={p.id} 
                    to={`/players/${p.id}`} 
                    className="snap-start block transition-transform hover:-translate-y-2 duration-300"
                  >
                    {/* Fixed: Pass player object correctly */}
                    <PlayerCard player={p} variant="flat" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-4 sm:px-6 md:px-12 lg:px-24">
                <div className="rounded-[40px] border border-black/5 bg-white/50 backdrop-blur-sm p-16 text-center shadow-sm">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-300">
                    Your {firstListName.toLowerCase()} is currently empty.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Section: Vertical Top Prospects */}
          <section className="space-y-8">
            <div className="px-4 sm:px-6 md:px-12 lg:px-24 mb-6">
              <div className="px-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                  Top <span className="text-[#00599c]">Prospects</span>
                </h2>
              </div>
            </div>

            <div className="px-4 sm:px-6 md:px-12 lg:px-24">
              <AthleteList 
                players={players} 
                loading={loading} 
                loadingMessage="Scanning Prospect Pool" 
              />
            </div>
          </section>

        </div>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;

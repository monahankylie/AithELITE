/**
 * DASHBOARD PAGE
 * The main landing page for authenticated recruiters.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageLayout from '../components/page-layout';
import AthleteList from "../components/athlete-list";
import PlayerCard from "../components/playercard";
import { useAuth } from "../auth-context";
import { athleteService, type BasketballPlayer } from "../lib/athlete-service";
import { watchlistService } from "../lib/watchlist-service";

const DashboardPage = () => {
    const { user, profile } = useAuth();
    const userName = profile?.firstName || "Recruiter";
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [watchlistPlayers, setWatchlistPlayers] = useState<BasketballPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingWatchlist, setLoadingWatchlist] = useState(true);

    useEffect(() => {
        async function fetchInitial() {
            const cached = athleteService.getCache('dashboard');
            if (cached) {
                setPlayers(cached);
                setLoading(false);
            } else {
                try {
                    const { players: initialPlayers } = await athleteService.fetchBasketballPlayers(10);
                    setPlayers(initialPlayers);
                    athleteService.setCache('dashboard', initialPlayers);
                } catch (error) {
                    console.error("Dashboard athlete load failed:", error);
                } finally {
                    setLoading(false);
                }
            }
        }

        fetchInitial();
    }, []);

    useEffect(() => {
        async function fetchWatchlist() {
            if (!user || !profile?.watchlistIndex) {
                setLoadingWatchlist(false);
                return;
            }

            const listIds = Object.keys(profile.watchlistIndex);
            if (listIds.length === 0) {
                setLoadingWatchlist(false);
                return;
            }

            // Pick the first list for now
            const firstListId = listIds[0];
            
            try {
                const list = await watchlistService.fetchListById(user.uid, firstListId);
                if (list && list.playerIds.length > 0) {
                    // Fetch all players in the list, no longer slicing to 4
                    const players = await athleteService.fetchBasketballPlayersByIds(list.playerIds);
                    setWatchlistPlayers(players);
                }
            } catch (error) {
                console.error("Failed to fetch watchlist for dashboard:", error);
            } finally {
                setLoadingWatchlist(false);
            }
        }

        fetchWatchlist();
    }, [user, profile?.watchlistIndex]);

    const firstListName = profile?.watchlistIndex && Object.keys(profile.watchlistIndex).length > 0
        ? profile.watchlistIndex[Object.keys(profile.watchlistIndex)[0]].name
        : "Watchlist";

    return (
        <PageLayout 
            title="Welcome back," 
            subtitle={userName}
            description="Your recruiting activity and top prospects."
            variant="hero"
        >
            <div className="pb-20">
                <div className="space-y-16">
                    <section className="space-y-6">
                        <div className="px-4 sm:px-6 md:px-12 lg:px-24">
                            <div className="px-2">
                                <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                                    My <span className="text-[#00599c]">{firstListName}</span>
                                </h2>
                            </div>
                        </div>

                        {loadingWatchlist ? (
                            <div className="px-4 sm:px-6 md:px-12 lg:px-24">
                                <div className="rounded-[40px] border border-black/5 bg-white p-16 text-center shadow-sm">
                                    <div className="flex justify-center">
                                        <div className="w-8 h-8 border-4 border-[#00599c] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                            </div>
                        ) : watchlistPlayers.length > 0 ? (
                            <div 
                                className="
                                    flex w-full gap-6 overflow-x-auto pb-4 pt-6
                                    px-4 sm:px-6 md:px-12 lg:px-24
                                    snap-x snap-mandatory scroll-smooth scroll-px-4
                                    scrollbar-hide
                                "
                            >
                                {watchlistPlayers.map((p) => (
                                    <Link 
                                        key={p.id} 
                                        to={`/players/${p.id}`}
                                        className="snap-start block transition-transform hover:-translate-y-1"
                                    >
                                        <PlayerCard {...p} />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 sm:px-6 md:px-12 lg:px-24">
                                <div className="rounded-[40px] border border-black/5 bg-white p-16 text-center shadow-sm">
                                    <p className="text-sm font-black uppercase tracking-widest text-black/20">
                                        Your {firstListName.toLowerCase()} is currently empty.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

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
                                loadingMessage="Fetching Prospect Data"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </PageLayout>
    );
};

export default DashboardPage;

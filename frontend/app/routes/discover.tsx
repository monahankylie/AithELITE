/**
 * DISCOVER PAGE
 * A place for recruiters to find new athletes.
 */
import React, { useEffect, useState, useCallback } from 'react';
import PageLayout from '../components/page-layout';
import AthleteList from "../components/athlete-list";
import { athleteService, type BasketballPlayer } from "../lib/athlete-service";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

const DiscoverPage = () => {
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const togglePlayerSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const fetchPage = useCallback(async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const result = await athleteService.fetchBasketballPlayers(20, isLoadMore ? lastDoc : null);
            // Filter out athletes without stats for the Discover page to maintain quality
            const playersWithStats = result.players.filter(p => p.averages && p.averages.ppg != null);
            
            setPlayers(prev => isLoadMore ? [...prev, ...playersWithStats] : playersWithStats);
            setLastDoc(result.lastDoc);
            setHasMore(result.hasMore);
        } catch (error) {
            console.error("Discover load failed:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [lastDoc]);

    useEffect(() => {
        fetchPage();
    }, []);

    const currentSport = players.length > 0 ? players[0].sport : "Basketball";

    const headerActions = (
        <div className="flex items-center gap-4">
            {selectedIds.size > 0 && isSelectMode && (
                <button className="rounded-2xl bg-[#00599c] px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl hover:bg-[#004a82] transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                    Add to Watchlist ({selectedIds.size})
                </button>
            )}
            <button
                onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedIds(new Set());
                }}
                className={`rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-widest transition-all shadow-sm border-2 whitespace-nowrap ${
                    isSelectMode 
                        ? "bg-white text-[#00599c] border-[#00599c] shadow-md" 
                        : "bg-white text-slate-900 border-slate-200 hover:border-slate-900 hover:bg-slate-50"
                }`}
            >
                {isSelectMode ? "Cancel Selection" : "Select Players"}
            </button>
        </div>
    );

    return (
        <PageLayout 
            title={`Discover ${currentSport}`}
            subtitle="Prospects"
            description={isSelectMode 
                ? `${selectedIds.size} Athletes Selected for Watchlist` 
                : `Browse the top performing ${currentSport.toLowerCase()} talent.`
            }
            variant="hero"
            actions={headerActions}
        >
            <div className="pb-20 px-4 sm:px-6 md:px-12 lg:px-24">
                <AthleteList 
                    players={players}
                    loading={loading}
                    isSelectMode={isSelectMode}
                    selectedIds={selectedIds}
                    onToggle={togglePlayerSelection}
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
        </PageLayout>
    );
};

export default DiscoverPage;

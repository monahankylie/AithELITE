/**
 * WATCHLISTS PAGE
 * A place for recruiters to view their saved athletes.
 */
import React from 'react';
import PageLayout from '../components/page-layout';
import { useAuth } from "../auth-context";

const WatchlistsPage = () => {
    const { profile } = useAuth();
    const userName = profile?.firstName || "Recruiter";

    return (
        <PageLayout title="Your Watchlists" description="Track your top prospects here.">
            <div className="mx-auto max-w-6xl px-6 pb-20">
                <div className="rounded-3xl border border-black/5 bg-gray-50/50 p-12 text-center">
                    <p className="text-sm text-black/40">You haven't added any athletes to your watchlist yet.</p>
                </div>
            </div>
        </PageLayout>
    );
};

export default WatchlistsPage;

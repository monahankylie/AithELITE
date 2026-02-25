/**
 * WATCHLISTS PAGE
 * A placeholder page for recruiters to view their saved athletes.
 */
import React from 'react';
import Navbar from '../components/navbar';
import { useAuth } from "../auth-context";

const WatchlistsPage = () => {
    const { profile, loading } = useAuth();
    const userName = profile?.firstName || "Recruiter";

    if (loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <header className="px-8 py-8 text-left">
                <h1 className="text-3xl font-bold text-black">Your Watchlists</h1>
                <p className="mt-2 text-black/60">Track your top prospects here, {userName}.</p>
            </header>

            <main className="px-8">
                {/* Watchlist items will go here */}
            </main>

            <footer className="mt-16 pt-8 border-t border-black/10 text-center text-sm text-black/60">
                <p>&copy; {new Date().getFullYear()} Aithelite. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default WatchlistsPage;

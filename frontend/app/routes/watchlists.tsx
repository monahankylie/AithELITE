/**
 * WATCHLISTS PAGE
 * A place for recruiters to view their saved athletes.
 */
import React, {useEffect, useState} from "react";
import PageLayout from "../components/page-layout";
import {useAuth} from "../auth-context";
import {watchlistService, type UserList} from "../lib/watchlist-service";
import {Link} from "react-router";

const WatchlistsPage = () => {
  const {profile, loading} = useAuth();

  // Convert the index map to a sorted array for display
  const lists = Object.entries(profile?.watchlistIndex || {})
    .map(([id, data]) => ({
      id,
      ...data,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageLayout requireAuth title="Your Watchlists" description="Track your top prospects here.">
      <div className="mx-auto max-w-6xl px-6 pb-20">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-[#00599c] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : lists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <Link
                key={list.id}
                to={`/watchlists/${list.id}`}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 hover:border-[#00599c]/20"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 transition-colors group-hover:bg-[#00599c]/5">
                  <svg
                    className="h-6 w-6 text-slate-400 transition-colors group-hover:text-[#00599c]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{list.name}</h3>
                <p className="text-sm font-medium text-slate-400">
                  {list.count} {list.count === 1 ? "Athlete" : "Athletes"} Saved
                </p>
                <div className="mt-6 flex items-center text-xs font-black uppercase tracking-widest text-[#00599c] opacity-0 transition-opacity group-hover:opacity-100">
                  View Prospect List
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-black/5 bg-gray-50/50 p-12 text-center">
            <p className="text-sm text-black/40 mb-6">You haven't added any athletes to your watchlist yet.</p>
            <Link
              to="/discover"
              className="inline-flex items-center rounded-2xl bg-[#00599c] px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-[#004a82] transition-all"
            >
              Find Athletes
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default WatchlistsPage;

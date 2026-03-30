import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth-context";

interface AddPlayersPopupProps {
  currentIds: string[];
  onClose: () => void;
}

const AddPlayersPopup: React.FC<AddPlayersPopupProps> = ({ currentIds, onClose }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showWatchlists, setShowWatchlists] = useState(false);

  const lists = Object.entries(profile?.watchlistIndex || {}).map(([id, data]) => ({
    id,
    ...data
  })).sort((a, b) => a.name.localeCompare(b.name));

  const handleDiscover = () => {
    // Navigate to discover, passing current IDs to keep selection
    const queryParams = new URLSearchParams({
      existing: currentIds.join(",")
    });
    navigate(`/discover?${queryParams.toString()}`);
    onClose();
  };

  const handleAddFromList = (playerCount: number, listId: string) => {
    // Navigate to the list detail page in select mode, passing current IDs 
    // so we can append to them when returning to analysis.
    const queryParams = new URLSearchParams({
      mode: "select",
      returnTo: "analyze",
      existing: currentIds.join(",")
    });
    navigate(`/watchlists/${listId}?${queryParams.toString()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900">
              {showWatchlists ? "Select Watchlist" : "Add More Athletes"}
            </h3>
            <button 
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!showWatchlists ? (
            <div className="space-y-3">
              <button
                onClick={handleDiscover}
                className="w-full flex items-center gap-4 rounded-2xl bg-slate-50 px-6 py-5 text-left transition-all hover:bg-[#00599c]/5 hover:translate-x-1 group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-[#00599c]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Discover</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Search the full database</p>
                </div>
              </button>

              <button
                onClick={() => setShowWatchlists(true)}
                className="w-full flex items-center gap-4 rounded-2xl bg-slate-50 px-6 py-5 text-left transition-all hover:bg-[#00599c]/5 hover:translate-x-1 group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-amber-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Watchlists</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">From your saved collections</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {lists.length > 0 ? (
                lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleAddFromList(list.count, list.id)}
                    className="w-full flex items-center justify-between rounded-2xl bg-slate-50 px-6 py-4 text-left transition-all hover:bg-[#00599c]/5 hover:translate-x-1 group"
                  >
                    <span className="font-bold text-slate-800">{list.name}</span>
                    <span className="text-xs text-slate-400 font-medium group-hover:text-[#00599c]">
                      {list.count} athletes
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">No watchlists found.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {showWatchlists && (
          <div className="p-4 bg-slate-50/50">
            <button
              onClick={() => setShowWatchlists(false)}
              className="w-full rounded-2xl border-2 border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-white transition-all"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPlayersPopup;

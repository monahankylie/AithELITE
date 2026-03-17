import React, { useEffect, useState } from "react";
import { watchlistService, type UserList } from "../lib/watchlist-service";
import { useAuth } from "../auth-context";
import { useNotification } from "../notification-context";

interface WatchlistPopupProps {
  playerIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const WatchlistPopup: React.FC<WatchlistPopupProps> = ({ playerIds, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [processing, setProcessing] = useState(false);

  // Convert the index map to a sorted array for display
  const lists = Object.entries(profile?.watchlistIndex || {}).map(([id, data]) => ({
    id,
    ...data
  })).sort((a, b) => a.name.localeCompare(b.name));

  const handleAddToList = async (listId: string) => {
    if (!user || processing) return;
    setProcessing(true);
    // Find the name for the notification
    const listName = lists.find(l => l.id === listId)?.name || "WATCHLIST";
    const count = playerIds.length;
    try {
      await watchlistService.addPlayersToList(user.uid, listId, playerIds);
      showNotification(`${count} PLAYER${count !== 1 ? 'S' : ''} ADDED TO ${listName.toUpperCase()}`, "success");
      onSuccess();
    } catch (error) {
      console.error("Failed to add players to list:", error);
      showNotification("FAILED TO ADD", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!user || !newListName.trim() || processing) return;
    setProcessing(true);
    const targetName = newListName.trim();
    const count = playerIds.length;
    try {
      await watchlistService.createList(user.uid, targetName, playerIds);
      showNotification(`${count} PLAYER${count !== 1 ? 'S' : ''} ADDED TO ${targetName.toUpperCase()}`, "success");
      onSuccess();
    } catch (error) {
      console.error("Failed to create list:", error);
      showNotification("FAILED TO CREATE LIST", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900">
              {isCreating ? "New List" : "Which list are we adding to?"}
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

          {isCreating ? (
            <div className="space-y-4 py-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name..."
                autoFocus
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-medium text-slate-900 focus:border-[#00599c] focus:outline-none transition-all"
              />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {lists.length > 0 ? (
                lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id)}
                    disabled={processing}
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
                  <p className="text-sm text-slate-400">No lists found. Create your first one below!</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50/50">
          {isCreating ? (
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 rounded-2xl border-2 border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-white transition-all"
              >
                Back
              </button>
              <button
                onClick={handleCreateAndAdd}
                disabled={!newListName.trim() || processing}
                className="flex-[2] rounded-2xl bg-[#00599c] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-[#004a82] disabled:opacity-50 transition-all active:scale-95"
              >
                {processing ? "Creating..." : "Create & Add"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full rounded-2xl bg-[#00599c] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-[#004a82] transition-all active:scale-95"
            >
              Create List
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPopup;

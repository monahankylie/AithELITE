import React from "react";
import { useNavigate } from "react-router";
import type { Athlete } from "../lib/athlete-types";

interface RemovePlayersPopupProps {
  players: Athlete[];
  onClose: () => void;
}

const RemovePlayersPopup: React.FC<RemovePlayersPopupProps> = ({ players, onClose }) => {
  const navigate = useNavigate();

  const handleRemove = (idToRemove: string) => {
    const updatedIds = players
      .filter(p => p.id !== idToRemove)
      .map(p => p.id)
      .join(",");
    
    // Use replace: true to keep history clean if many are removed
    navigate(`/analyze?ids=${updatedIds}`, { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900">Remove Athletes</h3>
            <button 
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {players.length > 0 ? (
              players.map((player) => (
                <div
                  key={player.id}
                  className="w-full flex items-center justify-between rounded-2xl bg-slate-50 px-6 py-4 transition-all hover:bg-slate-100/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{player.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {player.currentStats?.sport || "Basketball"} • {player.classYear}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(player.id)}
                    className="ml-4 p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
                    title="Remove from analysis"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-400">No athletes in analysis.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50/50">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-black transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemovePlayersPopup;

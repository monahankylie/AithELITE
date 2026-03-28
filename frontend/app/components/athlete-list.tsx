import React from "react";
import { Link } from "react-router";
import PlayerCard from "./playercard"; 
import type { Athlete } from "../lib/athlete-types"; // Keep Athlete type

interface AthleteListProps {
  players: Athlete[]; // Keep Athlete type
  loading?: boolean;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  emptyMessage?: string;
  loadingMessage?: string;
}

/**
 * ATHLETE LIST COMPONENT
 */
const AthleteList = ({
  players,
  loading = false,
  isSelectMode = false,
  selectedIds = new Set(),
  onToggle,
  emptyMessage = "No prospects found.",
  loadingMessage = "Scanning Database...",
}: AthleteListProps) => {
  
  // Restored Old Loading Spinner Style (Aesthetic change)
  if (loading && players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-40">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">
          {loadingMessage}
        </p>
      </div>
    );
  }

  // Restored Old Empty State Style (Aesthetic change)
  if (players.length === 0) {
    return (
      <div className="px-8 py-40 text-center">
        <p className="text-lg font-black uppercase tracking-widest text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Removed the "Table Header" to restore the clean look */}
      <div className="space-y-1 mx-auto max-w-[95vw] w-full"> 
        {players.map((player) => {
          const card = (
            <PlayerCard
              key={player.id}
              player={player} // Keep player={player} for consistency with current PlayerCard
              variant="flat" // Explicitly set to flat variant
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(player.id)}
              onToggle={onToggle}
            />
          );

          // Restored Selection Mode logic (Structural change, QOL feature)
          if (isSelectMode) {
            return card;
          }

          // Restored Link Wrapper with original transitions and hover effects (Aesthetic/Structural change)
          return (
            <Link
              key={player.id}
              to={`/players/${player.id}`}
              className="block cursor-pointer rounded-[28px] transition duration-200 hover:-translate-y-0.5 focus:outline-none"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AthleteList;
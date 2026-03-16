import React from "react";
import { Link } from "react-router";
import BasketballDashboardCard from "./dashboard-card";
import { type BasketballPlayer } from "../lib/athlete-service";

interface AthleteListProps {
  players: BasketballPlayer[];
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
      <div className="space-y-1">
        {players.map((player) => {
          const card = (
            <BasketballDashboardCard
              key={player.id}
              {...player}
              selectable={isSelectMode}
              checked={selectedIds.has(player.id)}
              onToggle={onToggle}
            />
          );

          if (isSelectMode) {
            return card;
          }

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
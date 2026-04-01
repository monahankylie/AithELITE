import { Link } from "react-router";
import { athleteFormatter } from "../lib/athlete-formatter";
import { athleteService } from "../lib/athlete-service";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";
import { POSITION_METRICS, DEFAULT_METRICS } from "../lib/relevant-metrics";

interface PlayerCardProps {
  player: Athlete;
  variant?: "default" | "flat"; // Add variant prop
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
}

export default function PlayerCard({ 
  player, 
  variant = "default", // Use variant prop
  isSelectMode, 
  isSelected, 
  onToggle 
}: PlayerCardProps) {
  const stats = player.currentStats as BasketballStatRecord;
  const primaryPos = (stats?.positions?.[0] || "PG").toUpperCase();
  const metrics = POSITION_METRICS[primaryPos] || DEFAULT_METRICS;

  const compositionRatingText =
    player.compositionRating != null && !Number.isNaN(player.compositionRating)
      ? athleteFormatter.formatAvg(player.compositionRating)
      : null;

  // Logic for the large "Featured Stats" line in default variant - keep existing logic
  const statsText = metrics.slice(0, 3).map(m => {
    const val = athleteService.getStatValue(player, m.key);
    return `${athleteFormatter.formatStat(val)} ${m.name}`;
  }).join(" • ");

  const sharedClasses = `
    relative transition-all duration-300 backdrop-blur-sm ring-1 ring-white/60
    ${isSelected ? 'border-[#00599c] ring-2 ring-[#00599c]/20' : 'border-slate-200/80'}
  `;

  // --- FLAT VARIANT (AESTHETICS REDEFINED FOR COMPACT ROW, SLIGHTLY TALLER/WIDER) ---
  if (variant === "flat") {
    return (
      <article className={`w-full min-h-[90px] shrink-0 rounded-[28px] bg-white/95 p-3 pr-6 shadow-sm flex items-center gap-4 transition-all duration-300 border ${sharedClasses} hover:shadow-md`}>
        {isSelectMode && (
          <button onClick={(e) => { e.preventDefault(); onToggle?.(player.id); }} className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full border-2 transition-all ${isSelected ? "bg-[#00599c] border-[#00599c]" : "bg-white border-slate-200"}`}>
            {isSelected && <div className="m-auto h-2 w-2 rounded-full bg-white" />}
          </button>
        )}

        {/* Compact Avatar */}
        <div className="relative shrink-0 ml-1">
          {player.image_link ? (
            <img src={player.image_link} alt={player.name} className="h-14 w-14 rounded-full object-cover ring-1 ring-slate-100" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-400">
              {player.name.charAt(0)}
            </div>
          )}
        </div>

        {compositionRatingText && (
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-[#00599c]/15 bg-[#00599c]/[0.06] px-2 py-1 min-w-[3.25rem]">
            <span className="text-[8px] font-black uppercase tracking-wider text-[#00599c]/70">Comp</span>
            <span className="text-sm font-black tabular-nums leading-tight text-[#00599c]">{compositionRatingText}</span>
          </div>
        )}

        {/* Compact Info Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="truncate text-xl font-black text-slate-900 leading-tight uppercase mb-0.5">{player.name}</h3>
          <div className="flex items-center gap-2 overflow-hidden">
            <p className="text-[10px] font-bold text-[#00599c]/70 uppercase tracking-tight whitespace-nowrap">
              {player.currentStats?.sport || "Basketball"} • {primaryPos}
            </p>
            {stats?.school_name && (
              <>
                <span className="text-[#00599c]/30 text-[10px]">•</span>
                <p className="truncate text-[10px] font-medium text-[#00599c]/60 uppercase">
                  {stats.school_name} {stats.state ? `(${stats.state})` : ""}
                </p>
              </>
            )}
            <span className="text-[#00599c]/30 text-[10px]">•</span>
            <p className="text-[10px] font-bold text-[#00599c]/40 uppercase tracking-tight whitespace-nowrap">
              {player.classYear}
            </p>
          </div>
        </div>

        {/* Dynamic Stats Row - adapted for compact display */}
        <div className="hidden md:flex items-center gap-6 text-slate-400 px-6 py-2.5 rounded-2xl bg-[#00599c]/[0.02] border border-[#00599c]/10">
          {!stats ? ( // If no stats, show "Stats Pending"
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              Stats Pending
            </span>
          ) : (
            <div className="flex items-center gap-6">
              {metrics.slice(0, 3).map((m, idx) => {
                const val = athleteService.getStatValue(player, m.key);
                return (
                  <div key={m.name} className="flex items-center gap-6">
                    {idx > 0 && <div className="h-8 w-px bg-[#00599c]/10" />}
                    <div className="flex flex-col items-center min-w-[40px]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#00599c]/40 mb-0.5">
                        {m.name}
                      </span>
                      <span className="text-sm font-black text-slate-900 tabular-nums">
                        {athleteFormatter.formatStat(val)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </article>
    );
  }

  // --- DEFAULT VARIANT (AESTHETICS FROM USER'S PROVIDED CODE) ---
  return (
    <article className={`group w-[320px] shrink-0 rounded-[28px] bg-white/95 p-6 shadow-[0_14px_32px_rgba(8,28,51,0.08)] flex flex-col hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(8,28,51,0.14)] border ${sharedClasses}`}>
       {isSelectMode && (
          <button onClick={(e) => { e.preventDefault(); onToggle?.(player.id); }} className={`absolute right-6 top-6 z-10 h-6 w-6 rounded-full border-2 transition-all ${isSelected ? "bg-[#00599c] border-[#00599c]" : "bg-white border-slate-200"}`}>
            {isSelected && <div className="m-auto h-2 w-2 rounded-full bg-white" />}
          </button>
        )}

      <div className="flex items-start gap-4">
        {player.image_link ? (
          <img src={player.image_link} alt={player.name} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-400">
            {player.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-[2rem] font-black leading-none tracking-tight text-slate-900">{player.name}</h3>
            {compositionRatingText && (
              <div className="flex shrink-0 flex-col items-end rounded-2xl border border-[#00599c]/15 bg-[#00599c]/[0.06] px-3 py-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#00599c]/70">Composition</span>
                <span className="text-xl font-black tabular-nums leading-none text-[#00599c]">{compositionRatingText}</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {player.currentStats?.sport || "Basketball"} {primaryPos ? `/ ${primaryPos}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-500 truncate">
            {stats?.school_name} {stats?.state ? `(${stats.state})` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 h-px w-full bg-gradient-to-r from-sky-100 via-slate-200 to-transparent" />

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b5fa5]">Featured Stats</p>
        <div className="mt-3 min-h-[72px]">
          {statsText ? ( // Use existing statsText logic
            <p className="text-[2rem] font-black leading-tight tracking-tight text-slate-900">
              {statsText}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-400">Stats pending</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">
          Class of {athleteFormatter.formatClassYear(player.classYear)}
        </span>
        <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-500">Recruit Profile</span>
      </div>
    </article>
  );
}
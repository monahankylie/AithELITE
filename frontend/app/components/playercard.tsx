import type { BasketballPlayer } from "../lib/athlete-service";
import { athleteFormatter } from "../lib/athlete-formatter";

function buildStatsLine(averages?: BasketballPlayer["averages"]): string {
  if (!averages) return "";
  const parts: string[] = [];
  if (averages.ppg != null) parts.push(`${athleteFormatter.formatStat(averages.ppg)} PPG`);
  if (averages.apg != null) parts.push(`${athleteFormatter.formatStat(averages.apg)} AST`);
  if (averages.rpg != null) parts.push(`${athleteFormatter.formatStat(averages.rpg)} REB`);
  if (averages.spg != null) parts.push(`${athleteFormatter.formatStat(averages.spg)} STL`);
  if (averages.bpg != null) parts.push(`${athleteFormatter.formatStat(averages.bpg)} BLK`);
  return parts.slice(0, 3).join(" \u2022 ");
}

export type PlayerCardProps = BasketballPlayer & {
  variant?: "default" | "flat";
};

export default function PlayerCard({ 
  name, 
  sport, 
  position, 
  school, 
  gradYear, 
  avatarUrl, 
  averages,
  variant = "default"
}: PlayerCardProps) {
  const statsText = buildStatsLine(averages);

  if (variant === "flat") {
    return (
      <article
        className="
          w-[440px] h-[160px] shrink-0
          rounded-[32px] bg-white p-6 shadow-lg ring-1 ring-black/5
          flex items-center gap-6 transition-all hover:shadow-xl
        "
      >
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${name} avatar`} className="h-24 w-24 rounded-2xl object-cover shadow-sm" loading="lazy" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-50 text-2xl font-black text-slate-200">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 h-24 flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-0.5">
               <h3 className="truncate text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{name}</h3>
               <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                 {athleteFormatter.formatShortGradYear(gradYear)}
               </span>
            </div>
            
            <p className="truncate text-[11px] font-bold text-[#00599c] uppercase tracking-wide leading-none">
              {sport} • {position} • {school}
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400 h-8">
            {averages?.ppg == null && averages?.rpg == null && averages?.apg == null ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Stats Pending</span>
            ) : (
              <>
                {averages?.ppg != null && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">PPG</span>
                    <span className="text-sm font-black text-slate-900">{athleteFormatter.formatStat(averages.ppg)}</span>
                  </div>
                )}
                {averages?.rpg != null && (
                  <div className="flex flex-col border-l border-slate-100 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">RPG</span>
                    <span className="text-sm font-black text-slate-900">{athleteFormatter.formatStat(averages.rpg)}</span>
                  </div>
                )}
                {averages?.apg != null && (
                  <div className="flex flex-col border-l border-slate-100 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">APG</span>
                    <span className="text-sm font-black text-slate-900">{athleteFormatter.formatStat(averages.apg)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="
        w-[320px] h-[420px] shrink-0
        rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/10
        flex flex-col
      "
    >
      <div className="flex items-start gap-6">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${name} avatar`} className="h-20 w-20 shrink-0 rounded-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black/10 text-2xl font-bold text-black/30">
            {name.charAt(0)}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-2xl font-extrabold text-black">{name}</h3>
          <p className="mt-1 text-sm font-medium text-black/70">
            {sport}
            {position ? ` / ${position}` : ""}
          </p>
          <p className="mt-2 text-sm text-black/60">{school}</p>
        </div>
      </div>
      <div className="mt-10 flex-1 overflow-hidden text-2xl font-extrabold tracking-tight text-black">
        <div className="line-clamp-3">{statsText}</div>
      </div>
      <div className="mt-10 flex justify-center">
        <span className="rounded-full bg-black/75 px-6 py-2 text-xs font-semibold text-white">Class of {athleteFormatter.formatGradYear(gradYear)}</span>
      </div>
    </article>
  );
}

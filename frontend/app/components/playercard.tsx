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
  return parts.slice(0, 3).join(" • ");
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
  variant = "default",
}: PlayerCardProps) {
  const statsText = buildStatsLine(averages);

  if (variant === "flat") {
    return (
      <article
        className="
          w-[440px] h-[160px] shrink-0
          rounded-[32px]
          border border-slate-200/80
          bg-white/95 p-6
          shadow-[0_12px_30px_rgba(8,28,51,0.08)]
          ring-1 ring-white/60
          backdrop-blur-sm
          flex items-center gap-6
          transition-all duration-300
          hover:-translate-y-0.5
          hover:shadow-[0_18px_40px_rgba(8,28,51,0.12)]
        "
      >
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${name} avatar`}
              className="h-24 w-24 rounded-2xl object-cover shadow-sm ring-2 ring-slate-100"
              loading="lazy"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-black text-slate-400">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 h-24 flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="truncate text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                {name}
              </h3>
              <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase text-sky-700">
                {athleteFormatter.formatShortGradYear(gradYear)}
              </span>
            </div>

            <p className="truncate text-[11px] font-bold uppercase tracking-wide leading-none text-[#0b5fa5]">
              {sport} • {position} • {school}
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400 h-8">
            {averages?.ppg == null && averages?.rpg == null && averages?.apg == null ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                Stats Pending
              </span>
            ) : (
              <>
                {averages?.ppg != null && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                      PPG
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {athleteFormatter.formatStat(averages.ppg)}
                    </span>
                  </div>
                )}
                {averages?.rpg != null && (
                  <div className="flex flex-col border-l border-slate-200 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                      RPG
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {athleteFormatter.formatStat(averages.rpg)}
                    </span>
                  </div>
                )}
                {averages?.apg != null && (
                  <div className="flex flex-col border-l border-slate-200 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                      APG
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {athleteFormatter.formatStat(averages.apg)}
                    </span>
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
        group
        w-[320px] shrink-0
        rounded-[28px]
        border border-slate-200/80
        bg-white/95 p-6
        shadow-[0_14px_32px_rgba(8,28,51,0.08)]
        ring-1 ring-white/60
        backdrop-blur-sm
        flex flex-col
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-[0_20px_42px_rgba(8,28,51,0.14)]
      "
    >
      <div className="flex items-start gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name} avatar`}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-400">
            {name.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[2rem] font-black leading-none tracking-tight text-slate-900">
            {name}
          </h3>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {sport}
            {position ? ` / ${position}` : ""}
          </p>

          <p className="mt-1 text-sm text-slate-500">{school}</p>
        </div>
      </div>

      <div className="mt-5 h-px w-full bg-gradient-to-r from-sky-100 via-slate-200 to-transparent" />

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b5fa5]">
          Featured Stats
        </p>

        <div className="mt-3 min-h-[72px]">
          {statsText ? (
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
          Class of {athleteFormatter.formatGradYear(gradYear)}
        </span>

        <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-500">
          Recruit Profile
        </span>
      </div>
    </article>
  );
}
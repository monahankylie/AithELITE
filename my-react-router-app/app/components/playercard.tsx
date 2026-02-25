export type PlayerCardProps = {
  name: string;
  sport: string;
  position: string;
  school: string;
  gradYear: number | string;
  avatarUrl?: string;
  averages?: {ppg?: number; rpg?: number; apg?: number; spg?: number; bpg?: number};
};

function buildStatsLine(averages?: PlayerCardProps["averages"]): string {
  if (!averages) return "";
  const parts: string[] = [];
  if (averages.ppg != null) parts.push(`${averages.ppg} PPG`);
  if (averages.apg != null) parts.push(`${averages.apg} AST`);
  if (averages.rpg != null) parts.push(`${averages.rpg} REB`);
  if (averages.spg != null) parts.push(`${averages.spg} STL`);
  if (averages.bpg != null) parts.push(`${averages.bpg} BLK`);
  return parts.slice(0, 3).join(" \u2022 ");
}

export default function PlayerCard({name, sport, position, school, gradYear, avatarUrl, averages}: PlayerCardProps) {
  const statsText = buildStatsLine(averages);

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
      </div>{" "}
      <div className="mt-10 flex justify-center">
        <span className="rounded-full bg-black/75 px-6 py-2 text-xs font-semibold text-white">Class of {gradYear}</span>
      </div>
    </article>
  );
}

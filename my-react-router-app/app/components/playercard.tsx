type PlayerCardProps = {
  name: string;
  sportPosition: string;
  school: string;
  classYear: string;
  statsText?: string;
  avatarUrl?: string; // will put placeholder images
};

export default function PlayerCard({
  name,
  sportPosition,
  school,
  classYear,
  statsText = "STATS STATS STATS",
  avatarUrl,
}: PlayerCardProps) {
  return (
    <article className="min-w-[320px] shrink-0 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/10 sm:min-w-0">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name} avatar`}
            className="h-20 w-20 shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-full bg-black/15" />
        )}

        <div className="min-w-0">
          <h3 className="truncate text-2xl font-extrabold text-black">
            {name}
          </h3>
          <p className="mt-1 text-sm font-medium text-black/70">
            {sportPosition}
          </p>
          <p className="mt-2 text-sm text-black/60">{school}</p>
        </div>
      </div>

      {/* Big stats text */}
      <div className="mt-10 text-2xl font-extrabold tracking-tight text-black">
        {statsText}
      </div>

      {/* Class pill */}
      <div className="mt-10 flex justify-center">
        <span className="rounded-full bg-black/75 px-6 py-2 text-xs font-semibold text-white">
          {classYear}
        </span>
      </div>
    </article>
  );
}

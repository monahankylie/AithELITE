import {useEffect, useState} from "react";
import type {Route} from "./+types/home";
import {Link} from "react-router";
import {collection, getDocs, doc, getDoc, query, limit} from "firebase/firestore";
import {db} from "../../firebase-config";
import PlayerCard from "~/components/playercard";
import type {PlayerCardProps} from "~/components/playercard";
import PageLayout from "../components/page-layout";

export function meta({}: Route.MetaArgs) {
  return [{title: "Athelite | Smart Recruiting"}, {name: "description", content: "Smart recruiting for smarter teams."}];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FeaturedCarousel() {
  const [players, setPlayers] = useState<(PlayerCardProps & {id: string})[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    async function fetchPlayers() {
      try {
        const snap = await getDocs(query(collection(db, "athletes"), limit(30)));
        const allDocs = snap.docs;
        const picked = shuffle(allDocs).slice(0, 30);

        const cards = await Promise.all(
          picked.map(async (d) => {
            const data = d.data();
            let position = "";
            let averages: PlayerCardProps["averages"] = undefined;

            try {
              const recordSnap = await getDoc(doc(db, "athletes", d.id, "sports_records", "bball_record"));
              if (recordSnap.exists()) {
                const rec = recordSnap.data();
                position = rec.position ?? "";
                if (rec.averages) averages = rec.averages;
              }
            } catch {
              // subcollection may not exist
            }

            return {
              id: d.id,
              name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
              sport: data.sport ?? "",
              position,
              school: data.school ?? "",
              gradYear: data.gradYear ?? "",
              avatarUrl: data.imageUrl || undefined,
              averages,
            };
          }),
        );
        const withStats = cards.filter((p) => p.averages?.ppg != null && p.averages?.apg != null && p.averages?.rpg != null);
        setPlayers(withStats.slice(0, 10));
      } catch (err) {
        console.error("Failed to load athletes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, []);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">Featured Athletes</h2>
            <p className="mt-2 text-sm text-black/70">A quick glance at rising talent in your pipeline.</p>
          </div>
        </div>
      </div>

      <div className="mt-10 w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-black" />
          </div>
        ) : players.length === 0 ? (
          <p className="px-6 text-sm text-black/50 text-center">No athletes found.</p>
        ) : (
          <div
            className="
              flex w-full gap-6 overflow-x-auto pb-4 pt-6
              px-4 sm:px-6
              snap-x snap-mandatory scroll-smooth scroll-px-4
              scrollbar-hide
            "
          >
            {players.map((p) => (
              <div key={p.id} className="snap-start">
                <PlayerCard {...p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
/**
 * Home Route ("/")
 */
export default function Home() {
  return (
    <PageLayout>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        {/* Background Layer*/}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* LEFT COLUMN */}
            <div className="relative z-10">
              <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                Smart <br />
                Recruiting, <br />
                Smarter Teams
              </h1>

              <p className="mt-6 max-w-xl text-base text-white/80">Competitive athlete discovery for collegiate recruiters.</p>

              <div className="mt-8">
                <Link
                  to="/login"
                  className="
                      relative inline-block overflow-hidden
                      rounded-full px-8 py-3 text-base font-medium text-white
                      bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
                      bg-[length:200%_200%] bg-left
                      transition-all duration-500 ease-in-out
                      hover:bg-right
                      shadow-lg hover:shadow-xl
                      focus:outline-none focus:ring-2 focus:ring-blue-400/40
                    "
                >
                  Explore Athletes
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="relative z-10 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl sm:h-80 lg:h-[420px]">
                <img
                  src="/images/hero-basketball.png"
                  alt="High school basketball player driving to the hoop"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturedCarousel />
    </PageLayout>
  );
}

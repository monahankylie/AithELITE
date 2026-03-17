import {useEffect, useState} from "react";
import type {Route} from "./+types/home";
import {Link} from "react-router";
import PlayerCard from "~/components/playercard";
import PageLayout from "../components/page-layout";
import { athleteService, type BasketballPlayer } from "../lib/athlete-service";
import {useAuth} from "../auth-context";

export function meta({}: Route.MetaArgs) {
  return [{title: "Aithelite | Smarter Recruiting"}, {name: "description", content: "Smarter recruiting for smarter teams."}];
}

function FeaturedCarousel() {
  const [players, setPlayers] = useState<BasketballPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      // Use cache to avoid reads on navigation back to home
      const cached = athleteService.getCache('featured');
      if (cached) {
          setPlayers(cached);
          setLoading(false);
          return;
      }

      try {
        const { players: initialPlayers } = await athleteService.fetchBasketballPlayers(10);
        setPlayers(initialPlayers);
        athleteService.setCache('featured', initialPlayers);
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

export default function Home() {
  const {user, profile} = useAuth();
  return (
    <PageLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative z-10">
              <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                Smarter <br />
                Recruiting, <br />
                Smarter Teams
              </h1>
              <p className="mt-6 max-w-xl text-base text-white/80">Competitive athlete discovery for collegiate recruiters.</p>
              <div className="mt-8">
                <Link
                  to= {user ? "/home" : "/login"}
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

import type { Route } from "./+types/home";
import { Link } from "react-router";
import PlayerCard from "~/components/playercard";
import PageLayout from "../components/page-layout";
import { useAuth } from "../auth-context";
import { FEATURED_ATHLETES } from "../lib/featured-athletes";

export function meta({}: Route.MetaArgs) {
  return [{title: "Aithelite | Smarter Recruiting"}, {name: "description", content: "Smarter recruiting for smarter teams."}];
}

function FeaturedCarousel() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
              Featured Athletes
            </h2>
            <p className="mt-2 text-sm text-black/70">
              A quick glance at rising talent in your pipeline.
            </p>
          </div>

          <Link
            to="/login"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Browse More
          </Link>
        </div>
      </div>

      <div className="mt-10 w-full">
        <div
          className="
            flex w-full gap-6 overflow-x-auto pb-4 pt-6
            px-4 sm:px-6
            snap-x snap-mandatory scroll-smooth scroll-px-4
            scrollbar-hide
          "
        >
          {FEATURED_ATHLETES.map((p) => (
            <div key={p.id} className="snap-start">
              <PlayerCard {...p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {user, profile} = useAuth();
  return (
    <PageLayout>
      <section className="relative overflow-hidden bg-gradient-to-r from-[#081c33] via-[#0b3d66] to-[#0ea5e9] text-white">
       
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            
            {/* LEFT SIDE (text + CTAs) */}
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Smart Recruiting for Smarter Teams
              </p>

              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
                Find the right athletes faster.
              </h1>

              <p className="mt-6 text-base leading-7 text-white/80">
                Discover high school prospects, compare player athletic profiles, and
                organize prospects in one clean workflow.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to={user ? "/home" : "/login"}
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-md transition hover:bg-slate-100"
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* RIGHT SIDE (image + overlay card) */}
            <div className="relative">
              <div className="overflow-hidden rounded-[24px] bg-white/10 p-3 backdrop-blur-sm">
                <img
                  src="/images/hero-basketball.png"
                  alt="High school basketball player driving to the hoop"
                  className="h-[380px] w-full rounded-[16px] object-cover"
                  loading="lazy"
                />
              </div>

             
            </div>
          </div>
        </div>
      </section>
      <FeaturedCarousel />
    </PageLayout>
  );
}


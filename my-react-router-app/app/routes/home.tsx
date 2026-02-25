import type { Route } from "./+types/home";
import { Link } from "react-router";
import PlayerCard from "~/components/playercard";
import PageLayout from "../components/page-layout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Athelite | Smart Recruiting" },
    { name: "description", content: "Smart recruiting for smarter teams." },
  ];
}

/**
 * Home Route ("/")
 */
export default function Home() {
  return (
    <PageLayout>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
          {/* 
              Background Layer: 
              We use a dark gradient to give it that premium sports feel.
          */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950" />

          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              
              {/* LEFT COLUMN: Text and Call to Action */}
              <div className="relative z-10">
                <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                  Smart <br />
                  Recruiting, <br />
                  Smarter Teams
                </h1>

                <p className="mt-6 max-w-xl text-base text-white/80">
                   Competitive athlete discovery for collegiate recruiters.
                </p>
                
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

              {/* RIGHT COLUMN: Featured Image */}
              <div className="relative z-10 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl sm:h-80 lg:h-[420px]">
                  <img
                    src="/images/hero-basketball.png"
                    alt="High school basketball player driving to the hoop"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {/* Subtle overlay to help text stand out if needed */}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PLAYER CARD CAROUSEL SECTION */}
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
                className="hidden rounded-full border border-black/15 px-5 py-2 text-sm font-semibold text-black/80 transition hover:border-black/25 hover:text-black sm:inline-flex"
              >
                View all
              </Link>
            </div>
            <div className="mt-10 -mx-4 flex gap-6 overflow-x-auto px-4 pb-6 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              <PlayerCard
                name="John Doe"
                sportPosition="Sport / Position"
                school="High School"
                classYear="Class of 2026"
              />
              <PlayerCard
                name="Jane Doe"
                sportPosition="Sport / Position"
                school="High School"
                classYear="Class of 2027"
              />
              <PlayerCard
                name="Name"
                sportPosition="Sport / Position"
                school="High School"
                classYear="Class of 2026"
              />
            </div>
            <div className="mt-6 sm:hidden">
              <Link
                to="/login"
                className="inline-flex rounded-full border border-black/15 px-5 py-2 text-sm font-semibold text-black/80 transition hover:border-black/25 hover:text-black"
              >
                View all
              </Link>
            </div>
          </div>
        </section>
    </PageLayout>
  );
}

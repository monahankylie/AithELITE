import type { Route } from "./+types/home";
import { Link } from "react-router";

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
    <div className="min-h-screen bg-white">
      {/* 
          NAVBAR (Sticky)
          */}
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Brand / Logo area */}
          <div className="flex items-center">
            <img
              src="/images/logo-aithelite.svg"
              alt="Athelite Logo"
              className="h-8 w-auto"
            />
          </div>


          {/* Log In Button (Animated gradient hover) */}
          <Link
            to="/login"
            className="
              relative overflow-hidden
              rounded-full px-6 py-2 text-sm font-medium text-white
              bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
              bg-[length:200%_200%] bg-left
              transition-all duration-500 ease-in-out
              hover:bg-right
              shadow-md hover:shadow-lg
              focus:outline-none focus:ring-2 focus:ring-blue-400/40
            ">
            Log In
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
          {/* Background Layer*/}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950 -z-10" />

          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              
              {/* LEFT COLUMN */}
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-black sm:text-6xl">
                  Smart <br />
                  Recruiting, <br />
                  Smarter Teams
                </h1>

                <p className="mt-6 max-w-xl text-base text-black/80">
                   Competitive athlete discovery for collegiate recruiters.
                </p>
              {/* TO DO: route */}
                <div className="mt-8">
                  <button
                    type="button"
                    className="
                      relative overflow-hidden
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
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex justify-center lg:justify-end">
               {/* TO DO: convert to include a motion image carousel to display multiple sports*/}
                <div className="relative w-full max-w-xl overflow-hidden rounded-3xl shadow-xl sm:h-80 lg:h-[420px]">
                  <img
                    src="/images/hero-basketball.png"
                    alt="High school basketball player driving to the hoop"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {/* dark overlay for polish */}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              </div>

            </div>
          </div>
        </section>
        {/* TO DO: add player card carousel */}
        <footer className="border-t border-black/10 bg-white py-6 text-center text-sm text-black/60">
          &copy; {new Date().getFullYear()} AithELITE. All rights reserved.
        </footer>
    </div>
  );
}

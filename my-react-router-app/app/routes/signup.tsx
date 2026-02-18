import type { Route } from "./+types/signup";
import { Form, Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Athelite | Smart Recruiting | Sign Up" },
    { name: "description", content: "Smart recruiting for smarter teams." },
  ];
}

export default function Signup() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          {/* AithELITE-Logo area */}
          <div className="flex items-center">
            <img
              src="/images/logo-aithelite.svg"
              alt="Athelite Logo"
              className="h-8 w-auto"
            />
          </div>

          {/* Login Button */}
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
            "
          >
            Log In
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <section className="relative overflow-hidden bg-white">
        {/* Background Layer  */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-black to-gray-950" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Side-Word Art */}
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-black sm:text-6xl">
                Recruiter Access
              </h1>

              <p className="mt-6 max-w-xl text-base text-black/80">
                Create an account to save prospects, compare athletes, and view
                insights powered by performance analytics.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="rounded-full border border-white/30 px-6 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            {/*Right Side-Sign Up Form*/}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
                <h2 className="text-center text-4xl font-extrabold text-black">
                  Sign Up
                </h2>

                <Form method="post" className="mt-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-black">
                      Full Name
                    </label>
                    <input
                      name="fullName"
                      type="text"
                      placeholder="Coach Carter"
                      className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm outline-none focus:border-black text-black placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-black">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="coachcarter@school.edu"
                      className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm outline-none focus:border-black text-black placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-black">
                      Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      placeholder="********"
                      className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm outline-none focus:border-black text-black placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-black">
                      Confirm Password
                    </label>
                    <input
                      name="confirmPassword"
                      type="password"
                      placeholder="********"
                      className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm outline-none focus:border-black text-black placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-sm text-black/70">
                      <input
                        type="checkbox"
                        name="remember"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="font-medium">Remember me</span>
                    </label>

                    <Link
                      to="/login"
                      className="text-sm font-medium text-black/70 hover:text-black"
                    >
                      Already have an account?
                    </Link>
                  </div>

                  {/* Button */}
                  <button
                    type="submit"
                    className="
                      mt-2 w-full
                      relative overflow-hidden
                      rounded-full py-4 text-sm font-semibold text-white
                      bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
                      bg-[length:200%_200%] bg-left
                      transition-all duration-500 ease-in-out
                      hover:bg-right
                      shadow-lg hover:shadow-xl
                      focus:outline-none focus:ring-2 focus:ring-blue-400/40
                    "
                  >
                    Create Account
                  </button>

                  <p className="pt-2 text-center text-xs text-gray-500">
                    By signing up, you agree to our{" "}
                    <a href="#" className="underline hover:text-black">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline hover:text-black">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10 bg-white py-6 text-center text-sm text-black/60">
        &copy; {new Date().getFullYear()} O. Jiang, K. Monahan, M. Levin, K.
        Cummings.
      </footer>
    </div>
  );
}

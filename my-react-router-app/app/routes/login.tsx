import type {Route} from "./+types/login";
import {Link, useNavigate} from "react-router";
import {GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup} from "firebase/auth";
import {doc, getDoc, setDoc} from "firebase/firestore";
import {auth, db} from "../../firebase-config";

export function meta({}: Route.MetaArgs) {
  return [
    {title: "Athelite | Recruiter Login"},
    {
      name: "description",
      content: "Recruiter access login for Athelite.",
    },
  ];
}

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (error) {
      alert("Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const nameParts = (user.displayName ?? "").trim().split(/\s+/);
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        await setDoc(userRef, {
          firstName,
          lastName,
          email: user.email,
          organization: "",
          role: "recruiter",
          createdAt: new Date(),
        });
      }

      navigate("/dashboard");
    } catch (error) {
      alert("Google sign-in failed");
    }
  };
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <img src="public/images/logo-aithelite.svg" alt="Athelite" className="h-7 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/" className="hidden text-sm font-medium text-white/80 transition hover:text-white">
              Home
            </Link>
            <Link to="/recruits" className="hidden text-sm font-medium text-white/80 transition hover:text-white">
              Recruits
            </Link>
            <Link to="/about" className="hidden text-sm font-medium text-white/80 transition hover:text-white">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* BODY */}
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* LEFT (header/info) SECTION */}
          <section className="max-w-xl">
            <h1 className="text-balance text-5xl font-extrabold tracking-tight text-black md:text-6xl">
              Recruiter <br className="hidden md:block" />
              Access
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-6 text-black/60">
              Sign-in to save prospects, compare athletes, and view insights powered by performance analytics.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3"></div>
          </section>

          {/* RIGHT (log-in) SECTION */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]">
              <h2 className="text-xl font-bold text-black">Log In</h2>

              <form onSubmit={handleLogin} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-black/80">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="coach@recruiter.info"
                      className="h-11 w-full rounded-full border border-black/15 bg-white px-4 text-sm text-black shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-black/80">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="********"
                    className="h-11 w-full rounded-full border border-black/15 bg-white px-4 text-sm text-black shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/10"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-black/60">
                    <input
                      type="checkbox"
                      name="remember"
                      className="h-4 w-4 rounded border-/20 bg-white accent-blue-500 transition focus:ring-2 focus:ring-blue-400/30"
                    />
                    Remember me
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-black/60 underline decoration-black/20 underline-offset-4 transition hover:text-black hover:decoration-black/40"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="mt-2 h-11 w-full rounded-full bg-black text-sm font-semibold text-white overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-[length:200%_200%] bg-left transition-all duration-500 ease-in-out hover:bg-right shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 active:scale-[0.99]"
                >
                  Sign In
                </button>
                <Link
                  to="/signup"
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-[length:200%_200%] bg-left transition-all duration-500 ease-in-out hover:bg-right shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 active:scale-[0.99]"
                >
                  Sign Up
                </Link>

                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="text-xs text-black/40">or</span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-full bg-gray-100 text-sm font-medium text-black/70 transition hover:bg-gray-200 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <img src="/images/google-icon.svg" alt="Google" className="h-5 w-5" />
                  Sign in with Google
                </button>

                <p className="pt-1 text-center text-xs text-black/50">
                  By continuing, you agree to our{" "}
                  <Link
                    to="/terms"
                    className="font-semibold text-black/60 underline decoration-black/20 underline-offset-4 hover:decoration-black/40"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="font-semibold text-black/60 underline decoration-black/20 underline-offset-4 hover:decoration-black/40"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-black/50">© {new Date().getFullYear()} AithELITE. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/support" className="text-xs font-semibold text-black/60 hover:text-black">
              Support
            </Link>
            <Link to="/privacy" className="text-xs font-semibold text-black/60 hover:text-black">
              Privacy
            </Link>
            <Link to="/terms" className="text-xs font-semibold text-black/60 hover:text-black">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

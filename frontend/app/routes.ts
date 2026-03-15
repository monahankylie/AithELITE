import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/dashboard", "routes/dashboard.tsx"),
  route("/profile", "routes/profile.tsx"),
  route("/Watchlists", "routes/watchlists.tsx"),
  route("/Discover", "routes/discover.tsx"),
] satisfies RouteConfig;

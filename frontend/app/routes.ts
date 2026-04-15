import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/dashboard", "routes/dashboard.tsx"),
  route("/profile", "routes/profile.tsx"),
  route("/watchlists", "routes/watchlists.tsx"), 
  route("/watchlists/:id", "routes/watchlists.$id.tsx"),
  route("/discover", "routes/discover.tsx"), 
  route("/analyze", "routes/analyze.tsx", [
    index("routes/analyze._index.tsx"),
    route("radar", "routes/analyze.radar.tsx"),
    route("trend", "routes/analyze.trend.tsx"),
    route("distribution", "routes/analyze.distribution.tsx"),
  ]),
  route("/players/:id", "routes/player.$id.tsx"),
  route("/players/:id/stats", "routes/player.$id.stats.tsx"),
  route("/players/:id/games", "routes/player.$id.games.tsx"),
] satisfies RouteConfig;

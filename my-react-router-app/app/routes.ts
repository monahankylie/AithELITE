import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/login", "routes/login.tsx"),  
] satisfies RouteConfig;

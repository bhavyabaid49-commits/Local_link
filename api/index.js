import app from "../server/index.js";

/**
 * Vercel's `api/[...path].js` catch-all only matches a single path segment,
 * so nested routes such as `/api/auth/login` never reach the function.
 * `vercel.json` rewrites every `/api/*` request to this file instead and
 * forwards the original path in the `__path` query parameter.
 */
export default function handler(request, response) {
  const [pathname, queryString = ""] = (request.url || "/api").split("?");

  if (pathname === "/api/index") {
    const parameters = new URLSearchParams(queryString);
    const forwarded = parameters.get("__path") || "";
    parameters.delete("__path");
    const query = parameters.toString();
    const path = forwarded.replace(/^\/+/, "");
    request.url = `/api/${path}${query ? `?${query}` : ""}`;
  } else if (!pathname.startsWith("/api")) {
    request.url = `/api${request.url || ""}`;
  }

  return app(request, response);
}

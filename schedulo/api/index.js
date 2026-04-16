const app = require("../server/src/app");

module.exports = function vercelHandler(req, res) {
  const requestUrl = new URL(req.url, "http://localhost");
  const forwardedRoute = requestUrl.searchParams.get("__route");

  if (forwardedRoute != null) {
    requestUrl.searchParams.delete("__route");

    const normalizedRoute = String(forwardedRoute || "")
      .split("/")
      .filter(Boolean)
      .join("/");

    const nextPath = normalizedRoute ? `/api/${normalizedRoute}` : "/api";
    const nextQuery = requestUrl.searchParams.toString();

    req.url = nextQuery ? `${nextPath}?${nextQuery}` : nextPath;
  }

  return app(req, res);
};

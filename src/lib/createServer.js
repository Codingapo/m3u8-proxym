import getHandler from "./getHandler.js";
import httpProxy from "http-proxy";
import http from "node:http";
import https from "node:https";

export default function createServer(options = {}) {
  // Merge default http-proxy options with custom options
  const httpProxyOptions = {
    xfwd: true,
    secure: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
    ...options.httpProxyOptions,
  };

  const proxyServer = httpProxy.createProxyServer(httpProxyOptions);
  const requestHandler = getHandler(options, proxyServer);
  let server;

  // CORS handler
  const handleCors = (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return true;
    }
    return false;
  };

  // Origin check
  const isOriginAllowed = (origin, options) => {
    // Allow empty origin (direct browser requests)
    if (!origin) return true;

    if (options.originWhitelist.includes("*")) return true;
    if (
      options.originWhitelist.length &&
      !options.originWhitelist.includes(origin)
    )
      return false;
    if (
      options.originBlacklist.length &&
      options.originBlacklist.includes(origin)
    )
      return false;

    return true;
  };

  // Unified request listener for HTTP & HTTPS
  const requestListener = (req, res) => {
    const origin = req.headers.origin || "";

    if (!isOriginAllowed(origin, options)) {
      res.writeHead(403, "Forbidden");
      res.end(
        `The origin "${origin}" was blacklisted by the operator of this proxy.`
      );
      return;
    }

    if (handleCors(req, res)) return;

    requestHandler(req, res);
  };

  if (options.httpsOptions) {
    server = https.createServer(options.httpsOptions, requestListener);
  } else {
    server = http.createServer(requestListener);
  }

  // Proxy error handler
  proxyServer.on("error", (err, req, res) => {
    console.error("Proxy error:", err);

    if (res.headersSent) {
      if (!res.writableEnded) res.end();
      return;
    }

    const headerNames = res.getHeaderNames
      ? res.getHeaderNames()
      : Object.keys(res._headers || {});

    headerNames.forEach((name) => res.removeHeader(name));

    res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
    res.end("Proxy error: " + (err.message || err));
  });

  return server;
}

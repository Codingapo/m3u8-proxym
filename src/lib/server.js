import dotenv from "dotenv";
import createServer from "./createServer.js";
import colors from "colors";

dotenv.config();

const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || 8080;
const web_server_url = process.env.PUBLIC_URL || `http://${host}:${port}`;

// Always include your production front-end URL
const defaultAllowedOrigins = ["https://anyapo.vercel.app"];

// Merge with environment variable if provided
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? [...defaultAllowedOrigins, ...process.env.ALLOWED_ORIGINS.split(",")]
  : defaultAllowedOrigins;

export default function server() {
  createServer({
    originBlacklist: [],
    originWhitelist: allowedOrigins,
    requireHeader: [],
    removeHeaders: [
      "cookie",
      "cookie2",
      "x-request-start",
      "x-request-id",
      "via",
      "connect-time",
      "total-route-time",
    ],
    redirectSameOrigin: true,
    httpProxyOptions: {
      xfwd: false,
    },
  }).listen(port, host, function () {
    console.log(
      colors.green("Server running on: ") + colors.blue(`${web_server_url}`)
    );
    console.log(
      colors.yellow("Allowed origins: ") + colors.cyan(allowedOrigins.join(", "))
    );
  });
}

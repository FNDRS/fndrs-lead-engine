import type { NextConfig } from "next";
import path from "path";

const backendOrigin = (
  process.env.NEST_ORIGIN ??
  process.env.BACKEND_PROXY_URL ??
  process.env.INTERNAL_API_URL ??
  "http://127.0.0.1:4001"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  /** Same-origin proxy so the browser never calls the backend directly (avoids CORS / “Network Error”). */
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;

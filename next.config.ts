import type { NextConfig } from "next";

// Static export: the whole app is plain HTML/CSS/JS with no server.
// User data never leaves the browser (see CLAUDE.md).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

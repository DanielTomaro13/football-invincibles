/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for GitHub Pages (no request-time server).
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    // GitHub Pages can't run the Next image optimizer; we use plain <img> tags.
    unoptimized: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Set when the media bucket serves images to browsers itself (see src/lib/media.ts).
const publicMediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Uploaded images, served by src/app/media/[filename]/route.ts or the bucket itself.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    remotePatterns: publicMediaUrl ? [new URL(`${publicMediaUrl}/**`)] : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

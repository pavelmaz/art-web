import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pt/artworks/:slug",
        destination: "/pt/obras/:slug",
        permanent: true,
      },
      {
        source: "/pt/artists/:slug",
        destination: "/pt/artistas/:slug",
        permanent: true,
      },
      {
        source: "/es/artworks/:slug",
        destination: "/es/obras/:slug",
        permanent: true,
      },
      {
        source: "/es/artists/:slug",
        destination: "/es/artistas/:slug",
        permanent: true,
      },
      {
        source: "/genres/theatrical",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*painting.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*oil.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*tempera.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*miniature.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*asian.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*scroll.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*embroidery.*)",
        destination: "/genres",
        permanent: true,
      },
      {
        source: "/genres/:slug(.*statuette.*)",
        destination: "/genres",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

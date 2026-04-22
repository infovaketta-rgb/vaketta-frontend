import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.vaketta.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/terms", "/privacy"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

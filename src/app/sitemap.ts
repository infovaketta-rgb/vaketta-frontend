import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.vaketta.com";

  return [
    { url: base,              lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${base}/login`,   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.5 },
    { url: `${base}/terms`,   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];
}

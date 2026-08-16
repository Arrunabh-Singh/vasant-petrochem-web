import type { MetadataRoute } from "next";
import { site } from "./content";

// Single page today. When routes are added, list them here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

import type { MetadataRoute } from "next";
import { ROUTES, SITE_URL } from "@/lib/site";
import { projects } from "@/lib/data/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  // Live demos hosted on this site (external demos belong to their own sites).
  const demos: MetadataRoute.Sitemap = projects
    .filter((p) => p.demoUrl?.startsWith("/"))
    .map((p) => ({ url: `${SITE_URL}${p.demoUrl}`, changeFrequency: "monthly", priority: 0.6 }));

  return [...pages, ...demos];
}

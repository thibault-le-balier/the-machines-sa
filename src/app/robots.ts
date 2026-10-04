import type { MetadataRoute } from "next";

// Formulaire privé : rien à indexer.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}

/** Sitemap Balandou — pages publiques uniquement */
export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}

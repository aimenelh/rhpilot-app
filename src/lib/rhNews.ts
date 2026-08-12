import { XMLParser } from "fast-xml-parser";

export type RhNewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string | null;
};

// Chaque flux est essayé indépendamment — si l'un est bloqué (certains
// médias protègent leur RSS derrière un pare-feu anti-robot) ou renvoie
// un format inattendu, on l'ignore silencieusement plutôt que de faire
// échouer tout le chargement du tableau de bord. À tester en conditions
// réelles depuis le serveur de production : certains flux qui échouent
// depuis un environnement de développement passent très bien depuis un
// vrai serveur applicatif, et inversement.
const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.actuel-rh.fr/rss-all", source: "actuEL-RH" },
  { url: "https://www.parlonsrh.com/feed/", source: "Parlons RH" },
  { url: "https://www.myrhline.com/feed/", source: "myRHline" },
];

const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: "__cdata" });

// Certains flux enveloppent le texte dans des blocs CDATA, que
// fast-xml-parser expose sous forme d'objet { __cdata: "..." } plutôt
// que d'une chaîne brute selon le flux — on gère les deux cas.
function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "__cdata" in value) {
    return String((value as { __cdata: unknown }).__cdata).trim();
  }
  return "";
}

async function fetchFeed(feed: { url: string; source: string }): Promise<RhNewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RHPilotBot/1.0)" },
      // Revalidation horaire — pas besoin d'un vrai flux temps réel
      // pour une carte d'actualité qui n'apparaît qu'une fois par jour.
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .map((item): RhNewsItem | null => {
        const title = extractText(item.title);
        const link = extractText(item.link) || (typeof item.link === "object" ? item.link?.["@_href"] : "");
        if (!title || !link) return null;
        return {
          title,
          link,
          source: feed.source,
          pubDate: extractText(item.pubDate) || extractText(item.published) || null,
        };
      })
      .filter((item): item is RhNewsItem => item !== null);
  } catch (err) {
    console.error(`Flux RH indisponible (${feed.source}):`, err);
    return [];
  }
}

export async function getRhNews(): Promise<RhNewsItem[]> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const allItems = results.flat();

  allItems.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  return allItems.slice(0, 8);
}

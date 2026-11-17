import { getJson, type PaperResult, type SearchOptions } from "./types";

type S2Paper = {
  paperId: string;
  title: string;
  url?: string | null;
  year?: number | null;
  abstract?: string | null;
  authors?: { name: string }[];
  externalIds?: { DOI?: string } | null;
};

/** Semantic Scholar paper search (D17, AC12.1). */
export async function searchSemanticScholar(
  query: string,
  opts: SearchOptions = {},
): Promise<PaperResult[]> {
  const params = new URLSearchParams({
    query,
    limit: String(opts.limit ?? 10),
    fields: "title,url,year,abstract,authors,externalIds",
  });
  const body = (await getJson(
    "semantic_scholar",
    `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
    opts,
  )) as {
    data?: S2Paper[];
  };
  return (body.data ?? []).map((p) => ({
    sourceType: "paper",
    title: p.title,
    url: p.url ?? `https://www.semanticscholar.org/paper/${p.paperId}`,
    authors: (p.authors ?? []).map((a) => a.name),
    year: p.year ?? null,
    doi: p.externalIds?.DOI ?? null,
    externalId: `S2:${p.paperId}`,
    excerpt: p.abstract ?? null,
    hasAbstract: Boolean(p.abstract),
    provider: "semantic_scholar",
  }));
}

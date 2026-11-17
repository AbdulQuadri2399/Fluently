import { getJson, type PaperResult, type SearchOptions } from "./types";

type OAWork = {
  id: string;
  display_name?: string | null;
  title?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  authorships?: { author: { display_name: string } }[];
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: { landing_page_url?: string | null } | null;
};

/** OpenAlex stores abstracts as word → positions; this puts the words back in order. */
export function invertedToText(index: Record<string, number[]> | null | undefined): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  const text = words.filter(Boolean).join(" ").trim();
  return text || null;
}

/** OpenAlex works search: the fallback when Semantic Scholar is unavailable (D17). */
export async function searchOpenAlex(
  query: string,
  opts: SearchOptions = {},
): Promise<PaperResult[]> {
  const params = new URLSearchParams({ search: query, "per-page": String(opts.limit ?? 10) });
  const body = (await getJson("openalex", `https://api.openalex.org/works?${params}`, opts)) as {
    results?: OAWork[];
  };
  return (body.results ?? []).map((w) => {
    const excerpt = invertedToText(w.abstract_inverted_index);
    return {
      sourceType: "paper",
      title: w.display_name ?? w.title ?? "Untitled",
      url: w.primary_location?.landing_page_url ?? w.doi ?? w.id,
      authors: (w.authorships ?? []).map((a) => a.author.display_name),
      year: w.publication_year ?? null,
      doi: w.doi ? w.doi.replace(/^https:\/\/doi\.org\//, "") : null,
      externalId: `OA:${w.id.replace(/^https:\/\/openalex\.org\//, "")}`,
      excerpt,
      hasAbstract: Boolean(excerpt),
      provider: "openalex",
    };
  });
}

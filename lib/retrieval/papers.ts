import { searchOpenAlex } from "./openAlex";
import { searchSemanticScholar } from "./semanticScholar";
import { RetrievalError, type PaperResult, type SearchOptions } from "./types";

/**
 * Academic papers step (AC12.1): Semantic Scholar first, OpenAlex if it fails after retries.
 * Throws only when both fail, so the stage can mark this one step failed (AC11.4).
 */
export async function searchPapers(
  query: string,
  opts: SearchOptions = {},
): Promise<PaperResult[]> {
  try {
    return await searchSemanticScholar(query, opts);
  } catch (e) {
    if (!(e instanceof RetrievalError)) throw e;
    return await searchOpenAlex(query, opts);
  }
}

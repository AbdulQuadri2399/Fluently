import type { PaperResult } from "./types";

/** Made-up papers for the prototype and tests (D30). Real titles, invented relevance. */
export const FAKE_PAPERS: PaperResult[] = [
  {
    sourceType: "paper",
    title: "The goal-gradient hypothesis resurrected",
    url: "https://doi.org/10.1509/jmkr.43.1.39",
    authors: ["Ran Kivetz", "Oleg Urminsky", "Yuhuang Zheng"],
    year: 2006,
    doi: "10.1509/jmkr.43.1.39",
    externalId: "FAKE:goal-gradient",
    excerpt: "People speed up as they get closer to a goal; showing progress increases completion.",
    hasAbstract: true,
    provider: "semantic_scholar",
  },
  {
    sourceType: "paper",
    title: "Choice under uncertainty and the cost of effort",
    url: "https://example.org/papers/effort",
    authors: ["A. Invented"],
    year: 2019,
    doi: null,
    externalId: "FAKE:effort",
    excerpt:
      "Each extra step loses a share of people; perceived effort matters more than actual effort.",
    hasAbstract: true,
    provider: "semantic_scholar",
  },
  {
    sourceType: "paper",
    title: "Trust signals in identity verification",
    url: "https://example.org/papers/trust",
    authors: ["B. Madeup", "C. Placeholder"],
    year: 2022,
    doi: null,
    externalId: "FAKE:trust",
    excerpt: null,
    hasAbstract: false,
    provider: "openalex",
  },
];

export async function fakeSearchPapers(): Promise<PaperResult[]> {
  return FAKE_PAPERS;
}

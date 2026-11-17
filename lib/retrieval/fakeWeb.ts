/** Made-up web, competitor and review results for the prototype and tests (D30). */
export type WebResult = { title: string; url: string; excerpt: string };

const RESULTS: Record<string, WebResult[]> = {
  web: [
    {
      title: "Identity checks: why people give up halfway",
      url: "https://example.org/blog/id-checks",
      excerpt: "Industry write-up: most drop-off happens at the photo step.",
    },
    {
      title: "Onboarding benchmarks 2026",
      url: "https://example.org/reports/onboarding",
      excerpt: "Apps that show progress complete more sign-ups.",
    },
  ],
  competitors: [
    {
      title: "Competitor A: ID check flow",
      url: "https://example.org/competitor-a",
      excerpt: "Shows a three-step progress bar during verification.",
    },
    {
      title: "Competitor B: save and come back",
      url: "https://example.org/competitor-b",
      excerpt: "Lets people pause verification and finish later.",
    },
  ],
  reviews: [
    {
      title: 'App store review: "stuck at the photo bit"',
      url: "https://example.org/reviews/1",
      excerpt: "Couldn't get the ID photo to work, gave up.",
    },
    {
      title: "Forum thread: is my passport photo safe?",
      url: "https://example.org/forum/2",
      excerpt: "Asks where the ID photo is stored and who sees it.",
    },
    {
      title: "Trustpilot: took three tries",
      url: "https://example.org/reviews/3",
      excerpt: "Verification failed twice before it worked.",
    },
  ],
};

export async function fakeWebSearch(step: "web" | "competitors" | "reviews"): Promise<WebResult[]> {
  return RESULTS[step] ?? [];
}

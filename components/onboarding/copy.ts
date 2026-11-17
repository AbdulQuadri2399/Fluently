// Onboarding copy, quoted from specs/fluently-mvp/03-ux-flows.md section 7.
export const onboardingCopy = {
  steps: [
    {
      title: "One tree, from brief to wireframe",
      body: "Fluently turns a brief into objectives, evidence, themes, opportunities, solutions, wireframes and tests. Each stage is a lane on one canvas, read from left to right.",
    },
    {
      title: "You decide at every checkpoint",
      body: "After each stage, Fluently stops and asks you to approve, edit or send it back with feedback. Nothing moves on without you.",
    },
    {
      title: "Everything traces back",
      body: "Select any card to see the path back to its sources, the principle behind it and both objectives. If it has no principle, it doesn't ship.",
    },
  ],
  next: "Next",
  back: "Back",
  skip: "Skip",
  start: "Start my first project",
  stepOf: (n: number) => `Step ${n} of 3`,
} as const;

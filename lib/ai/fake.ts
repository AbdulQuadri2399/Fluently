import {
  usageRow,
  validate,
  AiError,
  type AiCall,
  type AiClient,
  type UsageLogger,
} from "./client";
import {
  ETHICS_RULES,
  type CoachOutput,
  type EmailAuditOutput,
  type EthicsOutput,
  type FindingsOutput,
  type QuestionsOutput,
  type SynthesisOutput,
} from "./schemas";

/**
 * Made-up answers for tests and the prototype (D6, AI_MODE=fake). Each step has a responder
 * that builds a plausible answer from the inputs; tests can replace responders (including
 * ones that throw, stall or return malformed output). Usage is logged at £0.
 */
export type Responder = (call: AiCall<unknown>) => unknown | Promise<unknown>;

export class FakeAiClient implements AiClient {
  readonly mode = "fake" as const;
  constructor(
    private log: UsageLogger,
    private responders: Record<string, Responder> = defaultResponders,
  ) {}

  async generate<T>(call: AiCall<T>): Promise<T> {
    const respond = this.responders[call.step];
    if (!respond) throw new AiError("unavailable", `no fake responder for ${call.step}`);
    const { model } = call.settings.stageModels[call.stage];
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = performance.now();
      let out: unknown;
      try {
        out = await respond(call as AiCall<unknown>);
      } catch (e) {
        await this.log(
          usageRow(
            call,
            { model, inputTokens: 0, outputTokens: 0 },
            performance.now() - started,
            false,
            false,
          ),
        );
        throw e instanceof AiError ? e : new AiError("unavailable");
      }
      const ok = validate(call.schema, out);
      const tokens = {
        inputTokens: Math.ceil((call.system.length + call.prompt.length) / 4),
        outputTokens: Math.ceil(JSON.stringify(out ?? "").length / 4),
      };
      await this.log(
        usageRow(call, { model, ...tokens }, performance.now() - started, ok !== null, false),
      );
      if (ok !== null) return ok;
    }
    throw new AiError("invalid_output");
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const trimEnd = (s: string) => s.trim().replace(/[.\s]+$/, "");

/** Brief coaching: sharper wording plus a one-sentence reason (AC8.2, AC8.5). */
export function fakeCoach(field: string, text: string): CoachOutput {
  const t = trimEnd(text);
  if (field === "business_objective") {
    const measurable = /\d|%|percent/i.test(t);
    return measurable
      ? {
          suggestion: `${t}.`,
          reason: "It already names a measure; keep the number and the timeframe together.",
          lowSpecificity: false,
        }
      : {
          suggestion: `${t}, measured by a 15% rise in completed sign-ups within 3 months.`,
          reason: "A number and a timeframe make it clear what success looks like.",
          lowSpecificity: true,
        };
  }
  if (field === "behavioural_objective") {
    const hasWhen = /\b(when|after|before|within|during|first|day|week|month|each|every)\b/i.test(
      t,
    );
    return hasWhen
      ? {
          suggestion: `${t}.`,
          reason: "It says who acts, what they do and when, so it can be observed.",
          lowSpecificity: false,
        }
      : {
          suggestion: `New customers ${t.charAt(0).toLowerCase()}${t.slice(1)} within their first week.`,
          reason: "Naming who acts and when turns an intention into a behaviour you can observe.",
          lowSpecificity: true,
        };
  }
  if (field === "audience_context") {
    return {
      suggestion: `${t}. They see this on their phone, often in a hurry, and haven't used a similar service before.`,
      reason: "Where and in what state people meet the design shapes which principles fit.",
      lowSpecificity: false,
    };
  }
  return {
    suggestion: `${t}. Must follow the existing design system and current accessibility rules (WCAG 2.2 AA).`,
    reason: "Naming the design system and rules up front saves rework later.",
    lowSpecificity: false,
  };
}

const ETHICS_PATTERNS: [(typeof ETHICS_RULES)[number], RegExp][] = [
  [
    "Fake urgency or scarcity",
    /(only \d+ left|limited time|last chance|countdown|hurry|act now|scarcity|urgen)/i,
  ],
  ["Deception", /(mislead|trick|pretend|fake review|disguise|hide the)/i],
  [
    "Hard to cancel or opt out",
    /(hard(er)? to (cancel|leave|unsubscribe)|stop (them|people|users) (cancel|leav|unsubscrib)|prevent cancel|bury the cancel)/i,
  ],
  ["Hidden costs", /(hidden (fee|cost|charge)|drip pricing|surprise (fee|charge))/i],
  ["Exploiting vulnerable groups", /(children|vulnerable|in debt|problem gambl|addict)/i],
];

/** Ethics gate: a simple keyword screen over the brief, plus the sector flag list (AC10.1). */
export function fakeEthics(brief: string, sector: string, flagList: string[]): EthicsOutput {
  const reasons: EthicsOutput["reasons"] = [];
  for (const [rule, re] of ETHICS_PATTERNS) {
    const m = brief.match(re);
    if (m)
      reasons.push({
        rule,
        reason: `The brief mentions "${m[0]}", which can push people into choices they wouldn't otherwise make.`,
      });
  }
  if (sector && flagList.some((s) => s.toLowerCase() === sector.toLowerCase())) {
    reasons.push({
      rule: "Sensitive sector",
      reason: `${sector} is on the workspace's list of sectors that need a closer look.`,
    });
  }
  return { result: reasons.length ? "flag" : "pass", reasons };
}

/** Fake mode only: text containing this marker makes the made-up call fail (FF2 demos and tests). */
export const FAKE_FAIL_MARKER = "#unavailable";

export const defaultResponders: Record<string, Responder> = {
  questions: (call) => fakeQuestions(str(call.input?.business), str(call.input?.behavioural)),
  findings: (call) => fakeFindings((call.input?.sources as SourceRef[] | undefined) ?? []),
  synthesis: (call) =>
    fakeSynthesis(
      (call.input?.findings as { text: string }[] | undefined) ?? [],
      (call.input?.principleKeys as string[] | undefined) ?? [],
      (call.input?.services as string[] | undefined) ?? [],
      (call.input?.externalHandle as string | null | undefined) ?? null,
    ),
  coach: (call) => {
    if (str(call.input?.text).includes(FAKE_FAIL_MARKER)) throw new AiError("unavailable");
    return fakeCoach(str(call.input?.field), str(call.input?.text));
  },
  email_audit: (call) =>
    fakeEmailAudit({
      subject: str(call.input?.subject),
      ctas: (call.input?.ctas as string[] | undefined) ?? [],
      links: (call.input?.links as string[] | undefined) ?? [],
      bodyWords: str(call.input?.bodyStart),
      shortlist: (call.input?.shortlist as string[] | undefined) ?? [],
      hasImage: Boolean(call.input?.hasImage),
    }),
  ethics: (call) =>
    fakeEthics(
      str(call.input?.brief),
      str(call.input?.sector),
      (call.input?.flagList as string[] | undefined) ?? [],
    ),
};

type SourceRef = { handle: string; type: string };

/** Made-up research questions (AC11.9), built from the two objectives. */
export function fakeQuestions(business: string, behavioural: string): QuestionsOutput {
  const goal = behavioural || business || "the behaviour we want";
  return {
    questions: [
      `Where in the current journey do people stop before "${goal.slice(0, 80)}"?`,
      "What makes this step feel like effort, and how do people describe it in their own words?",
      "What do competitors do at the same step, and what do their customers say about it?",
      "Which behavioural principles explain the drop-off, and how strong is the evidence for each?",
    ],
  };
}

/** Made-up findings: one or two per kind of source, citing real handles from this run. */
export function fakeFindings(sources: SourceRef[]): FindingsOutput {
  const of = (type: string) => sources.filter((s) => s.type === type).map((s) => s.handle);
  const papers = of("paper");
  const uploads = of("upload");
  const desk = of("desk");
  const comp = of("competitor");
  const social = of("social");
  const findings: FindingsOutput["findings"] = [];
  const add = (
    text: string,
    handles: string[],
    stance: "supports" | "contradicts" | "neutral" = "supports",
  ) => {
    if (handles.length) findings.push({ text, sourceHandles: handles, aiInference: false, stance });
  };
  add("People speed up when they can see how close they are to finishing.", papers.slice(0, 1));
  add("Every extra step in the check loses a share of people.", [
    ...papers.slice(1, 2),
    ...uploads.slice(0, 1),
  ]);
  add("Industry reports put most drop-off at the ID photo step.", desk.slice(0, 1));
  add(
    "Competitors show progress through verification and let people finish later.",
    comp.slice(0, 2),
  );
  add(
    "Reviews describe getting stuck at the photo step and giving up.",
    social.slice(0, 1).concat(social.slice(2, 3)),
  );
  add(
    "Some people ask where their ID photo is stored and who sees it.",
    social.slice(1, 2),
    "neutral",
  );
  findings.push({
    text: "People may hesitate because the check feels like a test they could fail.",
    sourceHandles: [],
    aiInference: true,
    stance: "neutral",
  });
  return { findings };
}

/** Made-up synthesis: three themes, three opportunities, candidate principles from the toolkit. */
export function fakeSynthesis(
  findings: { text: string }[],
  principleKeys: string[],
  services: string[],
  externalHandle: string | null,
): SynthesisOutput {
  const idx = (needle: string) =>
    findings.map((f, i) => (f.text.includes(needle) ? i : -1)).filter((i) => i >= 0);
  const effort = [...idx("extra step"), ...idx("photo step")];
  const progress = [...idx("how close"), ...idx("Competitors show")];
  const trust = [...idx("stored"), ...idx("test they could fail")];
  const themes = [
    {
      title: "The ID step takes too much effort",
      summary: "People give up at the photo step after failed tries.",
      findings: effort,
    },
    {
      title: "Progress isn't visible",
      summary: "People can't tell how many steps remain.",
      findings: progress,
    },
    {
      title: "Unclear what happens to personal data",
      summary: "Some people hesitate over where their ID goes.",
      findings: trust,
    },
  ].filter((t) => t.findings.length);
  const k = (i: number) => (principleKeys[i] ? [principleKeys[i]!] : []);
  const opportunities = [
    {
      title: "Make the ID step feel shorter",
      summary: "Cut and chunk the photo step so it feels quick.",
      themes: [0],
      principleKeys: [...k(0), ...k(1)],
      contradicts: false,
      gapQuestion: null,
      gapMethod: null,
      gapKind: null,
    },
    {
      title: "Show progress through verification",
      summary: "Let people see how close they are to finishing.",
      themes: [1],
      principleKeys: k(2),
      contradicts: false,
      gapQuestion: null,
      gapMethod: null,
      gapKind: null,
    },
    {
      title: "Explain where the ID photo goes",
      summary: "Answer the privacy question before people ask it.",
      themes: [2],
      principleKeys: k(3),
      contradicts: false,
      gapQuestion: "Do people drop out because of privacy worries, or because of effort?",
      gapMethod: services[1] ?? services[0] ?? "Desk research",
      gapKind: "generative" as const,
    },
  ].filter((o) => o.themes.every((t) => t < themes.length));
  return {
    themes,
    opportunities,
    externalPrinciples: externalHandle
      ? [{ name: "Endowed progress", mechanism: "Motivation", sourceHandle: externalHandle }]
      : [],
  };
}

/**
 * Made-up email findings (J8, fake mode). Every quote is taken from the email's own words, so the
 * quote check passes; the toolkit principles are the first ones on the shortlist.
 */
export function fakeEmailAudit(input: {
  subject: string;
  ctas: string[];
  links?: string[];
  bodyWords: string;
  shortlist: string[];
  hasImage: boolean;
}): EmailAuditOutput {
  const [a, b, c] = input.shortlist;
  const findings: EmailAuditOutput["findings"] = [];
  if (input.subject && a)
    findings.push({
      part: "subject",
      lens: "content",
      verdict: "working",
      principleKey: a,
      proof: { kind: "quote", text: input.subject },
      explanation: "The subject line says plainly what the email is about.",
    });
  if (input.ctas[0] && b)
    findings.push({
      part: "ctas",
      lens: "content",
      verdict: "working",
      principleKey: b,
      proof: { kind: "quote", text: input.ctas[0] },
      explanation: "The button names the action in the person's own terms.",
    });
  if (input.bodyWords && c)
    findings.push({
      part: "body",
      lens: "structure",
      verdict: "friction",
      principleKey: c,
      proof: { kind: "quote", text: input.bodyWords },
      explanation: "The opening asks the reader to take in a lot before they see the next step.",
    });
  const rival = input.ctas[1] ?? input.links?.[0];
  if (rival)
    findings.push({
      part: "ctas",
      lens: "content",
      verdict: "friction",
      principleKey: null,
      proof: { kind: "quote", text: rival },
      explanation: "A second link competes with the main button; no toolkit principle covers it.",
    });
  if (input.hasImage && a)
    findings.push({
      part: "hero",
      lens: "visual",
      verdict: "working",
      principleKey: a,
      proof: { kind: "image", text: "the hero image" },
      explanation: "The main picture draws the eye towards the headline.",
    });
  return { findings };
}

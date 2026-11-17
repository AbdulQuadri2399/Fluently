import {
  usageRow,
  validate,
  AiError,
  type AiCall,
  type AiClient,
  type UsageLogger,
} from "./client";
import { ETHICS_RULES, type CoachOutput, type EthicsOutput } from "./schemas";

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

export const defaultResponders: Record<string, Responder> = {
  coach: (call) => fakeCoach(str(call.input?.field), str(call.input?.text)),
  ethics: (call) =>
    fakeEthics(
      str(call.input?.brief),
      str(call.input?.sector),
      (call.input?.flagList as string[] | undefined) ?? [],
    ),
};

import type { Measured } from "@/lib/email/measure";
import { TAP_TARGET_PX } from "@/lib/email/measure";

// Findings the code can state from measuring alone (AC31.5, AC31.7): no model, no guessing.
// They are labelled "measured" and filed under "Not in the toolkit" (AC31.8): they are real
// problems (reading, tapping, finding the main button) but not toolkit principles.

export type MeasuredFinding = {
  part: "subject" | "preheader" | "hero" | "body" | "ctas" | "footer";
  lens: "structure" | "content" | "visual";
  verdict: "friction" | "working";
  proofText: string;
  explanation: string;
};

export function measuredFindings(m: Measured): MeasuredFinding[] {
  const out: MeasuredFinding[] = [];
  if (m.textContrast.failing > 0 && m.textContrast.lowest) {
    const { snippet, ratio } = m.textContrast.lowest;
    out.push({
      part: "body",
      lens: "visual",
      verdict: "friction",
      proofText: `"${snippet}" at ${ratio} to 1 (${m.textContrast.failing} of ${m.textContrast.samples} text blocks are below readable contrast)`,
      explanation:
        "Text this pale is hard to read on a phone, especially outdoors or for people with low vision.",
    });
  }
  const primary = m.links.find((l) => l.primary && l.kind === "button");
  const buttons = m.links.filter((l) => l.kind === "button");
  if (primary && !primary.aboveFold) {
    out.push({
      part: "ctas",
      lens: "structure",
      verdict: "friction",
      proofText: `"${primary.text}" starts ${Math.round(primary.top)} px down; the first screen is ${m.foldPx} px`,
      explanation:
        "The main button is below the fold, so a reader has to scroll before they see what to do.",
    });
  } else if (primary) {
    out.push({
      part: "ctas",
      lens: "structure",
      verdict: "working",
      proofText: `"${primary.text}" starts ${Math.round(primary.top)} px down, inside the first ${m.foldPx} px screen`,
      explanation: "The main button is visible without scrolling.",
    });
  }
  for (const b of buttons.filter((b) => !b.tapTargetOk)) {
    out.push({
      part: "ctas",
      lens: "visual",
      verdict: "friction",
      proofText: `"${b.text}" is ${Math.round(b.width)}×${Math.round(b.height)} px; thumbs need at least ${TAP_TARGET_PX} px`,
      explanation: "A button this small is easy to miss or mis-tap on a phone.",
    });
  }
  for (const b of buttons.filter((b) => b.contrast && !b.contrast.passes)) {
    out.push({
      part: "ctas",
      lens: "visual",
      verdict: "friction",
      proofText: `"${b.text}" label contrast is ${b.contrast!.ratio} to 1`,
      explanation: "The button's label is hard to read against its colour.",
    });
  }
  if (!m.preheader.present) {
    out.push({
      part: "preheader",
      lens: "content",
      verdict: "friction",
      proofText: "No preheader text found",
      explanation:
        "Without one, the inbox shows whatever the email starts with, such as 'View in browser'.",
    });
  }
  if (m.images.withoutAlt > 0) {
    out.push({
      part: "hero",
      lens: "visual",
      verdict: "friction",
      proofText: `${m.images.withoutAlt} of ${m.images.count} images have no description`,
      explanation:
        "With images off, which is common in mail apps, these show as empty gaps, and screen readers say nothing.",
    });
  }
  if (!m.responsive) {
    out.push({
      part: "body",
      lens: "structure",
      verdict: "friction",
      proofText: `Laid out ${m.layoutWidth} px wide, wider than a phone`,
      explanation: "The email doesn't adapt to a phone, so text and buttons shrink to fit.",
    });
  }
  return out;
}

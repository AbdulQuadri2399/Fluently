import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmailRenderSection, type EmailRenderFns } from "@/components/email/EmailRenderSection";
import { emailCopy as c } from "@/components/email/copy";
import { splitEmail } from "@/lib/email/parts";
import type { Measured } from "@/lib/email/measure";
import type { EmailRenderView } from "@/lib/email/renderService";
import { readFileSync } from "node:fs";

// Phone view of an email: render, picture, measured facts (AC31.4, AC31.5).
const html = readFileSync("fixtures/emails/welcome.html", "utf8");
const parts = splitEmail(html, "Welcome to Examplebank");

const measured = (over: Partial<Measured> = {}): Measured => ({
  imagesOn: false,
  layoutWidth: 608,
  responsive: false,
  zoom: 0.6,
  fullHeight: 1300,
  foldPx: 580,
  links: [
    {
      text: "Verify my identity",
      href: parts.ctas[0]!.href,
      kind: "button",
      primary: true,
      top: 300,
      aboveFold: true,
      width: 120,
      height: 30,
      tapTargetOk: false,
      contrast: { ratio: 6.3, passes: true },
    },
  ],
  textContrast: { samples: 10, failing: 0, lowest: null },
  colours: { text: ["#222222"], background: ["#ffffff"] },
  images: { count: 1, withoutAlt: 1 },
  preheader: { present: true, length: 52 },
  words: 80,
  ...over,
});
const view = (m = measured()): EmailRenderView => ({
  id: "r1",
  images: false,
  url: "https://signed.test/pic.png",
  width: 375,
  height: 800,
  measured: m,
  renderedAt: new Date().toISOString(),
});

const fns = (loaded: EmailRenderView | null, rendered?: EmailRenderView): EmailRenderFns => ({
  load: vi.fn(async () => loaded),
  render: vi.fn(async () =>
    rendered
      ? { ok: true as const, data: rendered }
      : { ok: false as const, code: "unavailable" as const },
  ),
});
const preview = { id: "e1", subject: "Welcome to Examplebank", html, parts };
const show = (f: EmailRenderFns, imagesInitial = false, loadPreview = async () => preview) =>
  render(
    <EmailRenderSection
      emailId="e1"
      parts={parts}
      imagesInitial={imagesInitial}
      fns={f}
      loadPreview={loadPreview}
    />,
  );
const frame = () =>
  screen.getByTitle(c.preview.frameTitle("Welcome to Examplebank")) as HTMLIFrameElement;

describe("email phone view", () => {
  it("says it isn't rendered yet when there is no picture", async () => {
    show(fns(null));
    expect(await screen.findByText(c.render.none)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.render.button })).toBeInTheDocument();
  });

  it("shows the live email in one phone, and what was measured", async () => {
    show(fns(view()));
    expect(await screen.findByText(c.render.rendered)).toBeInTheDocument();
    expect(screen.getByTestId("phone-frame")).toContainElement(frame());
    expect(screen.getAllByTestId("phone-frame")).toHaveLength(1);
    expect(frame().getAttribute("sandbox")).toBe("allow-same-origin");
    expect(frame().getAttribute("srcdoc")).toContain("Welcome to Examplebank");
    expect(frame().getAttribute("srcdoc")).toContain("data-fold");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(c.render.shrunk(608))).toBeInTheDocument();
    expect(screen.getByText(c.render.contrastOk(10))).toBeInTheDocument();
    expect(screen.getByText(c.render.preheaderPresent(52))).toBeInTheDocument();
    expect(screen.getByText(c.render.length(80, 2))).toBeInTheDocument();
    expect(screen.getByText(c.parts.imagesCount(1, 1))).toBeInTheDocument();
    expect(screen.getByText(c.render.smallTap)).toBeInTheDocument();
    expect(screen.getByText("#222222")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.render.again })).toBeInTheDocument();
  });

  it("says so when the email can't be loaded", async () => {
    show(fns(null), false, async () => null as never);
    expect(await screen.findByText(c.preview.failed)).toBeInTheDocument();
  });

  it("names the weakest text when contrast is low", async () => {
    show(
      fns(
        view(
          measured({
            responsive: true,
            textContrast: { samples: 8, failing: 2, lowest: { snippet: "Fine print", ratio: 2.1 } },
          }),
        ),
      ),
    );
    expect(await screen.findByText(c.render.fits)).toBeInTheDocument();
    expect(screen.getByText(c.render.contrastBad(2, 8, "Fine print", 2.1))).toBeInTheDocument();
  });

  it("renders on request, then shows the result", async () => {
    const f = fns(null, view());
    show(f);
    await userEvent.click(await screen.findByRole("button", { name: c.render.button }));
    expect(f.render).toHaveBeenCalledWith("e1", false);
    expect(await screen.findByText(c.render.rendered)).toBeInTheDocument();
    expect(screen.getByText(c.render.measured)).toBeInTheDocument();
  });

  it("says so when rendering fails, and keeps the button", async () => {
    show(fns(null));
    await userEvent.click(await screen.findByRole("button", { name: c.render.button }));
    expect(await screen.findByText(c.render.failed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.render.button })).toBeInTheDocument();
  });

  it("the images switch loads the other picture", async () => {
    const f = fns(null);
    show(f);
    await screen.findByText(c.render.none);
    expect(screen.getByText(c.render.imagesOff)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(new RegExp(c.render.imagesLabel)));
    expect(f.load).toHaveBeenLastCalledWith("e1", true);
    expect(await screen.findByText(c.render.imagesOn)).toBeInTheDocument();
    expect(frame().getAttribute("srcdoc")).toContain("img-src data: https:");
  });
});

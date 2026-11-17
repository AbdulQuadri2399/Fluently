import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DownloadMenu } from "@/components/report/DownloadMenu";

// SCR9 download (AC15.4): exporting and export-failed states.
describe("SCR9 download", () => {
  async function choose(name: string) {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(await screen.findByRole("menuitem", { name }));
  }

  it("exporting: says it's preparing the file, then downloads", async () => {
    let resolve!: (r: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DownloadMenu projectId="p1" fetcher={fetcher as never} />);
    await choose("PDF");
    expect(await screen.findByText("Preparing your file…")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith("/projects/p1/report/download?format=pdf");
    resolve(
      new Response("x", {
        headers: { "Content-Disposition": 'attachment; filename="audit-report-a.pdf"' },
      }),
    );
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(screen.queryByText("Preparing your file…")).toBeNull();
  });

  it("export failed: says so and offers to try again", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("# ok"));
    URL.createObjectURL = vi.fn(() => "blob:x");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DownloadMenu projectId="p1" fetcher={fetcher as never} />);
    await choose("Markdown (.md)");
    expect(await screen.findByText("Export didn't work. Try again.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(fetcher).toHaveBeenLastCalledWith("/projects/p1/report/download?format=md");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

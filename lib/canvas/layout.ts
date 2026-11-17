// Tree layout (D24, 03b section 3): seven lanes left to right, 280 px cards, 56 px between
// lanes, 20 px between cards. Pure, so placement and keyboard moves are testable without a canvas.

export const LANES = [
  "objectives",
  "evidence",
  "themes",
  "opportunities",
  "solutions",
  "wireframes",
  "tests",
] as const;
export type Lane = (typeof LANES)[number];

export const CARD_W = 280;
export const LANE_GAP = 56;
export const CARD_GAP = 20;
export const LANE_PAD = 16;
export const CARD_H = 76;
export const LANE_W = CARD_W + LANE_PAD * 2;
export const TOP = 60;

const LANE_OF_TYPE: Record<string, Lane> = {
  objective: "objectives",
  asset_set: "objectives",
  ethics: "objectives",
  override: "objectives",
  source: "evidence",
  finding: "evidence",
  reference: "evidence",
  theme: "themes",
  opportunity: "opportunities",
  gap: "opportunities",
  recommendation: "solutions",
  lofi_variant: "wireframes",
  annotation: "wireframes",
  test_plan: "tests",
};

/** Objectives first, then current assets, then the ethics gate and its override (AC22.1, AC22.7). */
const TYPE_ORDER: Record<string, number> = { objective: 0, asset_set: 1, ethics: 2, override: 3 };

export function laneOf(type: string): Lane {
  return LANE_OF_TYPE[type] ?? "evidence";
}

export function laneX(lane: Lane): number {
  return LANES.indexOf(lane) * (LANE_W + LANE_GAP);
}

export type LayoutInput = {
  id: string;
  type: string;
  sortOrder: number;
  createdAt: string;
  height?: number;
};
export type Placed = { id: string; lane: Lane; x: number; y: number; index: number };

export function layoutTree(nodes: LayoutInput[]): Placed[] {
  const byLane = new Map<Lane, LayoutInput[]>();
  for (const n of nodes) {
    const lane = laneOf(n.type);
    byLane.set(lane, [...(byLane.get(lane) ?? []), n]);
  }
  const placed: Placed[] = [];
  for (const lane of LANES) {
    const list = (byLane.get(lane) ?? []).sort(
      (a, b) =>
        (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) ||
        a.sortOrder - b.sortOrder ||
        a.createdAt.localeCompare(b.createdAt),
    );
    let y = TOP;
    list.forEach((n, index) => {
      placed.push({ id: n.id, lane, x: laneX(lane) + LANE_PAD, y, index });
      y += (n.height ?? CARD_H) + CARD_GAP;
    });
  }
  return placed;
}

/**
 * Arrow-key moves between cards (AC22.4): up/down within a lane; left/right to the card in the
 * nearest non-empty lane whose position is closest.
 */
export function nextFocus(
  placed: Placed[],
  currentId: string,
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
): string {
  const cur = placed.find((p) => p.id === currentId);
  if (!cur) return placed[0]?.id ?? currentId;
  const inLane = (lane: Lane) =>
    placed.filter((p) => p.lane === lane).sort((a, b) => a.index - b.index);
  if (key === "ArrowUp" || key === "ArrowDown") {
    const list = inLane(cur.lane);
    const i = list.findIndex((p) => p.id === cur.id) + (key === "ArrowDown" ? 1 : -1);
    return list[Math.max(0, Math.min(list.length - 1, i))]!.id;
  }
  const step = key === "ArrowRight" ? 1 : -1;
  for (let li = LANES.indexOf(cur.lane) + step; li >= 0 && li < LANES.length; li += step) {
    const list = inLane(LANES[li]!);
    if (list.length) {
      return list.reduce((best, p) => (Math.abs(p.y - cur.y) < Math.abs(best.y - cur.y) ? p : best))
        .id;
    }
  }
  return cur.id;
}

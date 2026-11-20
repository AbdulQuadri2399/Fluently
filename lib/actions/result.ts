/** Typed result for every Server Action (04 §5). Codes map to 03 copy in the UI. */
export type ErrorCode =
  | "validation"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unavailable"
  | "rate_limited"
  | "cost_cap"
  | "unconfirmed"
  | "locked"
  | "cant_connect"
  | "link_required"
  | "cant_delete_objective"
  | "too_many";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; code: ErrorCode };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (code: ErrorCode): ActionResult<never> => ({ ok: false, code });

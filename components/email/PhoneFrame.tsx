"use client";

import type { ReactNode } from "react";
import { FOLD_PX, PHONE_WIDTH } from "@/lib/email/fold";
import { emailCopy as c } from "./copy";

// An iPhone-style phone with a generic mail app around the email (IB21, 04 D45). Drawn around the
// email, never inside the stored render, so what is measured and audited stays the plain email.
const BEZEL = 8;
const STATUS_H = 47;
const NAV_H = 44;
const HEADER_H = 92;
const TOOLBAR_H = 49;
const HOME_H = 34;
const SCREEN_W = PHONE_WIDTH;
/** Visible email area: the first phone screen, which is also where the fold is. */
export const EMAIL_VIEW_H = FOLD_PX;
const SCREEN_H = STATUS_H + NAV_H + HEADER_H + EMAIL_VIEW_H + TOOLBAR_H + HOME_H;
export const FRAME_W = SCREEN_W + BEZEL * 2;
export const FRAME_H = SCREEN_H + BEZEL * 2;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function StatusIcons() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" {...stroke} strokeWidth={1.7}>
        <path d="M1 4.2a10 10 0 0 1 14 0M3.6 7a6.3 6.3 0 0 1 8.8 0M6.3 9.7a2.5 2.5 0 0 1 3.4 0" />
      </svg>
      <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
        <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.5" />
        <rect x="2" y="2" width="19" height="9" rx="2.2" fill="currentColor" />
        <rect x="24" y="4.2" width="2" height="4.6" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  );
}

/**
 * The phone. `children` fill the email area, which is `EMAIL_VIEW_H` (580) px tall and as wide as
 * the phone (375 px); `scale` shrinks the whole phone to fit a card or panel.
 */
export function PhoneFrame({
  subject,
  scale = 1,
  children,
}: {
  subject: string;
  scale?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: FRAME_W * scale, height: FRAME_H * scale }}
      data-testid="phone-frame"
    >
      <div
        className="absolute left-0 top-0 bg-ink"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          padding: BEZEL,
          borderRadius: 52,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12)",
        }}
      >
        <div
          className="relative flex flex-col overflow-hidden bg-white text-[#1c1c1e]"
          style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 44 }}
        >
          {/* status bar, with the camera island */}
          <div
            className="relative flex shrink-0 items-center justify-between px-8 pt-1.5 text-[15px] font-semibold"
            style={{ height: STATUS_H }}
            aria-hidden="true"
          >
            <span>9:41</span>
            <span
              className="absolute left-1/2 top-[11px] -translate-x-1/2 rounded-full bg-black"
              style={{ width: 110, height: 31 }}
            />
            <StatusIcons />
          </div>
          {/* the mail app's top bar */}
          <div
            className="flex shrink-0 items-center justify-between px-3 text-[17px] text-[#0a7aff]"
            style={{ height: NAV_H }}
            aria-hidden="true"
          >
            <span className="flex items-center gap-0.5">
              <svg width="12" height="20" viewBox="0 0 12 20" {...stroke} strokeWidth={2.4}>
                <path d="M10 2 2 10l8 8" />
              </svg>
              {c.frame.inbox}
            </span>
            <span className="flex items-center gap-5">
              <svg width="20" height="20" viewBox="0 0 20 20" {...stroke} strokeWidth={2}>
                <path d="m4 13 6-6 6 6" />
              </svg>
              <svg width="20" height="20" viewBox="0 0 20 20" {...stroke} strokeWidth={2}>
                <path d="m4 7 6 6 6-6" />
              </svg>
            </span>
          </div>
          {/* who it's from, and the subject line */}
          <div
            className="shrink-0 border-b border-[#e5e5ea] px-4 pt-2.5"
            style={{ height: HEADER_H }}
          >
            <div className="flex items-center gap-2.5" aria-hidden="true">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#c7c7cc] text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8.5" r="4.2" />
                  <path d="M3.5 21c.6-4.4 4-6.8 8.5-6.8s7.9 2.4 8.5 6.8z" />
                </svg>
              </span>
              <span className="grid leading-tight">
                <span className="text-[15px] font-semibold">{c.frame.sender}</span>
                <span className="text-[13px] text-[#8e8e93]">{c.frame.to}</span>
              </span>
            </div>
            <p className="mt-2 truncate text-[17px] font-semibold leading-snug" title={subject}>
              {subject}
            </p>
          </div>
          {/* the email itself: the first phone screen, scrolling for the rest */}
          <div className="shrink-0 overflow-hidden" style={{ height: EMAIL_VIEW_H }}>
            {children}
          </div>
          {/* the mail app's bottom bar and the home bar */}
          <div
            className="flex shrink-0 items-center justify-between border-t border-[#e5e5ea] bg-[#f9f9f9] px-8 text-[#0a7aff]"
            style={{ height: TOOLBAR_H }}
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
              <path d="M3 6.5h7l2 2.5h9v10H3z" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
              <path d="M10 6 4 12l6 6M4 12h10a6 6 0 0 1 6 6" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
              <path d="M12 20h8M16 4l4 4-10 10-5 1 1-5z" />
            </svg>
          </div>
          <div
            className="flex shrink-0 items-start justify-center bg-[#f9f9f9]"
            style={{ height: HOME_H }}
            aria-hidden="true"
          >
            <span className="mt-2 h-[5px] w-36 rounded-full bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}

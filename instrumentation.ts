import * as Sentry from "@sentry/nextjs";

/** Server/edge error monitoring (04 §9). Off unless NEXT_PUBLIC_SENTRY_DSN is set. */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;

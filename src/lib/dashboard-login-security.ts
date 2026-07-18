import { NextRequest, NextResponse } from "next/server";
import {
  checkPublicRateLimit,
  countRecentPublicSecurityEvents,
  getPublicRequestFingerprint,
  logPublicSecurityEvent,
} from "@/lib/public-security";

const LOGIN_SCOPE = "dashboard_login";
const FAILURE_LIMIT = 8;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const BURST_LIMIT = 20;
const BURST_WINDOW_MS = 60 * 1000;

type LoginGuard = {
  blocked: boolean;
  failureCount: number | null;
  fallbackRemaining: number;
  retryAfterSeconds: number;
  source: "burst" | "database" | "memory" | null;
};

export async function inspectDashboardLoginAttempt(
  request: NextRequest,
): Promise<LoginGuard> {
  const burst = checkPublicRateLimit(request, {
    scope: "dashboard-login-burst",
    limit: BURST_LIMIT,
    windowMs: BURST_WINDOW_MS,
  });

  const fallback = checkPublicRateLimit(request, {
    scope: "dashboard-login-fallback",
    limit: FAILURE_LIMIT,
    windowMs: FAILURE_WINDOW_MS,
  });

  const fingerprintHash = getPublicRequestFingerprint(request);
  const failureCount = await countRecentPublicSecurityEvents({
    scope: LOGIN_SCOPE,
    reason: "login_invalid",
    fingerprintHash,
    since: new Date(Date.now() - FAILURE_WINDOW_MS),
  });

  const source = !burst.allowed
    ? "burst"
    : failureCount !== null && failureCount >= FAILURE_LIMIT
      ? "database"
      : failureCount === null && !fallback.allowed
        ? "memory"
        : null;

  return {
    blocked: source !== null,
    failureCount,
    fallbackRemaining: fallback.remaining,
    retryAfterSeconds: Math.max(
      burst.retryAfterSeconds,
      fallback.retryAfterSeconds,
    ),
    source,
  };
}

export async function recordDashboardLoginInvalid(
  request: NextRequest,
  guard: LoginGuard,
) {
  await logPublicSecurityEvent(request, {
    scope: LOGIN_SCOPE,
    reason: "login_invalid",
    severity: "warning",
    extra: {
      priorFailures: guard.failureCount,
    },
  });

  const nextFailureCount =
    guard.failureCount === null
      ? null
      : guard.failureCount + 1;

  return {
    limitReached:
      nextFailureCount !== null
        ? nextFailureCount >= FAILURE_LIMIT
        : guard.fallbackRemaining === 0,
    failureCount: nextFailureCount,
  };
}

export async function recordDashboardLoginRateLimited(
  request: NextRequest,
  guard: LoginGuard,
  failureCount = guard.failureCount,
) {
  await logPublicSecurityEvent(request, {
    scope: LOGIN_SCOPE,
    reason: "login_rate_limited",
    severity: "warning",
    extra: {
      source: guard.source ?? "failure_limit",
      failureCount,
    },
  });
}

export async function recordDashboardLoginSuccess(
  request: NextRequest,
) {
  await logPublicSecurityEvent(request, {
    scope: LOGIN_SCOPE,
    reason: "login_success",
    severity: "info",
  });
}

export function createDashboardLoginRateLimitResponse(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      layer: "dashboard-auth",
      message: "Zu viele Anmeldeversuche. Bitte spaeter erneut versuchen.",
      authenticated: false,
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    },
  );
}

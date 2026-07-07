import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type PublicRateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  token?: string | null;
};

type PublicRateLimitResult = {
  allowed: boolean;
  key: string;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
};

type PublicSecurityEvent = {
  scope: string;
  reason: string;
  severity?: "info" | "warning" | "critical";
  token?: string | null;
  extra?: Record<string, unknown>;
};

const RATE_LIMIT_STORE_MAX_SIZE = 5000;

const globalForSecurity = globalThis as unknown as {
  hexaPublicRateLimitStore?: Map<string, RateLimitBucket>;
};

function getRateLimitStore() {
  if (!globalForSecurity.hexaPublicRateLimitStore) {
    globalForSecurity.hexaPublicRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return globalForSecurity.hexaPublicRateLimitStore;
}

function cleanupRateLimitStore(now: number) {
  const store = getRateLimitStore();

  if (store.size < RATE_LIMIT_STORE_MAX_SIZE) {
    return;
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }

  if (store.size < RATE_LIMIT_STORE_MAX_SIZE) {
    return;
  }

  const keysToDelete = Array.from(store.keys()).slice(0, Math.ceil(store.size * 0.2));

  for (const key of keysToDelete) {
    store.delete(key);
  }
}

export function hashPublicSecurityValue(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function getPublicRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cloudflareIp?.trim() ||
    "unknown";

  return ip || "unknown";
}

export function getPublicRequestUserAgent(request: NextRequest) {
  return request.headers.get("user-agent")?.slice(0, 240) || "unknown";
}

export function getPublicRequestFingerprint(request: NextRequest) {
  const ip = getPublicRequestIp(request);
  const userAgent = getPublicRequestUserAgent(request);

  return hashPublicSecurityValue(`${ip}|${userAgent}`);
}

export function getPublicTokenPrefixForLog(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  return token.slice(0, 10);
}

export function checkPublicRateLimit(
  request: NextRequest,
  options: PublicRateLimitOptions,
): PublicRateLimitResult {
  const now = Date.now();
  const store = getRateLimitStore();

  cleanupRateLimitStore(now);

  const fingerprint = getPublicRequestFingerprint(request);
  const tokenPart = options.token ? hashPublicSecurityValue(options.token).slice(0, 24) : "global";
  const key = `${options.scope}:${fingerprint}:${tokenPart}`;

  const existingBucket = store.get(key);

  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : {
          count: 0,
          resetAt: now + options.windowMs,
        };

  bucket.count += 1;
  store.set(key, bucket);

  const remaining = Math.max(options.limit - bucket.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1);

  const headers = {
    "X-RateLimit-Limit": String(options.limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
  };

  if (bucket.count > options.limit) {
    return {
      allowed: false,
      key,
      limit: options.limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds,
      headers: {
        ...headers,
        "Retry-After": String(retryAfterSeconds),
      },
    };
  }

  return {
    allowed: true,
    key,
    limit: options.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
    headers,
  };
}

export function createPublicRateLimitResponse(result: PublicRateLimitResult) {
  return NextResponse.json(
    {
      ok: false,
      message: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: result.headers,
    },
  );
}

export function logPublicSecurityEvent(request: NextRequest, event: PublicSecurityEvent) {
  const payload = {
    scope: event.scope,
    reason: event.reason,
    severity: event.severity ?? "warning",
    ipHash: hashPublicSecurityValue(getPublicRequestIp(request)),
    fingerprintHash: getPublicRequestFingerprint(request),
    userAgentHash: hashPublicSecurityValue(getPublicRequestUserAgent(request)),
    tokenPrefix: getPublicTokenPrefixForLog(event.token),
    path: request.nextUrl.pathname,
    method: request.method,
    createdAt: new Date().toISOString(),
    extra: event.extra ?? {},
  };

  console.warn("[HEXA_PUBLIC_SECURITY_EVENT]", JSON.stringify(payload));
}

export function createSafePublicNotFoundResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: "Offer link is not available.",
    },
    {
      status: 404,
    },
  );
}

export function createSafePublicGoneResponse(message = "Offer link is no longer available.") {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    {
      status: 410,
    },
  );
}
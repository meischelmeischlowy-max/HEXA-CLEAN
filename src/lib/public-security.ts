import { createHash, createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

type PublicAccessLogEvent = {
  scope: string;
  statusCode?: number;
  success?: boolean;
  token?: string | null;
  rateLimit?: PublicRateLimitResult | null;
  requestBytes?: number | null;
  responseMs?: number | null;
  extra?: Record<string, unknown>;
};

type UnsafePublicSecurityPrisma = {
  publicSecurityEvent?: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  publicAccessLog?: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

const RATE_LIMIT_STORE_MAX_SIZE = 5000;
const MAX_SCOPE_LENGTH = 80;
const MAX_HEADER_LENGTH = 240;
const MAX_PATH_LENGTH = 500;

const PUBLIC_SECURITY_HASH_SECRET =
  process.env.HEXA_PUBLIC_SECURITY_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  null;

const globalForSecurity = globalThis as unknown as {
  hexaPublicRateLimitStore?: Map<string, RateLimitBucket>;
  hexaPublicSecurityPrisma?: PrismaClient;
};

function getRateLimitStore() {
  if (!globalForSecurity.hexaPublicRateLimitStore) {
    globalForSecurity.hexaPublicRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return globalForSecurity.hexaPublicRateLimitStore;
}

function getPublicSecurityPrisma() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!globalForSecurity.hexaPublicSecurityPrisma) {
    globalForSecurity.hexaPublicSecurityPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
    });
  }

  return globalForSecurity.hexaPublicSecurityPrisma;
}

function getUnsafePublicSecurityPrisma() {
  const prisma = getPublicSecurityPrisma();

  if (!prisma) {
    return null;
  }

  return prisma as unknown as UnsafePublicSecurityPrisma;
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

function safeText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function safeScope(value: string) {
  return (
    safeText(value, MAX_SCOPE_LENGTH)
      ?.replace(/[^a-zA-Z0-9:_-]/g, "_")
      .slice(0, MAX_SCOPE_LENGTH) || "public"
  );
}

function safeHeaderValue(value: string | null) {
  return safeText(value, MAX_HEADER_LENGTH) ?? "unknown";
}

function safePath(value: string) {
  return safeText(value, MAX_PATH_LENGTH) ?? "/";
}

function safeExtraValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return safeText(value, 500);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(safeExtraValue);
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value).slice(0, 30)) {
      output[safeScope(key)] = safeExtraValue(item);
    }

    return output;
  }

  return String(value).slice(0, 200);
}

function safeExtra(extra: Record<string, unknown> | undefined) {
  if (!extra) {
    return {};
  }

  return safeExtraValue(extra) as Record<string, unknown>;
}

function safeStatusCode(value: unknown) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (parsed < 100 || parsed > 599) {
    return null;
  }

  return parsed;
}

function safePositiveInt(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function hashPublicSecurityValue(value: string) {
  const input = String(value ?? "");

  if (PUBLIC_SECURITY_HASH_SECRET && PUBLIC_SECURITY_HASH_SECRET.length >= 16) {
    return createHmac("sha256", PUBLIC_SECURITY_HASH_SECRET)
      .update(input, "utf8")
      .digest("hex");
  }

  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function getPublicRequestIp(request: NextRequest) {
  const cloudflareIp = safeHeaderValue(request.headers.get("cf-connecting-ip"));
  const realIp = safeHeaderValue(request.headers.get("x-real-ip"));
  const forwardedFor = safeHeaderValue(request.headers.get("x-forwarded-for"));

  const forwardedIp = forwardedFor.split(",")[0]?.trim();

  const ip =
    cloudflareIp !== "unknown"
      ? cloudflareIp
      : realIp !== "unknown"
        ? realIp
        : forwardedIp || "unknown";

  return ip.slice(0, 80) || "unknown";
}

export function getPublicRequestUserAgent(request: NextRequest) {
  return safeHeaderValue(request.headers.get("user-agent"));
}

export function getPublicRequestFingerprint(request: NextRequest) {
  const ip = getPublicRequestIp(request);
  const userAgent = getPublicRequestUserAgent(request);
  const acceptLanguage = safeHeaderValue(request.headers.get("accept-language"));

  return hashPublicSecurityValue(`${ip}|${userAgent}|${acceptLanguage}`);
}

export function getPublicTokenPrefixForLog(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  return token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10) || null;
}

export function checkPublicRateLimit(
  request: NextRequest,
  options: PublicRateLimitOptions,
): PublicRateLimitResult {
  const now = Date.now();
  const store = getRateLimitStore();

  cleanupRateLimitStore(now);

  const scope = safeScope(options.scope);
  const limit = Math.max(1, Math.floor(options.limit));
  const windowMs = Math.max(1000, Math.floor(options.windowMs));
  const fingerprint = getPublicRequestFingerprint(request);
  const tokenPart = options.token
    ? hashPublicSecurityValue(options.token).slice(0, 24)
    : "global";
  const key = `${scope}:${fingerprint}:${tokenPart}`;

  const existingBucket = store.get(key);

  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : {
          count: 0,
          resetAt: now + windowMs,
        };

  bucket.count += 1;
  store.set(key, bucket);

  const remaining = Math.max(limit - bucket.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1);

  const headers = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
    "Cache-Control": "no-store",
  };

  if (bucket.count > limit) {
    return {
      allowed: false,
      key,
      limit,
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
    limit,
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
      success: false,
      message: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: result.headers,
    },
  );
}

async function persistPublicSecurityEvent(payload: {
  scope: string;
  reason: string;
  severity: string;
  ipHash: string;
  fingerprintHash: string;
  userAgentHash: string;
  tokenPrefix: string | null;
  path: string;
  method: string;
  extra: Record<string, unknown>;
}) {
  const prisma = getUnsafePublicSecurityPrisma();

  if (!prisma?.publicSecurityEvent?.create) {
    return;
  }

  try {
    await prisma.publicSecurityEvent.create({
      data: {
        scope: payload.scope,
        reason: payload.reason,
        severity: payload.severity,
        ipHash: payload.ipHash,
        fingerprintHash: payload.fingerprintHash,
        userAgentHash: payload.userAgentHash,
        tokenPrefix: payload.tokenPrefix,
        path: payload.path,
        method: payload.method,
        extra: payload.extra,
      },
    });
  } catch (error) {
    console.warn("[HEXA_PUBLIC_SECURITY_EVENT_DB_FAILED]", error);
  }
}

async function persistPublicAccessLog(payload: {
  scope: string;
  path: string;
  method: string;
  statusCode: number | null;
  success: boolean;
  ipHash: string;
  fingerprintHash: string;
  userAgentHash: string;
  tokenPrefix: string | null;
  rateLimitKey: string | null;
  rateLimitAllowed: boolean | null;
  rateLimitRemaining: number | null;
  retryAfterSeconds: number | null;
  requestBytes: number | null;
  responseMs: number | null;
  extra: Record<string, unknown>;
}) {
  const prisma = getUnsafePublicSecurityPrisma();

  if (!prisma?.publicAccessLog?.create) {
    return;
  }

  try {
    await prisma.publicAccessLog.create({
      data: {
        scope: payload.scope,
        path: payload.path,
        method: payload.method,
        statusCode: payload.statusCode,
        success: payload.success,
        ipHash: payload.ipHash,
        fingerprintHash: payload.fingerprintHash,
        userAgentHash: payload.userAgentHash,
        tokenPrefix: payload.tokenPrefix,
        rateLimitKey: payload.rateLimitKey,
        rateLimitAllowed: payload.rateLimitAllowed,
        rateLimitRemaining: payload.rateLimitRemaining,
        retryAfterSeconds: payload.retryAfterSeconds,
        requestBytes: payload.requestBytes,
        responseMs: payload.responseMs,
        extra: payload.extra,
      },
    });
  } catch (error) {
    console.warn("[HEXA_PUBLIC_ACCESS_LOG_DB_FAILED]", error);
  }
}

export function logPublicSecurityEvent(request: NextRequest, event: PublicSecurityEvent) {
  const payload = {
    scope: safeScope(event.scope),
    reason: safeText(event.reason, 160) ?? "unknown",
    severity: event.severity ?? "warning",
    ipHash: hashPublicSecurityValue(getPublicRequestIp(request)),
    fingerprintHash: getPublicRequestFingerprint(request),
    userAgentHash: hashPublicSecurityValue(getPublicRequestUserAgent(request)),
    tokenPrefix: getPublicTokenPrefixForLog(event.token),
    path: safePath(request.nextUrl.pathname),
    method: safeText(request.method, 20) ?? "UNKNOWN",
    createdAt: new Date().toISOString(),
    extra: safeExtra(event.extra),
  };

  console.warn("[HEXA_PUBLIC_SECURITY_EVENT]", JSON.stringify(payload));

  void persistPublicSecurityEvent({
    scope: payload.scope,
    reason: payload.reason,
    severity: payload.severity,
    ipHash: payload.ipHash,
    fingerprintHash: payload.fingerprintHash,
    userAgentHash: payload.userAgentHash,
    tokenPrefix: payload.tokenPrefix,
    path: payload.path,
    method: payload.method,
    extra: payload.extra,
  });
}

export function logPublicAccessEvent(request: NextRequest, event: PublicAccessLogEvent) {
  const rateLimit = event.rateLimit ?? null;

  const payload = {
    scope: safeScope(event.scope),
    path: safePath(request.nextUrl.pathname),
    method: safeText(request.method, 20) ?? "UNKNOWN",
    statusCode: safeStatusCode(event.statusCode),
    success: Boolean(event.success),
    ipHash: hashPublicSecurityValue(getPublicRequestIp(request)),
    fingerprintHash: getPublicRequestFingerprint(request),
    userAgentHash: hashPublicSecurityValue(getPublicRequestUserAgent(request)),
    tokenPrefix: getPublicTokenPrefixForLog(event.token),
    rateLimitKey: rateLimit?.key ?? null,
    rateLimitAllowed: rateLimit?.allowed ?? null,
    rateLimitRemaining: rateLimit?.remaining ?? null,
    retryAfterSeconds: rateLimit?.retryAfterSeconds ?? null,
    requestBytes: safePositiveInt(event.requestBytes),
    responseMs: safePositiveInt(event.responseMs),
    createdAt: new Date().toISOString(),
    extra: safeExtra(event.extra),
  };

  console.info("[HEXA_PUBLIC_ACCESS_LOG]", JSON.stringify(payload));

  void persistPublicAccessLog({
    scope: payload.scope,
    path: payload.path,
    method: payload.method,
    statusCode: payload.statusCode,
    success: payload.success,
    ipHash: payload.ipHash,
    fingerprintHash: payload.fingerprintHash,
    userAgentHash: payload.userAgentHash,
    tokenPrefix: payload.tokenPrefix,
    rateLimitKey: payload.rateLimitKey,
    rateLimitAllowed: payload.rateLimitAllowed,
    rateLimitRemaining: payload.rateLimitRemaining,
    retryAfterSeconds: payload.retryAfterSeconds,
    requestBytes: payload.requestBytes,
    responseMs: payload.responseMs,
    extra: payload.extra,
  });
}

export function createSafePublicNotFoundResponse() {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message: "Resource is not available.",
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function createSafePublicGoneResponse(message = "Resource is no longer available.") {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message,
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function createSafePublicErrorResponse(message = "Request could not be processed.") {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message,
    },
    {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function createSafePublicServerErrorResponse() {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message: "Server error.",
    },
    {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
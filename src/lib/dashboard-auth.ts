import type { NextRequest } from "next/server";

export const DASHBOARD_COOKIE_NAME =
  "hexa_dashboard_auth";

export const DASHBOARD_SESSION_MAX_AGE_SECONDS =
  60 * 60 * 12;

const SESSION_VERSION = "v1";
const MAX_CLOCK_SKEW_SECONDS = 60;
const MAX_BEARER_TOKEN_LENGTH = 4096;
const NONCE_PATTERN = /^[0-9a-f]{32}$/;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;

const encoder = new TextEncoder();

type DashboardAuthorization = {
  ok: boolean;
  reason:
    | "authorization_header"
    | "dashboard_cookie"
    | "missing_dashboard_token"
    | "missing_credentials"
    | "invalid_credentials";
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string) {
  if (
    value.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    return null;
  }

  const output = new Uint8Array(value.length / 2);

  for (
    let index = 0;
    index < value.length;
    index += 2
  ) {
    output[index / 2] = Number.parseInt(
      value.slice(index, index + 2),
      16,
    );
  }

  return output;
}

async function importHmacKey(
  secret: string,
  usages: KeyUsage[],
) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    usages,
  );
}

async function createSignature(
  secret: string,
  payload: string,
) {
  const key = await importHmacKey(
    secret,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  return bytesToHex(
    new Uint8Array(signature),
  );
}

async function verifySignature(
  secret: string,
  payload: string,
  signatureHex: string,
) {
  const signature = hexToBytes(signatureHex);

  if (!signature) {
    return false;
  }

  const key = await importHmacKey(
    secret,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(payload),
  );
}

async function secureSecretEqual(
  left: string,
  right: string,
) {
  if (!left || !right) {
    return false;
  }

  const payload =
    "hexa-dashboard-bearer-verification";

  const signature = await createSignature(
    left,
    payload,
  );

  return verifySignature(
    right,
    payload,
    signature,
  );
}

export async function createDashboardSessionToken(
  secret: string,
  nowMs = Date.now(),
) {
  if (secret.length < 32) {
    throw new Error(
      "DASHBOARD_AUTH_TOKEN must contain at least 32 characters.",
    );
  }

  const issuedAt = Math.floor(
    nowMs / 1000,
  );

  const expiresAt =
    issuedAt +
    DASHBOARD_SESSION_MAX_AGE_SECONDS;

  const randomBytes = new Uint8Array(16);

  crypto.getRandomValues(randomBytes);

  const nonce = bytesToHex(randomBytes);

  const payload = [
    SESSION_VERSION,
    issuedAt,
    expiresAt,
    nonce,
  ].join(".");

  const signature = await createSignature(
    secret,
    payload,
  );

  return `${payload}.${signature}`;
}

export async function verifyDashboardSessionToken(
  token: string | null | undefined,
  secret: string,
  nowMs = Date.now(),
) {
  if (!token || !secret || secret.length < 32) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 5) {
    return false;
  }

  const [
    version,
    issuedAtText,
    expiresAtText,
    nonce,
    signature,
  ] = parts;

  if (
    version !== SESSION_VERSION ||
    !NONCE_PATTERN.test(nonce) ||
    !SIGNATURE_PATTERN.test(signature)
  ) {
    return false;
  }

  const issuedAt = Number(issuedAtText);
  const expiresAt = Number(expiresAtText);
  const now = Math.floor(nowMs / 1000);

  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= issuedAt ||
    issuedAt > now + MAX_CLOCK_SKEW_SECONDS ||
    expiresAt <= now ||
    expiresAt - issuedAt >
      DASHBOARD_SESSION_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const payload = [
    version,
    issuedAt,
    expiresAt,
    nonce,
  ].join(".");

  return verifySignature(
    secret,
    payload,
    signature,
  );
}

export async function getDashboardAuthorization(
  request: NextRequest,
): Promise<DashboardAuthorization> {
  const dashboardSecret =
    process.env.DASHBOARD_AUTH_TOKEN;

  if (
    !dashboardSecret ||
    dashboardSecret.length < 32
  ) {
    return {
      ok: false,
      reason: "missing_dashboard_token",
    };
  }

  const authorizationHeader =
    request.headers.get("authorization");

  const bearerMatch = authorizationHeader
    ?.match(
      /^Bearer[ \t]+([^\s]+)[ \t]*$/i,
    );

  const bearerToken = bearerMatch?.[1];

  if (
    bearerToken &&
    bearerToken.length <=
      MAX_BEARER_TOKEN_LENGTH &&
    await secureSecretEqual(
      bearerToken,
      dashboardSecret,
    )
  ) {
    return {
      ok: true,
      reason: "authorization_header",
    };
  }

  const cookieToken = request.cookies.get(
    DASHBOARD_COOKIE_NAME,
  )?.value;

  if (
    cookieToken &&
    await verifyDashboardSessionToken(
      cookieToken,
      dashboardSecret,
    )
  ) {
    return {
      ok: true,
      reason: "dashboard_cookie",
    };
  }

  return {
    ok: false,
    reason:
      authorizationHeader?.trim() || cookieToken
        ? "invalid_credentials"
        : "missing_credentials",
  };
}

export async function isDashboardRequestAuthorized(
  request: NextRequest,
) {
  const authorization =
    await getDashboardAuthorization(request);

  return authorization.ok;
}

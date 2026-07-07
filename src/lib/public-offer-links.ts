import { createHash, randomBytes, timingSafeEqual } from "crypto";

const PUBLIC_OFFER_TOKEN_BYTES = 32;
const PUBLIC_OFFER_TOKEN_MIN_LENGTH = 32;
const PUBLIC_OFFER_TOKEN_MAX_LENGTH = 256;
const DEFAULT_PUBLIC_OFFER_EXPIRES_DAYS = 14;

const PUBLIC_OFFER_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PublicOfferTokenData = {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: Date;
};

export function normalizePublicOfferToken(token: unknown): string | null {
  if (typeof token !== "string") {
    return null;
  }

  const normalizedToken = token.trim();

  if (
    normalizedToken.length < PUBLIC_OFFER_TOKEN_MIN_LENGTH ||
    normalizedToken.length > PUBLIC_OFFER_TOKEN_MAX_LENGTH
  ) {
    return null;
  }

  if (!PUBLIC_OFFER_TOKEN_PATTERN.test(normalizedToken)) {
    return null;
  }

  return normalizedToken;
}

export function createPublicOfferTokenHash(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function verifyPublicOfferTokenHash(
  rawToken: string,
  expectedTokenHash: string,
): boolean {
  const tokenHash = createPublicOfferTokenHash(rawToken);

  const tokenHashBuffer = Buffer.from(tokenHash, "hex");
  const expectedTokenHashBuffer = Buffer.from(expectedTokenHash, "hex");

  if (tokenHashBuffer.length !== expectedTokenHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenHashBuffer, expectedTokenHashBuffer);
}

export function createPublicOfferTokenPrefix(rawToken: string): string {
  return rawToken.slice(0, 10);
}

export function createPublicOfferExpiresAt(
  days = DEFAULT_PUBLIC_OFFER_EXPIRES_DAYS,
): Date {
  const safeDays =
    Number.isFinite(days) && days > 0 && days <= 90
      ? Math.floor(days)
      : DEFAULT_PUBLIC_OFFER_EXPIRES_DAYS;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + safeDays);

  return expiresAt;
}

export function createPublicOfferTokenData(
  expiresInDays = DEFAULT_PUBLIC_OFFER_EXPIRES_DAYS,
): PublicOfferTokenData {
  const rawToken = randomBytes(PUBLIC_OFFER_TOKEN_BYTES).toString("base64url");

  return {
    rawToken,
    tokenHash: createPublicOfferTokenHash(rawToken),
    tokenPrefix: createPublicOfferTokenPrefix(rawToken),
    expiresAt: createPublicOfferExpiresAt(expiresInDays),
  };
}

export function isPublicOfferLinkExpired(
  expiresAt: Date,
  now = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function buildPublicOfferUrl(rawToken: string): string {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL;

  const baseUrl = configuredBaseUrl
    ? configuredBaseUrl.startsWith("http")
      ? configuredBaseUrl
      : `https://${configuredBaseUrl}`
    : "http://localhost:3000";

  return `${baseUrl.replace(/\/+$/, "")}/public/offers/${rawToken}`;
}
import { NextRequest } from "next/server";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  createDashboardSessionToken,
  DASHBOARD_COOKIE_NAME,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
  getDashboardAuthorization,
  verifyDashboardSessionToken,
} from "@/lib/dashboard-auth";

const SECRET = "test-dashboard-secret-0123456789abcdef-0123456789abcdef";
const OTHER_SECRET = "other-dashboard-secret-0123456789abcdef-0123456789abcdef";
const originalSecret = process.env.DASHBOARD_AUTH_TOKEN;

function requestWithHeaders(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/dashboard/overview", {
    headers,
  });
}

beforeEach(() => {
  process.env.DASHBOARD_AUTH_TOKEN = SECRET;
});

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.DASHBOARD_AUTH_TOKEN;
  } else {
    process.env.DASHBOARD_AUTH_TOKEN = originalSecret;
  }
});

describe("dashboard signed sessions", () => {
  it("creates a signed token with the expected format", async () => {
    const token = await createDashboardSessionToken(SECRET, 1_800_000_000_000);

    expect(token).toMatch(
      /^v1\.\d+\.\d+\.[0-9a-f]{32}\.[0-9a-f]{64}$/,
    );
    await expect(
      verifyDashboardSessionToken(token, SECRET, 1_800_000_000_000),
    ).resolves.toBe(true);
  });

  it("rejects secrets shorter than 32 characters", async () => {
    await expect(createDashboardSessionToken("too-short"))
      .rejects.toThrow("at least 32 characters");
  });

  it("rejects a token verified with another secret", async () => {
    const token = await createDashboardSessionToken(SECRET);

    await expect(verifyDashboardSessionToken(token, OTHER_SECRET))
      .resolves.toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const token = await createDashboardSessionToken(SECRET);
    const replacement = token.endsWith("0") ? "1" : "0";
    const tampered = `${token.slice(0, -1)}${replacement}`;

    await expect(verifyDashboardSessionToken(tampered, SECRET))
      .resolves.toBe(false);
  });

  it("rejects expired and malformed tokens", async () => {
    const now = 1_800_000_000_000;
    const expired = await createDashboardSessionToken(
      SECRET,
      now - DASHBOARD_SESSION_MAX_AGE_SECONDS * 1000,
    );

    await expect(verifyDashboardSessionToken(expired, SECRET, now))
      .resolves.toBe(false);
    await expect(verifyDashboardSessionToken("not-a-session", SECRET, now))
      .resolves.toBe(false);
  });

  it("rejects a token issued beyond allowed clock skew", async () => {
    const now = 1_800_000_000_000;
    const future = await createDashboardSessionToken(SECRET, now + 61_000);

    await expect(verifyDashboardSessionToken(future, SECRET, now))
      .resolves.toBe(false);
  });
});

describe("dashboard request authorization", () => {
  it("accepts only a correctly formatted valid bearer token", async () => {
    const valid = await getDashboardAuthorization(
      requestWithHeaders({ authorization: `Bearer ${SECRET}` }),
    );
    const raw = await getDashboardAuthorization(
      requestWithHeaders({ authorization: SECRET }),
    );
    const invalid = await getDashboardAuthorization(
      requestWithHeaders({ authorization: "Bearer invalid-token" }),
    );

    expect(valid).toEqual({ ok: true, reason: "authorization_header" });
    expect(raw).toEqual({ ok: false, reason: "invalid_credentials" });
    expect(invalid).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("accepts a valid signed dashboard cookie", async () => {
    const token = await createDashboardSessionToken(SECRET);
    const authorization = await getDashboardAuthorization(
      requestWithHeaders({ cookie: `${DASHBOARD_COOKIE_NAME}=${token}` }),
    );

    expect(authorization).toEqual({ ok: true, reason: "dashboard_cookie" });
  });

  it("distinguishes missing configuration from missing credentials", async () => {
    const missingCredentials = await getDashboardAuthorization(
      requestWithHeaders({}),
    );

    delete process.env.DASHBOARD_AUTH_TOKEN;
    const missingToken = await getDashboardAuthorization(
      requestWithHeaders({}),
    );

    expect(missingCredentials).toEqual({
      ok: false,
      reason: "missing_credentials",
    });
    expect(missingToken).toEqual({
      ok: false,
      reason: "missing_dashboard_token",
    });
  });
});

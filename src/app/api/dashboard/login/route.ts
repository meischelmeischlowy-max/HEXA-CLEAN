import {
  createHash,
  timingSafeEqual,
} from "node:crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createDashboardSessionToken,
  DASHBOARD_COOKIE_NAME,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
} from "@/lib/dashboard-auth";
import {
  createDashboardLoginRateLimitResponse,
  inspectDashboardLoginAttempt,
  recordDashboardLoginInvalid,
  recordDashboardLoginRateLimited,
  recordDashboardLoginSuccess,
} from "@/lib/dashboard-login-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PASSWORD_LENGTH = 256;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  };
}

function secureTextEqual(
  left: string,
  right: string,
) {
  const leftHash = createHash("sha256")
    .update(left, "utf8")
    .digest();

  const rightHash = createHash("sha256")
    .update(right, "utf8")
    .digest();

  return timingSafeEqual(
    leftHash,
    rightHash,
  );
}

function invalidCredentialsResponse() {
  return NextResponse.json(
    {
      layer: "dashboard-auth",
      message: "Ungueltige Anmeldedaten.",
      authenticated: false,
    },
    {
      status: 401,
      headers: noStoreHeaders(),
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const dashboardPassword =
      process.env.DASHBOARD_PASSWORD;

    const dashboardSecret =
      process.env.DASHBOARD_AUTH_TOKEN;

    if (
      !dashboardPassword ||
      !dashboardSecret ||
      dashboardSecret.length < 32
    ) {
      console.error(
        "Dashboard authentication environment variables are missing or insecure.",
      );

      return NextResponse.json(
        {
          layer: "dashboard-auth",
          message:
            "Dashboard-Anmeldung ist nicht konfiguriert.",
          authenticated: false,
        },
        {
          status: 503,
          headers: noStoreHeaders(),
        },
      );
    }

    const guard = await inspectDashboardLoginAttempt(request);

    if (guard.blocked) {
      await recordDashboardLoginRateLimited(request, guard);
      return createDashboardLoginRateLimitResponse(
        guard.retryAfterSeconds,
      );
    }

    const body = await request
      .json()
      .catch(() => null);

    const password =
      body &&
      typeof body === "object" &&
      "password" in body &&
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      password.length === 0 ||
      password.length >
        MAX_PASSWORD_LENGTH ||
      !secureTextEqual(
        password,
        dashboardPassword,
      )
    ) {
      const invalid = await recordDashboardLoginInvalid(
        request,
        guard,
      );

      if (invalid.limitReached) {
        await recordDashboardLoginRateLimited(
          request,
          guard,
          invalid.failureCount,
        );

        return createDashboardLoginRateLimitResponse(
          guard.retryAfterSeconds,
        );
      }

      return invalidCredentialsResponse();
    }

    await recordDashboardLoginSuccess(request);

    const sessionToken =
      await createDashboardSessionToken(
        dashboardSecret,
      );

    const response = NextResponse.json(
      {
        layer: "dashboard-auth",
        message:
          "Dashboard-Anmeldung erfolgreich.",
        authenticated: true,
      },
      {
        headers: noStoreHeaders(),
      },
    );

    response.cookies.set(
      DASHBOARD_COOKIE_NAME,
      sessionToken,
      {
        httpOnly: true,
        sameSite: "strict",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge:
          DASHBOARD_SESSION_MAX_AGE_SECONDS,
      },
    );

    return response;
  } catch (error) {
    console.error("[DASHBOARD_LOGIN_FAILED]", error);

    return NextResponse.json(
      {
        layer: "dashboard-auth",
        message:
          "Dashboard-Anmeldung fehlgeschlagen.",
        authenticated: false,
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}

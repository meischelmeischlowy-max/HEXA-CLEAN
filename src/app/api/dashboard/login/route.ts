import {
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DASHBOARD_COOKIE_NAME = "hexa_dashboard_auth";
const MAX_PASSWORD_LENGTH = 256;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  };
}

function secureTextEqual(left: string, right: string) {
  const leftHash = createHash("sha256")
    .update(left, "utf8")
    .digest();

  const rightHash = createHash("sha256")
    .update(right, "utf8")
    .digest();

  return timingSafeEqual(leftHash, rightHash);
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

export async function POST(request: Request) {
  try {
    const dashboardPassword = process.env.DASHBOARD_PASSWORD;
    const dashboardToken = process.env.DASHBOARD_AUTH_TOKEN;

    if (!dashboardPassword || !dashboardToken) {
      console.error(
        "Dashboard authentication environment variables are missing.",
      );

      return NextResponse.json(
        {
          layer: "dashboard-auth",
          message: "Dashboard-Anmeldung ist nicht konfiguriert.",
          authenticated: false,
        },
        {
          status: 503,
          headers: noStoreHeaders(),
        },
      );
    }

    const body = await request.json().catch(() => null);

    const password =
      body &&
      typeof body === "object" &&
      "password" in body &&
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      password.length === 0 ||
      password.length > MAX_PASSWORD_LENGTH ||
      !secureTextEqual(
        password,
        dashboardPassword,
      )
    ) {
      return invalidCredentialsResponse();
    }

    const response = NextResponse.json(
      {
        layer: "dashboard-auth",
        message: "Dashboard-Anmeldung erfolgreich.",
        authenticated: true,
      },
      {
        headers: noStoreHeaders(),
      },
    );

    response.cookies.set(
      DASHBOARD_COOKIE_NAME,
      dashboardToken,
      {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        layer: "dashboard-auth",
        message: "Dashboard-Anmeldung fehlgeschlagen.",
        authenticated: false,
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}

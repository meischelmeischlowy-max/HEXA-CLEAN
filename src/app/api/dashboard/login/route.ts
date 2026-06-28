import { NextResponse } from "next/server";

const DASHBOARD_COOKIE_NAME = "hexa_dashboard_auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body.password;

    const dashboardPassword = process.env.DASHBOARD_PASSWORD;
    const dashboardToken = process.env.DASHBOARD_AUTH_TOKEN;

    if (!dashboardPassword || !dashboardToken) {
      return NextResponse.json(
        {
          layer: "dashboard-auth",
          message: "Dashboard auth is not configured",
        },
        { status: 500 }
      );
    }

    if (!password || password !== dashboardPassword) {
      return NextResponse.json(
        {
          layer: "dashboard-auth",
          message: "Invalid password",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      layer: "dashboard-auth",
      message: "Dashboard login works",
      authenticated: true,
    });

    response.cookies.set(DASHBOARD_COOKIE_NAME, dashboardToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-auth",
        message: "Dashboard login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
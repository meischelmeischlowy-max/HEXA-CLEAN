import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DASHBOARD_COOKIE_NAME = "hexa_dashboard_auth";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  };
}

export async function POST() {
  const response = NextResponse.json(
    {
      layer: "dashboard-auth",
      message: "Dashboard-Abmeldung erfolgreich.",
      authenticated: false,
    },
    {
      headers: noStoreHeaders(),
    },
  );

  response.cookies.set(
    DASHBOARD_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    },
  );

  return response;
}

import { NextResponse } from "next/server";

const DASHBOARD_COOKIE_NAME = "hexa_dashboard_auth";

function logoutResponse() {
  const response = NextResponse.json({
    layer: "dashboard-auth",
    message: "Dashboard logout works",
    authenticated: false,
  });

  response.cookies.set(DASHBOARD_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function POST() {
  return logoutResponse();
}

export async function GET() {
  return logoutResponse();
}
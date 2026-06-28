import { NextRequest, NextResponse } from "next/server";

const DASHBOARD_COOKIE_NAME = "hexa_dashboard_auth";

const testApiRoutes = [
  "/api/db-test",
  "/api/db-write-test",
  "/api/repository-test",
  "/api/customer-service-test",
  "/api/session-service-test",
  "/api/order-service-test",
  "/api/conversation-service-test",
  "/api/quote-service-test",
  "/api/invoice-service-test",
  "/api/payment-service-test",
  "/api/notification-service-test",
  "/api/attachment-service-test",
  "/api/audit-log-service-test",
];

function isDashboardPage(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isDashboardApi(pathname: string) {
  return pathname.startsWith("/api/dashboard/");
}

function isPublicDashboardApi(pathname: string) {
  return (
    pathname === "/api/dashboard/login" ||
    pathname === "/api/dashboard/logout"
  );
}

function isTestApiRoute(pathname: string) {
  return testApiRoutes.includes(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.NODE_ENV === "production" && isTestApiRoute(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const dashboardToken = process.env.DASHBOARD_AUTH_TOKEN;
  const cookieToken = request.cookies.get(DASHBOARD_COOKIE_NAME)?.value;

  const isAuthenticated =
    Boolean(dashboardToken) && cookieToken === dashboardToken;

  if (isPublicDashboardApi(pathname)) {
    return NextResponse.next();
  }

  if (isDashboardApi(pathname) && !isAuthenticated) {
    return NextResponse.json(
      {
        layer: "dashboard-auth",
        message: "Unauthorized dashboard API access",
      },
      { status: 401 }
    );
  }

  if (isDashboardPage(pathname) && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/dashboard-login";
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
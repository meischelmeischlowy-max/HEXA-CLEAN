import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  getDashboardAuthorization,
} from "@/lib/dashboard-auth";

function isDashboardPage(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  );
}

function isDashboardApi(pathname: string) {
  return pathname.startsWith(
    "/api/dashboard/",
  );
}

function isPublicDashboardApi(pathname: string) {
  return (
    pathname === "/api/dashboard/login" ||
    pathname === "/api/dashboard/logout"
  );
}

function unauthorizedHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  };
}

export async function proxy(
  request: NextRequest,
) {
  const { pathname } = request.nextUrl;

  if (isPublicDashboardApi(pathname)) {
    return NextResponse.next();
  }

  const authorization =
    await getDashboardAuthorization(request);

  if (
    isDashboardApi(pathname) &&
    !authorization.ok
  ) {
    return NextResponse.json(
      {
        layer: "dashboard-auth",
        message:
          "Nicht autorisierte Dashboard-Anfrage.",
      },
      {
        status: 401,
        headers: unauthorizedHeaders(),
      },
    );
  }

  if (
    isDashboardPage(pathname) &&
    !authorization.ok
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/dashboard-login";

    loginUrl.searchParams.set(
      "redirect",
      pathname,
    );

    return NextResponse.redirect(
      loginUrl,
      {
        headers: unauthorizedHeaders(),
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
  ],
};

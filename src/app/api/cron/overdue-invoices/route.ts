import {
  NextResponse,
} from "next/server";

import {
  runOverdueInvoiceReminder,
} from "@/lib/overdue-reminder-service";

export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
export const maxDuration =
  60;

export async function GET(
  request: Request,
) {
  const cronSecret =
    process.env.CRON_SECRET
      ?.trim();

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !cronSecret ||
    authorization !==
      `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        status:
          "UNAUTHORIZED",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const result =
      await runOverdueInvoiceReminder();

    return NextResponse.json(
      {
        status: "OK",
        actionRequired:
          result.failed > 0,
        result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Overdue invoice cron error:",
      error,
    );

    return NextResponse.json(
      {
        status:
          "ERROR",
        actionRequired: true,
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
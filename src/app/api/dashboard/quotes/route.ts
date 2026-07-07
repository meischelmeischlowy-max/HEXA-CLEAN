import { NextResponse } from "next/server";

import { dashboardService } from "@/services/dashboardService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export async function GET() {
  try {
    const quotes = await dashboardService.getQuotes();

    return NextResponse.json(
      {
        layer: "dashboard-quotes-api",
        message: "Quotes loaded",
        data: quotes,
      },
      {
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Dashboard quotes API error:", error);

    return NextResponse.json(
      {
        layer: "dashboard-quotes-api",
        message: "Quotes load error",
        data: {
          status: "error",
          message: "Die Angebote konnten nicht geladen werden.",
          quotes: [],
        },
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}
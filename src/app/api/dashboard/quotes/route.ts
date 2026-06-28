import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const quotes = await dashboardService.getQuotes();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard quotes works",
      data: quotes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard quotes failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const recentActivity = await dashboardService.getRecentActivity();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard recent activity works",
      data: recentActivity,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard recent activity failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
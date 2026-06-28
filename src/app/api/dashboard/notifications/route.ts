import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const notifications = await dashboardService.getNotifications();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard notifications works",
      data: notifications,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard notifications failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
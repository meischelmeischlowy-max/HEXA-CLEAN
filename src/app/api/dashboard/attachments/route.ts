import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const attachments = await dashboardService.getAttachments();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard attachments works",
      data: attachments,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard attachments failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
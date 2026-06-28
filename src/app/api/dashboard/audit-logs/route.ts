import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const auditLogs = await dashboardService.getAuditLogs();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard audit logs works",
      data: auditLogs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard audit logs failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
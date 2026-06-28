import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const orders = await dashboardService.getOrders();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard orders works",
      data: orders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard orders failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
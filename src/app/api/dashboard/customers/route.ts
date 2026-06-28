import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const customers = await dashboardService.getCustomers();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard customers works",
      data: customers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard customers failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
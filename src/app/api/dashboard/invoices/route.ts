import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboardService";

export async function GET() {
  try {
    const invoices = await dashboardService.getInvoices();

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard invoices works",
      data: invoices,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard invoices failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";

import { dashboardService } from "@/services/dashboardService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const result = await dashboardService.getAttachmentDetails(id);

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to load attachment details",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
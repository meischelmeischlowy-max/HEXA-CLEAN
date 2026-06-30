import { NextResponse } from "next/server";

import { dashboardService } from "@/services/dashboardService";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await dashboardService.createQuoteFromOrder(id);

  if (result.status === "NOT_FOUND") {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result, { status: 201 });
}
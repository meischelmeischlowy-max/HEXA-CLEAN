import { NextResponse } from "next/server";

import { dashboardOrderActionsRepository } from "@/repositories/dashboardOrderActionsRepository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await dashboardOrderActionsRepository.markOrderAsCompleted(id);

  if (!result) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        message: "Order not found",
        orderId: id,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      status: "OK",
      message: result.updated
        ? "Order marked as completed"
        : "Order was already completed",
      orderId: id,
      updated: result.updated,
      order: result.updatedOrder,
    },
    {
      status: 200,
    }
  );
}
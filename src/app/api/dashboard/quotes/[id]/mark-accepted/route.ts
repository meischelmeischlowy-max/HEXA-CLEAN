import { NextResponse } from "next/server";

import { dashboardQuoteActionsRepository } from "@/repositories/dashboardQuoteActionsRepository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await dashboardQuoteActionsRepository.markQuoteAsAccepted(id);

  if (!result) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        message: "Quote not found",
        quoteId: id,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      status: "OK",
      message: result.updated
        ? "Quote marked as accepted"
        : "Quote was already accepted",
      quoteId: id,
      updated: result.updated,
      quote: result.updatedQuote,
    },
    {
      status: 200,
    }
  );
}
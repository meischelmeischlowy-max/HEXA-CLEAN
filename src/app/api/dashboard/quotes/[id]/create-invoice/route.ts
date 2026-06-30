import { NextResponse } from "next/server";

import { dashboardRepository } from "@/repositories/dashboardRepository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await dashboardRepository.createInvoiceFromQuote(id);

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
      message: result.created
        ? "Invoice created from quote"
        : "Invoice already exists for quote",
      quoteId: id,
      invoiceId: result.invoice.id,
      created: result.created,
      quote: result.quote,
      invoice: result.invoice,
    },
    {
      status: result.created ? 201 : 200,
    }
  );
}
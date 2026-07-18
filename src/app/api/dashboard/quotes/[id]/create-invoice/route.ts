import { NextResponse } from "next/server";
import { QuoteStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dashboardRepository } from "@/repositories/dashboardRepository";
import { canCreateInvoiceFromQuote } from "@/lib/public-offer-workflow";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const quote = await prisma.quote.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Quote not found",
          quoteId: id,
        },
        { status: 404 }
      );
    }

    if (!canCreateInvoiceFromQuote(quote.status)) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message: "Invoice can only be created from an accepted quote.",
          quoteId: id,
          quoteNumber: quote.quoteNumber,
          currentStatus: quote.status,
          requiredStatus: QuoteStatus.ACCEPTED,
        },
        { status: 409 }
      );
    }

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
          ? "Invoice created from accepted quote"
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
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to create invoice from quote",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
import {
  OrderStatus,
  QuoteStatus,
} from "@prisma/client";
import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";
import {
  canCreateInvoiceFromQuote,
} from "@/lib/public-offer-workflow";
import {
  dashboardRepository,
} from "@/repositories/dashboardRepository";

export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await context.params;

    const quote =
      await prisma.quote.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          orderId: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
      });

    if (!quote) {
      return NextResponse.json(
        {
          status:
            "NOT_FOUND",
          message:
            "Quote not found",
          quoteId: id,
        },
        {
          status: 404,
        },
      );
    }

    if (
      !quote.order ||
      !canCreateInvoiceFromQuote(
        quote.status,
        quote.order.status,
      )
    ) {
      return NextResponse.json(
        {
          status:
            "CONFLICT",
          message:
            "Eine Rechnung darf erst nach Abschluss des Auftrags erstellt werden.",
          quoteId:
            quote.id,
          quoteNumber:
            quote.quoteNumber,
          quoteStatus:
            quote.status,
          orderId:
            quote.orderId,
          orderNumber:
            quote.order?.orderNumber ??
            null,
          orderStatus:
            quote.order?.status ??
            null,
          requiredQuoteStatus:
            QuoteStatus.ACCEPTED,
          requiredOrderStatus:
            OrderStatus.COMPLETED,
        },
        {
          status: 409,
        },
      );
    }

    const result =
      await dashboardRepository
        .createInvoiceFromQuote(
          id,
        );

    if (!result) {
      return NextResponse.json(
        {
          status:
            "NOT_FOUND",
          message:
            "Quote not found",
          quoteId: id,
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        status: "OK",
        message:
          result.created
            ? "Die Rechnung wurde nach Abschluss des Auftrags erstellt."
            : "Für diesen abgeschlossenen Auftrag existiert bereits eine Rechnung.",
        quoteId:
          quote.id,
        quoteNumber:
          quote.quoteNumber,
        orderId:
          quote.order.id,
        orderNumber:
          quote.order.orderNumber,
        orderStatus:
          quote.order.status,
        created:
          result.created,
        invoice:
          result.invoice,
      },
      {
        status:
          result.created
            ? 201
            : 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Create invoice from completed order error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Die Rechnung konnte nicht erstellt werden.",
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
      },
      {
        status: 500,
      },
    );
  }
}

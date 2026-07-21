import {
  QuoteStatus,
} from "@prisma/client";
import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";
import {
  dashboardOrderActionsRepository,
} from "@/repositories/dashboardOrderActionsRepository";
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

    const result =
      await dashboardOrderActionsRepository
        .markOrderAsCompleted(id);

    if (!result) {
      return NextResponse.json(
        {
          status:
            "NOT_FOUND",
          message:
            "Order not found",
          orderId: id,
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const acceptedQuote =
      await prisma.quote.findFirst({
        where: {
          orderId: id,
          status:
            QuoteStatus.ACCEPTED,
        },
        orderBy: {
          acceptedAt: "desc",
        },
        select: {
          id: true,
          quoteNumber: true,
        },
      });

    let invoiceAutomation:
      | {
          status:
            "CREATED" |
            "EXISTING";
          quoteId: string;
          quoteNumber: string;
          created: boolean;
          invoice: unknown;
        }
      | {
          status:
            "NO_ACCEPTED_QUOTE";
          quoteId: null;
          quoteNumber: null;
          created: false;
          invoice: null;
        };

    if (acceptedQuote) {
      const invoiceResult =
        await dashboardRepository
          .createInvoiceFromQuote(
            acceptedQuote.id,
          );

      if (!invoiceResult) {
        throw new Error(
          `Accepted quote ${acceptedQuote.quoteNumber} disappeared during invoice automation.`,
        );
      }

      invoiceAutomation = {
        status:
          invoiceResult.created
            ? "CREATED"
            : "EXISTING",
        quoteId:
          acceptedQuote.id,
        quoteNumber:
          acceptedQuote.quoteNumber,
        created:
          invoiceResult.created,
        invoice:
          invoiceResult.invoice,
      };
    } else {
      invoiceAutomation = {
        status:
          "NO_ACCEPTED_QUOTE",
        quoteId: null,
        quoteNumber: null,
        created: false,
        invoice: null,
      };

      await prisma.auditLog.create({
        data: {
          customerId:
            result.updatedOrder
              .customerId,
          orderId:
            result.updatedOrder.id,
          sessionId:
            result.updatedOrder
              .sessionId,
          action:
            "UPDATE",
          entityType:
            "Order",
          entityId:
            result.updatedOrder.id,
          actorType:
            "invoice_automation",
          message:
            `Order ${result.updatedOrder.orderNumber} was completed, but no accepted quote was found for automatic invoice creation.`,
          metadata: {
            source:
              "mark_completed_auto_invoice",
            automatic: true,
            actionRequired: true,
            reason:
              "NO_ACCEPTED_QUOTE",
            orderId:
              result.updatedOrder.id,
            orderNumber:
              result.updatedOrder
                .orderNumber,
          },
        },
      });
    }

    return NextResponse.json(
      {
        status: "OK",
        message:
          invoiceAutomation.status ===
          "CREATED"
            ? "Der Auftrag wurde abgeschlossen und der Rechnungsentwurf automatisch erstellt."
            : invoiceAutomation.status ===
                "EXISTING"
              ? "Der Auftrag ist abgeschlossen. Der Rechnungsentwurf existierte bereits."
              : "Der Auftrag wurde abgeschlossen, aber es wurde keine akzeptierte Offerte für die automatische Rechnung gefunden.",
        orderId: id,
        updated:
          result.updated,
        order:
          result.updatedOrder,
        invoiceAutomation,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Complete order and create invoice error:",
      error,
    );

    return NextResponse.json(
      {
        status:
          "ERROR",
        message:
          "Der Auftrag konnte nicht vollständig abgeschlossen werden.",
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

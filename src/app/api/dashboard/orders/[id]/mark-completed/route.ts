import {
  QuoteStatus,
} from "@prisma/client";
import {
  NextResponse,
} from "next/server";

import {
  sendInvoiceEmailWorkflow,
  type InvoiceEmailWorkflowResult,
} from "@/lib/invoice-email-service";
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

type InvoiceAutomation =
  | {
      status:
        "CREATED" |
        "EXISTING";
      quoteId: string;
      quoteNumber: string;
      created: boolean;
      invoice: {
        id: string;
        invoiceNumber: string;
        status: string;
      };
    }
  | {
      status:
        "NO_ACCEPTED_QUOTE";
      quoteId: null;
      quoteNumber: null;
      created: false;
      invoice: null;
    };

type EmailAutomation =
  | {
      status:
        "SENT" |
        "ALREADY_SENT" |
        "ACTION_REQUIRED";
      attempted: true;
      result:
        InvoiceEmailWorkflowResult;
    }
  | {
      status:
        "NOT_APPLICABLE";
      attempted: false;
      result: null;
    };

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

    const completionResult =
      await dashboardOrderActionsRepository
        .markOrderAsCompleted(id);

    if (!completionResult) {
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

    if (completionResult.conflict) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message:
            "Nur ein eingeplanter Auftrag kann abgeschlossen werden.",
          orderId: id,
          currentStatus: completionResult.order.status,
          requiredStatus: completionResult.requiredStatus,
          updated: false,
          invoiceAutomation: null,
          emailAutomation: null,
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
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
          acceptedAt:
            "desc",
        },
        select: {
          id: true,
          quoteNumber: true,
        },
      });

    let invoiceAutomation:
      InvoiceAutomation;

    let emailAutomation:
      EmailAutomation = {
        status:
          "NOT_APPLICABLE",
        attempted: false,
        result: null,
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
        invoice: {
          id:
            invoiceResult.invoice.id,
          invoiceNumber:
            invoiceResult.invoice
              .invoiceNumber,
          status:
            invoiceResult.invoice
              .status,
        },
      };

      const emailResult =
        await sendInvoiceEmailWorkflow(
          invoiceResult.invoice.id,
        );

      emailAutomation = {
        status:
          emailResult.alreadySent
            ? "ALREADY_SENT"
            : emailResult.sent
              ? "SENT"
              : "ACTION_REQUIRED",
        attempted: true,
        result:
          emailResult,
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
            completionResult
              .updatedOrder
              .customerId,
          orderId:
            completionResult
              .updatedOrder.id,
          sessionId:
            completionResult
              .updatedOrder
              .sessionId,
          action:
            "UPDATE",
          entityType:
            "Order",
          entityId:
            completionResult
              .updatedOrder.id,
          actorType:
            "invoice_automation",
          message:
            `Order ${completionResult.updatedOrder.orderNumber} was completed, but no accepted quote was found for automatic invoice creation.`,
          metadata: {
            source:
              "mark_completed_auto_invoice",
            automatic: true,
            actionRequired: true,
            reason:
              "NO_ACCEPTED_QUOTE",
            orderId:
              completionResult
                .updatedOrder.id,
            orderNumber:
              completionResult
                .updatedOrder
                .orderNumber,
          },
        },
      });
    }

    const actionRequired =
      invoiceAutomation.status ===
        "NO_ACCEPTED_QUOTE" ||
      emailAutomation.status ===
        "ACTION_REQUIRED";

    const message =
      invoiceAutomation.status ===
      "NO_ACCEPTED_QUOTE"
        ? "Der Auftrag wurde abgeschlossen, aber es wurde keine akzeptierte Offerte für die automatische Rechnung gefunden."
        : emailAutomation.status ===
            "SENT"
          ? "Der Auftrag wurde abgeschlossen, die Rechnung erstellt und automatisch per E-Mail versendet."
          : emailAutomation.status ===
              "ALREADY_SENT"
            ? "Der Auftrag ist abgeschlossen. Die Rechnung existiert und wurde bereits per E-Mail versendet."
            : "Der Auftrag wurde abgeschlossen und die Rechnung erstellt. Der E-Mail-Versand benötigt eine Prüfung.";

    return NextResponse.json(
      {
        status: "OK",
        message,
        actionRequired,
        orderId: id,
        updated:
          completionResult.updated,
        order:
          completionResult
            .updatedOrder,
        invoiceAutomation,
        emailAutomation,
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
      "Complete order, create invoice and send email error:",
      error,
    );

    return NextResponse.json(
      {
        status:
          "ERROR",
        message:
          "Der Auftrag konnte nicht vollständig abgeschlossen werden.",
        actionRequired: true,
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

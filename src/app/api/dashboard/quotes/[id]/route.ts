import { NextResponse } from "next/server";
import { QuoteStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dashboardService } from "@/services/dashboardService";

function parseQuoteStatus(value: unknown): QuoteStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  switch (normalized) {
    case QuoteStatus.SENT:
      return QuoteStatus.SENT;
    case QuoteStatus.ACCEPTED:
      return QuoteStatus.ACCEPTED;
    case QuoteStatus.REJECTED:
      return QuoteStatus.REJECTED;
    case QuoteStatus.EXPIRED:
      return QuoteStatus.EXPIRED;
    default:
      return null;
  }
}

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const result = await dashboardService.getQuoteDetails(id);

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to load quote details",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          status: "BAD_REQUEST",
          message: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const requestedStatus = parseQuoteStatus(
      body && typeof body === "object" && "status" in body
        ? (body as { status?: unknown }).status
        : null
    );

    if (!requestedStatus) {
      return NextResponse.json(
        {
          status: "BAD_REQUEST",
          message:
            "Invalid quote status. Allowed actions: SENT, ACCEPTED, REJECTED, EXPIRED.",
        },
        { status: 400 }
      );
    }

    const quote = await prisma.quote.findUnique({
      where: {
        id,
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

    const now = new Date();

    if (requestedStatus === QuoteStatus.SENT) {
      if (quote.status === QuoteStatus.ACCEPTED) {
        return NextResponse.json({
          status: "OK",
          message: "Quote is already accepted and cannot be downgraded to sent.",
          quoteId: id,
          updated: false,
          quote,
        });
      }

      if (
        quote.status === QuoteStatus.REJECTED ||
        quote.status === QuoteStatus.EXPIRED
      ) {
        return NextResponse.json(
          {
            status: "CONFLICT",
            message: `Quote with status ${quote.status} cannot be marked as sent.`,
            quoteId: id,
            currentStatus: quote.status,
          },
          { status: 409 }
        );
      }

      if (quote.status === QuoteStatus.SENT && quote.sentAt) {
        return NextResponse.json({
          status: "OK",
          message: "Quote was already sent.",
          quoteId: id,
          updated: false,
          quote,
        });
      }
    }

    if (requestedStatus === QuoteStatus.ACCEPTED) {
      if (quote.status === QuoteStatus.ACCEPTED && quote.acceptedAt) {
        return NextResponse.json({
          status: "OK",
          message: "Quote was already accepted.",
          quoteId: id,
          updated: false,
          quote,
        });
      }

      if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.ACCEPTED) {
        return NextResponse.json(
          {
            status: "CONFLICT",
            message: "Only a sent quote can be accepted.",
            quoteId: id,
            currentStatus: quote.status,
          },
          { status: 409 }
        );
      }
    }

    if (requestedStatus === QuoteStatus.REJECTED) {
      if (quote.status === QuoteStatus.ACCEPTED) {
        return NextResponse.json(
          {
            status: "CONFLICT",
            message: "Accepted quote cannot be rejected.",
            quoteId: id,
            currentStatus: quote.status,
          },
          { status: 409 }
        );
      }

      if (quote.status === QuoteStatus.REJECTED) {
        return NextResponse.json({
          status: "OK",
          message: "Quote was already rejected.",
          quoteId: id,
          updated: false,
          quote,
        });
      }

      if (quote.status !== QuoteStatus.SENT) {
        return NextResponse.json(
          {
            status: "CONFLICT",
            message: "Only a sent quote can be rejected.",
            quoteId: id,
            currentStatus: quote.status,
          },
          { status: 409 }
        );
      }
    }

    if (requestedStatus === QuoteStatus.EXPIRED) {
      if (quote.status === QuoteStatus.ACCEPTED) {
        return NextResponse.json(
          {
            status: "CONFLICT",
            message: "Accepted quote cannot be expired.",
            quoteId: id,
            currentStatus: quote.status,
          },
          { status: 409 }
        );
      }

      if (quote.status === QuoteStatus.EXPIRED) {
        return NextResponse.json({
          status: "OK",
          message: "Quote was already expired.",
          quoteId: id,
          updated: false,
          quote,
        });
      }

      if (quote.validUntil && quote.validUntil > now) {
        return NextResponse.json(
          {
            status: "CONFLICT",
            message: "Quote cannot be expired before validUntil date.",
            quoteId: id,
            currentStatus: quote.status,
            validUntil: quote.validUntil,
          },
          { status: 409 }
        );
      }
    }

    const before = {
      status: quote.status,
      sentAt: serializeDate(quote.sentAt),
      acceptedAt: serializeDate(quote.acceptedAt),
    };

    const updateData: {
      status: QuoteStatus;
      sentAt?: Date;
      acceptedAt?: Date;
    } = {
      status: requestedStatus,
    };

    if (requestedStatus === QuoteStatus.SENT) {
      updateData.sentAt = quote.sentAt ?? now;
    }

    if (requestedStatus === QuoteStatus.ACCEPTED) {
      updateData.sentAt = quote.sentAt ?? now;
      updateData.acceptedAt = quote.acceptedAt ?? now;
    }

    const updatedQuote = await prisma.quote.update({
      where: {
        id: quote.id,
      },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        customerId: quote.customerId,
        orderId: quote.orderId,
        sessionId: quote.sessionId,
        action: "STATUS_CHANGE",
        entityType: "Quote",
        entityId: quote.id,
        actorType: "dashboard",
        before,
        after: {
          status: updatedQuote.status,
          sentAt: serializeDate(updatedQuote.sentAt),
          acceptedAt: serializeDate(updatedQuote.acceptedAt),
        },
        message: `Quote ${quote.quoteNumber} status changed from ${quote.status} to ${updatedQuote.status}`,
        metadata: {
          source: "dashboard_quote_patch",
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          previousStatus: quote.status,
          nextStatus: updatedQuote.status,
        },
      },
    });

    return NextResponse.json({
      status: "OK",
      message: `Quote status updated to ${updatedQuote.status}`,
      quoteId: id,
      updated: true,
      quote: updatedQuote,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to update quote",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
import { AuditAction, PrismaClient, QuoteStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

import { dashboardService } from "@/services/dashboardService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaPrisma;
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

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

function isFinalQuoteStatus(status: QuoteStatus) {
  return (
    status === QuoteStatus.ACCEPTED ||
    status === QuoteStatus.REJECTED ||
    status === QuoteStatus.EXPIRED
  );
}

function canChangeQuoteStatus(
  currentStatus: QuoteStatus,
  requestedStatus: QuoteStatus,
  validUntil: Date | null,
  now: Date,
) {
  if (currentStatus === requestedStatus) {
    return {
      allowed: true,
      message: "Das Angebot hat bereits diesen Status.",
      updated: false,
    };
  }

  if (requestedStatus === QuoteStatus.SENT) {
    if (isFinalQuoteStatus(currentStatus)) {
      return {
        allowed: false,
        message:
          "Ein finales Angebot kann nicht erneut als versendet markiert werden.",
        updated: false,
      };
    }

    return {
      allowed: true,
      message: "Das Angebot kann als versendet markiert werden.",
      updated: true,
    };
  }

  if (requestedStatus === QuoteStatus.ACCEPTED) {
    if (currentStatus !== QuoteStatus.SENT) {
      return {
        allowed: false,
        message: "Nur ein versendetes Angebot kann akzeptiert werden.",
        updated: false,
      };
    }

    return {
      allowed: true,
      message: "Das Angebot kann als akzeptiert markiert werden.",
      updated: true,
    };
  }

  if (requestedStatus === QuoteStatus.REJECTED) {
    if (currentStatus !== QuoteStatus.SENT) {
      return {
        allowed: false,
        message: "Nur ein versendetes Angebot kann abgelehnt werden.",
        updated: false,
      };
    }

    return {
      allowed: true,
      message: "Das Angebot kann als abgelehnt markiert werden.",
      updated: true,
    };
  }

  if (requestedStatus === QuoteStatus.EXPIRED) {
    if (currentStatus === QuoteStatus.ACCEPTED) {
      return {
        allowed: false,
        message: "Ein akzeptiertes Angebot kann nicht ablaufen.",
        updated: false,
      };
    }

    if (currentStatus === QuoteStatus.REJECTED) {
      return {
        allowed: false,
        message: "Ein abgelehntes Angebot kann nicht als abgelaufen markiert werden.",
        updated: false,
      };
    }

    if (validUntil && validUntil > now) {
      return {
        allowed: false,
        message:
          "Das Angebot kann nicht vor dem Gültigkeitsdatum als abgelaufen markiert werden.",
        updated: false,
      };
    }

    return {
      allowed: true,
      message: "Das Angebot kann als abgelaufen markiert werden.",
      updated: true,
    };
  }

  return {
    allowed: false,
    message: "Diese Statusänderung ist nicht erlaubt.",
    updated: false,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const result = await dashboardService.getQuoteDetails(id);

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(result, {
        status: 404,
        headers: responseHeaders(),
      });
    }

    return NextResponse.json(result, {
      headers: responseHeaders(),
    });
  } catch (error) {
    console.error("Quote details API error:", error);

    return NextResponse.json(
      {
        status: "ERROR",
        message: "Die Angebotsdetails konnten nicht geladen werden.",
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
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
          message: "Der Request enthält kein gültiges JSON.",
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const requestedStatus = parseQuoteStatus(
      body && typeof body === "object" && "status" in body
        ? (body as { status?: unknown }).status
        : null,
    );

    if (!requestedStatus) {
      return NextResponse.json(
        {
          status: "BAD_REQUEST",
          message:
            "Der angeforderte Angebotsstatus ist ungültig. Erlaubt sind SENT, ACCEPTED, REJECTED und EXPIRED.",
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const prisma = getPrisma();

    const quote = await prisma.quote.findUnique({
      where: {
        id,
      },
    });

    if (!quote) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Das Angebot wurde nicht gefunden.",
          quoteId: id,
        },
        {
          status: 404,
          headers: responseHeaders(),
        },
      );
    }

    const now = new Date();

    const transition = canChangeQuoteStatus(
      quote.status,
      requestedStatus,
      quote.validUntil,
      now,
    );

    if (!transition.allowed) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message: transition.message,
          quoteId: id,
          currentStatus: quote.status,
          requestedStatus,
        },
        {
          status: 409,
          headers: responseHeaders(),
        },
      );
    }

    if (!transition.updated) {
      return NextResponse.json(
        {
          status: "OK",
          message: transition.message,
          quoteId: id,
          updated: false,
          quote,
        },
        {
          headers: responseHeaders(),
        },
      );
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

    const updatedQuote = await prisma.$transaction(async (tx) => {
      const changedQuote = await tx.quote.update({
        where: {
          id: quote.id,
        },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          customerId: quote.customerId,
          orderId: quote.orderId,
          sessionId: quote.sessionId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "Quote",
          entityId: quote.id,
          actorType: "dashboard",
          before,
          after: {
            status: changedQuote.status,
            sentAt: serializeDate(changedQuote.sentAt),
            acceptedAt: serializeDate(changedQuote.acceptedAt),
          },
          message: `Angebot ${quote.quoteNumber}: Status von ${quote.status} auf ${changedQuote.status} geändert.`,
          metadata: {
            source: "dashboard_quote_patch",
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            previousStatus: quote.status,
            nextStatus: changedQuote.status,
          },
        },
      });

      return changedQuote;
    });

    return NextResponse.json(
      {
        status: "OK",
        message: `Der Angebotsstatus wurde auf ${updatedQuote.status} geändert.`,
        quoteId: id,
        updated: true,
        quote: updatedQuote,
      },
      {
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Quote update API error:", error);

    return NextResponse.json(
      {
        status: "ERROR",
        message: "Der Angebotsstatus konnte nicht geändert werden.",
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}
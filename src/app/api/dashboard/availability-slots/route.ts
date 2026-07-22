import {
  AvailabilitySlotStatus,
} from "@prisma/client";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { ensureAutomaticAvailability } from "@/lib/automatic-availability";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

function parseRequiredDate(
  value: unknown,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function cleanNotes(
  value: unknown,
) {
  const notes = String(
    value ?? "",
  ).trim();

  return notes || null;
}

export async function GET() {
  try {
    await ensureAutomaticAvailability(
      prisma,
    );

    const slots =
      await prisma.availabilitySlot.findMany({
        where: {
          tenantKey: TENANT_KEY,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
        orderBy: [
          {
            startAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    return NextResponse.json({
      status: "OK",
      data: {
        slots,
      },
    });
  } catch (error) {
    console.error(
      "Availability slots GET error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Die freien Termine konnten nicht geladen werden.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const startAt =
      parseRequiredDate(
        body.startAt,
      );

    const endAt =
      parseRequiredDate(
        body.endAt,
      );

    if (!startAt || !endAt) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Ein gueltiger Start- und Endtermin ist erforderlich.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      endAt.getTime() <=
      startAt.getTime()
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Der Endtermin muss nach dem Starttermin liegen.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      startAt.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Ein freier Termin muss in der Zukunft liegen.",
        },
        {
          status: 400,
        },
      );
    }

    const overlappingSlot =
      await prisma.availabilitySlot.findFirst({
        where: {
          tenantKey: TENANT_KEY,
          startAt: {
            lt: endAt,
          },
          endAt: {
            gt: startAt,
          },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
        },
      });

    if (overlappingSlot) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message:
            "Dieser Termin ueberschneidet sich mit einem bestehenden Zeitfenster.",
          data: {
            conflictingSlot:
              overlappingSlot,
          },
        },
        {
          status: 409,
        },
      );
    }

    const slot =
      await prisma.availabilitySlot.create({
        data: {
          tenantKey: TENANT_KEY,
          startAt,
          endAt,
          status:
            AvailabilitySlotStatus.AVAILABLE,
          notes:
            cleanNotes(
              body.notes,
            ),
        },
      });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entityType:
          "AvailabilitySlot",
        entityId: slot.id,
        actorType:
          "dashboard_owner",
        after: {
          startAt:
            slot.startAt.toISOString(),
          endAt:
            slot.endAt.toISOString(),
          status:
            slot.status,
          notes:
            slot.notes,
        },
        message:
          "Ein freier Kundentermin wurde erstellt.",
        metadata: {
          source:
            "dashboard_availability_slot",
          automatic: false,
        },
      },
    });

    return NextResponse.json(
      {
        status: "OK",
        message:
          "Der freie Termin wurde erstellt.",
        data: {
          slot,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Availability slots POST error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Der freie Termin konnte nicht erstellt werden.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}


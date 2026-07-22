import {
  AvailabilitySlotStatus,
} from "@prisma/client";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isOwnerStatus(
  value: unknown,
): value is
  | AvailabilitySlotStatus.AVAILABLE
  | AvailabilitySlotStatus.BLOCKED {
  return (
    value ===
      AvailabilitySlotStatus.AVAILABLE ||
    value ===
      AvailabilitySlotStatus.BLOCKED
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    const body =
      await request.json();

    if (
      !isOwnerStatus(
        body.status,
      )
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Nur AVAILABLE oder BLOCKED kann manuell gesetzt werden.",
        },
        {
          status: 400,
        },
      );
    }

    const current =
      await prisma.availabilitySlot.findFirst({
        where: {
          id,
          tenantKey: TENANT_KEY,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message:
            "Der Termin wurde nicht gefunden.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      current.status ===
        AvailabilitySlotStatus.BOOKED ||
      current.orderId
    ) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message:
            "Ein gebuchter Termin kann nicht manuell ge?ndert werden.",
        },
        {
          status: 409,
        },
      );
    }

    const updated =
      await prisma.availabilitySlot.update({
        where: {
          id: current.id,
        },
        data: {
          status:
            body.status,
        },
      });

    await prisma.auditLog.create({
      data: {
        action:
          "STATUS_CHANGE",
        entityType:
          "AvailabilitySlot",
        entityId:
          updated.id,
        actorType:
          "dashboard_owner",
        before: {
          status:
            current.status,
        },
        after: {
          status:
            updated.status,
        },
        message:
          `Terminstatus wurde von ${current.status} auf ${updated.status} ge?ndert.`,
        metadata: {
          source:
            "dashboard_availability_slot",
          automatic: false,
        },
      },
    });

    return NextResponse.json({
      status: "OK",
      message:
        "Der Terminstatus wurde ge?ndert.",
      data: {
        slot: updated,
      },
    });
  } catch (error) {
    console.error(
      "Availability slot PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Der Termin konnte nicht ge?ndert werden.",
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

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    const current =
      await prisma.availabilitySlot.findFirst({
        where: {
          id,
          tenantKey: TENANT_KEY,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message:
            "Der Termin wurde nicht gefunden.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      current.status ===
        AvailabilitySlotStatus.BOOKED ||
      current.orderId
    ) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message:
            "Ein gebuchter Termin kann nicht gel?scht werden.",
        },
        {
          status: 409,
        },
      );
    }

    await prisma.$transaction([
      prisma.availabilitySlot.delete({
        where: {
          id: current.id,
        },
      }),

      prisma.auditLog.create({
        data: {
          action: "DELETE",
          entityType:
            "AvailabilitySlot",
          entityId:
            current.id,
          actorType:
            "dashboard_owner",
          before: {
            startAt:
              current.startAt.toISOString(),
            endAt:
              current.endAt.toISOString(),
            status:
              current.status,
          },
          message:
            "Ein freier Kundentermin wurde gel?scht.",
          metadata: {
            source:
              "dashboard_availability_slot",
            automatic: false,
          },
        },
      }),
    ]);

    return NextResponse.json({
      status: "OK",
      message:
        "Der freie Termin wurde gel?scht.",
    });
  } catch (error) {
    console.error(
      "Availability slot DELETE error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Der Termin konnte nicht gel?scht werden.",
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
